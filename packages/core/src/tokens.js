// Design tokens — single source of truth for both apps. Rules live in /DESIGN.md.
//
// INVARIANT: every value in `colors` is a 6-digit hex. UI code derives tints by
// appending a 2-digit alpha (e.g. `${colors.accent}60`). Pre-baked translucent
// tints live in `tints` (8-digit) — never concatenate alpha onto those.

/** @type {Record<string, string>} */
export const colors = {
  // Elevation ladder — each step a visible luminance lift.
  bgDeep: "#10131A", // sunken: web header, board canvas
  bg: "#14171F", // page background
  well: "#191D27", // inset: inputs, tracks, nested sub-cards
  surface: "#1E222D", // cards, sheets, pills at rest
  surfaceHi: "#272C3A", // raised interactive: quiz options, pressed states
  border: "#353C4D",

  // Text
  textBright: "#F4F7FC", // headings, emphasized values
  text: "#E8ECF4", // body
  textDim: "#9AA5BC", // secondary
  textFaint: "#6B7690", // captions, placeholders

  // Brand
  accent: "#14B8A6", // focus teal — fills, lines, active states
  accentBright: "#2DD4BF", // glow, active accents, links
  onAccent: "#0F141C", // text/icons on accent or category fills

  // Status
  success: "#22C55E",
  successBright: "#86EFAC",
  danger: "#EF4444",
  dangerBright: "#FCA5A5",
  warning: "#F59E0B",
  warningBright: "#FBBF24",
};

/** Pre-baked translucent tints (8-digit hex). @type {Record<string, string>} */
export const tints = {
  accentSoft: "#14B8A622",
  successSoft: "#22C55E26",
  dangerSoft: "#EF44441F",
  warningSoft: "#F59E0B1A",
};

// Font weights stay as string literals in code ("600" etc.) — React Native's
// fontWeight type only accepts literals, so a string-typed token can't carry them.
export const font = {
  size: { caption: 10, label: 11, small: 12, body: 13, bodyLg: 15, title: 17, heading: 20, display: 28 },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
