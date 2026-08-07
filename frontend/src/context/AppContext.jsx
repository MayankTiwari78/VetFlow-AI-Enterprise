"use client";

import { createContext, useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

import {
  bootstrapPatientSession,
  configurePatientAuth,
  isAuthSessionHandledError
} from "../api/authClient";
import { publicEnv } from "../lib/env";
import { normalizeEntityId } from "../lib/entityId";
import { normalizeDoctors } from "../lib/veterinaryDisplay";

export const AppContext = createContext();

const AppContextProvider = ({ children }) => {
  const backendUrl = publicEnv.backendUrl;
  const currencySymbol = "INR ";
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState("");
  const [token, setToken] = useState("");
  const [userData, setUserData] = useState(false);
  const [authStatus, setAuthStatus] = useState("initializing");
  const initialDoctorLoadStarted = useRef(false);
  const profileTokenLoaded = useRef("");
  const tokenRef = useRef("");

  const updateToken = useCallback((nextToken) => {
    const normalizedToken = nextToken || "";

    if (typeof window !== "undefined") {
      if (normalizedToken) {
        window.localStorage.setItem("token", normalizedToken);
      } else {
        window.localStorage.removeItem("token");
      }
    }

    tokenRef.current = normalizedToken;
    setToken(normalizedToken);
    setAuthStatus(normalizedToken ? "authenticated" : "unauthenticated");

    if (!normalizedToken) {
      profileTokenLoaded.current = "";
      setUserData(false);
    }
  }, []);

  const getDoctosData = useCallback(async () => {
    setDoctorsLoading(true);
    setDoctorsError("");
    try {
      const { data } = await axios.get(`${backendUrl}/api/doctor/list`);
      if (data.success) {
        setDoctors(
          Array.isArray(data.doctors)
            ? normalizeDoctors(
                data.doctors.map((doctor) => ({ ...doctor, _id: normalizeEntityId(doctor._id) }))
              )
            : []
        );
      } else {
        setDoctors([]);
        setDoctorsError("The veterinary directory is temporarily unavailable. Please try again shortly.");
      }
    } catch (error) {
      setDoctors([]);
      setDoctorsError(
        error.response
          ? "The veterinary directory is temporarily unavailable. Please try again shortly."
          : "We could not reach the veterinary directory. Check the local service and try again."
      );
    } finally {
      setDoctorsLoading(false);
    }
  }, [backendUrl]);

  const loadUserProfileData = useCallback(async (tokenOverride, options = {}) => {
    const activeToken = tokenOverride || tokenRef.current;
    if (!activeToken) return false;

    try {
      const { data } = await axios.get(`${backendUrl}/api/user/get-profile`, {
        headers: { token: activeToken },
        optionalAuthRequest: options.optional,
        skipAuthRefresh: options.optional
      });
      if (data.success) {
        setUserData(data.userData);
        profileTokenLoaded.current = activeToken;
        return true;
      } else {
        if (!options.silent) {
          toast.error(data.message);
        }
      }
    } catch (error) {
      if (options.optional && error.response?.status === 401) {
        updateToken("");
        return false;
      }

      if (!options.silent && !isAuthSessionHandledError(error)) {
        toast.error(error.response?.data?.message || error.message || "Unable to load your profile");
      }
    }
    return false;
  }, [backendUrl, updateToken]);

  useEffect(() => {
    let active = true;

    configurePatientAuth({
      backendUrl,
      setToken: updateToken,
      onAuthCleared: () => {
        profileTokenLoaded.current = "";
        setUserData(false);
      }
    });

    setAuthStatus("initializing");

    bootstrapPatientSession(backendUrl)
      .then(async (result) => {
        if (!active) return;

        if (result.status !== "authenticated" || !result.token) {
          updateToken("");
          return;
        }

        profileTokenLoaded.current = result.token;
        updateToken(result.token);
        const loaded = await loadUserProfileData(result.token, { optional: true, silent: true });

        if (active && !loaded) {
          updateToken("");
        }
      })
      .catch(() => {
        if (active) {
          updateToken("");
        }
      });

    return () => {
      active = false;
    };
  }, [backendUrl, loadUserProfileData, updateToken]);

  useEffect(() => {
    if (initialDoctorLoadStarted.current) return;
    initialDoctorLoadStarted.current = true;
    void getDoctosData();
  }, [getDoctosData]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !token || profileTokenLoaded.current === token) return;
    void loadUserProfileData(token);
  }, [authStatus, loadUserProfileData, token]);

  const value = {
    doctors,
    doctorsLoading,
    doctorsError,
    getDoctosData,
    currencySymbol,
    backendUrl,
    authStatus,
    token,
    setToken: updateToken,
    userData,
    setUserData,
    loadUserProfileData
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContextProvider;
