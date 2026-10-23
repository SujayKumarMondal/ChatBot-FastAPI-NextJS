import { useState, useEffect } from "react";
import { useTheme, themePresets, accentColors, Theme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { Moon, Settings, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SettingsPage() {
  const navigate = useNavigate();
  const {
    currentTheme,
    setTheme,
    accentColor,
    setAccentColor,
    highContrast,
    setHighContrast,
    warmPalette,
    setWarmPalette,
  } = useTheme();

  const [fontSize, setFontSize] = useState(localStorage.getItem("fontSize") || "base");
  const [messageDensity, setMessageDensity] = useState(
    localStorage.getItem("messageDensity") || "comfortable"
  );
  const [autoScroll, setAutoScroll] = useState(
    localStorage.getItem("autoScroll") !== "false"
  );
  const [notifications, setNotifications] = useState(
    localStorage.getItem("notifications") !== "false"
  );
  const [soundEnabled, setSoundEnabled] = useState(
    localStorage.getItem("soundEnabled") !== "false"
  );
  const [compactSidebar, setCompactSidebar] = useState(
    localStorage.getItem("compactSidebar") === "true"
  );

  // Initialize data attributes on mount
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-font-size", fontSize);
    root.setAttribute("data-message-density", messageDensity);
  }, [fontSize, messageDensity]);

  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    localStorage.setItem("fontSize", size);
    document.documentElement.setAttribute("data-font-size", size);
  };

  const handleMessageDensityChange = (density: string) => {
    setMessageDensity(density);
    localStorage.setItem("messageDensity", density);
    document.documentElement.setAttribute("data-message-density", density);
  };

  const handleAutoScrollChange = (value: boolean) => {
    setAutoScroll(value);
    localStorage.setItem("autoScroll", String(value));
  };

  const handleNotificationsChange = (value: boolean) => {
    setNotifications(value);
    localStorage.setItem("notifications", String(value));
  };

  const handleSoundChange = (value: boolean) => {
    setSoundEnabled(value);
    localStorage.setItem("soundEnabled", String(value));
  };

  const handleCompactSidebarChange = (value: boolean) => {
    setCompactSidebar(value);
    localStorage.setItem("compactSidebar", String(value));
  };

  return (
    <div className="settings-page min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 sm:px-5 py-2.5">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center rounded-lg p-1.5 hover:bg-muted transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Settings</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 sm:px-5 py-5 space-y-5">
        {/* Theme Section */}
        <section className="space-y-2.5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Moon className="h-4 w-4 text-primary" />
            Theme
          </h2>
          <label htmlFor="appearance-theme" className="sr-only">Choose a color theme</label>
          <select
            id="appearance-theme"
            value={currentTheme}
            onChange={(event) => setTheme(event.target.value as Theme)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {(["VS Code built-in", "Advanced & classic"] as const).map((group) => (
              <optgroup key={group} label={group}>
                {Object.entries(themePresets)
                  .filter(([, theme]) => theme.group === group)
                  .map(([key, theme]) => (
                    <option key={key} value={key}>{theme.label}</option>
                  ))}
              </optgroup>
            ))}
          </select>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {themePresets[currentTheme].description}
          </p>
        </section>

        {/* Accent Color Section */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Accent Color</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {accentColors.map((color) => (
              <button
                key={color.value}
                onClick={() => setAccentColor(color.value)}
                className={`h-9 rounded-lg border-2 transition-transform hover:scale-105 ${
                  accentColor === color.value
                    ? "border-foreground scale-110"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
                aria-label={`Select ${color.name} accent`}
              />
            ))}
          </div>
        </section>

        {/* Accessibility Section */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Accessibility</h3>
          <div className="space-y-2">
            <ToggleOption
              label="High Contrast Mode"
              description="Increases color contrast for better visibility"
              checked={highContrast}
              onChange={setHighContrast}
            />
            <ToggleOption
              label="Warm Color Palette"
              description="Uses warm tones instead of cool tones"
              checked={warmPalette}
              onChange={setWarmPalette}
            />
          </div>
        </section>

        {/* Font Size Section */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Font Size</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "Small", value: "small" },
              { label: "Base", value: "base" },
              { label: "Large", value: "large" },
              { label: "Extra Large", value: "xl" },
            ].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => handleFontSizeChange(value)}
                className={`px-3 py-2 rounded-lg border transition-colors ${
                  fontSize === value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Message Display Section */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Message Display</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { label: "Compact", value: "compact" },
              { label: "Comfortable", value: "comfortable" },
              { label: "Spacious", value: "spacious" },
            ].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => handleMessageDensityChange(value)}
                className={`px-3 py-2 rounded-lg border transition-colors ${
                  messageDensity === value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Chat Behavior Section */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Chat Behavior</h3>
          <div className="space-y-2">
            <ToggleOption
              label="Auto-Scroll to Latest"
              description="Automatically scroll to the latest message"
              checked={autoScroll}
              onChange={handleAutoScrollChange}
            />
            <ToggleOption
              label="Compact Sidebar"
              description="Make sidebar narrower with icon-only view"
              checked={compactSidebar}
              onChange={handleCompactSidebarChange}
            />
          </div>
        </section>

        {/* Notification Settings */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          <div className="space-y-2">
            <ToggleOption
              label="Enable Notifications"
              description="Show desktop notifications for new messages"
              checked={notifications}
              onChange={handleNotificationsChange}
            />
            <ToggleOption
              label="Sound Effects"
              description="Play sound for notifications"
              checked={soundEnabled}
              onChange={handleSoundChange}
              disabled={!notifications}
            />
          </div>
        </section>

        {/* Reset Section */}
        <section className="space-y-2 pt-4 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground">Reset</h3>
          <Button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            variant="outline"
            className="w-full"
          >
            Reset All Settings to Default
          </Button>
        </section>
      </div>
    </div>
  );
}

interface ToggleOptionProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function ToggleOption({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: ToggleOptionProps) {
  return (
    <div
      className={`flex items-center justify-between p-2.5 rounded-lg border border-border ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      <div className="flex-1">
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 rounded cursor-pointer accent-primary"
        aria-label={label}
      />
    </div>
  );
}
