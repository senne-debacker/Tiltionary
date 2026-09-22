// src/constants/theme.ts
// Eén plek voor alle kleuren, maten en schaduwen. De app volgt het systeem:
// Colors.light en Colors.dark hebben exact dezelfde sleutels, zodat elk scherm
// via useTheme() de juiste variant krijgt zonder ergens iets te vergeten.

export const Colors = {
  dark: {
    background: "#0D0A17", // gedempt indigo-zwart i.p.v. puur zwart
    surface: "#161228",
    surfaceLight: "#1F1A35",
    surfaceLighter: "#2B2547",
    border: "#392F5C",
    text: "#F7F5FF",
    textMuted: "#A69BD1",
    textDim: "#6C6293",
    primary: "#8B5CF6", // merkkleur: paars
    accent: "#FF6B6B", // koraal, voor secundaire nadruk
    success: "#2DD4BF",
    danger: "#FB4B4B",
    warning: "#FFB020",
    gold: "#FFD60A",
    silver: "#C7C7CC",
    bronze: "#CD7F32",
  },
  // Geen omkering van het donkere palet: teal, amber en goud zijn op wit veel
  // te licht om als tekst te lezen, dus die worden hier bewust dieper.
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
 * Het tekenvlak volgt BEWUST het thema niet. Een tekening wordt gedeeld tussen
 * spelers die elk een andere systeeminstelling kunnen hebben — als de
 * achtergrond mee zou veranderen, zag dezelfde tekening er bij iedereen anders
 * uit en zou witte inkt bij de één onzichtbaar zijn.
 */
export const canvas = {
  background: "#1F1A35",
  hint: "#A69BD1",
  overlay: "rgba(13,10,23,0.9)",
};

export const INK = "#8B5CF6"; // standaardkleur van de getekende lijn

// Kleuren waaruit de tekenaar kan kiezen voor het balletje/de lijn.
export const INK_COLORS = [
  "#8B5CF6", // paars
  "#FF6B6B", // koraal
  "#2DD4BF", // teal
  "#FFB020", // amber
  "#4C9AFF", // blauw
  "#FF4FD8", // roze
  "#7CE562", // groen
  "#FFE45E", // geel
  "#FFFFFF", // wit
  "#0D0A17", // zwart
];

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const radius = { sm: 12, md: 18, lg: 26, pill: 999 };

// shadowColor/Offset/Opacity/Radius gelden op iOS, elevation op Android.
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
