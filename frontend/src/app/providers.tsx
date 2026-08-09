"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ToastContainer } from "react-toastify";

import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import AppContextProvider from "../context/AppContext";

const isAuthenticatedAppRoute = (pathname: string) =>
  pathname === "/dashboard" ||
  pathname.startsWith("/dashboard/") ||
  pathname === "/pet-owner" ||
  pathname.startsWith("/pet-owner/");

export const Providers = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname() ?? "";
  const isApp = isAuthenticatedAppRoute(pathname);

  return (
    <AppContextProvider>
      <ToastContainer />
      {!isApp && <Navbar />}
      <main className={isApp ? "" : "pt-20"}>
        <div className={isApp ? "" : "mf-page"}>{children}</div>
      </main>
      {!isApp && <Footer />}
    </AppContextProvider>
  );
};
