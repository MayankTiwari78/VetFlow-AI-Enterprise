"use client";

import type { ReactNode } from "react";
import { ToastContainer } from "react-toastify";

import AdminContextProvider from "../context/AdminContext";
import AppContextProvider from "../context/AppContext";
import DoctorContextProvider from "../context/DoctorContext";

export const Providers = ({ children }: { children: ReactNode }) => (
  <AppContextProvider>
    <AdminContextProvider>
      <DoctorContextProvider>
        <ToastContainer />
        {children}
      </DoctorContextProvider>
    </AdminContextProvider>
  </AppContextProvider>
);
