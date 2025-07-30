import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Appearance, ColorSchemeName } from "react-native";
import { ColorScheme, theme, ThemeColors } from "../theme";

interface ThemeContextType {
  colorScheme: ColorScheme;
  colors: ThemeColors;
  toggleTheme: () => void;
  theme: typeof theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [colorScheme, setColorScheme] = useState<ColorScheme>("light");

  useEffect(() => {
    // Get initial color scheme
    const initialScheme = Appearance.getColorScheme();
    setColorScheme(initialScheme === "dark" ? "dark" : "light");

    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(
      ({ colorScheme: newColorScheme }: { colorScheme: ColorSchemeName }) => {
        setColorScheme(newColorScheme === "dark" ? "dark" : "light");
      }
    );

    return () => subscription?.remove();
  }, []);

  const toggleTheme = () => {
    setColorScheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const colors = theme.colors[colorScheme];

  const value: ThemeContextType = {
    colorScheme,
    colors,
    toggleTheme,
    theme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
