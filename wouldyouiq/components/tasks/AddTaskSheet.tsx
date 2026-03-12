import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { Task } from '@/types/models';
import { Colors, Fonts } from '@/constants/tokens';
import { BottomSheet, EmojiPicker, Toggle } from '@/components/ui';

type DeadlineOption = 'none' | 'today' | 'this week';

type AddTaskSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id' | 'elo' | 'done' | 'createdAt'>) => void;
  editTask?: Task | null;
  onDelete?: (id: string) => void;
};

export function AddTaskSheet({
  visible,
  onClose,
  onSave,
  editTask,
  onDelete,
}: AddTaskSheetProps) {
  const isEdit = Boolean(editTask);
  const [emoji, setEmoji] = useState(editTask?.emoji ?? '📋');
  const [name, setName] = useState(editTask?.name ?? '');
  const [timeEstimate, setTimeEstimate] = useState(editTask?.timeEstimate ?? '');
  const [deadline, setDeadline] = useState<DeadlineOption>(
    editTask?.deadline ?? 'none'
  );
  const [essential, setEssential] = useState(editTask?.essential ?? false);

  useEffect(() => {
    if (visible) {
      setEmoji(editTask?.emoji ?? '📋');
      setName(editTask?.name ?? '');
      setTimeEstimate(editTask?.timeEstimate ?? '');
      setDeadline(editTask?.deadline ?? 'none');
      setEssential(editTask?.essential ?? false);
    }
  }, [visible, editTask]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      emoji,
      name: trimmed,
      timeEstimate: timeEstimate.trim(),
      essential,
      deadline: deadline === 'none' ? null : deadline,
      urgency:
        deadline === 'today' ? 'high' : deadline === 'this week' ? 'med' : 'low',
    });
    reset();
    onClose();
  };

  const reset = () => {
    setEmoji('📋');
    setName('');
    setTimeEstimate('');
    setDeadline('none');
    setEssential(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDelete = () => {
    if (editTask && onDelete) {
      onDelete(editTask.id);
      reset();
      onClose();
    }
  };

  const deadlineOptions: { value: DeadlineOption; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'today', label: 'Today' },
    { value: 'this week', label: 'This week' },
  ];

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={isEdit ? 'Edit task' : 'Add task'}
      showHandle
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}
      >
        <Text style={styles.label}>Emoji</Text>
        <EmojiPicker selected={emoji} onSelect={setEmoji} />
        <Text style={styles.label}>Task name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Ship feature"
          placeholderTextColor={Colors.t3}
        />
        <Text style={styles.label}>Time estimate</Text>
        <TextInput
          style={styles.input}
          value={timeEstimate}
          onChangeText={setTimeEstimate}
          placeholder="e.g. 30 min"
          placeholderTextColor={Colors.t3}
        />
        <Text style={styles.label}>Deadline</Text>
        <View style={styles.deadlineRow}>
          {deadlineOptions.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.deadlineChip,
                deadline === opt.value && styles.deadlineChipActive,
              ]}
              onPress={() => setDeadline(opt.value)}
            >
              <Text
                style={[
                  styles.deadlineLabel,
                  deadline === opt.value && styles.deadlineLabelActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Toggle
          label="⭐ Essential (pinned to top)"
          value={essential}
          onValueChange={setEssential}
        />
        <View style={styles.actions}>
          {isEdit && onDelete && (
            <Pressable style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          )}
          <View style={styles.rightActions}>
            <Pressable style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!name.trim()}
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
  content: {
    paddingBottom: 24,
  },
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
  deadlineRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  deadlineChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.s2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  deadlineChipActive: {
    borderColor: Colors.violet,
    backgroundColor: Colors.violet + '25',
  },
  deadlineLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.t2,
  },
  deadlineLabelActive: {
    color: Colors.violet,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
  },
  deleteBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  deleteText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.red,
  },
  rightActions: {
    flexDirection: 'row',
    gap: 12,
  },
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
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.bg,
  },
});
