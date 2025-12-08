import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Track if user has ever set a theme preference
  const hasUserSetTheme = useRef(false);

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme") as Theme;
      if (saved) {
        hasUserSetTheme.current = true;
        return saved;
      }
    }
    return "light"; // Default to light, don't auto-detect system
  });

  // Wrapper for setTheme that marks user has made a choice
  const setTheme = (newTheme: Theme) => {
    hasUserSetTheme.current = true;
    setThemeState(newTheme);
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

    localStorage.setItem("theme", theme);
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

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
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
