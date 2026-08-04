import mongoose from "mongoose";

import { connectDB, disconnectDB } from "../config/database.js";
import AppointmentModel from "../models/Appointment.js";
import DoctorModel from "../models/Doctor.js";
import UserModel from "../models/User.js";
import { defaultDoctorAvailability } from "../services/availabilityService.js";

const emptyHealthProfile = {
  bloodGroup: "Not known",
  allergies: [],
  chronicConditions: [],
  medicalNotes: "",
  emergencyContact: { name: "", relationship: "", phone: "" },
  insurance: { provider: "", policyNumber: "", expiryDate: "" }
};

const run = async (): Promise<void> => {
  await connectDB();

  const [users, doctors] = await Promise.all([UserModel.find({}), DoctorModel.find({})]);
  let usersUpdated = 0;
  let doctorsUpdated = 0;

  for (const user of users) {
    if (!user.healthProfile) {
      await UserModel.findByIdAndUpdate(user._id, { healthProfile: emptyHealthProfile });
      usersUpdated += 1;
    }
  }

  for (const doctor of doctors) {
    if (!doctor.availability) {
      await DoctorModel.findByIdAndUpdate(doctor._id, {
        availability: { ...defaultDoctorAvailability(), enabled: doctor.available }
      });
      doctorsUpdated += 1;
    }
  }

  const cancelled = await AppointmentModel.updateMany(
    { status: { $exists: false }, cancelled: true },
    { status: "cancelled" }
  );
  const completed = await AppointmentModel.updateMany(
    { status: { $exists: false }, cancelled: { $ne: true }, isCompleted: true },
    { status: "completed" }
  );
  const scheduled = await AppointmentModel.updateMany(
    { status: { $exists: false }, cancelled: { $ne: true }, isCompleted: { $ne: true } },
    { status: "scheduled" }
  );

  const conflicts = await AppointmentModel.aggregate<{
    _id: { docId: string; slotDate: string; slotTime: string };
    count: number;
  }>([
    { $match: { status: "scheduled" } },
    {
      $group: {
        _id: { docId: "$docId", slotDate: "$slotDate", slotTime: "$slotTime" },
        count: { $sum: 1 }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]);

  if (conflicts.length > 0) {
    console.warn("Phase 2B found active slot conflicts. Resolve them before creating the unique index.", {
      conflictCount: conflicts.length
    });
  } else {
    await AppointmentModel.collection.createIndex(
      { docId: 1, slotDate: 1, slotTime: 1 },
      { unique: true, partialFilterExpression: { status: "scheduled" } }
    );
  }

  console.info("Phase 2B backfill completed safely.", {
    usersUpdated,
    doctorsUpdated,
    appointmentsUpdated:
      cancelled.modifiedCount + completed.modifiedCount + scheduled.modifiedCount,
    activeSlotConflicts: conflicts.length
  });
};

run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Phase 2B backfill failed");
    process.exitCode = 1;
  })
  .finally(() => {
    void disconnectDB().then(() => mongoose.connection.removeAllListeners());
  });
