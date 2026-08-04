"use client";

import { createContext } from "react";

import { publicEnv } from "../lib/env";

export const AppContext = createContext();

const AppContextProvider = ({ children }) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const slotDateFormat = (slotDate) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(slotDate)) {
      const date = new Date(`${slotDate}T12:00:00`);
      return Number.isNaN(date.getTime())
        ? slotDate
        : `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    }
    const dateArray = slotDate.split("_");
    return `${dateArray[0]} ${months[Number(dateArray[1]) - 1]} ${dateArray[2]}`;
  };
  const calculateAge = (dob) => new Date().getFullYear() - new Date(dob).getFullYear();

  return (
    <AppContext.Provider
      value={{
        backendUrl: publicEnv.backendUrl,
        currency: publicEnv.currency,
        slotDateFormat,
        calculateAge
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;
