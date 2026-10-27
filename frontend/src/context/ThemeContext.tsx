import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme =
  | "light"
  | "dark"
  | "dark-modern"
  | "light-modern"
  | "dark-plus"
  | "light-plus"
  | "high-contrast"
  | "quiet-light"
  | "monokai"
  | "solarized-dark"
  | "solarized-light"
  | "abyss"
  | "kimbie-dark"
  | "red"
  | "tomorrow-night-blue"
  | "cobalt2"
  | "one-dark-pro"
  | "dracula"
  | "github-dark"
  | "github-light"
  | "nord"
  | "chatbot-pro"
  | "azure"
  | "deep-ocean"
  | "midnight"
  | "radiant";

type ThemeGroup = "VS Code built-in" | "Advanced & classic";

interface ThemeColors {
  mode: "light" | "dark";
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
  border: string;
  destructive: string;
  label: string;
  description: string;
  group: ThemeGroup;
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

const mix = (first: string, second: string, amount: number) => {
  const a = first.match(/[a-f\d]{2}/gi)?.map((part) => parseInt(part, 16)) ?? [0, 0, 0];
  const b = second.match(/[a-f\d]{2}/gi)?.map((part) => parseInt(part, 16)) ?? [0, 0, 0];
  const channels = [0, 1, 2].map((index) =>
    Math.round(a[index] * (1 - amount) + b[index] * amount)
      .toString(16)
      .padStart(2, "0")
  );
  return `#${channels.join("")}`;
};

const isLightColor = (color: string) => {
  const channels = color.match(/[a-f\d]{2}/gi)?.map((part) => parseInt(part, 16)) ?? [0, 0, 0];
  return (channels[0] * 299 + channels[1] * 587 + channels[2] * 114) / 1000 > 145;
};

const defineTheme = (
  group: ThemeGroup,
  mode: "light" | "dark",
  label: string,
  description: string,
  background: string,
  foreground: string,
  primary: string,
  secondary: string,
  accent: string,
  muted: string,
  border: string,
  destructive = mode === "dark" ? "#F07178" : "#C43D4E"
): ThemeColors => ({
  group,
  mode,
  label,
  description,
  background,
  foreground,
  primary,
  secondary,
  accent,
  muted,
  border,
  destructive,
});

export const themePresets: Record<Theme, ThemeColors> = {
  light: defineTheme("VS Code built-in", "light", "Light Mode", "A calm, bright workspace with crisp blue accents", "#F5F8FC", "#182536", "#2878E5", "#E8EFF8", "#168FA7", "#ECF1F7", "#D8E1EC"),
  dark: defineTheme("VS Code built-in", "dark", "Dark Mode", "A midnight workspace with electric blue accents", "#0A111E", "#E8EEF7", "#5B91FF", "#1A2639", "#55D6E8", "#111B2A", "#26364D"),
  "dark-modern": defineTheme("VS Code built-in", "dark", "Dark Modern", "Modern charcoal with clear blue accents", "#181818", "#CCCCCC", "#0078D4", "#333333", "#3794FF", "#252526", "#3C3C3C"),
  "light-modern": defineTheme("VS Code built-in", "light", "Light Modern", "Soft neutral surfaces with blue accents", "#FFFFFF", "#1F1F1F", "#0066B8", "#F3F3F3", "#0078D4", "#F3F3F3", "#D4D4D4"),
  "dark-plus": defineTheme("VS Code built-in", "dark", "Dark+", "The familiar VS Code default dark theme", "#1E1E1E", "#D4D4D4", "#0E639C", "#333333", "#3794FF", "#252526", "#3C3C3C"),
  "light-plus": defineTheme("VS Code built-in", "light", "Light+", "The familiar VS Code default light theme", "#FFFFFF", "#333333", "#0066B8", "#F3F3F3", "#005FB8", "#F3F3F3", "#D4D4D4"),
  "high-contrast": defineTheme("VS Code built-in", "dark", "High Contrast", "Maximum contrast for improved readability", "#000000", "#FFFFFF", "#FFFF00", "#1A1A1A", "#FFFF00", "#101010", "#FFFFFF"),
  "quiet-light": defineTheme("VS Code built-in", "light", "Quiet Light", "A soft light theme with warm paper tones", "#F5F5F5", "#333333", "#4078F2", "#E8E8E8", "#A626A4", "#ECECEC", "#D0D0D0"),
  monokai: defineTheme("VS Code built-in", "dark", "Monokai", "Vivid syntax colors on a warm charcoal base", "#272822", "#F8F8F2", "#A6E22E", "#3E3D32", "#66D9EF", "#34352F", "#49483E"),
  "solarized-dark": defineTheme("VS Code built-in", "dark", "Solarized Dark", "Solarized's balanced deep blue-green palette", "#002B36", "#839496", "#268BD2", "#073642", "#2AA198", "#073642", "#164B55"),
  "solarized-light": defineTheme("VS Code built-in", "light", "Solarized Light", "Solarized's warm, low-glare light palette", "#FDF6E3", "#586E75", "#268BD2", "#EEE8D5", "#2AA198", "#EEE8D5", "#D8D1BD"),
  abyss: defineTheme("VS Code built-in", "dark", "Abyss", "Deep navy surfaces with cool blue highlights", "#000C18", "#6688CC", "#0088CC", "#001F33", "#00A3E0", "#001524", "#123047"),
  "kimbie-dark": defineTheme("VS Code built-in", "dark", "Kimbie Dark", "Earthy brown tones with soft copper accents", "#221A0F", "#D3AF86", "#DC3958", "#362712", "#F79A32", "#2C2115", "#4A3827"),
  red: defineTheme("VS Code built-in", "dark", "Red", "A high-energy dark theme with vivid red accents", "#390000", "#F5DADA", "#FF3333", "#4A1010", "#FF5555", "#481010", "#692323"),
  "tomorrow-night-blue": defineTheme("VS Code built-in", "dark", "Tomorrow Night Blue", "Rich midnight blue with clear, bright text", "#002451", "#FFFFFF", "#BBDAFF", "#00336D", "#82CFFF", "#00305F", "#194A7A"),
  "cobalt2": defineTheme("Advanced & classic", "dark", "Cobalt2", "Saturated blue with golden highlights", "#193549", "#FFFFFF", "#FFC600", "#234E70", "#FF9D00", "#1F405B", "#32617F"),
  "one-dark-pro": defineTheme("Advanced & classic", "dark", "One Dark Pro", "A balanced charcoal palette with crisp syntax accents", "#282C34", "#ABB2BF", "#61AFEF", "#353B45", "#C678DD", "#30343D", "#414752"),
  dracula: defineTheme("Advanced & classic", "dark", "Dracula", "A playful dark palette with violet and pink accents", "#282A36", "#F8F8F2", "#BD93F9", "#343746", "#FF79C6", "#343746", "#44475A"),
  "github-dark": defineTheme("Advanced & classic", "dark", "GitHub Dark", "GitHub's dark neutral palette with blue actions", "#0D1117", "#E6EDF3", "#2F81F7", "#161B22", "#4493F8", "#161B22", "#30363D"),
  "github-light": defineTheme("Advanced & classic", "light", "GitHub Light", "GitHub's clean light palette", "#FFFFFF", "#1F2328", "#0969DA", "#F6F8FA", "#0969DA", "#F6F8FA", "#D1D9E0"),
  nord: defineTheme("Advanced & classic", "dark", "Nord", "Cool arctic blues and soft charcoal surfaces", "#2E3440", "#D8DEE9", "#88C0D0", "#3B4252", "#81A1C1", "#3B4252", "#4C566A"),
  "chatbot-pro": defineTheme("Advanced & classic", "dark", "Chatbot Pro", "ChatPaat's midnight blue and cyan workspace", "#0A111E", "#E8EEF7", "#5B91FF", "#1A2639", "#55D6E8", "#111B2A", "#26364D"),
  azure: defineTheme("Advanced & classic", "dark", "Azure Sky", "A restrained blue-gray palette", "#0D1114", "#E6ECEF", "#80AFC2", "#608B9C", "#A5CAD6", "#1A2327", "#29363B"),
  "deep-ocean": defineTheme("Advanced & classic", "dark", "Quiet Evergreen", "Dark neutrals with a soft green accent", "#0E1211", "#E7ECE9", "#8EB49F", "#678A77", "#B0C8B9", "#1A211D", "#2A3530"),
  midnight: defineTheme("Advanced & classic", "dark", "Monochrome", "A minimal charcoal and silver theme", "#101112", "#ECEEEF", "#B4BBC0", "#899298", "#D0D4D7", "#1C1F21", "#303437"),
  radiant: defineTheme("Advanced & classic", "dark", "Soft Ember", "Warm stone with a subtle copper accent", "#13110F", "#EEEAE5", "#D2A37B", "#B98169", "#E4C2A0", "#211C18", "#38302A"),
};

export const accentColors = [
  { name: "Mist Blue", value: "#A5BEDA" },
  { name: "Soft Blue", value: "#82A9D8" },
  { name: "Sage", value: "#8EB49F" },
  { name: "Silver", value: "#B4BBC0" },
  { name: "Sand", value: "#D2A37B" },
  { name: "Rosewood", value: "#C58F8B" },
  { name: "Slate", value: "#91A0AB" },
  { name: "Sea Glass", value: "#80AFC2" },
];

const isTheme = (value: string | null): value is Theme =>
  value !== null && Object.prototype.hasOwnProperty.call(themePresets, value);

const readStoredPreference = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Unable to read the saved ${key} preference.`, error);
    return null;
  }
};

const readStoredBoolean = (key: string) => readStoredPreference(key) === "true";
const getInitialTheme = (): Theme => {
  const savedTheme = readStoredPreference("theme");
  if (isTheme(savedTheme)) return savedTheme;
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(getInitialTheme);
  const [accentColor, setAccentColor] = useState(() => {
    const savedAccent = readStoredPreference("accentColor");
    if (savedAccent && accentColors.some((color) => color.value === savedAccent)) {
      return savedAccent;
    }
    return themePresets[getInitialTheme()].accent;
  });
  const [highContrast, setHighContrast] = useState(() => readStoredBoolean("highContrast"));
  const [warmPalette, setWarmPalette] = useState(() => readStoredBoolean("warmPalette"));

  useEffect(() => {
    const root = document.documentElement;
    const preset = themePresets[currentTheme];
    const isDark = preset.mode === "dark";
    const background = highContrast ? (isDark ? "#000000" : "#FFFFFF") : preset.background;
    const foreground = highContrast ? (isDark ? "#FFFFFF" : "#000000") : preset.foreground;
    const primary = highContrast
      ? (isDark ? "#FFFF00" : "#0000A8")
      : warmPalette
        ? (isDark ? "#D2A37B" : "#9C4A20")
        : preset.primary;
    const accent = warmPalette
      ? (isDark ? "#E4C2A0" : "#7A3518")
      : accentColor;
    const card = mix(background, foreground, isDark ? 0.035 : 0.025);
    const secondaryForeground = isLightColor(preset.secondary) ? "#161616" : "#FFFFFF";
    const primaryForeground = isLightColor(primary) ? "#161616" : "#FFFFFF";
    const accentForeground = isLightColor(accent) ? "#161616" : "#FFFFFF";
    const mutedForeground = mix(foreground, background, isDark ? 0.48 : 0.5);
    const border = highContrast ? foreground : preset.border;
    const values: Record<string, string> = {
      "--background": background,
      "--foreground": foreground,
      "--card": card,
      "--card-foreground": foreground,
      "--popover": card,
      "--popover-foreground": foreground,
      "--primary": primary,
      "--primary-foreground": primaryForeground,
      "--secondary": preset.secondary,
      "--secondary-foreground": secondaryForeground,
      "--muted": highContrast ? card : preset.muted,
      "--muted-foreground": mutedForeground,
      "--accent": accent,
      "--accent-foreground": accentForeground,
      "--destructive": preset.destructive,
      "--border": border,
      "--input": mix(background, foreground, isDark ? 0.09 : 0.055),
      "--ring": accent,
      "--chart-1": primary,
      "--chart-2": accent,
      "--chart-3": preset.secondary,
      "--chart-4": preset.destructive,
      "--chart-5": preset.accent,
      "--sidebar": mix(background, foreground, isDark ? 0.02 : 0.015),
      "--sidebar-foreground": foreground,
      "--sidebar-primary": primary,
      "--sidebar-primary-foreground": primaryForeground,
      "--sidebar-accent": accent,
      "--sidebar-accent-foreground": accentForeground,
      "--sidebar-border": border,
      "--sidebar-ring": accent,
      "--accent-custom": accent,
      "--high-contrast": highContrast ? "1" : "0",
    };
    Object.entries(values).forEach(([name, value]) => root.style.setProperty(name, value));

    root.classList.toggle("dark", isDark);
    if (highContrast) root.setAttribute("data-high-contrast", "true");
    else root.removeAttribute("data-high-contrast");
    if (warmPalette) root.setAttribute("data-warm-palette", "true");
    else root.removeAttribute("data-warm-palette");

    localStorage.setItem("theme", currentTheme);
    localStorage.setItem("accentColor", accentColor);
    localStorage.setItem("highContrast", JSON.stringify(highContrast));
    localStorage.setItem("warmPalette", JSON.stringify(warmPalette));
  }, [currentTheme, accentColor, highContrast, warmPalette]);

  const setTheme = (theme: Theme) => {
    setCurrentTheme(theme);
    setAccentColor(themePresets[theme].accent);
  };

  const toggleDarkMode = () => {
    setTheme(currentTheme === "light" || themePresets[currentTheme].mode === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        setTheme,
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
