export const Layout = {
  desktopBreakpoint: 1024,
  appMaxWidth: 1480,
  contentMaxWidth: 1200,
  readingMaxWidth: 980,
  narrowMaxWidth: 860,
} as const;

export function isDesktopWidth(width: number) {
  return width >= Layout.desktopBreakpoint;
}
