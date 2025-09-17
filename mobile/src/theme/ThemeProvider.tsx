import React, { PropsWithChildren, createContext, useContext, useMemo } from 'react';
import { ColorSchemeName, useColorScheme as useRNColorScheme } from 'react-native';
import { darkColors, lightColors } from './colors';

export type Theme = {
  colorScheme: ColorSchemeName;
  colors: typeof lightColors;
  spacing: (factor: number) => number;
  radii: {
    sm: number;
    md: number;
    lg: number;
  };
  typography: {
    title: {
      fontSize: number;
      fontWeight: '600' | '700';
    };
    subtitle: {
      fontSize: number;
      fontWeight: '500';
    };
    body: {
      fontSize: number;
      fontWeight: '400';
    };
    small: {
      fontSize: number;
      fontWeight: '400';
    };
  };
};

const ThemeContext = createContext<Theme | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
  const scheme = useRNColorScheme() ?? 'light';

  const value = useMemo<Theme>(() => {
    const colors = scheme === 'dark' ? darkColors : lightColors;
    return {
      colorScheme: scheme,
      colors,
      spacing: (factor: number) => factor * 8,
      radii: {
        sm: 8,
        md: 12,
        lg: 16
      },
      typography: {
        title: {
          fontSize: 24,
          fontWeight: '700'
        },
        subtitle: {
          fontSize: 18,
          fontWeight: '500'
        },
        body: {
          fontSize: 16,
          fontWeight: '400'
        },
        small: {
          fontSize: 13,
          fontWeight: '400'
        }
      }
    };
  }, [scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
