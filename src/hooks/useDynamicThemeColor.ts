import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '../constants/Colors';
import { useTheme } from '../contexts/ThemeContext';

type ColorName = keyof typeof Colors.light & keyof typeof Colors.dark;

export function useDynamicThemeColor(
  props: { light?: string; dark?: string },
  colorName: ColorName
): string {
  const { themeColors, isLoading } = useTheme();
  const systemTheme = useColorScheme() ?? 'light';
  
  // If theme is loading, use system colors as fallback
  if (isLoading) {
    const colorFromProps = props[systemTheme];
    if (colorFromProps) {
      return colorFromProps;
    }
    const fallbackColor = Colors[systemTheme][colorName];
    return fallbackColor;
  }

  // Check if we have a custom theme color for this property
  const themeColorValue = themeColors[colorName as keyof typeof themeColors];
  if (themeColorValue) {
    return themeColorValue;
  }

  // Fallback to props or default colors
  const colorFromProps = props[systemTheme];
  if (colorFromProps) {
    return colorFromProps;
  }

  const defaultColor = Colors[systemTheme][colorName];
  return defaultColor;
}

// Create an alias to maintain backward compatibility
export const useThemeColor = useDynamicThemeColor;