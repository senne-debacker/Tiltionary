// All colors, sizes and shadows in one place. The app follows the system
// theme. Colors.light and Colors.dark have the same keys, so every screen gets
// the right variant through useTheme().

export const Colors = {
  dark: {
    background: "#0D0A17",
    surface: "#161228",
    surfaceLight: "#1F1A35",
    surfaceLighter: "#2B2547",
    border: "#392F5C",
    text: "#F7F5FF",
    textMuted: "#A69BD1",
    textDim: "#6C6293",
    primary: "#8B5CF6",
    accent: "#FF6B6B",
    success: "#2DD4BF",
    danger: "#FB4B4B",
    warning: "#FFB020",
    gold: "#FFD60A",
    silver: "#C7C7CC",
    bronze: "#CD7F32",
  },
  // Not an inverted dark palette: teal, amber and gold are too light to read
  // on white, so they are darker here.
  light: {
    background: "#FBFAFF",
    surface: "#FFFFFF",
    surfaceLight: "#F3F0FC",
    surfaceLighter: "#E9E3F9",
    border: "#D8CEF0",
    text: "#16112A",
    textMuted: "#5C5280",
    textDim: "#8A80A8",
    primary: "#7C3AED",
    accent: "#E14B4B",
    success: "#0D9488",
    danger: "#DC2626",
    warning: "#B45309",
    gold: "#A87900",
    silver: "#8E8E93",
    bronze: "#8C5A24",
  },
} as const;

export type ThemeName = keyof typeof Colors;
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type Theme = (typeof Colors)[ThemeName];

/**
 * Canvas colors, which do not follow the theme on purpose. Players share one
 * drawing but can have different system themes. A changing background would
 * make white ink invisible for some of them.
 */
export const canvas = {
  background: "#1F1A35",
  hint: "#A69BD1",
  overlay: "rgba(13,10,23,0.9)",
};

/** Default line color. */
export const INK = "#8B5CF6";

/** Ink colors the drawer can pick from. */
export const INK_COLORS = [
  "#8B5CF6",
  "#FF6B6B",
  "#2DD4BF",
  "#FFB020",
  "#4C9AFF",
  "#FF4FD8",
  "#7CE562",
  "#FFE45E",
  "#FFFFFF",
  "#0D0A17",
];

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const radius = { sm: 12, md: 18, lg: 26, pill: 999 };

// The shadow* keys apply on iOS and elevation applies on Android.
export const shadow = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};
