// src/theme.js
// Eén plek voor alle kleuren, maten en schaduwen, zodat alle schermen
// dezelfde visuele taal spreken. Verander je hier iets, dan verandert de
// hele app mee.

export const colors = {
  background: "#0D0A17", // gedempt indigo-zwart i.p.v. puur zwart
  surface: "#161228",
  surfaceLight: "#1F1A35",
  surfaceLighter: "#2B2547",
  border: "#392F5C",
  text: "#F7F5FF",
  textMuted: "#A69BD1",
  textDim: "#6C6293",
  primary: "#8B5CF6", // merkkleur: paars
  accent: "#FF6B6B", // koraal, voor secundaire nadruk/CTA's
  success: "#2DD4BF",
  danger: "#FB4B4B",
  warning: "#FFB020",
  gold: "#FFD60A",
  silver: "#C7C7CC",
  bronze: "#CD7F32",
};

export const INK = colors.primary; // standaardkleur van de getekende lijn

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
