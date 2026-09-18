// Shared design tokens (GrowClinic / Cloutrr brand) used by the landing, login
// and audit screens so they match the dashboard exactly.
// Brand palette: white #ffffff · green #17a57e · navy #0a0d31 · black #000000 · gray #7a7676.
export const BG = "#F4F8F7";          // near-white surface (keeps the soft neumorphic look)
export const PRIMARY = "#17a57e";     // brand green
export const PRIMARY_DARK = "#0F7A5C"; // darker green, hover / text on light / gradients
export const PRIMARY_LIGHT = "#E4F3EE"; // light green tint
export const TEXT = "#0a0d31";        // brand navy, headings & body
export const MUTED = "#7a7676";       // brand gray, secondary text
export const WARN = "#F59E0B";
export const DANGER = "#EF4444";
export const INFO_C = "#3B82F6";

// Deep green gradient used for CTA / footer "color blending" (matches cloutrr.com).
export const GRAD_DEEP = "linear-gradient(160deg, #17a57e 0%, #0c6b51 55%, #0a3b2f 100%)";

// White card face + sharper corners for a crisper, slightly 3D look.
export const CARD_BG = "#FFFFFF";
export const CARD_RADIUS = 10; // px — sharper than the old 16px rounding

// Subtle dark-purple tinted page backdrop so white cards separate from it.
// Understated: faint radial glows over a cool off-white, never dominant.
export const PAGE_BG =
  "radial-gradient(1100px 620px at 80% -8%, rgba(67,24,130,0.06), transparent 60%), radial-gradient(900px 520px at 8% 108%, rgba(67,24,130,0.05), transparent 60%), #EDF0F5";

// Neumorphic shadows: keep the soft dual highlight/shadow, but crisper, plus a
// SMALL dark-purple ambient hugging the card's lower edge for slight lift.
export const nm = {
  card: "5px 5px 12px rgba(176,185,201,0.5), -5px -5px 12px #FFFFFF, 0 7px 16px -9px rgba(67,24,130,0.22)",
  sm: "3px 3px 9px rgba(176,185,201,0.45), -3px -3px 9px #FFFFFF, 0 5px 12px -8px rgba(67,24,130,0.16)",
  xs: "2px 2px 6px rgba(176,185,201,0.4), -2px -2px 6px #FFFFFF, 0 3px 8px -6px rgba(67,24,130,0.14)",
  inset: "inset 4px 4px 10px #CBD2D0, inset -4px -4px 10px #FFFFFF",
  insetSm: "inset 2px 2px 6px #CBD2D0, inset -2px -2px 6px #FFFFFF",
  primary: "4px 4px 12px rgba(23,165,126,0.4), -2px -2px 8px rgba(255,255,255,0.9)",
};
