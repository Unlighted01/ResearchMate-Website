import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";

export type Theme = "light" | "dark" | "system";
export type VisualTheme = "minimalist" | "glass" | "bubble";

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  visualTheme: VisualTheme;
  setVisualTheme: (theme: VisualTheme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const COLOR_THEME_KEY = "theme";
const VISUAL_THEME_KEY = "visualTheme";
const validColorThemes: Theme[] = ["light", "dark", "system"];
const validVisualThemes: VisualTheme[] = ["minimalist", "glass", "bubble"];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Track if user has ever set a theme preference
  const hasUserSetTheme = useRef(false);

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(COLOR_THEME_KEY) as Theme | null;
      if (saved && validColorThemes.includes(saved)) {
        hasUserSetTheme.current = true;
        return saved;
      }
    }
    return "light"; // Default to light
  });
  const [visualTheme, setVisualThemeState] = useState<VisualTheme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(VISUAL_THEME_KEY) as VisualTheme | null;
      if (saved && validVisualThemes.includes(saved)) {
        return saved;
      }
    }
    return "minimalist";
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (theme === "dark") return true;
    if (theme === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Wrapper for setTheme that marks user has made a choice
  const setTheme = (newTheme: Theme) => {
    hasUserSetTheme.current = true;
    setThemeState(newTheme);
  };
  const setVisualTheme = (newTheme: VisualTheme) => {
    setVisualThemeState(newTheme);
  };

  // Apply theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    let currentIsDark = false;
    if (theme === "system") {
      currentIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(currentIsDark ? "dark" : "light");
      root.setAttribute("data-theme", currentIsDark ? "dark" : "light");
    } else {
      currentIsDark = theme === "dark";
      root.classList.add(theme);
      root.setAttribute("data-theme", theme);
    }
    setIsDark(currentIsDark);

    if (hasUserSetTheme.current) {
      localStorage.setItem(COLOR_THEME_KEY, theme);
    }
  }, [theme]);

  // Listen for system preference changes (only when theme is "system")
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const root = window.document.documentElement;
      const darkPref = mediaQuery.matches;
      root.classList.remove("light", "dark");
      root.classList.add(darkPref ? "dark" : "light");
      root.setAttribute("data-theme", darkPref ? "dark" : "light");
      setIsDark(darkPref);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // Apply visual theme globally
  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute("data-ui-theme", visualTheme);
    localStorage.setItem(VISUAL_THEME_KEY, visualTheme);
  }, [visualTheme]);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, visualTheme, setVisualTheme, isDark }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
