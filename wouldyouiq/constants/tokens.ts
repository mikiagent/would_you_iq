/**
 * WouldYouIQ design tokens — PRD §7
 */
export const Colors = {
  bg: '#07070d',
  s1: '#0f0f1a',
  s2: '#17172a',
  s3: '#1e1e35',
  violet: '#a78bfa',
  v2: '#7c6af7',
  gold: '#f5c842',
  green: '#34d399',
  red: '#f87171',
  cyan: '#22d3ee',
  blue: '#3b82f6',
  redB: '#ef4444',
  t1: '#f1f0f8',
  t2: '#9490b5',
  t3: '#4e4a6a',
  // Calibrate card themes
  challengerBg: '#1f0808',
  challengerBgLight: '#2d0e0e',
  defenderBg: '#080d20',
  defenderBgLight: '#0c1530',
};

export const Fonts = {
  display: 'Unbounded_900Black',
  bodyBold: 'Figtree_800ExtraBold',
  body: 'Figtree_600SemiBold',
  bodyLight: 'Figtree_400Regular',
} as const;

// Fallbacks when custom fonts not loaded (use system)
export const FontsFallback = {
  display: 'System',
  bodyBold: 'System',
  body: 'System',
  bodyLight: 'System',
} as const;
