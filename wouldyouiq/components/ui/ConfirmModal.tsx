import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts } from '@/constants/tokens';

type ConfirmModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  icon?: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
};

export function ConfirmModal({
  visible,
  onClose,
  title,
  subtitle,
  icon = '↩️',
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: ConfirmModalProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 430);
  const paddingBottom = Math.max(insets.bottom, 16) + 8;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.bg} onPress={onClose}>
        <Pressable
          style={[
            styles.box,
            { paddingBottom, maxWidth },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={styles.buttons}>
            <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onSecondary}>
              <Text style={styles.btnSecondaryText}>{secondaryLabel}</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onPrimary}>
              <Text style={styles.btnPrimaryText}>{primaryLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  box: {
    width: '100%',
    backgroundColor: Colors.s1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.b2,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  icon: {
    fontSize: 38,
    marginBottom: 10,
  },
  title: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 6,
    color: Colors.t1,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.t2,
    marginBottom: 20,
    lineHeight: 22,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondary: {
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b2,
  },
  btnSecondaryText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.t2,
  },
  btnPrimary: {
    background: `linear-gradient(135deg, ${Colors.v2}, ${Colors.violet})`,
    backgroundColor: Colors.violet,
  },
  btnPrimaryText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: '#fff',
  },
});
