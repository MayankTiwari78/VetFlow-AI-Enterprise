"use client";

import { useContext } from "react";

import { AdminContext } from "../context/AdminContext";
import { DoctorContext } from "../context/DoctorContext";
import Login from "../features/Login";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const PortalShell = (props) => {
  const children = props.children ?? null;
  const { aToken } = useContext(AdminContext);
  const { dToken } = useContext(DoctorContext);

  if (!aToken && !dToken) return <Login />;

  return (
    <div className="min-h-screen bg-[#F6FAFB]">
      <Navbar />
      <div className="flex items-start">
        <Sidebar />
        {children}
      </div>
    </div>
  );
};

export default PortalShell;
