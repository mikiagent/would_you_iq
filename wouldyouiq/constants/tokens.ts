/**
 * WouldYouIQ design tokens — PRD §7, v9 parity
 */
export const Colors = {
  bg: '#07070d',
  s1: '#0e0e1c',
  s2: '#15152a',
  s3: '#1c1c38',
  b1: 'rgba(255,255,255,0.055)',
  b2: 'rgba(255,255,255,0.1)',
  b3: 'rgba(255,255,255,0.18)',
  violet: '#a78bfa',
  v2: '#7c6af7',
  v3: '#6254e0',
  gold: '#f5c842',
  gold2: '#ff9f43',
  green: '#34d399',
  green2: '#10b981',
  red: '#f87171',
  cyan: '#22d3ee',
  blue: '#3b82f6',
  redB: '#ef4444',
  t1: '#f1f0f8',
  t2: '#9490b5',
  t3: '#4e4a6a',
  t4: '#2e2e52',
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
