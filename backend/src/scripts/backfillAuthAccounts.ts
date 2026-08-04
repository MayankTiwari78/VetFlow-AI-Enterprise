import mongoose, { type Model } from "mongoose";

import { connectDB, disconnectDB } from "../config/database.js";
import DoctorModel, { type Doctor } from "../models/Doctor.js";
import UserModel, { type User } from "../models/User.js";
import { normalizeEmail } from "../utils/authCrypto.js";

interface DuplicateEmail {
  _id: string;
  count: number;
}

interface EmailRecord {
  _id?: unknown;
  email: string;
  normalizedEmail?: string;
}

const findDuplicateNormalizedEmails = async <T extends { email: string }>(
  model: Model<T>
): Promise<DuplicateEmail[]> =>
  model.aggregate<DuplicateEmail>([
    {
      $project: {
        normalizedEmail: { $toLower: "$email" }
      }
    },
    {
      $group: {
        _id: "$normalizedEmail",
        count: { $sum: 1 }
      }
    },
    {
      $match: {
        count: { $gt: 1 }
      }
    }
  ]);

const backfillNormalizedEmails = async <T extends EmailRecord>(
  model: Model<T>
): Promise<number> => {
  const records = await model.find({
    $or: [{ normalizedEmail: { $exists: false } }, { normalizedEmail: "" }]
  });

  for (const record of records) {
    if (!record._id) {
      continue;
    }

    await model.findByIdAndUpdate(record._id, {
      normalizedEmail: normalizeEmail(record.email)
    });
  }

  return records.length;
};

const backfillAccountDefaults = async <T extends { email: string }>(
  model: Model<T>,
  existingAccountsAreVerified: boolean
): Promise<void> => {
  await model.updateMany(
    { emailVerified: { $exists: false } },
    { emailVerified: existingAccountsAreVerified }
  );
  await model.updateMany({ accountStatus: { $exists: false } }, { accountStatus: "ACTIVE" });
  await model.updateMany({ failedLoginAttempts: { $exists: false } }, { failedLoginAttempts: 0 });
  await model.updateMany(
    { authenticationProvider: { $exists: false } },
    { authenticationProvider: "LOCAL" }
  );
};

const run = async (): Promise<void> => {
  await connectDB();

  const userDuplicates = await findDuplicateNormalizedEmails(UserModel);
  const doctorDuplicates = await findDuplicateNormalizedEmails(DoctorModel);

  if (userDuplicates.length > 0 || doctorDuplicates.length > 0) {
    console.warn(
      "Duplicate normalized emails detected. Resolve these before adding unique indexes."
    );
    console.warn({ users: userDuplicates, doctors: doctorDuplicates });
  }

  const [usersNormalized, doctorsNormalized] = await Promise.all([
    backfillNormalizedEmails<User>(UserModel),
    backfillNormalizedEmails<Doctor>(DoctorModel)
  ]);

  await Promise.all([
    backfillAccountDefaults(UserModel, true),
    backfillAccountDefaults(DoctorModel, true)
  ]);

  console.info("Auth account backfill completed safely.", {
    usersNormalized,
    doctorsNormalized,
    duplicateUserEmails: userDuplicates.length,
    duplicateDoctorEmails: doctorDuplicates.length
  });
};

run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Auth account backfill failed");
    process.exitCode = 1;
  })
  .finally(() => {
    void disconnectDB().then(() => mongoose.connection.removeAllListeners());
  });
