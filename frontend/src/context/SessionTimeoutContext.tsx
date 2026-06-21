import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface SessionTimeoutContextType {
  isWarningVisible: boolean;
  dismissWarning: () => void;
  extendSession: () => void;
  timeRemaining: number; // seconds
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined);

export const SessionTimeoutProvider = ({ children }: { children: ReactNode }) => {
  const { signOut, user } = useAuth();
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes in seconds
  
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes
  const WARNING_THRESHOLD = 25 * 60 * 1000; // 25 minutes (warning at 5 min before logout)

  // Reset all timers
  const resetInactivityTimer = () => {
    // Clear existing timers
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setIsWarningVisible(false);
    setTimeRemaining(30 * 60); // Reset to 30 minutes

    // Set new warning timer (25 minutes)
    warningTimeoutRef.current = setTimeout(() => {
      setIsWarningVisible(true);
      startCountdown();
    }, WARNING_THRESHOLD);

    // Set new logout timer (30 minutes)
    inactivityTimeoutRef.current = setTimeout(() => {
      handleLogout();
    }, INACTIVITY_LIMIT);
  };

  const startCountdown = () => {
    let secondsLeft = 5 * 60; // 5 minutes
    setTimeRemaining(secondsLeft);

    countdownIntervalRef.current = setInterval(() => {
      secondsLeft -= 1;
      setTimeRemaining(secondsLeft);

      if (secondsLeft <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      }
    }, 1000);
  };

  const dismissWarning = () => {
    // Dismiss warning but keep the session active
    setIsWarningVisible(false);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  const extendSession = () => {
    // Reset timer - user is active again
    resetInactivityTimer();
  };

  const handleLogout = () => {
    // Clear all timers
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setIsWarningVisible(false);
    signOut();
  };

  // Setup activity listeners
  useEffect(() => {
    if (!user) return; // Only start tracking when user is logged in

    // Define activity events
    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart", "click"];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Add event listeners
    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    // Initial timer setup
    resetInactivityTimer();

    // Cleanup
    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });

      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [user]);

  return (
    <SessionTimeoutContext.Provider
      value={{
        isWarningVisible,
        dismissWarning,
        extendSession,
        timeRemaining,
      }}
    >
      {children}
    </SessionTimeoutContext.Provider>
  );
};

export const useSessionTimeout = () => {
  const context = useContext(SessionTimeoutContext);
  if (!context) {
    throw new Error("useSessionTimeout must be used within SessionTimeoutProvider");
  }
  return context;
};
