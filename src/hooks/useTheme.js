import { useState, useLayoutEffect, useCallback } from "react";

const STORAGE_KEY = "xray-theme";
const LIGHT_CLASS = "light-mode";

function readStoredIsDark() {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light") return false;
  if (stored === "dark") return true;
  return true;
}

/** Sync class on <html> before first React paint when possible */
function applyThemeClass(isDark) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  if (isDark) el.classList.remove(LIGHT_CLASS);
  else el.classList.add(LIGHT_CLASS);
}

export function useTheme() {
  const [isDark, setIsDark] = useState(readStoredIsDark);

  useLayoutEffect(() => {
    applyThemeClass(isDark);
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
      return next;
    });
  }, []);

  return {
    isDark,
    theme: isDark ? "dark" : "light",
    toggleTheme,
  };
}
