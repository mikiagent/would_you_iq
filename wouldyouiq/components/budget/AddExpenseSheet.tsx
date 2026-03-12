import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { BudgetItem } from '@/types/models';
import { Colors, Fonts } from '@/constants/tokens';
import { BottomSheet, EmojiPicker, Toggle } from '@/components/ui';

type AddExpenseSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (item: Omit<BudgetItem, 'id'>) => void;
  editItem?: BudgetItem | null;
  onDelete?: (id: string) => void;
};

const EMOJI_OPTIONS = ['🏠', '🍔', '🚗', '📱', '💡', '🛒', '🎬', '✈️', '📚', '💰'];

export function AddExpenseSheet({
  visible,
  onClose,
  onSave,
  editItem,
  onDelete,
}: AddExpenseSheetProps) {
  const isEdit = Boolean(editItem);
  const [emoji, setEmoji] = useState(editItem?.emoji ?? '🏠');
  const [name, setName] = useState(editItem?.name ?? '');
  const [amount, setAmount] = useState(
    editItem ? String(editItem.amountMonthly) : ''
  );
  const [type, setType] = useState<'essential' | 'flex'>(
    editItem?.type ?? 'flex'
  );
  const [essential, setEssential] = useState(editItem?.essential ?? false);

  useEffect(() => {
    if (visible) {
      setEmoji(editItem?.emoji ?? '🏠');
      setName(editItem?.name ?? '');
      setAmount(editItem ? String(editItem.amountMonthly) : '');
      setType(editItem?.type ?? 'flex');
      setEssential(editItem?.essential ?? false);
    }
  }, [visible, editItem]);

  const handleSave = () => {
    const trimmed = name.trim();
    const num = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!trimmed || isNaN(num) || num < 0) return;
    onSave({
      emoji,
      name: trimmed,
      amountMonthly: num,
      type,
      essential,
    });
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={isEdit ? 'Edit expense' : 'Add expense'}
      showHandle
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}
      >
        <Text style={styles.label}>Emoji</Text>
        <EmojiPicker selected={emoji} onSelect={setEmoji} />
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Rent"
          placeholderTextColor={Colors.t3}
        />
        <Text style={styles.label}>Monthly amount ($)</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="decimal-pad"
          placeholderTextColor={Colors.t3}
        />
        <Text style={styles.label}>Type</Text>
        <View style={styles.typeRow}>
          <Pressable
            style={[styles.typeChip, type === 'essential' && styles.typeChipActive]}
            onPress={() => setType('essential')}
          >
            <Text
              style={[
                styles.typeLabel,
                type === 'essential' && styles.typeLabelActive,
              ]}
            >
              Essential
            </Text>
          </Pressable>
          <Pressable
            style={[styles.typeChip, type === 'flex' && styles.typeChipActive]}
            onPress={() => setType('flex')}
          >
            <Text
              style={[styles.typeLabel, type === 'flex' && styles.typeLabelActive]}
            >
              Flexible
            </Text>
          </Pressable>
        </View>
        <Toggle
          label="⭐ Essential (excluded from alignment)"
          value={essential}
          onValueChange={setEssential}
        />
        <View style={styles.actions}>
          {isEdit && onDelete && editItem && (
            <Pressable
              style={styles.deleteBtn}
              onPress={() => {
                onDelete(editItem.id);
                onClose();
              }}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          )}
          <View style={styles.rightActions}>
            <Pressable style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.saveBtn,
                (!name.trim() || !amount || isNaN(parseFloat(amount))) &&
                  styles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={
                !name.trim() || !amount || isNaN(parseFloat(amount)) ||
                parseFloat(amount) < 0
              }
            >
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  label: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.t2,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.s2,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.t1,
  },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  typeChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.s2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeChipActive: {
    borderColor: Colors.violet,
    backgroundColor: Colors.violet + '25',
  },
  typeLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.t2,
  },
  typeLabelActive: { color: Colors.violet },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
  },
  deleteBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  deleteText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.red,
  },
  rightActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.s2,
  },
  cancelText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.t2,
  },
  saveBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: Colors.violet,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.bg,
  },
});
