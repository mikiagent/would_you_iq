import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";

import { Colors, Fonts } from "@/constants/tokens";
import { medalForIndex } from "@/domain/logic";
import type { ArenaMode, Task, TaskProject } from "@/domain/models";
import { useAppStore } from "@/domain/store";
import {
  getProjectStats,
  normalizeTaskWorkspace,
} from "@/domain/taskWorkspace";

type EloView = "projects" | "tasks";
type EloRow =
  | { id: string; kind: "project"; project: TaskProject }
  | { id: string; kind: "task"; task: Task };

export function TaskEloPanel() {
  const [view, setView] = useState<EloView>("projects");
  const tasks = useAppStore((state) => state.tasks);
  const rawWorkspace = useAppStore((state) => state.taskWorkspace);
  const setArenaMode = useAppStore((state) => state.setArenaMode);
  const workspace = useMemo(
    () => normalizeTaskWorkspace(rawWorkspace),
    [rawWorkspace],
  );

  const rows = useMemo<EloRow[]>(() => {
    if (view === "projects") {
      return [...workspace.projects]
        .sort((left, right) => right.elo - left.elo || left.order - right.order)
        .map((project) => ({
          id: project.id,
          kind: "project" as const,
          project,
        }));
    }

    return tasks
      .filter((task) => !task.done)
      .sort((left, right) => {
        if (left.ess !== right.ess) return left.ess ? -1 : 1;
        return right.elo - left.elo || left.order - right.order;
      })
      .map((task) => ({ id: task.id, kind: "task" as const, task }));
  }, [tasks, view, workspace.projects]);

  const startRanking = (mode: Extract<ArenaMode, "projects" | "tasks">) => {
    setArenaMode(mode);
    router.push("/(tabs)/calibrate");
  };

  const renderRow: ListRenderItem<EloRow> = ({ item, index }) => {
    const isProject = item.kind === "project";
    const title = isProject ? item.project.name : item.task.n;
    const elo = isProject ? item.project.elo : item.task.elo;
    const accent = isProject
      ? item.project.color
      : elo >= 1300
        ? Colors.gold
        : Colors.violet;
    const meta = isProject
      ? (() => {
          const stats = getProjectStats(item.project.id, tasks, workspace);
          return `${item.project.code} · ${stats.taskCount} task${stats.taskCount === 1 ? "" : "s"} · ${stats.percent}% done`;
        })()
      : `${item.task.t || "No estimate"}${item.task.ess ? " · Essential" : ""}`;

    return (
      <View style={[styles.row, index === 0 && styles.leaderRow]}>
        <Text style={[styles.rank, index < 3 && { color: accent }]}>
          {medalForIndex(index)}
        </Text>
        <View
          style={[
            styles.identity,
            { backgroundColor: `${accent}18`, borderColor: `${accent}30` },
          ]}
        >
          {isProject ? (
            <View style={[styles.projectDot, { backgroundColor: accent }]} />
          ) : (
            <Text style={styles.taskEmoji}>{item.task.e}</Text>
          )}
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>
            {title}
          </Text>
          <Text numberOfLines={1} style={styles.meta}>
            {meta}
          </Text>
        </View>
        <View
          style={[
            styles.eloPill,
            { borderColor: `${accent}38`, backgroundColor: `${accent}14` },
          ]}
        >
          <Text style={[styles.eloValue, { color: accent }]}>{elo}</Text>
          <Text style={styles.eloLabel}>ELO</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Importance rankings</Text>
          <Text style={styles.subtitle}>
            Projects and tasks ranked by your choices
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => startRanking(view)}
          style={({ pressed }) => [
            styles.rankButton,
            pressed && styles.pressed,
          ]}
        >
          <LinearGradient
            colors={["#8b74f7", "#765ee6"]}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.rankButtonLabel}>Rank {view}</Text>
        </Pressable>
      </View>

      <View style={styles.switcher} accessibilityLabel="Choose ELO leaderboard">
        <EloOption
          active={view === "projects"}
          label="Project ELO"
          onPress={() => setView("projects")}
        />
        <EloOption
          active={view === "tasks"}
          label="Task ELO"
          onPress={() => setView("tasks")}
        />
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>
          {view === "projects" ? "Project ranking" : "Task ranking"}
        </Text>
        <Text style={styles.listCount}>{rows.length} ranked</Text>
      </View>

      <FlatList
        data={rows}
        renderItem={renderRow}
        keyExtractor={(item) => `${item.kind}:${item.id}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing to rank yet</Text>
            <Text style={styles.emptyCopy}>
              Add at least two {view}, then compare them on Would You?
            </Text>
          </View>
        }
      />
    </View>
  );
}

function EloOption({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        active && styles.optionActive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 10 },
  header: {
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontFamily: Fonts.display, fontSize: 18, color: Colors.t1 },
  subtitle: {
    marginTop: 3,
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.t2,
  },
  rankButton: {
    minWidth: 112,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 13,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  rankButtonLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: "#fff",
    textTransform: "capitalize",
  },
  pressed: { opacity: 0.72 },
  switcher: {
    height: 42,
    marginTop: 16,
    marginHorizontal: 18,
    padding: 3,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.b1,
    backgroundColor: Colors.s1,
    flexDirection: "row",
  },
  option: {
    flex: 1,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  optionActive: {
    backgroundColor: Colors.s3,
    borderWidth: 1,
    borderColor: Colors.b2,
  },
  optionLabel: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.t3 },
  optionLabelActive: { color: Colors.t1 },
  listHeader: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.t1,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  listCount: { fontFamily: Fonts.body, fontSize: 11, color: Colors.t3 },
  listContent: { paddingHorizontal: 18, paddingBottom: 100, gap: 8 },
  row: {
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.b1,
    backgroundColor: "rgba(14,14,28,0.64)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  leaderRow: {
    borderColor: "rgba(245,200,66,0.24)",
    backgroundColor: "rgba(245,200,66,0.045)",
  },
  rank: {
    width: 24,
    textAlign: "center",
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.t3,
  },
  identity: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  projectDot: { width: 13, height: 13, borderRadius: 7 },
  taskEmoji: { fontSize: 20 },
  copy: { flex: 1, minWidth: 0 },
  name: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.t1 },
  meta: {
    marginTop: 3,
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.t2,
  },
  eloPill: {
    minWidth: 54,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
  },
  eloValue: { fontFamily: Fonts.display, fontSize: 11 },
  eloLabel: {
    marginTop: 1,
    fontFamily: Fonts.bodyBold,
    fontSize: 7,
    color: Colors.t3,
    letterSpacing: 0.8,
  },
  empty: {
    marginTop: 18,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.b1,
    backgroundColor: Colors.s1,
  },
  emptyTitle: { fontFamily: Fonts.display, fontSize: 15, color: Colors.t1 },
  emptyCopy: {
    marginTop: 7,
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.t2,
  },
});
