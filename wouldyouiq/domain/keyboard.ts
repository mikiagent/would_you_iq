// Keep the field inside the available scroll area without jumping to the top.
export function focusedInputScrollOffset({
  scrollOffset, viewportTop, viewportHeight, inputTop, inputHeight, gap = 12,
}: {
  scrollOffset: number;
  viewportTop: number;
  viewportHeight: number;
  inputTop: number;
  inputHeight: number;
  gap?: number;
}) {
  const top = viewportTop + gap;
  const bottom = viewportTop + viewportHeight - gap;
  if (inputHeight > bottom - top || inputTop < top) {
    return Math.max(0, scrollOffset + inputTop - top);
  }
  if (inputTop + inputHeight > bottom) {
    return Math.max(0, scrollOffset + inputTop + inputHeight - bottom);
  }
  return scrollOffset;
}

export function keyboardViewport({
  layoutHeight, visualHeight, offsetTop, scale, editableFocused,
}: {
  layoutHeight: number;
  visualHeight: number;
  offsetTop: number;
  scale: number;
  editableFocused: boolean;
}) {
  // Browser chrome and pinch zoom are not a software keyboard.
  const visible = editableFocused && Math.abs(scale - 1) < 0.01 &&
    layoutHeight - visualHeight > 100;
  return visible
    ? { visible, height: visualHeight, top: Math.max(0, offsetTop) }
    : { visible: false, height: layoutHeight, top: 0 };
}
