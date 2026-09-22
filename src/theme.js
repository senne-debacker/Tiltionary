// src/theme.js
// Eén plek voor alle kleuren en maten, zodat alle schermen er hetzelfde uitzien.

export const colors = {
  background: "#000",
  surface: "#111",
  surfaceLight: "#1c1c1e",
  surfaceLighter: "#2c2c2e",
  border: "#333",
  text: "#FFF",
  textMuted: "#8e8e93",
  textDim: "#666",
  primary: "#007AFF",
  success: "#34C759",
  danger: "#FF3B30",
  warning: "#FF9500",
  gold: "#FFD60A",
  silver: "#C7C7CC",
  bronze: "#CD7F32",
};

export const INK = colors.primary; // standaardkleur van de getekende lijn

// Kleuren waaruit de tekenaar kan kiezen voor het balletje/de lijn.
export const INK_COLORS = [
  "#007AFF", // blauw
  "#FF3B30", // rood
  "#34C759", // groen
  "#FFD60A", // geel
  "#FF9500", // oranje
  "#AF52DE", // paars
  "#FF2D95", // roze
  "#5AC8FA", // lichtblauw
  "#FFFFFF", // wit
  "#000000", // zwart
];

export const radius = { sm: 10, md: 15, lg: 20 };
