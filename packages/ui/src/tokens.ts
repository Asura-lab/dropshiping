// Design tokens shared across web and mobile.
// Web: CSS variables are generated from these values in globals.css.
// Mobile: use these constants directly in StyleSheet.

export const colors = {
  // Backgrounds
  bgCream: "#f5f4f0",
  bgPaper: "#fafaf8",
  bgStone: "#eeecea",
  bgWarm: "#f0eee9",

  // Accent (coral/brick)
  accent: "#b84a30",
  accentHover: "#9a3d27",
  accentMid: "#d26b52",
  accentSoft: "#f5e2d8",
  accentMist: "#ebc9bb",

  // Text
  ink: "#1c1c1a",
  ink2: "#3a3a37",
  mute: "#6b6b67",
  mute2: "#9a9a95",

  // Borders
  line: "#e2dfd8",
  line2: "#cfcbc2",

  // Semantic
  success: "#15803d",
  successBg: "#dcfce7",
  error: "#dc2626",
  errorBg: "#fee2e2",
  warning: "#a16207",
  warningBg: "#fef9c3",
  info: "#1d4ed8",
  infoBg: "#dbeafe",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 56,
} as const;

export const radius = {
  sm: 2,
  md: 6,
  lg: 10,
  xl: 12,
  full: 999,
} as const;

export const fontSize = {
  xs: 10,
  sm: 11,
  base: 13,
  md: 14,
  lg: 15,
  xl: 18,
  "2xl": 22,
  "3xl": 28,
} as const;

export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};
