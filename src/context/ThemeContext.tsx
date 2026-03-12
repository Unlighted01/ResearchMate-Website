import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";

type Theme = "light" | "dark" | "system";
type VisualTheme = "minimalist" | "bubble" | "glass";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  visualTheme: VisualTheme;
  setVisualTheme: (theme: VisualTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const COLOR_THEME_KEY = "theme";
const VISUAL_THEME_KEY = "visualTheme";
const validColorThemes: Theme[] = ["light", "dark", "system"];
const validVisualThemes: VisualTheme[] = ["minimalist", "bubble", "glass"];

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
    return "light"; // Default to light, don't auto-detect system
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
    // Only apply theme if user has explicitly set one
    if (!hasUserSetTheme.current) {
      return;
    }

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem(COLOR_THEME_KEY, theme);
  }, [theme]);

  // Listen for system preference changes (only when theme is "system")
  useEffect(() => {
    if (theme !== "system" || !hasUserSetTheme.current) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(mediaQuery.matches ? "dark" : "light");
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
      value={{ theme, setTheme, visualTheme, setVisualTheme }}
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
