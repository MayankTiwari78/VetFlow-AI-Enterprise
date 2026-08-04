"use client";

import axios from "axios";
import { createContext, useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import { configureAdminAuth, isAuthSessionHandledError } from "../api/authClient";
import { publicEnv } from "../lib/env";

export const AdminContext = createContext();

const AdminContextProvider = ({ children }) => {
  const backendUrl = publicEnv.backendUrl;
  const [aToken, setAToken] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [dashData, setDashData] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAToken(window.localStorage.getItem("aToken") || "");
    }
    configureAdminAuth({ backendUrl, setAToken });
  }, [backendUrl]);

  const getAllDoctors = useCallback(async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/all-doctors`, { headers: { aToken } });
      if (data.success) setDoctors(data.doctors);
      else toast.error(data.message);
    } catch (error) {
      if (!isAuthSessionHandledError(error)) toast.error(error.response?.data?.message || error.message || "Unable to load doctors");
    }
  }, [aToken, backendUrl]);

  const changeAvailability = useCallback(
    async (docId) => {
      try {
        const { data } = await axios.post(
          `${backendUrl}/api/admin/change-availability`,
          { docId },
          { headers: { aToken } }
        );
        if (data.success) {
          toast.success(data.message);
          await getAllDoctors();
        } else toast.error(data.message);
      } catch (error) {
        if (!isAuthSessionHandledError(error)) toast.error(error.response?.data?.message || error.message || "Unable to update availability");
      }
    },
    [aToken, backendUrl, getAllDoctors]
  );

  const getAllAppointments = useCallback(async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/appointments`, { headers: { aToken } });
      if (data.success) setAppointments(data.appointments.reverse());
      else toast.error(data.message);
    } catch (error) {
      if (!isAuthSessionHandledError(error)) toast.error(error.response?.data?.message || error.message || "Unable to load appointments");
    }
  }, [aToken, backendUrl]);

  const cancelAppointment = useCallback(
    async (appointmentId) => {
      try {
        const { data } = await axios.post(
          `${backendUrl}/api/admin/cancel-appointment`,
          { appointmentId },
          { headers: { aToken } }
        );
        if (data.success) {
          toast.success(data.message);
          await getAllAppointments();
        } else toast.error(data.message);
      } catch (error) {
        if (!isAuthSessionHandledError(error)) toast.error(error.response?.data?.message || error.message || "Unable to cancel appointment");
      }
    },
    [aToken, backendUrl, getAllAppointments]
  );

  const getDashData = useCallback(async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/dashboard`, { headers: { aToken } });
      if (data.success) setDashData(data.dashData);
      else toast.error(data.message);
    } catch (error) {
      if (!isAuthSessionHandledError(error)) toast.error(error.response?.data?.message || error.message || "Unable to load dashboard");
    }
  }, [aToken, backendUrl]);

  return (
    <AdminContext.Provider
      value={{
        aToken,
        setAToken,
        doctors,
        getAllDoctors,
        changeAvailability,
        appointments,
        getAllAppointments,
        getDashData,
        cancelAppointment,
        dashData
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export default AdminContextProvider;
