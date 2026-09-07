import { useEffect, useState } from 'react';
import { Keyboard, Platform, type ViewStyle } from 'react-native';

import { keyboardViewport } from '@/domain/keyboard';

export function useKeyboardLayout(enabled = true) {
  const [visible, setVisible] = useState(false);
  const [webFrame, setWebFrame] = useState<ViewStyle>();

  useEffect(() => {
    if (!enabled) return;
    if (Platform.OS !== 'web') {
      setVisible(Keyboard.isVisible());
      const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true));
      const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false));
      return () => { show.remove(); hide.remove(); };
    }
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const viewport = window.visualViewport;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const active = document.activeElement;
        const editable = active instanceof HTMLTextAreaElement ||
          (active instanceof HTMLInputElement && !['button', 'checkbox', 'radio', 'submit', 'range'].includes(active.type)) ||
          (active instanceof HTMLElement && active.isContentEditable);
        const next = keyboardViewport({
          layoutHeight: window.innerHeight,
          visualHeight: viewport.height,
          offsetTop: viewport.offsetTop,
          scale: viewport.scale,
          editableFocused: editable,
        });
        setVisible(next.visible);
        setWebFrame(next.visible ? { position: 'absolute', left: 0, right: 0, top: next.top, height: next.height, flex: 0 } : undefined);
      });
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, [enabled]);

  return { visible: enabled && visible, frameStyle: enabled ? webFrame : undefined };
}
