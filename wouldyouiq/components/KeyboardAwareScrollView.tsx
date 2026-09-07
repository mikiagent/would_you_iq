import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { Keyboard, Platform, ScrollView, TextInput, type ScrollViewProps } from 'react-native';

import { focusedInputScrollOffset } from '@/domain/keyboard';
import { useReducedMotion } from '@/lib/useReducedMotion';

// The parent resizes for the keyboard. This keeps the newly focused field in
// that smaller viewport, including when switching fields with the keyboard open.
export const KeyboardAwareScrollView = forwardRef<ScrollView, ScrollViewProps>(function KeyboardAwareScrollView({
  onFocus, onBlur, onLayout, onScroll, onContentSizeChange, ...props
}, forwardedRef) {
  const scrollRef = useRef<ScrollView>(null);
  const focusedInput = useRef<ReturnType<typeof TextInput.State.currentlyFocusedInput> | null>(null);
  const offset = useRef(0);
  const pendingFrame = useRef(0);
  const reduceMotion = useReducedMotion();
  useImperativeHandle(forwardedRef, () => scrollRef.current!);

  const revealInput = useCallback(() => {
    cancelAnimationFrame(pendingFrame.current);
    pendingFrame.current = requestAnimationFrame(() => {
      const input = focusedInput.current;
      if (!input || input !== TextInput.State.currentlyFocusedInput()) return;
      if (Platform.OS === 'web') {
        if (input instanceof HTMLElement) input.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
        return;
      }
      scrollRef.current?.getNativeScrollRef()?.measureInWindow((_x: number, viewportTop: number, _width: number, viewportHeight: number) => {
        input.measureInWindow((_inputX, inputTop, _inputWidth, inputHeight) => {
          if (input !== TextInput.State.currentlyFocusedInput()) return;
          const next = focusedInputScrollOffset({ scrollOffset: offset.current, viewportTop, viewportHeight, inputTop, inputHeight });
          if (Math.abs(next - offset.current) > 1) scrollRef.current?.scrollTo({ y: next, animated: !reduceMotion });
        });
      });
    });
  }, [reduceMotion]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', revealInput);
    return () => { show.remove(); cancelAnimationFrame(pendingFrame.current); };
  }, [revealInput]);

  return (
    <ScrollView
      {...props}
      ref={scrollRef}
      keyboardShouldPersistTaps={props.keyboardShouldPersistTaps ?? 'handled'}
      keyboardDismissMode={props.keyboardDismissMode ?? (Platform.OS === 'ios' ? 'interactive' : 'on-drag')}
      scrollEventThrottle={props.scrollEventThrottle ?? 16}
      onFocus={(event) => { focusedInput.current = TextInput.State.currentlyFocusedInput(); revealInput(); onFocus?.(event); }}
      onBlur={(event) => { focusedInput.current = null; onBlur?.(event); }}
      onLayout={(event) => { onLayout?.(event); revealInput(); }}
      onScroll={(event) => { offset.current = event.nativeEvent.contentOffset.y; onScroll?.(event); }}
      onContentSizeChange={(width, height) => { onContentSizeChange?.(width, height); revealInput(); }}
    />
  );
});

export function renderKeyboardAwareScrollView(props: ScrollViewProps) {
  return <KeyboardAwareScrollView {...props} />;
}
