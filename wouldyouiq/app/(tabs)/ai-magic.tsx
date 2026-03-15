import { useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { ActionButton, Badge, PageHeader, SegmentedControl, Surface } from '@/components/primitives';
import { Layout, isDesktopWidth } from '@/constants/layout';
import { Colors, Fonts } from '@/constants/tokens';
import type { ExpenseDraft, TaskDraft } from '@/domain/models';
import { useAppStore } from '@/domain/store';
import { generateAiMagicSuggestions } from '@/lib/aiMagic';
import { generateTasksWithOpenRouter } from '@/lib/openrouter';

type SourceMode = 'bank' | 'tasks' | 'mixed';

type DraftTaskRow = TaskDraft & {
  id: string;
  selected: boolean;
};

type DraftExpenseRow = ExpenseDraft & {
  id: string;
  selected: boolean;
};

function makeTaskRows(tasks: TaskDraft[]) {
  return tasks.map((draft, index) => ({
    ...draft,
    id: `ai-task-${Date.now()}-${index}`,
    selected: true,
  }));
}

function makeExpenseRows(expenses: ExpenseDraft[]) {
  return expenses.map((draft, index) => ({
    ...draft,
    id: `ai-expense-${Date.now()}-${index}`,
    selected: true,
  }));
}

export default function AiMagicScreen() {
  const { width } = useWindowDimensions();
  const saveTask = useAppStore((state) => state.saveTask);
  const saveExpense = useAppStore((state) => state.saveExpense);
  const showToast = useAppStore((state) => state.showToast);
  const desktop = Platform.OS === 'web' && isDesktopWidth(width);

  const [source, setSource] = useState<SourceMode>('mixed');
  const [ocrText, setOcrText] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [generatedTasks, setGeneratedTasks] = useState<DraftTaskRow[]>([]);
  const [generatedExpenses, setGeneratedExpenses] = useState<DraftExpenseRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const pickImage = () => {
    if (typeof document === 'undefined') {
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImageUri(reader.result);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const generate = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const result = await generateTasksWithOpenRouter({
        source,
        imageUri,
        text: ocrText,
      });

      const taskRows = makeTaskRows(
        result.tasks.map((task) => ({
          ...task,
          ess: source === 'bank' || source === 'mixed' ? true : task.ess,
        })),
      );
      const expenseRows = makeExpenseRows(result.expenses);

      setGeneratedTasks(taskRows);
      setGeneratedExpenses(expenseRows);
      showToast({
        icon: '✨',
        title: 'AI Magic generated imports',
        subtitle: `${expenseRows.length} budget items and ${taskRows.length} tasks ready for review.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'AI Magic could not generate items right now.';
      const fallback = generateAiMagicSuggestions(ocrText, source);
      const taskRows = makeTaskRows(fallback.tasks);
      const expenseRows = makeExpenseRows(fallback.expenses);

      if ((taskRows.length > 0 || expenseRows.length > 0) && (ocrText.trim() || imageUri)) {
        setGeneratedTasks(taskRows);
        setGeneratedExpenses(expenseRows);
        setGenerationError(`${message} Showing local fallback suggestions instead.`);
      } else {
        setGenerationError(message);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const saveSelected = () => {
    const selectedExpenses = generatedExpenses.filter((expense) => expense.selected && expense.n.trim());
    const selectedTasks = generatedTasks.filter((task) => task.selected && task.n.trim());

    selectedExpenses.forEach(({ id, selected, ...draft }) => saveExpense(draft));
    selectedTasks.forEach(({ id, selected, ...draft }) =>
      saveTask({
        ...draft,
        ess: source === 'bank' || source === 'mixed' ? true : draft.ess,
      }),
    );

    showToast({
      icon: '✨',
      title: 'Imported from AI Magic',
      subtitle: `Saved ${selectedExpenses.length} budget items and ${selectedTasks.length} tasks.`,
    });
  };

  return (
    <View style={styles.root}>
      <View style={[styles.content, desktop && styles.contentDesktop]}>
        <PageHeader title="AI Magic ✨" />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Surface style={styles.hero}>
            <Text style={styles.heroEyebrow}>Experimental OCR</Text>
            <Text style={styles.heroTitle}>Turn screenshots into imports</Text>
            <Text style={styles.heroSub}>
              Import a bank statement, a rough to-do list, or any messy source text. AI Magic can draft
              budget items and tasks you can review, edit, and save together.
            </Text>
          </Surface>

          <Surface style={styles.panel}>
            <Text style={styles.panelTitle}>1. Choose your source</Text>
            <SegmentedControl
              items={[
                { label: '🏦 Bank', value: 'bank' },
                { label: '📝 Task List', value: 'tasks' },
                { label: '✨ Mixed', value: 'mixed' },
              ]}
              value={source}
              onChange={setSource}
            />
            {(source === 'bank' || source === 'mixed') && (
              <Text style={styles.helperText}>
                Bank imports can generate recurring budget items and related follow-up tasks. Bank-based tasks
                are marked essential automatically.
              </Text>
            )}

            <View style={[styles.uploadRow, desktop && styles.uploadRowDesktop]}>
              <Surface style={styles.uploadCard}>
                <Text style={styles.uploadTitle}>Photo upload</Text>
                <Text style={styles.uploadSub}>
                  Upload a statement screenshot, banking app image, or receipt summary. AI Magic will pull out
                  both budget items and useful tasks when it can.
                </Text>
                <ActionButton label="Upload Image" tone="primary" onPress={pickImage} />
                {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : null}
              </Surface>

              <Surface style={styles.uploadCard}>
                <Text style={styles.uploadTitle}>OCR text / imported notes</Text>
                <TextInput
                  multiline
                  value={ocrText}
                  onChangeText={setOcrText}
                  placeholder="Paste statement lines, OCR text, or a rough task list here..."
                  placeholderTextColor={Colors.t3}
                  style={styles.textarea}
                />
                <ActionButton
                  label={isGenerating ? 'Generating…' : 'Generate Imports'}
                  tone="primary"
                  onPress={() => {
                    void generate();
                  }}
                />
              </Surface>
            </View>
            {generationError ? <Text style={styles.errorText}>{generationError}</Text> : null}
          </Surface>

          <Surface style={styles.panel}>
              <View style={styles.reviewHeader}>
                <View>
                  <Text style={styles.panelTitle}>2. Review suggested imports</Text>
                  <Text style={styles.reviewSub}>
                    Budget items and tasks are generated separately below so you can edit each before saving.
                  </Text>
                </View>
                <Badge
                  label={`${generatedExpenses.filter((expense) => expense.selected).length + generatedTasks.filter((task) => task.selected).length} selected`}
                  tone="green"
                />
              </View>
              {generatedExpenses.length === 0 ? (
                <Text style={styles.emptyState}>
                  No budget items generated yet. AI Magic will place any expense imports here.
                </Text>
              ) : (
              <View style={styles.generatedList}>
                {generatedExpenses.map((expense) => (
                  <Surface
                    key={expense.id}
                    style={[styles.generatedCard, !expense.selected && styles.generatedCardMuted]}
                  >
                    <View style={styles.generatedTopRow}>
                      <Pressable
                        style={[styles.checkbox, expense.selected && styles.checkboxOn]}
                        onPress={() =>
                          setGeneratedExpenses((current) =>
                            current.map((entry) =>
                              entry.id === expense.id ? { ...entry, selected: !entry.selected } : entry,
                            ),
                          )
                        }
                      />
                      <TextInput
                        value={expense.e}
                        onChangeText={(value) =>
                          setGeneratedExpenses((current) =>
                            current.map((entry) => (entry.id === expense.id ? { ...entry, e: value || '💳' } : entry)),
                          )
                        }
                        style={styles.emojiInput}
                        placeholder="💳"
                        placeholderTextColor={Colors.t3}
                      />
                      <View style={styles.generatedFields}>
                        <TextInput
                          value={expense.n}
                          onChangeText={(value) =>
                            setGeneratedExpenses((current) =>
                              current.map((entry) => (entry.id === expense.id ? { ...entry, n: value } : entry)),
                            )
                          }
                          style={styles.generatedName}
                          placeholder="Budget item name"
                          placeholderTextColor={Colors.t3}
                        />
                        <TextInput
                          value={String(expense.amt || '')}
                          onChangeText={(value) =>
                            setGeneratedExpenses((current) =>
                              current.map((entry) =>
                                entry.id === expense.id
                                  ? { ...entry, amt: Number(value.replace(/[^0-9]/g, '')) || 0 }
                                  : entry,
                              ),
                            )
                          }
                          style={styles.generatedDetail}
                          placeholder="Monthly amount"
                          keyboardType="number-pad"
                          placeholderTextColor={Colors.t3}
                        />
                        <View style={styles.inlineControls}>
                          <SegmentedControl
                            items={[
                              { label: 'Essential', value: 'ess' },
                              { label: 'Flexible', value: 'flex' },
                            ]}
                            value={expense.type}
                            onChange={(value) =>
                              setGeneratedExpenses((current) =>
                                current.map((entry) =>
                                  entry.id === expense.id ? { ...entry, type: value, ess: value === 'ess' } : entry,
                                ),
                              )
                            }
                          />
                        </View>
                      </View>
                      <Pressable
                        style={styles.removeButton}
                        onPress={() =>
                          setGeneratedExpenses((current) => current.filter((entry) => entry.id !== expense.id))
                        }
                      >
                        <Text style={styles.removeLabel}>Remove</Text>
                      </Pressable>
                    </View>
                  </Surface>
                ))}
              </View>
            )}
          </Surface>

          <Surface style={styles.panel}>
              <View style={styles.reviewHeader}>
                <View>
                  <Text style={styles.panelTitle}>3. Review suggested tasks</Text>
                  <Text style={styles.reviewSub}>
                  These are task imports from the same scan. Bank-based tasks are saved as essential by
                  default.
                  </Text>
                </View>
              <Badge label={`${generatedTasks.filter((task) => task.selected).length} selected`} tone="violet" />
            </View>

              {generatedTasks.length === 0 ? (
                <Text style={styles.emptyState}>
                  No tasks generated yet. AI Magic will place any task imports here.
                </Text>
              ) : (
              <View style={styles.generatedList}>
                {generatedTasks.map((task) => (
                  <Surface key={task.id} style={[styles.generatedCard, !task.selected && styles.generatedCardMuted]}>
                    <View style={styles.generatedTopRow}>
                      <Pressable
                        style={[styles.checkbox, task.selected && styles.checkboxOn]}
                        onPress={() =>
                          setGeneratedTasks((current) =>
                            current.map((entry) =>
                              entry.id === task.id ? { ...entry, selected: !entry.selected } : entry,
                            ),
                          )
                        }
                      />
                      <TextInput
                        value={task.e}
                        onChangeText={(value) =>
                          setGeneratedTasks((current) =>
                            current.map((entry) => (entry.id === task.id ? { ...entry, e: value || '✨' } : entry)),
                          )
                        }
                        style={styles.emojiInput}
                        placeholder="✨"
                        placeholderTextColor={Colors.t3}
                      />
                      <View style={styles.generatedFields}>
                        <TextInput
                          value={task.n}
                          onChangeText={(value) =>
                            setGeneratedTasks((current) =>
                              current.map((entry) => (entry.id === task.id ? { ...entry, n: value } : entry)),
                            )
                          }
                          style={styles.generatedName}
                          placeholder="Task name"
                          placeholderTextColor={Colors.t3}
                        />
                        <TextInput
                          value={task.detail ?? ''}
                          onChangeText={(value) =>
                            setGeneratedTasks((current) =>
                              current.map((entry) => (entry.id === task.id ? { ...entry, detail: value } : entry)),
                            )
                          }
                          style={styles.generatedDetail}
                          placeholder="Short detail"
                          placeholderTextColor={Colors.t3}
                        />
                        <View style={styles.taskMetaRow}>
                          <Badge label={task.ess ? 'Essential' : 'Optional'} tone={task.ess ? 'gold' : 'default'} />
                          <Text style={styles.durationLabel}>{task.t}</Text>
                        </View>
                      </View>
                      <Pressable
                        style={styles.removeButton}
                        onPress={() => setGeneratedTasks((current) => current.filter((entry) => entry.id !== task.id))}
                      >
                        <Text style={styles.removeLabel}>Remove</Text>
                      </Pressable>
                    </View>
                  </Surface>
                ))}
              </View>
            )}

            <View style={styles.footerButtons}>
              <ActionButton
                label="Clear"
                onPress={() => {
                  setGeneratedExpenses([]);
                  setGeneratedTasks([]);
                }}
              />
              <ActionButton label="Save Selected Imports" tone="primary" onPress={saveSelected} />
            </View>
          </Surface>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
  },
  contentDesktop: {
    paddingTop: 8,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 120,
    gap: 16,
  },
  hero: {
    padding: 20,
    gap: 10,
  },
  heroEyebrow: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: Colors.gold,
  },
  heroTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.t1,
  },
  heroSub: {
    fontFamily: Fonts.bodyLight,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.t2,
    maxWidth: 760,
  },
  panel: {
    padding: 18,
    gap: 14,
  },
  panelTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.t1,
  },
  helperText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.t2,
  },
  uploadRow: {
    gap: 14,
  },
  uploadRowDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  uploadCard: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  uploadTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 17,
    color: Colors.t1,
  },
  uploadSub: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.t2,
  },
  preview: {
    width: '100%',
    aspectRatio: 1.35,
    borderRadius: 22,
    backgroundColor: Colors.s2,
  },
  textarea: {
    minHeight: 168,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.b2,
    backgroundColor: Colors.s2,
    padding: 18,
    color: Colors.t1,
    textAlignVertical: 'top',
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
  },
  errorText: {
    fontFamily: Fonts.bodyBold,
    color: Colors.red,
    fontSize: 13,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
  },
  reviewSub: {
    marginTop: 4,
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.t2,
    maxWidth: 680,
  },
  emptyState: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.t2,
  },
  generatedList: {
    gap: 12,
  },
  generatedCard: {
    padding: 16,
  },
  generatedCardMuted: {
    opacity: 0.55,
  },
  generatedTopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.b2,
    backgroundColor: Colors.s2,
    marginTop: 8,
  },
  checkboxOn: {
    backgroundColor: Colors.violet,
    borderColor: Colors.violet,
  },
  emojiInput: {
    width: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.b2,
    backgroundColor: Colors.s2,
    paddingVertical: 10,
    textAlign: 'center',
    color: Colors.t1,
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
  },
  generatedFields: {
    flex: 1,
    gap: 10,
  },
  generatedName: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.b2,
    backgroundColor: Colors.s2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.t1,
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
  },
  generatedDetail: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.b2,
    backgroundColor: Colors.s2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.t2,
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  inlineControls: {
    marginTop: 2,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  durationLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.t2,
  },
  removeButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.24)',
    backgroundColor: 'rgba(255,107,107,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  removeLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: '#ff8b8b',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});
