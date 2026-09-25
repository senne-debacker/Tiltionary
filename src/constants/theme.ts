// Design tokens: colors, fonts, sizes and outlines, based on the styleboard.
// The look is flat: four Google-style brand colors with pastel tints, thin
// outlines instead of shadows, and pill-shaped buttons. Colors.light and
// Colors.dark have the same keys, so every screen gets the right variant
// through useTheme().

/** The four brand colors and their pastel tints. Same in light and dark. */
const brand = {
  blue: "#4285F4",
  red: "#EA4335",
  yellow: "#FBBC04",
  green: "#34A853",
  blueSoft: "#C6DAFC",
  redSoft: "#F9CDC8",
  yellowSoft: "#FDE7A6",
  greenSoft: "#C6E8CF",
};

export const Colors = {
  light: {
    ...brand,
    background: "#F3F1EC",
    surface: "#FFFFFF",
    surfaceMuted: "#E7E4DD",
    line: "#1F1F1F",
    text: "#1F1F1F",
    textMuted: "#5F6368",
    textDim: "#8D9096",
    // Brand colors are too light for small text on a light background, so
    // text uses these deeper versions.
    blueText: "#1A73E8",
    redText: "#C5221F",
    yellowText: "#A15C00",
    greenText: "#188038",
  },
  dark: {
    ...brand,
    background: "#1B1B1D",
    surface: "#26272A",
    surfaceMuted: "#35363A",
    line: "#E8EAED",
    text: "#F1F3F4",
    textMuted: "#A9ADB3",
    textDim: "#7A7E85",
    blueText: "#8AB4F8",
    redText: "#F28B82",
    yellowText: "#FDD663",
    greenText: "#81C995",
  },
} as const;

export type ThemeName = keyof typeof Colors;
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type Theme = (typeof Colors)[ThemeName];

/** Brand colors that can fill a button, tile or block. */
export type BrandColor = "blue" | "red" | "yellow" | "green";
export const BRAND_COLORS: BrandColor[] = ["blue", "red", "yellow", "green"];

/** Text color on top of a filled color. Dark text reads best on yellow and green. */
export const ON_COLOR: Record<BrandColor | "ink", string> = {
  blue: "#FFFFFF",
  red: "#FFFFFF",
  yellow: "#1F1F1F",
  green: "#1F1F1F",
  ink: "#FFFFFF",
};

/** Font family per weight. Custom fonts need a family per weight, not fontWeight. */
export const fonts = {
  regular: "GoogleSans_400Regular",
  medium: "GoogleSans_500Medium",
  semibold: "GoogleSans_600SemiBold",
  bold: "GoogleSans_700Bold",
  mono: "GoogleSansCode_500Medium",
};

/**
 * Canvas colors, which do not follow the theme on purpose. Players share one
 * drawing but can have different system themes, and the drawing must look
 * the same for everyone.
 */
export const canvas = {
  background: "#FFFFFF",
  ink: "#1F1F1F",
  hint: "#8D9096",
  overlay: "rgba(31,31,31,0.92)",
};

/** Ink colors the drawer can pick from. The first one is the default. */
export const INK_COLORS = [
  "#4285F4",
  "#EA4335",
  "#FBBC04",
  "#34A853",
  "#FA7B17",
  "#A142F4",
  "#FF63B8",
  "#1F1F1F",
];

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

/** Outline widths. Outlines replace shadows everywhere in the app. */
export const stroke = { thin: 1, regular: 1.5, bold: 2 };
