"use client";

import type { ReactNode } from "react";
import { ToastContainer } from "react-toastify";

import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import AppContextProvider from "../context/AppContext";

export const Providers = ({ children }: { children: ReactNode }) => (
  <AppContextProvider>
    <ToastContainer />
    <div className="mx-4 sm:mx-[10%]">
      <Navbar />
      {children}
      <Footer />
    </div>
  </AppContextProvider>
);
