import React, { ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useCloudSync } from '@/components/SyncProvider';
import { isDesktopWidth } from '@/constants/layout';
import { Colors, Fonts, Spacing } from '@/constants/tokens';
import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import { useKeyboardLayout } from '@/lib/useKeyboardLayout';

export function PageHeader({
  title,
  right,
}: {
  title: string;
  right?: ReactNode;
}) {
  const { isSignedIn, isSaving, manualSave, saveLabel, saveState } = useCloudSync();

  return (
    <View style={styles.header}>
      <Text style={styles.pageTitle}>{title}</Text>
      <View style={styles.headerActions}>
        <View
          style={[
            styles.savePill,
            saveState === 'saved'
              ? styles.savePillSaved
              : saveState === 'saving'
              ? styles.savePillSaving
              : saveState === 'error'
              ? styles.savePillError
              : styles.savePillUnsaved,
          ]}
        >
          <Text style={styles.savePillLabel}>{saveLabel}</Text>
        </View>
        <Pressable
          style={[styles.saveButton, (!isSignedIn || isSaving) && styles.saveButtonDisabled]}
          onPress={() => {
            void manualSave();
          }}
          disabled={!isSignedIn || isSaving}
          accessibilityRole="button"
          accessibilityLabel={`Save to cloud. ${saveLabel}`}
          accessibilityState={{ disabled: !isSignedIn || isSaving, busy: isSaving }}
        >
          <Text maxFontSizeMultiplier={1.4} style={styles.saveButtonLabel}>Save</Text>
        </Pressable>
        {right ? <View>{right}</View> : null}
      </View>
    </View>
  );
}

export function Surface({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

export function Badge({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: 'default' | 'violet' | 'gold' | 'green' | 'danger';
}) {
  const toneStyle =
    tone === 'violet'
      ? styles.badgeViolet
      : tone === 'gold'
      ? styles.badgeGold
      : tone === 'green'
      ? styles.badgeGreen
      : tone === 'danger'
      ? styles.badgeDanger
      : null;

  return (
    <View style={[styles.badge, toneStyle]}>
      <Text style={[styles.badgeLabel, tone === 'default' ? null : styles.badgeActiveLabel]}>
        {label}
      </Text>
    </View>
  );
}

export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
}: {
  items: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Pressable
            key={item.value}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(item.value)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ActionButton({
  label,
  onPress,
  tone = 'secondary',
  icon,
  style,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'success';
  icon?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  if (tone === 'primary') {
    return (
      <Pressable disabled={disabled} onPress={onPress} style={[style, disabled && { opacity: 0.45 }]} accessibilityState={{ disabled }} accessibilityRole="button" accessibilityLabel={label}>
        <LinearGradient colors={[Colors.v2, Colors.violet]} style={[styles.button, styles.primary]}>
          {icon ? <Text style={styles.buttonIcon}>{icon}</Text> : null}
          <Text style={styles.primaryLabel}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityState={{ disabled }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.button,
        tone === 'success' ? styles.successButton : styles.secondaryButton,
        style,
        disabled && { opacity: 0.45 },
      ]}
    >
      {icon ? <Text style={styles.buttonIcon}>{icon}</Text> : null}
      <Text style={tone === 'success' ? styles.successLabel : styles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

export function Fab({ onPress, label = 'Add' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable
      style={styles.fabWrap}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <LinearGradient colors={[Colors.v2, Colors.violet]} style={styles.fab}>
        <Text style={styles.fabLabel}>+</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function Sheet({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && isDesktopWidth(width);
  const keyboard = useKeyboardLayout(open);
  const close = () => { Keyboard.dismiss(); onClose(); };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'height' : undefined} style={[styles.sheetBackdrop, desktop && styles.sheetBackdropDesktop, keyboard.frameStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessible={false}
        />
        <View style={[styles.sheet, desktop && styles.sheetDesktop]}>
          <View style={[styles.sheetHandle, desktop && styles.sheetHandleDesktop]} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            {keyboard.visible && (
              <Pressable onPress={Keyboard.dismiss} accessibilityRole="button" accessibilityLabel="Done typing" style={styles.sheetHeaderButton}>
                <Text style={styles.sheetHeaderButtonLabel}>Done</Text>
              </Pressable>
            )}
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={`Close ${title}`} style={styles.sheetHeaderButton}>
              <Text style={styles.sheetHeaderButtonLabel}>✕</Text>
            </Pressable>
          </View>
          <KeyboardAwareScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent}>
            {children}
          </KeyboardAwareScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.t3}
        style={styles.input}
        keyboardType={keyboardType}
        accessibilityLabel={label}
      />
    </View>
  );
}

export function ToggleRow({
  label,
  subtitle,
  active,
  onPress,
}: {
  label: string;
  subtitle: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Pressable
        onPress={onPress}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: active }}
        style={[styles.toggle, active && styles.toggleActive]}
      >
        <View style={[styles.toggleThumb, active && styles.toggleThumbActive]} />
      </Pressable>
    </View>
  );
}

export function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <Surface style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 16,
    paddingHorizontal: Spacing.screen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.t1,
  },
  savePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
  },
  savePillSaved: {
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderColor: 'rgba(52,211,153,0.28)',
  },
  savePillSaving: {
    backgroundColor: 'rgba(167,139,250,0.12)',
    borderColor: 'rgba(167,139,250,0.28)',
  },
  savePillUnsaved: {
    backgroundColor: 'rgba(245,200,66,0.08)',
    borderColor: 'rgba(245,200,66,0.2)',
  },
  savePillError: {
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderColor: 'rgba(248,113,113,0.24)',
  },
  savePillLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.t1,
    letterSpacing: 0.3,
  },
  saveButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.violet,
    backgroundColor: 'rgba(124,106,247,0.18)',
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  saveButtonLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.t1,
  },
  surface: {
    backgroundColor: Colors.s1,
    borderRadius: Spacing.radius,
    borderWidth: 1,
    borderColor: Colors.b1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Spacing.pill,
    borderWidth: 1,
    borderColor: Colors.b2,
    backgroundColor: Colors.s2,
    alignSelf: 'flex-start',
  },
  badgeViolet: {
    backgroundColor: 'rgba(167,139,250,0.14)',
    borderColor: 'rgba(167,139,250,0.28)',
  },
  badgeGold: {
    backgroundColor: 'rgba(245,200,66,0.14)',
    borderColor: 'rgba(245,200,66,0.28)',
  },
  badgeGreen: {
    backgroundColor: 'rgba(52,211,153,0.14)',
    borderColor: 'rgba(52,211,153,0.28)',
  },
  badgeDanger: {
    backgroundColor: 'rgba(248,113,113,0.14)',
    borderColor: 'rgba(248,113,113,0.28)',
  },
  badgeLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.t2,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  badgeActiveLabel: {
    color: Colors.t1,
  },
  segmented: {
    marginHorizontal: Spacing.screen,
    marginBottom: 14,
    padding: 3,
    borderRadius: 16,
    backgroundColor: Colors.s2,
    flexDirection: 'row',
    gap: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
  },
  segmentActive: {
    backgroundColor: Colors.s1,
    borderWidth: 1,
    borderColor: Colors.b2,
  },
  segmentLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.t3,
  },
  segmentLabelActive: {
    color: Colors.t1,
  },
  button: {
    minHeight: 66,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
  },
  primary: {
    shadowColor: Colors.v2,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  secondaryButton: {
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b2,
  },
  successButton: {
    backgroundColor: '#56d68a',
    shadowColor: '#56d68a',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },
  primaryLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: '#fff',
  },
  secondaryLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.t2,
  },
  successLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: '#072514',
  },
  buttonIcon: {
    fontSize: 18,
  },
  fabWrap: {
    position: 'absolute',
    right: Spacing.screen,
    bottom: 110,
    zIndex: 8,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.v2,
    shadowOpacity: 0.5,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
  },
  fabLabel: {
    fontSize: 28,
    lineHeight: 28,
    color: '#fff',
    marginTop: -1,
    minWidth: 24,
    textAlign: 'center',
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetBackdropDesktop: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 84,
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: Colors.s1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: Colors.b2,
    maxHeight: '82%',
  },
  sheetDesktop: {
    width: '34%',
    minWidth: 460,
    maxWidth: 620,
    maxHeight: '70%',
    borderRadius: 28,
    borderWidth: 1,
    borderTopWidth: 1,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.b3,
    marginTop: 12,
    marginBottom: 10,
  },
  sheetHandleDesktop: {
    marginTop: 14,
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 10,
    marginBottom: 8,
    gap: 4,
  },
  sheetTitle: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.t1,
  },
  sheetHeaderButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHeaderButtonLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.violet,
  },
  sheetScroll: {
    flexShrink: 1,
    maxHeight: '100%',
  },
  sheetContent: {
    paddingHorizontal: 18,
    paddingBottom: 28,
    gap: 14,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.t3,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b2,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.t1,
    fontFamily: Fonts.body,
    fontSize: 15,
  },
  toggleRow: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.t1,
  },
  toggleSubtitle: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    color: Colors.t2,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.s4,
    padding: 3,
  },
  toggleActive: {
    backgroundColor: Colors.v2,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  statCard: {
    padding: 14,
    flex: 1,
    minHeight: 110,
  },
  statIcon: {
    fontSize: 22,
    marginBottom: 10,
  },
  statValue: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.t1,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.t2,
    marginTop: 4,
  },
});
