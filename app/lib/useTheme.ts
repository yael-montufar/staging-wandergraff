import { useState, useEffect } from "react";

const colorSchemes = {
  light: {
    name: "Urban - Light",
    primaryBg: "#E7E7E7",
    text: "#0E0E0E",
    secondaryBg: "#F0F0F0",
    divider: "#919191",
    accent: "#D24E47",
  },
  dark: {
    name: "Urban - Dark",
    primaryBg: "#1A1A1A",
    text: "#F5F5F5",
    secondaryBg: "#262626",
    divider: "#505050",
    accent: "#D24E47",
  },
} as const;

type SchemeKey = "light" | "dark";

const getInitialScheme = (): SchemeKey => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("wandergraff-theme");
    if (stored === "light" || stored === "dark") {
      return stored;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
};

export function useTheme() {
  const [selectedScheme, setSelectedScheme] = useState<SchemeKey>(() => {
    if (typeof window === "undefined") return "light";
    return getInitialScheme();
  });
  const [isMounted, setIsMounted] = useState(false);

  const scheme = colorSchemes[selectedScheme];
  const noiseColor = selectedScheme === "light" ? "E7E7E7" : "1A1A1A";

  useEffect(() => {
    setIsMounted(true);

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.theme) {
        setSelectedScheme(customEvent.detail.theme);
      }
    };

    window.addEventListener("wandergraff-theme-change", handleThemeChange);
    return () => window.removeEventListener("wandergraff-theme-change", handleThemeChange);
  }, []);

  return {
    selectedScheme,
    scheme,
    noiseColor,
    isMounted,
  };
}
