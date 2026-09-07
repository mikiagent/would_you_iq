import * as AppleAuthentication from "expo-apple-authentication";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useCloudSync } from "@/components/SyncProvider";
import { renderKeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import { ActionButton, Badge, Sheet, Surface } from "@/components/primitives";
import { Links } from "@/constants/links";
import { Colors, Fonts } from "@/constants/tokens";
import { createId } from "@/domain/logic";
import type { SyllabusDocument, SyllabusSourceKind } from "@/domain/models";
import { useAppStore } from "@/domain/store";
import { normalizeTaskWorkspace } from "@/domain/taskWorkspace";
import { getAiConsent, grantAiConsent } from "@/lib/aiConsent";
import {
  MAX_SYLLABUS_FILE_BYTES,
  extractAssignments,
  formatDueDate,
} from "@/lib/syllabus";
import {
  deleteSyllabusSource,
  getSyllabusUrl,
  readSyllabusSource,
  storeSyllabusSource,
} from "@/lib/syllabusStorage";
import { encodeBase64, validateSource } from "@/lib/syllabusFiles";
import { DEFAULT_TASK_PROJECT_ID } from "@/domain/taskWorkspace";
import { supabase } from "@/lib/supabase";

type PendingSource = {
  kind: SyllabusSourceKind;
  data: string;
  filename: string;
  label: string;
  mimeType: string;
  byteSize: number;
};

function sourceSize(data: string, kind: SyllabusSourceKind) {
  return validateSource(data, kind);
}

function storageLabel(document: SyllabusDocument) {
  return document.remotePath ? "Uploaded" : "On device";
}

function scanLabel(document: SyllabusDocument) {
  if (document.extractionStatus === "extracting") return "Scanning...";
  if (document.extractionStatus === "ready") return "Scan again";
  return "Scan for homework";
}

function confirmDelete(document: SyllabusDocument, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (
      globalThis.confirm?.(
        `Delete ${document.name}?\n\nThis removes the stored syllabus and extracted homework.`,
      )
    ) {
      onConfirm();
    }
    return;
  }

  Alert.alert(
    "Delete syllabus?",
    "This removes the stored file and extracted homework.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onConfirm },
    ],
  );
}

export function SyllabusContextPanel() {
  const allSyllabi = useAppStore((state) => state.syllabi);
  const rawWorkspace = useAppStore((state) => state.taskWorkspace);
  const upsertSyllabus = useAppStore((state) => state.upsertSyllabus);
  const deleteSyllabus = useAppStore((state) => state.deleteSyllabus);
  const showToast = useAppStore((state) => state.showToast);
  const {
    userId,
    isSignedIn,
    isCloudConfigured,
    isAppleSignInAvailable,
    signInWithApple,
    signInWithGoogle,
    manualSave,
  } = useCloudSync();
  const syllabi = allSyllabi.filter((document) => document.ownerId === userId);
  const ownerRef = useRef(userId);
  ownerRef.current = userId;
  const storingRef = useRef(false);
  const operationsRef = useRef(new Set<string>());
  const [workingIds, setWorkingIds] = useState<string[]>([]);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const setWorking = (id: string, working: boolean) => {
    if (working) operationsRef.current.add(id);
    else operationsRef.current.delete(id);
    setWorkingIds([...operationsRef.current]);
  };
  const stillOwned = (document: SyllabusDocument) =>
    ownerRef.current === document.ownerId &&
    useAppStore
      .getState()
      .syllabi.some(
        (entry) =>
          entry.id === document.id && entry.ownerId === document.ownerId,
      );
  const workspace = useMemo(
    () => normalizeTaskWorkspace(rawWorkspace),
    [rawWorkspace],
  );
  const projects = useMemo(
    () =>
      [...workspace.projects].sort((left, right) => left.order - right.order),
    [workspace.projects],
  );

  const [projectId, setProjectId] = useState(
    projects[0]?.id ?? DEFAULT_TASK_PROJECT_ID,
  );
  const [pickedSource, setPickedSource] = useState<PendingSource | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [consentSheetOpen, setConsentSheetOpen] = useState(false);
  const [pendingScanId, setPendingScanId] = useState<string | null>(null);

  useEffect(() => {
    if (!projects.some((project) => project.id === projectId)) {
      setProjectId(projects[0]?.id ?? DEFAULT_TASK_PROJECT_ID);
    }
  }, [projectId, projects]);

  useEffect(() => {
    setPickedSource(null);
    setPastedText("");
    setError(null);
    let cancelled = false;
    if (!isSignedIn) {
      setHasConsent(false);
      return;
    }
    getAiConsent()
      .then((record) => {
        if (!cancelled) setHasConsent(!!record);
      })
      .catch(() => setHasConsent(false));
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userId]);

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_SYLLABUS_FILE_BYTES) {
      setError("That PDF is larger than 5 MB. Choose a smaller file.");
      return;
    }

    try {
      const data =
        Platform.OS === "web"
          ? encodeBase64(
              await (asset.file
                ? asset.file.arrayBuffer()
                : fetch(asset.uri).then((response) => response.arrayBuffer())),
            )
          : await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
      const byteSize = sourceSize(data, "pdf");
      setPickedSource({
        kind: "pdf",
        data,
        filename: asset.name || "syllabus.pdf",
        label: asset.name || "Selected PDF",
        mimeType: asset.mimeType || "application/pdf",
        byteSize,
      });
      setPastedText("");
      setError(null);
    } catch {
      setError("Could not read that PDF. Try choosing it again.");
    }
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const base64 = asset.base64;
    if (!base64) return;
    const byteSize = Math.floor(base64.length * 0.75);
    if (byteSize > MAX_SYLLABUS_FILE_BYTES) {
      setError("That photo is larger than 5 MB. Choose a smaller image.");
      return;
    }

    setPickedSource({
      kind: "image",
      data: base64,
      filename: asset.fileName || "syllabus.jpg",
      label: asset.fileName || "Selected photo",
      mimeType: asset.mimeType || "image/jpeg",
      byteSize,
    });
    setPastedText("");
    setError(null);
  };

  const pendingSource = (): PendingSource | null => {
    if (pickedSource) return pickedSource;
    const text = pastedText.trim();
    if (!text) return null;
    const project = projects.find((entry) => entry.id === projectId);
    return {
      kind: "text",
      data: text,
      filename: `${project?.code.toLowerCase() || "course"}-syllabus.txt`,
      label: "Pasted syllabus text",
      mimeType: "text/plain",
      byteSize: sourceSize(text, "text"),
    };
  };

  const storeSource = async () => {
    if (storingRef.current) return;
    try {
      const source = pendingSource();
      if (!source) {
        setError("Choose a PDF or photo, or paste syllabus text first.");
        return;
      }
      if (!userId) {
        setError("Sign in before storing a syllabus.");
        return;
      }

      source.byteSize = validateSource(source.data, source.kind);
      storingRef.current = true;
      setBusy(true);
      setError(null);
      const id = createId("syllabus");
      const now = Date.now();
      const project = projects.find((entry) => entry.id === projectId);

      const stored = await storeSyllabusSource({
        id,
        userId,
        kind: source.kind,
        data: source.data,
        filename: source.filename,
        mimeType: source.mimeType,
      });
      if (!stored.localUri && !stored.remotePath) {
        throw new Error(
          stored.remoteError || "The syllabus could not be stored.",
        );
      }
      const { data: auth } = await supabase.auth.getSession();
      if (auth.session?.user.id !== userId) return;

      const document: SyllabusDocument = {
        id,
        ownerId: userId,
        projectId,
        name: `${project?.name || "Course"} syllabus`,
        filename: source.filename,
        kind: source.kind,
        mimeType: source.mimeType,
        byteSize: source.byteSize,
        localUri: stored.localUri,
        remotePath: stored.remotePath,
        storageStatus: stored.remotePath ? "synced" : "local",
        extractionStatus: "not_started",
        extractionError: null,
        assignments: [],
        createdAt: now,
        updatedAt: now,
        extractedAt: null,
      };
      upsertSyllabus(document);
      void manualSave();
      setPickedSource(null);
      setPastedText("");
      setError(stored.remoteError);
      showToast({
        icon: "📚",
        title: "Syllabus stored",
        subtitle: stored.remotePath
          ? "Uploaded to your private library."
          : "Saved on this device. Retry the upload when connected.",
      });
    } catch (storeError) {
      setError(
        storeError instanceof Error
          ? storeError.message
          : "The syllabus could not be stored.",
      );
    } finally {
      storingRef.current = false;
      setBusy(false);
    }
  };

  const runExtraction = async (document: SyllabusDocument) => {
    if (!stillOwned(document) || operationsRef.current.has(document.id)) return;
    setWorking(document.id, true);
    const extracting = {
      ...document,
      extractionStatus: "extracting" as const,
      extractionError: null,
      updatedAt: Date.now(),
    };
    upsertSyllabus(extracting);
    setError(null);

    try {
      const data = await readSyllabusSource(document);
      if (!stillOwned(document)) return;
      const extracted = await extractAssignments({
        kind: document.kind,
        data,
        filename: document.filename,
        ownerId: document.ownerId,
        mimeType: document.mimeType,
      });
      if (!stillOwned(document)) return;
      upsertSyllabus({
        ...extracting,
        extractionStatus: "ready",
        assignments: extracted.map((assignment) => ({
          ...assignment,
          id: createId("assignment"),
        })),
        extractedAt: Date.now(),
        updatedAt: Date.now(),
      });
      void manualSave();
      showToast({
        icon: "📚",
        title: "Homework found",
        subtitle: `${extracted.length} item${extracted.length === 1 ? "" : "s"} saved with this syllabus.`,
      });
    } catch (scanError) {
      if (!stillOwned(document)) return;
      const message =
        scanError instanceof Error
          ? scanError.message
          : "The syllabus scan failed.";
      upsertSyllabus({
        ...extracting,
        extractionStatus: "error",
        extractionError: message,
        updatedAt: Date.now(),
      });
      void manualSave();
      setError(message);
    } finally {
      setWorking(document.id, false);
    }
  };

  const requestExtraction = async (document: SyllabusDocument) => {
    if (document.extractionStatus === "extracting") return;
    const consent = await getAiConsent().catch(() => null);
    if (!hasConsent || !consent) {
      setPendingScanId(document.id);
      setConsentSheetOpen(true);
      return;
    }
    void runExtraction(document);
  };

  const removeDocument = (document: SyllabusDocument) => {
    confirmDelete(document, async () => {
      if (operationsRef.current.has(document.id)) return;
      setWorking(document.id, true);
      try {
        await deleteSyllabusSource(document);
        if (!stillOwned(document)) return;
        deleteSyllabus(document.id);
        void manualSave();
        showToast({
          icon: "🗑️",
          title: "Syllabus deleted",
          subtitle: document.filename,
        });
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Could not delete the syllabus.",
        );
      } finally {
        setWorking(document.id, false);
      }
    });
  };

  const retryUpload = async (document: SyllabusDocument) => {
    if (operationsRef.current.has(document.id)) return;
    setWorking(document.id, true);
    try {
      const data = await readSyllabusSource(document);
      const stored = await storeSyllabusSource({
        id: document.id,
        userId: document.ownerId,
        kind: document.kind,
        data,
        filename: document.filename,
        mimeType: document.mimeType,
      });
      if (!stillOwned(document)) return;
      if (!stored.remotePath)
        throw new Error(
          "Upload failed. Your local copy is safe. Try again when connected.",
        );
      upsertSyllabus({
        ...document,
        remotePath: stored.remotePath,
        storageStatus: "synced",
        updatedAt: Date.now(),
      });
      void manualSave();
      setError(null);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed.",
      );
    } finally {
      setWorking(document.id, false);
    }
  };

  const openSource = async (document: SyllabusDocument) => {
    try {
      if (document.kind === "text") {
        setPreviewText(await readSyllabusSource(document));
        return;
      }
      const url = await getSyllabusUrl(document);
      if (!url) throw new Error("Upload this file to open its preview.");
      await WebBrowser.openBrowserAsync(url);
    } catch (openError) {
      setError(
        openError instanceof Error
          ? openError.message
          : "Could not open this syllabus.",
      );
    }
  };

  const renderDocument = ({ item }: { item: SyllabusDocument }) => {
    const project = projects.find((entry) => entry.id === item.projectId);
    return (
      <Surface style={styles.documentCard}>
        <View style={styles.documentHeader}>
          <View style={styles.documentIcon}>
            <Text style={styles.documentEmoji}>📄</Text>
          </View>
          <View style={styles.documentCopy}>
            <Text style={styles.documentName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.documentMeta} numberOfLines={1}>
              {project?.code || "COURSE"} · {item.filename}
            </Text>
          </View>
          <Badge
            label={storageLabel(item)}
            tone={item.storageStatus === "synced" ? "green" : "default"}
          />
        </View>

        <View style={styles.documentActions}>
          <ActionButton
            disabled={workingIds.includes(item.id)}
            label={scanLabel(item)}
            tone="primary"
            onPress={() => void requestExtraction(item)}
          />
          <ActionButton
            disabled={workingIds.includes(item.id)}
            label="Open source"
            onPress={() => void openSource(item)}
          />
          {!item.remotePath ? (
            <ActionButton
              disabled={workingIds.includes(item.id)}
              label="Retry upload"
              onPress={() => void retryUpload(item)}
            />
          ) : null}
          <ActionButton
            disabled={workingIds.includes(item.id)}
            label="Delete"
            onPress={() => removeDocument(item)}
          />
        </View>

        {item.extractionError ? (
          <Text style={styles.errorText}>{item.extractionError}</Text>
        ) : null}
        {item.extractionStatus === "ready" ? (
          <View style={styles.assignmentSection}>
            <Text style={styles.assignmentHeading}>
              Homework and dates · {item.assignments.length}
            </Text>
            {item.assignments.length ? (
              item.assignments.map((assignment) => (
                <View key={assignment.id} style={styles.assignmentRow}>
                  <Text style={styles.assignmentEmoji}>
                    {assignment.emoji || "📚"}
                  </Text>
                  <View style={styles.assignmentCopy}>
                    <Text style={styles.assignmentTitle}>
                      {assignment.title}
                    </Text>
                    {assignment.detail ? (
                      <Text style={styles.assignmentDetail} numberOfLines={2}>
                        {assignment.detail}
                      </Text>
                    ) : null}
                  </View>
                  <Badge
                    label={
                      assignment.dueDate
                        ? `Due ${formatDueDate(assignment.dueDate)}`
                        : "No date"
                    }
                    tone={assignment.dueDate ? "gold" : "default"}
                  />
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>
                No homework or due dates were found.
              </Text>
            )}
            <Text style={styles.futureNote}>
              Task conversion will be added in a later update.
            </Text>
          </View>
        ) : null}
      </Surface>
    );
  };

  const uploadPanel = (
    <>
      <Surface style={styles.hero}>
        <Text style={styles.eyebrow}>Course context</Text>
        <Text style={styles.heroTitle}>Keep the source with the work</Text>
        <Text style={styles.heroCopy}>
          Store a course syllabus, then scan it for homework and due dates. The
          source and extracted details stay attached to the course.
        </Text>
      </Surface>

      {!isCloudConfigured ? (
        <Surface style={styles.panel}>
          <Text style={styles.panelTitle}>Context upload is unavailable</Text>
          <Text style={styles.helperText}>
            This build is missing its cloud configuration.
          </Text>
        </Surface>
      ) : !isSignedIn ? (
        <Surface style={styles.panel}>
          <Text style={styles.panelTitle}>Sign in to store course context</Text>
          <Text style={styles.helperText}>
            Your syllabi are private and tied to your account.
          </Text>
          {isAppleSignInAvailable ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
              }
              buttonStyle={
                AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              }
              cornerRadius={14}
              style={styles.appleButton}
              onPress={() => {
                signInWithApple().catch(() => {
                  showToast({
                    icon: "⚠️",
                    title: "Apple sign-in failed",
                    subtitle: "Try again.",
                  });
                });
              }}
            />
          ) : null}
          <ActionButton
            label="Continue with Google"
            onPress={() => {
              signInWithGoogle().catch(() => {
                showToast({
                  icon: "⚠️",
                  title: "Google sign-in failed",
                  subtitle: "Try again.",
                });
              });
            }}
          />
        </Surface>
      ) : (
        <Surface style={styles.panel}>
          <Text style={styles.panelTitle}>Add course context</Text>
          <Text style={styles.sectionLabel}>Attach to project</Text>
          <View style={styles.projectChoices}>
            {projects.map((project) => (
              <Pressable
                key={project.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: projectId === project.id }}
                disabled={busy}
                onPress={() => setProjectId(project.id)}
                style={[
                  styles.projectChoice,
                  projectId === project.id && styles.projectChoiceActive,
                ]}
              >
                <View
                  style={[
                    styles.projectDot,
                    { backgroundColor: project.color },
                  ]}
                />
                <Text
                  style={[
                    styles.projectLabel,
                    projectId === project.id && styles.projectLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {project.code}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.uploadButtons}>
            <ActionButton
              disabled={busy}
              label="Choose PDF"
              tone="primary"
              onPress={() =>
                void pickPdf().catch(() =>
                  setError("Could not open the file picker. Try again."),
                )
              }
            />
            <ActionButton
              disabled={busy}
              label="Choose photo"
              onPress={() =>
                void pickPhoto().catch(() =>
                  setError("Could not open the photo picker. Try again."),
                )
              }
            />
          </View>
          {pickedSource ? (
            <View style={styles.pickedRow}>
              <Badge label={pickedSource.label} tone="violet" />
              <Pressable onPress={() => setPickedSource(null)}>
                <Text style={styles.removeLabel}>Remove</Text>
              </Pressable>
            </View>
          ) : null}
          <Text style={styles.orLabel}>or paste the schedule</Text>
          <TextInput
            multiline
            accessibilityLabel="Syllabus schedule"
            editable={!busy}
            value={pastedText}
            onChangeText={(value) => {
              setPastedText(value);
              if (value) setPickedSource(null);
            }}
            placeholder="Paste the course schedule or assignment calendar..."
            placeholderTextColor={Colors.t3}
            style={styles.textarea}
          />
          <ActionButton
            label={busy ? "Storing..." : "Store syllabus"}
            disabled={busy}
            tone="primary"
            onPress={() => void storeSource()}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Text style={styles.privacyNote}>
            Store uploads the selected source to your private account. Scanning
            uses AI only after you agree. Maximum 5 MB.
          </Text>
        </Surface>
      )}

      <View style={styles.libraryHeader}>
        <Text style={styles.libraryTitle}>Stored syllabi</Text>
        <Text style={styles.libraryCount}>{syllabi.length}</Text>
      </View>
    </>
  );

  return (
    <View style={styles.root}>
      <FlatList
        renderScrollComponent={renderKeyboardAwareScrollView}
        data={syllabi}
        renderItem={renderDocument}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={uploadPanel}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No syllabi stored yet.</Text>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        removeClippedSubviews={Platform.OS !== "web"}
      />

      <Sheet
        open={consentSheetOpen}
        title="Before your syllabus is scanned"
        onClose={() => {
          setConsentSheetOpen(false);
          setPendingScanId(null);
        }}
      >
        <Text style={styles.consentBody}>
          The syllabus you choose is sent over an encrypted connection to
          OpenRouter and processed by an Anthropic model. The request asks the
          provider not to retain the data.
        </Text>
        <Pressable
          onPress={() => void WebBrowser.openBrowserAsync(Links.privacyPolicy)}
        >
          <Text style={styles.consentLink}>Read the privacy policy</Text>
        </Pressable>
        <ActionButton
          label="I agree and scan"
          tone="primary"
          onPress={() => {
            const document = syllabi.find(
              (entry) => entry.id === pendingScanId,
            );
            setConsentSheetOpen(false);
            setPendingScanId(null);
            void grantAiConsent()
              .then(() => {
                setHasConsent(true);
                if (document) void runExtraction(document);
              })
              .catch(() => setError("Could not save your consent. Try again."));
          }}
        />
        <ActionButton
          label="Not now"
          onPress={() => setConsentSheetOpen(false)}
        />
      </Sheet>
      <Sheet
        open={previewText !== null}
        title="Stored syllabus"
        onClose={() => setPreviewText(null)}
      >
        <Text selectable style={styles.consentBody}>
          {previewText}
        </Text>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 110,
    gap: 12,
  },
  hero: { padding: 18, gap: 8 },
  eyebrow: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: Colors.gold,
  },
  heroTitle: { fontFamily: Fonts.display, fontSize: 21, color: Colors.t1 },
  heroCopy: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.t2,
  },
  panel: { padding: 16, gap: 12 },
  panelTitle: { fontFamily: Fonts.display, fontSize: 17, color: Colors.t1 },
  helperText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.t2,
  },
  sectionLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.t3,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  appleButton: { width: "100%", height: 48 },
  projectChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  projectChoice: {
    maxWidth: 140,
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.b1,
    backgroundColor: Colors.s2,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  projectChoiceActive: {
    borderColor: Colors.violet,
    backgroundColor: "rgba(124,106,247,0.15)",
  },
  projectDot: { width: 8, height: 8, borderRadius: 4 },
  projectLabel: {
    flexShrink: 1,
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.t2,
  },
  projectLabelActive: { color: Colors.t1 },
  uploadButtons: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  pickedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  removeLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: "#ff8b8b" },
  orLabel: {
    alignSelf: "center",
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.t3,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  textarea: {
    minHeight: 110,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.b2,
    backgroundColor: Colors.s2,
    padding: 14,
    color: Colors.t1,
    textAlignVertical: "top",
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  errorText: {
    fontFamily: Fonts.bodyBold,
    color: Colors.red,
    fontSize: 12,
    lineHeight: 18,
  },
  privacyNote: {
    fontFamily: Fonts.body,
    fontSize: 10,
    lineHeight: 15,
    color: Colors.t3,
  },
  libraryHeader: {
    marginTop: 4,
    paddingHorizontal: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  libraryTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.t1,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  libraryCount: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.violet,
  },
  documentCard: { padding: 14, gap: 12 },
  documentHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(124,106,247,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },
  documentEmoji: { fontSize: 19 },
  documentCopy: { flex: 1, minWidth: 0 },
  documentName: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.t1 },
  documentMeta: {
    marginTop: 3,
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.t3,
  },
  documentActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  assignmentSection: {
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.b1,
  },
  assignmentHeading: {
    marginTop: 6,
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.t2,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  assignmentRow: {
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  assignmentEmoji: { width: 24, fontSize: 17, textAlign: "center" },
  assignmentCopy: { flex: 1, minWidth: 0 },
  assignmentTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.t1,
  },
  assignmentDetail: {
    marginTop: 2,
    fontFamily: Fonts.body,
    fontSize: 10,
    lineHeight: 14,
    color: Colors.t3,
  },
  futureNote: { fontFamily: Fonts.body, fontSize: 10, color: Colors.t3 },
  emptyText: {
    padding: 18,
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.t2,
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
});
