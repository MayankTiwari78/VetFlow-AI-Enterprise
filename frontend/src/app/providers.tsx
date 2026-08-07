"use client";

import type { ReactNode } from "react";
import { ToastContainer } from "react-toastify";

import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import AppContextProvider from "../context/AppContext";

export const Providers = ({ children }: { children: ReactNode }) => (
  <AppContextProvider>
    <ToastContainer />
    <Navbar />
    <main className="pt-20">
      <div className="mf-page">
        {children}
      </div>
    </main>
    <Footer />
  </AppContextProvider>
);
