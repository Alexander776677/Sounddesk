/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#F7F4EF',
    tint: '#FF7A59',

    // Core surfaces
    background: '#11131A',
    foreground: '#F7F4EF',

    // Cards / elevated surfaces
    card: '#1A1D27',
    cardForeground: '#F7F4EF',

    // Primary action color (buttons, links, active states)
    primary: '#FF7A59',
    primaryForeground: '#11131A',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#232733',
    secondaryForeground: '#F7F4EF',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#20232D',
    mutedForeground: '#9297A6',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#FFC857',
    accentForeground: '#11131A',

    // Destructive actions (delete, error states)
    destructive: '#FF5C6C',
    destructiveForeground: '#FFFFFF',

    // Borders and input outlines
    border: '#2B2F3B',
    input: '#2B2F3B',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 16,
};

export default colors;
