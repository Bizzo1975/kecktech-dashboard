"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Get initial theme from localStorage or system preference
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    const initialTheme = storedTheme || "system";
    setTheme(initialTheme);
    updateTheme(initialTheme);
  }, []);

  const updateTheme = (newTheme: Theme) => {
    const root = window.document.documentElement;
    
    if (newTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.remove("light", "dark");
      root.classList.add(systemTheme);
      setResolvedTheme(systemTheme);
    } else {
      root.classList.remove("light", "dark");
      root.classList.add(newTheme);
      setResolvedTheme(newTheme);
    }
  };

  const setThemeValue = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    updateTheme(newTheme);
  };

  return {
    theme,
    resolvedTheme,
    setTheme: setThemeValue,
  };
}

