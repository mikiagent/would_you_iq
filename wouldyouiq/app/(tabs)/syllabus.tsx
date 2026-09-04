import * as AppleAuthentication from 'expo-apple-authentication';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { useCloudSync } from '@/components/SyncProvider';
import { ActionButton, Badge, PageHeader, Sheet, Surface } from '@/components/primitives';
import { Layout, isDesktopWidth } from '@/constants/layout';
import { Links } from '@/constants/links';
import { Colors, Fonts } from '@/constants/tokens';
import { useAppStore } from '@/domain/store';
import { getAiConsent, grantAiConsent } from '@/lib/aiConsent';
import {
  MAX_SYLLABUS_FILE_BYTES,
  assignmentToTaskDraft,
  extractAssignments,
  formatDueDate,
  type ExtractedAssignment,
  type SyllabusSourceKind,
} from '@/lib/syllabus';

type AssignmentRow = ExtractedAssignment & {
  id: string;
  selected: boolean;
};

type PendingSource = {
  kind: SyllabusSourceKind;
  data: string;
  filename?: string;
  label: string;
};

function makeAssignmentRows(assignments: ExtractedAssignment[]): AssignmentRow[] {
  return assignments.map((assignment, index) => ({
    ...assignment,
    id: `syllabus-${Date.now()}-${index}`,
    selected: true,
  }));
}

export default function SyllabusScreen() {
  const { width } = useWindowDimensions();
  const saveTask = useAppStore((state) => state.saveTask);
  const showToast = useAppStore((state) => state.showToast);
  const {
    isSignedIn,
    isCloudConfigured,
    isAppleSignInAvailable,
    signInWithApple,
    signInWithGoogle,
  } = useCloudSync();
  const desktop = Platform.OS === 'web' && isDesktopWidth(width);

  const [pastedText, setPastedText] = useState('');
  const [pickedSource, setPickedSource] = useState<PendingSource | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [consentSheetOpen, setConsentSheetOpen] = useState(false);
  const [pendingAfterConsent, setPendingAfterConsent] = useState<PendingSource | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      setHasConsent(false);
      return;
    }

    getAiConsent().then((record) => setHasConsent(!!record));
  }, [isSignedIn]);

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_SYLLABUS_FILE_BYTES) {
      setExtractionError('That PDF is larger than 5 MB. Try a smaller file or photograph the relevant page.');
      return;
    }
    try {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setExtractionError(null);
      setPickedSource({
        kind: 'pdf',
        data: base64,
        filename: asset.name ?? 'syllabus.pdf',
        label: asset.name ?? 'Selected PDF',
      });
    } catch {
      setExtractionError('Could not read that file. Try again.');
    }
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    const asset = result.assets[0];
    if (asset.base64!.length * 0.75 > MAX_SYLLABUS_FILE_BYTES) {
      setExtractionError('That photo is too large. Try a smaller image.');
      return;
    }
    setExtractionError(null);
    setPickedSource({
      kind: 'image',
      data: asset.base64!,
      label: asset.fileName ?? 'Selected photo',
    });
  };

  const runExtraction = async (source: PendingSource) => {
    setIsExtracting(true);
    setExtractionError(null);
    try {
      const extracted = await extractAssignments({
        kind: source.kind,
        data: source.data,
        filename: source.filename,
      });
      if (extracted.length === 0) {
        setExtractionError('No assignments were found in that syllabus. Try a clearer file or paste the schedule text.');
        return;
      }
      setAssignments(makeAssignmentRows(extracted));
      showToast({
        icon: '📚',
        title: 'Assignments extracted',
        subtitle: `${extracted.length} assignments ready for review.`,
      });
    } catch (error) {
      setExtractionError(
        error instanceof Error ? error.message : 'Syllabus import failed. Try again.',
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const startExtraction = () => {
    const source: PendingSource | null = pickedSource
      ? pickedSource
      : pastedText.trim()
      ? { kind: 'text', data: pastedText.trim(), label: 'Pasted text' }
      : null;

    if (!source) {
      setExtractionError('Pick a PDF or photo, or paste your syllabus text first.');
      return;
    }

    if (!hasConsent) {
      setPendingAfterConsent(source);
      setConsentSheetOpen(true);
      return;
    }

    void runExtraction(source);
  };

  const saveSelected = () => {
    const selected = assignments.filter((assignment) => assignment.selected && assignment.title.trim());
    selected.forEach((assignment) => {
      saveTask(assignmentToTaskDraft(assignment));
    });
    setAssignments((current) => current.filter((assignment) => !assignment.selected));
    showToast({
      icon: '📚',
      title: 'Assignments imported',
      subtitle: `Saved ${selected.length} assignment${selected.length === 1 ? '' : 's'} as tasks.`,
    });
  };

  const selectedCount = assignments.filter((assignment) => assignment.selected).length;

  return (
    <View style={styles.root}>
      <View style={[styles.content, desktop && styles.contentDesktop]}>
        <PageHeader title="Syllabus 📚" />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Surface style={styles.hero}>
            <Text style={styles.heroEyebrow}>AI Import</Text>
            <Text style={styles.heroTitle}>Turn a syllabus into your task list</Text>
            <Text style={styles.heroSub}>
              Pick a syllabus PDF or photo, or paste the schedule text. The assignments, readings, and
              exams are extracted with due dates so you can review them and save the ones you want as tasks.
            </Text>
          </Surface>

          {!isCloudConfigured ? (
            <Surface style={styles.panel}>
              <Text style={styles.panelTitle}>Syllabus import is unavailable</Text>
              <Text style={styles.helperText}>
                This build is missing its cloud configuration. You can keep adding and ranking tasks
                manually.
              </Text>
            </Surface>
          ) : !isSignedIn ? (
            <Surface style={styles.panel}>
              <Text style={styles.panelTitle}>Sign in to import a syllabus</Text>
              <Text style={styles.helperText}>
                Syllabus import runs through our server, so it needs an account. Everything else in the
                app works without one.
              </Text>
              {isAppleSignInAvailable ? (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                  cornerRadius={14}
                  style={styles.appleButton}
                  onPress={() => {
                    signInWithApple().catch(() => {
                      showToast({ icon: '⚠️', title: 'Apple sign-in failed', subtitle: 'Try again.' });
                    });
                  }}
                />
              ) : null}
              <ActionButton
                label="Continue with Google"
                onPress={() => {
                  signInWithGoogle().catch(() => {
                    showToast({ icon: '⚠️', title: 'Google sign-in failed', subtitle: 'Try again.' });
                  });
                }}
              />
            </Surface>
          ) : (
            <Surface style={styles.panel}>
              <Text style={styles.panelTitle}>1. Add your syllabus</Text>
              <View style={[styles.uploadRow, desktop && styles.uploadRowDesktop]}>
                <Surface style={styles.uploadCard}>
                  <Text style={styles.uploadTitle}>PDF or photo</Text>
                  <Text style={styles.uploadSub}>
                    Use the course syllabus PDF, or a clear photo of the assignment schedule.
                  </Text>
                  <ActionButton label="Pick PDF" tone="primary" onPress={() => void pickPdf()} />
                  <ActionButton label="Pick Photo" onPress={() => void pickPhoto()} />
                  {pickedSource ? (
                    <View style={styles.pickedRow}>
                      <Badge label={pickedSource.label} tone="violet" />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Remove selected file"
                        onPress={() => setPickedSource(null)}
                        style={styles.removeButton}
                      >
                        <Text style={styles.removeLabel}>Remove</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </Surface>

                <Surface style={styles.uploadCard}>
                  <Text style={styles.uploadTitle}>Or paste the schedule</Text>
                  <TextInput
                    multiline
                    value={pastedText}
                    onChangeText={setPastedText}
                    placeholder="Paste the assignment schedule or course calendar here..."
                    placeholderTextColor={Colors.t3}
                    style={styles.textarea}
                    accessibilityLabel="Syllabus text"
                  />
                </Surface>
              </View>
              <ActionButton
                label={isExtracting ? 'Extracting…' : 'Extract Assignments'}
                tone="primary"
                onPress={startExtraction}
              />
              {extractionError ? <Text style={styles.errorText}>{extractionError}</Text> : null}
              <Text style={styles.privacyNote}>
                Syllabus content is sent to OpenRouter (processed by Anthropic) only after you agree, with
                zero data retention requested. You can revoke consent anytime in Settings.
              </Text>
            </Surface>
          )}

          <Surface style={styles.panel}>
            <View style={styles.reviewHeader}>
              <View>
                <Text style={styles.panelTitle}>2. Review assignments</Text>
                <Text style={styles.reviewSub}>
                  Edit titles and details, uncheck anything you don't want, then save them as tasks.
                </Text>
              </View>
              <Badge label={`${selectedCount} selected`} tone="green" />
            </View>

            {assignments.length === 0 ? (
              <Text style={styles.emptyState}>
                Nothing here yet. Extracted assignments will appear for review before anything is saved.
              </Text>
            ) : (
              <View style={styles.generatedList}>
                {assignments.map((assignment) => (
                  <Surface
                    key={assignment.id}
                    style={[styles.generatedCard, !assignment.selected && styles.generatedCardMuted]}
                  >
                    <View style={styles.generatedTopRow}>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: assignment.selected }}
                        accessibilityLabel={`Include ${assignment.title}`}
                        style={[styles.checkbox, assignment.selected && styles.checkboxOn]}
                        onPress={() =>
                          setAssignments((current) =>
                            current.map((entry) =>
                              entry.id === assignment.id
                                ? { ...entry, selected: !entry.selected }
                                : entry,
                            ),
                          )
                        }
                      />
                      <TextInput
                        value={assignment.emoji}
                        onChangeText={(value) =>
                          setAssignments((current) =>
                            current.map((entry) =>
                              entry.id === assignment.id ? { ...entry, emoji: value || '📚' } : entry,
                            ),
                          )
                        }
                        style={styles.emojiInput}
                        placeholder="📚"
                        placeholderTextColor={Colors.t3}
                        accessibilityLabel="Assignment emoji"
                      />
                      <View style={styles.generatedFields}>
                        <TextInput
                          value={assignment.title}
                          onChangeText={(value) =>
                            setAssignments((current) =>
                              current.map((entry) =>
                                entry.id === assignment.id ? { ...entry, title: value } : entry,
                              ),
                            )
                          }
                          style={styles.generatedName}
                          placeholder="Assignment title"
                          placeholderTextColor={Colors.t3}
                          accessibilityLabel="Assignment title"
                        />
                        <TextInput
                          value={assignment.detail}
                          onChangeText={(value) =>
                            setAssignments((current) =>
                              current.map((entry) =>
                                entry.id === assignment.id ? { ...entry, detail: value } : entry,
                              ),
                            )
                          }
                          style={styles.generatedDetail}
                          placeholder="Detail (course, notes)"
                          placeholderTextColor={Colors.t3}
                          accessibilityLabel="Assignment detail"
                        />
                        <View style={styles.taskMetaRow}>
                          {assignment.dueDate ? (
                            <Badge label={`Due ${formatDueDate(assignment.dueDate)}`} tone="gold" />
                          ) : (
                            <Badge label="No due date" tone="default" />
                          )}
                          <Text style={styles.durationLabel}>{assignment.estimatedDuration}</Text>
                        </View>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${assignment.title}`}
                        style={styles.removeButton}
                        onPress={() =>
                          setAssignments((current) =>
                            current.filter((entry) => entry.id !== assignment.id),
                          )
                        }
                      >
                        <Text style={styles.removeLabel}>Remove</Text>
                      </Pressable>
                    </View>
                  </Surface>
                ))}
              </View>
            )}

            <View style={styles.footerButtons}>
              <ActionButton label="Clear" onPress={() => setAssignments([])} />
              <ActionButton
                label="Save Selected as Tasks"
                tone="primary"
                onPress={saveSelected}
              />
            </View>
          </Surface>
        </ScrollView>
      </View>

      <Sheet
        open={consentSheetOpen}
        title="Before your syllabus is sent"
        onClose={() => {
          setConsentSheetOpen(false);
          setPendingAfterConsent(null);
        }}
      >
        <Text style={styles.consentBody}>
          To extract assignments, the file, photo, or text you chose is sent over an encrypted
          connection to OpenRouter and processed by an Anthropic AI model. It is used only to generate
          your assignment list. The request requires a zero-data-retention provider and is not used
          to train models.
        </Text>
        <Text style={styles.consentBody}>
          Nothing is sent until you agree, and only the content you explicitly choose is ever sent. You
          can revoke this consent anytime in Settings, and keep adding tasks manually instead.
        </Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Read the privacy policy"
          onPress={() => {
            void WebBrowser.openBrowserAsync(Links.privacyPolicy);
          }}
        >
          <Text style={styles.consentLink}>Read the privacy policy</Text>
        </Pressable>
        <ActionButton
          label="I Agree and Send My Syllabus"
          tone="primary"
          onPress={() => {
            const source = pendingAfterConsent;
            setConsentSheetOpen(false);
            setPendingAfterConsent(null);
            void grantAiConsent().then(() => {
              setHasConsent(true);
              if (source) {
                void runExtraction(source);
              }
            });
          }}
        />
        <ActionButton
          label="Not Now"
          onPress={() => {
            setConsentSheetOpen(false);
            setPendingAfterConsent(null);
          }}
        />
      </Sheet>
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
  appleButton: {
    width: '100%',
    height: 48,
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
  pickedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  privacyNote: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.t3,
  },
  consentBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.t2,
  },
  consentLink: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.violet,
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
