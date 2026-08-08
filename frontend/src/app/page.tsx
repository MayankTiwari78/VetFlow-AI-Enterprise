"use client";

import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";

import Home from "../features/Home";
import { AppContext } from "../context/AppContext";

export default function Page() {
  const router = useRouter();
  const { authStatus, token } = useContext(AppContext);

  useEffect(() => {
    if (authStatus === "authenticated" && token) {
      router.replace("/dashboard");
    }
  }, [authStatus, router, token]);

  if (authStatus === "authenticated" && token) {
    return null;
  }

  return <Home />;
}