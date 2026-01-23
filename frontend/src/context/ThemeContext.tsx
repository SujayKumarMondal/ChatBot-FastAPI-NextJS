import React, { createContext, useContext, useState, useEffect } from "react";

export type Theme = "light" | "dark" | "chatbot-pro" | "azure" | "deep-ocean" | "midnight" | "radiant";

interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
  border: string;
  destructive: string;
}

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;
  toggleDarkMode: () => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  highContrast: boolean;
  setHighContrast: (value: boolean) => void;
  warmPalette: boolean;
  setWarmPalette: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themePresets: Record<Theme, ThemeColors & { label: string; description: string }> = {
  light: {
    label: "Light Mode",
    description: "Clean, bright interface for daytime use",
    background: "oklch(0.98 0.001 280)",
    foreground: "oklch(0.12 0.008 275)",
    primary: "oklch(0.55 0.28 255)",
    secondary: "oklch(0.65 0.25 280)",
    accent: "oklch(0.68 0.28 200)",
    muted: "oklch(0.92 0.005 280)",
    border: "oklch(0.90 0.008 280)",
    destructive: "oklch(0.62 0.28 25)",
  },
  dark: {
    label: "Dark Mode",
    description: "Easy on the eyes for nighttime usage",
    background: "oklch(0.14 0.01 275)",
    foreground: "oklch(0.96 0.008 280)",
    primary: "oklch(0.65 0.28 255)",
    secondary: "oklch(0.55 0.22 280)",
    accent: "oklch(0.75 0.28 200)",
    muted: "oklch(0.30 0.01 275)",
    border: "oklch(0.25 0.02 275)",
    destructive: "oklch(0.72 0.28 25)",
  },
  "chatbot-pro": {
    label: "Chatbot Pro",
    description: "Professional gradient-based theme for AI conversations",
    background: "oklch(0.12 0.012 270)",
    foreground: "oklch(0.95 0.01 280)",
    primary: "oklch(0.62 0.30 255)",
    secondary: "oklch(0.58 0.25 285)",
    accent: "oklch(0.70 0.30 190)",
    muted: "oklch(0.28 0.012 270)",
    border: "oklch(0.22 0.025 270)",
    destructive: "oklch(0.68 0.30 15)",
  },
  azure: {
    label: "Azure Sky",
    description: "Soft blue and cyan tones inspired by clouds",
    background: "oklch(0.13 0.015 245)",
    foreground: "oklch(0.94 0.012 250)",
    primary: "oklch(0.60 0.32 245)",
    secondary: "oklch(0.55 0.28 220)",
    accent: "oklch(0.72 0.32 190)",
    muted: "oklch(0.32 0.015 245)",
    border: "oklch(0.24 0.03 245)",
    destructive: "oklch(0.65 0.30 20)",
  },
  "deep-ocean": {
    label: "Deep Ocean",
    description: "Dark teal and ocean blue gradient theme",
    background: "oklch(0.11 0.020 230)",
    foreground: "oklch(0.93 0.015 240)",
    primary: "oklch(0.58 0.35 230)",
    secondary: "oklch(0.52 0.30 210)",
    accent: "oklch(0.68 0.35 180)",
    muted: "oklch(0.26 0.020 230)",
    border: "oklch(0.20 0.035 230)",
    destructive: "oklch(0.62 0.32 10)",
  },
  midnight: {
    label: "Midnight Ultra",
    description: "Ultra dark with neon accent colors",
    background: "oklch(0.08 0.005 260)",
    foreground: "oklch(0.97 0.005 280)",
    primary: "oklch(0.70 0.35 255)",
    secondary: "oklch(0.60 0.30 280)",
    accent: "oklch(0.75 0.35 180)",
    muted: "oklch(0.22 0.008 260)",
    border: "oklch(0.15 0.015 260)",
    destructive: "oklch(0.75 0.35 0)",
  },
  radiant: {
    label: "Radiant Glow",
    description: "Purple and violet tones with vibrant accents",
    background: "oklch(0.14 0.018 280)",
    foreground: "oklch(0.94 0.015 285)",
    primary: "oklch(0.65 0.32 280)",
    secondary: "oklch(0.58 0.28 300)",
    accent: "oklch(0.72 0.32 200)",
    muted: "oklch(0.30 0.015 280)",
    border: "oklch(0.24 0.032 280)",
    destructive: "oklch(0.70 0.32 15)",
  },
};

export const accentColors = [
  { name: "Vibrant Cyan", value: "oklch(0.75 0.32 190)" },
  { name: "Bright Blue", value: "oklch(0.65 0.30 255)" },
  { name: "Electric Purple", value: "oklch(0.70 0.32 280)" },
  { name: "Neon Green", value: "oklch(0.72 0.35 140)" },
  { name: "Sunset Orange", value: "oklch(0.68 0.35 40)" },
  { name: "Magenta Pink", value: "oklch(0.72 0.32 310)" },
  { name: "Coral Red", value: "oklch(0.65 0.32 15)" },
  { name: "Teal Accent", value: "oklch(0.68 0.35 200)" },
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>("dark");
  const [accentColor, setAccentColor] = useState(accentColors[0].value);
  const [highContrast, setHighContrast] = useState(false);
  const [warmPalette, setWarmPalette] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const savedAccent = localStorage.getItem("accentColor");
    const savedContrast = localStorage.getItem("highContrast");
    const savedWarm = localStorage.getItem("warmPalette");

    if (savedTheme) setCurrentTheme(savedTheme);
    if (savedAccent) setAccentColor(savedAccent);
    if (savedContrast) setHighContrast(JSON.parse(savedContrast));
    if (savedWarm) setWarmPalette(JSON.parse(savedWarm));

    // Check system preference
    if (!savedTheme && window.matchMedia("(prefers-color-scheme: light)").matches) {
      setCurrentTheme("light");
    }
  }, []);

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    const preset = themePresets[currentTheme];

    // Set all CSS variables for the current theme
    Object.entries(preset).forEach(([key, value]) => {
      if (key !== "label" && key !== "description" && typeof value === "string") {
        root.style.setProperty(`--${key}`, value);
      }
    });

    // Set custom variables
    root.style.setProperty("--accent-custom", accentColor);
    root.style.setProperty("--high-contrast", highContrast ? "1" : "0");

    // Apply theme class
    if (currentTheme === "light") {
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
    }

    // Apply high contrast mode
    if (highContrast) {
      root.setAttribute("data-high-contrast", "true");
    } else {
      root.removeAttribute("data-high-contrast");
    }

    // Apply warm palette
    if (warmPalette) {
      root.setAttribute("data-warm-palette", "true");
    } else {
      root.removeAttribute("data-warm-palette");
    }

    // Save to localStorage
    localStorage.setItem("theme", currentTheme);
    localStorage.setItem("accentColor", accentColor);
    localStorage.setItem("highContrast", JSON.stringify(highContrast));
    localStorage.setItem("warmPalette", JSON.stringify(warmPalette));
  }, [currentTheme, accentColor, highContrast, warmPalette]);

  const toggleDarkMode = () => {
    setCurrentTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        setTheme: setCurrentTheme,
        toggleDarkMode,
        accentColor,
        setAccentColor,
        highContrast,
        setHighContrast,
        warmPalette,
        setWarmPalette,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
