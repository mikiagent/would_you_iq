import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type ListRenderItem,
} from 'react-native';
import {
  PanGestureHandler,
  State,
  type PanGestureHandlerGestureEvent,
  type PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';

import { useConfettiOverlay } from '@/components/ConfettiLayer';
import { ActionButton, Field, SegmentedControl, Sheet, ToggleRow } from '@/components/primitives';
import { Layout, isDesktopWidth } from '@/constants/layout';
import { Colors, Fonts } from '@/constants/tokens';
import { medalForIndex } from '@/domain/logic';
import type {
  Subtask,
  SubtaskDraft,
  Task,
  TaskBoardColumn,
  TaskDraft,
  TaskProject,
  TaskProjectDraft,
  TaskSortMode,
} from '@/domain/models';
import { useAppStore } from '@/domain/store';
import {
  pickTaskDropTarget,
  type MeasuredTaskDropZone,
  type TaskDragPoint,
  type TaskDragSource,
  type TaskDropTarget,
  type TaskDropZoneTarget,
} from '@/domain/taskDrag';
import {
  DEFAULT_TASK_PROJECT_ID,
  getProjectStats,
  getTaskItemStats,
  getWorkspaceStats,
  normalizeTaskWorkspace,
  resolveTaskProjectId,
  sortWorkspaceTasks,
  taskDueLabel,
  TASK_PROJECT_COLORS,
} from '@/domain/taskWorkspace';
import { useReducedMotion } from '@/lib/useReducedMotion';

const EMOJIS = ['🏋️', '📚', '💡', '📖', '🧘', '✉️', '🎸', '🌿', '🍳', '🚀'];
const SUBTASK_EMOJIS = ['📌', '📝', '🔥', '✅', '💬', '📦', '🎯', '🧠', '📞', '🛠️'];

function confirmDestructiveAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (typeof globalThis.confirm === 'function' && globalThis.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

const SORT_OPTIONS: Array<{ value: TaskSortMode; label: string; detail: string }> = [
  { value: 'importance', label: 'By importance', detail: 'Highest ELO tasks first.' },
  { value: 'due', label: 'By due date', detail: 'Urgent work first, then importance.' },
  { value: 'custom', label: 'Custom order', detail: 'The order you set with the move handles.' },
];

type TaskListRow =
  | { id: string; kind: 'project'; project: TaskProject; collapsed: boolean; tag: string | null }
  | { id: string; kind: 'task'; task: Task; project: TaskProject; rank: number | null }
  | { id: string; kind: 'empty'; project: TaskProject };

type OrderedSubtask = {
  subtask: Subtask;
  depth: number;
  hasChildren: boolean;
  complete: number;
  total: number;
};

type DropZoneNode = {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void;
};

type DropZoneRegistration = {
  node: DropZoneNode;
  target: TaskDropZoneTarget;
};

type DragState = {
  source: TaskDragSource;
  target: TaskDropTarget | null;
};

type TaskMenuState = {
  taskId: string;
  left: number;
  top: number;
};

type ProjectMenuState = {
  projectId: string;
  left: number;
  top: number;
};

type DragCallbacks = {
  onDragStart: (source: TaskDragSource, point: TaskDragPoint) => void;
  onDragMove: (point: TaskDragPoint) => void;
  onDragEnd: (didMove: boolean) => void;
};

function blankTaskDraft(projectId = DEFAULT_TASK_PROJECT_ID): TaskDraft {
  return { e: '💡', n: '', t: '30 min', dl: null, ess: false, detail: '', projectId };
}

function blankProjectDraft(columnId?: string): TaskProjectDraft {
  return { code: '', name: '', color: TASK_PROJECT_COLORS[0], columnId };
}

function withAlpha(color: string, alpha: string) {
  return color.length === 7 ? `${color}${alpha}` : color;
}

function orderedSubtasks(task: Task): OrderedSubtask[] {
  const byParent = new Map<string | null, Subtask[]>();
  const ids = new Set(task.subtasks.map((subtask) => subtask.id));

  task.subtasks.forEach((subtask) => {
    const parent = subtask.parentId && ids.has(subtask.parentId) ? subtask.parentId : null;
    const siblings = byParent.get(parent) ?? [];
    siblings.push(subtask);
    byParent.set(parent, siblings);
  });
  byParent.forEach((siblings) => siblings.sort((left, right) => left.order - right.order));

  const result: OrderedSubtask[] = [];
  const visited = new Set<string>();
  const countLeaves = (subtask: Subtask): { complete: number; total: number } => {
    const children = byParent.get(subtask.id) ?? [];
    if (!children.length) return { complete: subtask.done ? 1 : 0, total: 1 };
    return children.reduce(
      (stats, child) => {
        const next = countLeaves(child);
        return { complete: stats.complete + next.complete, total: stats.total + next.total };
      },
      { complete: 0, total: 0 },
    );
  };
  const visit = (subtask: Subtask, depth: number) => {
    if (visited.has(subtask.id)) return;
    visited.add(subtask.id);
    const children = byParent.get(subtask.id) ?? [];
    result.push({ subtask, depth, hasChildren: children.length > 0, ...countLeaves(subtask) });
    children.forEach((child) => visit(child, depth + 1));
  };
  (byParent.get(null) ?? []).forEach((subtask) => visit(subtask, 0));
  task.subtasks.forEach((subtask) => visit(subtask, 0));
  return result;
}

function useHoverMotion() {
  const reduceMotion = useReducedMotion();
  const hover = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;
  const animate = useCallback(
    (value: Animated.Value, toValue: number, duration: number) => {
      if (reduceMotion) return value.setValue(toValue);
      Animated.timing(value, { toValue, duration, useNativeDriver: true }).start();
    },
    [reduceMotion],
  );
  return {
    motionStyle: {
      transform: [
        { translateY: hover.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
        { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] }) },
      ],
    },
    hoverHandlers: {
      onHoverIn: () => animate(hover, 1, 150),
      onHoverOut: () => animate(hover, 0, 180),
      onPressIn: () => animate(press, 1, 90),
      onPressOut: () => animate(press, 0, 140),
    },
  };
}

function ModeSwitch({ value, onChange }: { value: 'list' | 'board'; onChange: (value: 'list' | 'board') => void }) {
  return (
    <View style={styles.modeSwitch}>
      {(['list', 'board'] as const).map((mode) => {
        const active = value === mode;
        return (
          <Pressable
            key={mode}
            onPress={() => onChange(mode)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [styles.modeButton, active && styles.modeButtonActive, pressed && styles.pressed]}
          >
            <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{mode === 'list' ? 'List' : 'Board'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DragHandle({
  source,
  label,
  selected,
  dragging,
  onTap,
  dragCallbacks,
  compact = false,
}: {
  source: TaskDragSource;
  label: string;
  selected: boolean;
  dragging: boolean;
  onTap?: () => void;
  dragCallbacks: DragCallbacks;
  compact?: boolean;
}) {
  const didMoveRef = useRef(false);
  const handleGesture = useCallback((event: PanGestureHandlerGestureEvent) => {
    const { absoluteX, absoluteY, translationX, translationY } = event.nativeEvent;
    if (Math.hypot(translationX, translationY) > 5) didMoveRef.current = true;
    dragCallbacks.onDragMove({ x: absoluteX, y: absoluteY });
  }, [dragCallbacks]);

  const handleGestureStateChange = useCallback((event: PanGestureHandlerStateChangeEvent) => {
    const { state, oldState, absoluteX, absoluteY } = event.nativeEvent;
    if (state === State.BEGAN) {
      didMoveRef.current = false;
      dragCallbacks.onDragStart(source, { x: absoluteX, y: absoluteY });
      return;
    }
    if (state === State.CANCELLED || state === State.FAILED) {
      dragCallbacks.onDragEnd(false);
      return;
    }
    if (oldState === State.ACTIVE) dragCallbacks.onDragEnd(didMoveRef.current);
  }, [dragCallbacks, source]);

  return (
    <PanGestureHandler
      minDist={5}
      onGestureEvent={handleGesture}
      onHandlerStateChange={handleGestureStateChange}
    >
      <View style={styles.dragHandleInteraction}>
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            if (!didMoveRef.current) onTap?.();
          }}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={onTap ? 'Hold and drag to reorder. Tap to use accessible move mode.' : 'Hold and drag to reorder.'}
          style={({ pressed }) => [
            compact ? styles.subtaskGripButton : styles.gripButton,
            (selected || dragging) && styles.gripButtonSelected,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.grip, (selected || dragging) && styles.gripSelected]}>⠿</Text>
        </Pressable>
      </View>
    </PanGestureHandler>
  );
}

function DropIndicator({ before }: { before: boolean }) {
  return <View pointerEvents="none" style={[styles.dropIndicator, before ? styles.dropIndicatorBefore : styles.dropIndicatorAfter]} />;
}

function dropPosition(
  target: TaskDropTarget | null | undefined,
  kind: TaskDropZoneTarget['kind'],
  id: string,
) {
  if (!target || target.kind !== kind) return null;
  const targetId =
    target.kind === 'project' || target.kind === 'board-project'
      ? target.projectId
      : target.kind === 'task'
        ? target.taskId
        : target.kind === 'subtask'
          ? target.subtaskId
          : target.columnId;
  return targetId === id ? (target.before ? 'before' : 'after') : null;
}

function sameDropTarget(left: TaskDropTarget | null, right: TaskDropTarget | null) {
  if (!left || !right) return left === right;
  if (left.kind !== right.kind || left.before !== right.before) return false;
  if (left.kind === 'project' && right.kind === 'project') return left.projectId === right.projectId;
  if (left.kind === 'task' && right.kind === 'task') return left.taskId === right.taskId;
  if (left.kind === 'subtask' && right.kind === 'subtask') return left.subtaskId === right.subtaskId;
  if (left.kind === 'board-project' && right.kind === 'board-project') return left.projectId === right.projectId;
  if (left.kind === 'board-column' && right.kind === 'board-column') return left.columnId === right.columnId;
  return false;
}

function ProjectHeader({
  project,
  stats,
  collapsed,
  tag,
  selected,
  dragState,
  registerDropZone,
  dragCallbacks,
  onPress,
  onOpenMenu,
  onMovePress,
}: {
  project: TaskProject;
  stats: ReturnType<typeof getProjectStats>;
  collapsed: boolean;
  tag: string | null;
  selected: boolean;
  dragState: DragState | null;
  registerDropZone: (key: string, target: TaskDropZoneTarget, node: DropZoneNode | null) => void;
  dragCallbacks: DragCallbacks;
  onPress: () => void;
  onOpenMenu: (event: GestureResponderEvent) => void;
  onMovePress: () => void;
}) {
  const didLongPressRef = useRef(false);
  const dragging = dragState?.source.kind === 'project' && dragState.source.projectId === project.id;
  const position = dropPosition(dragState?.target, 'project', project.id);
  const webContextMenuHandlers = Platform.OS === 'web'
    ? {
        onContextMenu: (event: GestureResponderEvent) => {
          event.preventDefault();
          didLongPressRef.current = true;
          onOpenMenu(event);
        },
      }
    : {};

  return (
    <View
      ref={(node) => registerDropZone(`project:${project.id}`, { kind: 'project', projectId: project.id }, node)}
      collapsable={false}
      style={[styles.projectHeaderWrap, dragging && styles.draggingRow]}
    >
      {position ? <DropIndicator before={position === 'before'} /> : null}
      <Pressable
        onPress={() => {
          if (didLongPressRef.current) {
            didLongPressRef.current = false;
            return;
          }
          onPress();
        }}
        onLongPress={(event) => {
          didLongPressRef.current = true;
          onOpenMenu(event);
        }}
        onPressIn={() => { didLongPressRef.current = false; }}
        {...webContextMenuHandlers}
        delayLongPress={420}
        accessibilityRole="button"
        accessibilityLabel={`${collapsed ? 'Expand' : 'Collapse'} ${project.name}`}
        accessibilityHint="Tap to expand or collapse. Press and hold for project actions."
        style={({ pressed }) => [styles.projectHeader, pressed && styles.pressed]}
      >
        <Text style={styles.projectChevron}>{collapsed ? '▸' : '▾'}</Text>
        <View style={[styles.projectPill, { backgroundColor: withAlpha(project.color, '24'), borderColor: withAlpha(project.color, '30') }]}>
          <Text numberOfLines={1} style={[styles.projectPillLabel, { color: project.color }]}>{project.code} · {project.name}</Text>
        </View>
        {tag ? <Text style={styles.projectTag}>{tag}</Text> : null}
        <View style={styles.projectProgressTrack}>
          <View style={[styles.projectProgressFill, { width: `${stats.percent}%`, backgroundColor: project.color }]} />
        </View>
        <Text style={[styles.projectPercent, { color: stats.percent ? project.color : Colors.t3 }]}>{stats.total ? `${stats.percent}%` : '—'}</Text>
      </Pressable>
      <DragHandle
        source={{ kind: 'project', projectId: project.id }}
        label={`Move ${project.name}`}
        selected={selected}
        dragging={dragging}
        onTap={onMovePress}
        dragCallbacks={dragCallbacks}
      />
    </View>
  );
}

function ProgressSegments({ complete, total }: { complete: number; total: number }) {
  const count = Math.min(8, Math.max(4, total));
  const filled = total ? Math.round((complete / total) * count) : 0;
  return (
    <View style={styles.segmentTrack}>
      {Array.from({ length: count }, (_, index) => <View key={index} style={[styles.progressSegment, index < filled && styles.progressSegmentFilled]} />)}
    </View>
  );
}

function TaskCard({
  task, project, rank, expanded, selected, selectedSubtaskId, onPress, onToggleDone,
  onOpenMenu, onMovePress, onToggleExpanded, onAddSubtask, onEditSubtask,
  onToggleSubtask, onMoveSubtask, onStart, dragState, registerDropZone, dragCallbacks,
}: {
  task: Task;
  project: TaskProject;
  rank: number | null;
  expanded: boolean;
  selected: boolean;
  selectedSubtaskId: string | null;
  onPress: () => void;
  onToggleDone: () => void;
  onOpenMenu: (event: GestureResponderEvent) => void;
  onMovePress: () => void;
  onToggleExpanded: () => void;
  onAddSubtask: () => void;
  onEditSubtask: (subtask: Subtask) => void;
  onToggleSubtask: (subtask: Subtask) => void;
  onMoveSubtask: (subtask: Subtask) => void;
  onStart: () => void;
  dragState: DragState | null;
  registerDropZone: (key: string, target: TaskDropZoneTarget, node: DropZoneNode | null) => void;
  dragCallbacks: DragCallbacks;
}) {
  const { motionStyle, hoverHandlers } = useHoverMotion();
  const didLongPressRef = useRef(false);
  const stats = getTaskItemStats(task);
  const hasSubtasks = task.subtasks.length > 0;
  const rows = useMemo(() => orderedSubtasks(task), [task]);
  const nextOpenId = rows.find((row) => !row.hasChildren && !row.subtask.done)?.subtask.id ?? null;
  const dragging = dragState?.source.kind === 'task' && dragState.source.taskId === task.id;
  const webContextMenuHandlers = Platform.OS === 'web'
    ? {
        onContextMenu: (event: GestureResponderEvent) => {
          event.preventDefault();
          didLongPressRef.current = true;
          onOpenMenu(event);
        },
      }
    : {};

  return (
    <Animated.View style={[styles.taskCard, expanded && styles.taskCardExpanded, selected && styles.taskCardSelected, dragging && styles.draggingCard, task.done && !dragging && styles.taskCardDone, motionStyle]}>
      <View style={styles.taskRow}>
        {hasSubtasks && !task.done ? (
          <Pressable onPress={onToggleExpanded} accessibilityRole="button" accessibilityLabel={expanded ? 'Collapse subtasks' : 'Expand subtasks'} style={styles.taskLeadButton}>
            <Text style={[styles.taskTriangle, expanded && styles.taskTriangleExpanded]}>▶</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onToggleDone} accessibilityRole="checkbox" accessibilityState={{ checked: task.done }} accessibilityLabel={task.done ? 'Mark task open' : 'Complete task'} style={[styles.taskCheckbox, task.done && styles.taskCheckboxDone]}>
            {task.done ? <Text style={styles.taskCheckmark}>✓</Text> : null}
          </Pressable>
        )}
        <Pressable
          onPress={() => {
            if (didLongPressRef.current) {
              didLongPressRef.current = false;
              return;
            }
            onPress();
          }}
          onLongPress={(event) => {
            didLongPressRef.current = true;
            onOpenMenu(event);
          }}
          {...webContextMenuHandlers}
          delayLongPress={420}
          accessibilityRole="button"
          accessibilityLabel={`${task.n}. ${taskDueLabel(task)}.`}
          accessibilityHint="Tap to open. Press and hold for rename, edit, or delete."
          style={({ pressed }) => [styles.taskBodyButton, pressed && styles.taskRowPressed]}
          onHoverIn={hoverHandlers.onHoverIn}
          onHoverOut={hoverHandlers.onHoverOut}
          onPressIn={() => {
            didLongPressRef.current = false;
            hoverHandlers.onPressIn();
          }}
          onPressOut={hoverHandlers.onPressOut}
        >
          <View style={[styles.taskEmojiBox, { backgroundColor: withAlpha(project.color, '15') }, task.done && styles.taskEmojiBoxDone]}><Text style={styles.taskEmoji}>{task.e}</Text></View>
          <View style={styles.taskCopy}>
            <View style={styles.taskTitleRow}>
              <Text numberOfLines={expanded ? 2 : 1} style={[styles.taskTitle, task.done && styles.doneText]}>{task.n}</Text>
              {rank ? <Text style={[styles.taskRank, { color: project.color }]}>{medalForIndex(rank - 1)}</Text> : null}
            </View>
            <View style={styles.taskMetaRow}>
              {task.done ? <Text style={styles.doneMeta}>Done</Text> : (
                <>
                  {task.ess ? <Text style={styles.essentialMeta}>★ Essential</Text> : null}
                  <Text style={task.dl ? styles.dueMeta : styles.taskMeta}>{taskDueLabel(task)}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.taskMeta}>{hasSubtasks ? `${stats.complete} of ${stats.total}` : task.t || 'No estimate'}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.eloMeta}>ELO {task.elo}</Text>
                </>
              )}
            </View>
          </View>
          {hasSubtasks && !task.done ? <Text style={[styles.taskPercent, { color: project.color }]}>{stats.percent}%</Text> : null}
        </Pressable>
        <DragHandle
          source={{ kind: 'task', taskId: task.id, projectId: project.id }}
          label={`Move ${task.n}`}
          selected={selected}
          dragging={dragging}
          onTap={onMovePress}
          dragCallbacks={dragCallbacks}
        />
      </View>

      {expanded && hasSubtasks ? (
        <View style={styles.subtaskPanel}>
          <ProgressSegments complete={stats.complete} total={stats.total} />
          <View style={styles.subtaskDivider} />
          {rows.map(({ subtask, depth, hasChildren, complete, total }) => {
            const next = subtask.id === nextOpenId;
            const rowSelected = selectedSubtaskId === subtask.id;
            return (
              <View
                key={subtask.id}
                ref={(node) => registerDropZone(
                  `subtask:${task.id}:${subtask.id}`,
                  { kind: 'subtask', taskId: task.id, subtaskId: subtask.id },
                  node,
                )}
                collapsable={false}
                style={[styles.subtaskRow, rowSelected && styles.subtaskRowSelected]}
              >
                {dropPosition(dragState?.target, 'subtask', subtask.id) ? (
                  <DropIndicator before={dropPosition(dragState?.target, 'subtask', subtask.id) === 'before'} />
                ) : null}
                <Pressable
                  onPress={() => (hasChildren ? undefined : onToggleSubtask(subtask))}
                  onLongPress={() => onEditSubtask(subtask)}
                  delayLongPress={350}
                  accessibilityRole={hasChildren ? 'button' : 'checkbox'}
                  accessibilityState={hasChildren ? undefined : { checked: subtask.done }}
                  style={({ pressed, hovered }) => [
                    styles.subtaskBodyButton,
                    { paddingLeft: 4 + depth * 18 },
                    hovered && styles.subtaskRowHover,
                    pressed && styles.pressed,
                  ]}
                >
                  {hasChildren ? <Text style={[styles.subtaskTriangle, complete === total && styles.subtaskTriangleDone]}>▶</Text> : (
                    <View style={[styles.subtaskCheckbox, subtask.done && styles.subtaskCheckboxDone, next && styles.subtaskCheckboxNext]}>{subtask.done ? <Text style={styles.subtaskCheckmark}>✓</Text> : null}</View>
                  )}
                  <Text numberOfLines={2} style={[styles.subtaskTitle, hasChildren && styles.subtaskGroupTitle, subtask.done && styles.subtaskDoneText]}>{subtask.n}</Text>
                  <Text style={[styles.subtaskRight, next && styles.subtaskNext]}>{hasChildren ? `${complete}/${total}` : next ? `NEXT · ${subtask.why || task.t}` : subtask.why || ''}</Text>
                </Pressable>
                <DragHandle
                  source={{ kind: 'subtask', taskId: task.id, subtaskId: subtask.id }}
                  label={`Move ${subtask.n}`}
                  selected={rowSelected}
                  dragging={dragState?.source.kind === 'subtask' && dragState.source.subtaskId === subtask.id}
                  onTap={() => onMoveSubtask(subtask)}
                  dragCallbacks={dragCallbacks}
                  compact
                />
              </View>
            );
          })}
          <View style={styles.subtaskActions}>
            <Pressable onPress={onAddSubtask} style={styles.textAction} accessibilityRole="button"><Text style={styles.textActionLabel}>+ Add step</Text></Pressable>
            <Pressable onPress={onStart} style={styles.startTaskButton} accessibilityRole="button"><Text style={styles.startTaskLabel}>▶ Start task</Text></Pressable>
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}

function BoardProjectCard({
  project,
  columnId,
  stats,
  previous,
  next,
  dragState,
  registerDropZone,
  dragCallbacks,
  onOpen,
  onOpenMenu,
  onMove,
}: {
  project: TaskProject;
  columnId: string;
  stats: ReturnType<typeof getProjectStats>;
  previous?: TaskBoardColumn;
  next?: TaskBoardColumn;
  dragState: DragState | null;
  registerDropZone: (key: string, target: TaskDropZoneTarget, node: DropZoneNode | null) => void;
  dragCallbacks: DragCallbacks;
  onOpen: () => void;
  onOpenMenu: (event: GestureResponderEvent) => void;
  onMove: (columnId: string) => void;
}) {
  const { motionStyle, hoverHandlers } = useHoverMotion();
  const didLongPressRef = useRef(false);
  const dragging = dragState?.source.kind === 'board-project' && dragState.source.projectId === project.id;
  const position = dropPosition(dragState?.target, 'board-project', project.id);
  const webContextMenuHandlers = Platform.OS === 'web'
    ? {
        onContextMenu: (event: GestureResponderEvent) => {
          event.preventDefault();
          didLongPressRef.current = true;
          onOpenMenu(event);
        },
      }
    : {};

  return (
    <View
      ref={(node) => registerDropZone(
        `board-project:${project.id}`,
        { kind: 'board-project', projectId: project.id, columnId },
        node,
      )}
      collapsable={false}
    >
      {position ? <DropIndicator before={position === 'before'} /> : null}
      <Animated.View style={[styles.boardCard, dragging && styles.draggingCard, motionStyle]}>
        <View style={styles.boardCardTop}>
          <View style={[styles.projectDot, { backgroundColor: project.color }]} />
          <Text numberOfLines={1} style={styles.boardCode}>{project.code}</Text>
          <DragHandle
            source={{ kind: 'board-project', projectId: project.id }}
            label={`Drag ${project.name}`}
            selected={false}
            dragging={dragging}
            dragCallbacks={dragCallbacks}
            compact
          />
        </View>
        <Pressable
          onPress={() => {
            if (didLongPressRef.current) {
              didLongPressRef.current = false;
              return;
            }
            onOpen();
          }}
          onLongPress={(event) => {
            didLongPressRef.current = true;
            onOpenMenu(event);
          }}
          onPressIn={() => {
            didLongPressRef.current = false;
            hoverHandlers.onPressIn();
          }}
          onPressOut={hoverHandlers.onPressOut}
          onHoverIn={hoverHandlers.onHoverIn}
          onHoverOut={hoverHandlers.onHoverOut}
          {...webContextMenuHandlers}
          delayLongPress={420}
          accessibilityRole="button"
          accessibilityLabel={project.name}
          accessibilityHint="Tap to open. Press and hold for project actions."
          style={styles.boardCardPressable}
        >
          <Text numberOfLines={2} style={styles.boardProjectName}>{project.name}</Text>
          <View style={styles.boardProgressRow}><View style={styles.boardProgressTrack}><View style={[styles.boardProgressFill, { width: `${stats.percent}%`, backgroundColor: project.color }]} /></View><Text style={[styles.boardPercent, { color: project.color }]}>{stats.percent}%</Text></View>
          <Text style={styles.boardSummary}>{stats.taskCount} task{stats.taskCount === 1 ? '' : 's'} · {stats.complete} of {stats.total} items</Text>
        </Pressable>
        <View style={styles.boardMoveRow}>
          <Pressable disabled={!previous} onPress={() => previous && onMove(previous.id)} style={[styles.boardMoveButton, !previous && styles.boardMoveDisabled]} accessibilityRole="button" accessibilityState={{ disabled: !previous }}><Text numberOfLines={1} style={styles.boardMoveLabel}>← {previous?.name ?? '—'}</Text></Pressable>
          <Pressable disabled={!next} onPress={() => next && onMove(next.id)} style={[styles.boardMoveButton, styles.boardMoveButtonNext, !next && styles.boardMoveDisabled]} accessibilityRole="button" accessibilityState={{ disabled: !next }}><Text numberOfLines={1} style={styles.boardMoveLabelActive}>{next?.name ?? '—'} →</Text></Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

function SheetOption({ active, title, subtitle, color, onPress }: { active: boolean; title: string; subtitle?: string; color?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: active }} style={({ pressed }) => [styles.sheetOption, active && styles.sheetOptionActive, pressed && styles.pressed]}>
      {color ? <View style={[styles.projectDot, { backgroundColor: color }]} /> : <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioFill} /> : null}</View>}
      <View style={styles.sheetOptionCopy}><Text style={styles.sheetOptionTitle}>{title}</Text>{subtitle ? <Text style={styles.sheetOptionSubtitle}>{subtitle}</Text> : null}</View>
      {active ? <Text style={styles.selectedLabel}>SELECTED</Text> : null}
    </Pressable>
  );
}

function EntityContextMenu({
  title,
  menu,
  onClose,
  onRename,
  onEdit,
  onDelete,
  editLabel = 'Edit details',
  canDelete = true,
}: {
  title: string | null;
  menu: { left: number; top: number } | null;
  onClose: () => void;
  onRename: () => void;
  onEdit: () => void;
  onDelete: () => void;
  editLabel?: string;
  canDelete?: boolean;
}) {
  if (!title || !menu) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.contextMenuLayer} accessibilityViewIsModal>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close action menu"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.contextMenu, { left: menu.left, top: menu.top }]}>
          <Text numberOfLines={1} style={styles.contextMenuTitle}>{title}</Text>
          <Pressable accessibilityRole="button" onPress={onRename} style={({ pressed }) => [styles.contextMenuItem, pressed && styles.contextMenuItemPressed]}>
            <Text style={styles.contextMenuLabel}>Rename</Text>
            <Text style={styles.contextMenuIcon}>✎</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onEdit} style={({ pressed }) => [styles.contextMenuItem, pressed && styles.contextMenuItemPressed]}>
            <Text style={styles.contextMenuLabel}>{editLabel}</Text>
            <Text style={styles.contextMenuIcon}>⋯</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canDelete }}
            disabled={!canDelete}
            onPress={onDelete}
            style={({ pressed }) => [
              styles.contextMenuItem,
              styles.contextMenuDeleteItem,
              !canDelete && styles.contextMenuItemDisabled,
              pressed && styles.contextMenuDeletePressed,
            ]}
          >
            <Text style={[styles.contextMenuDeleteLabel, !canDelete && styles.contextMenuDisabledLabel]}>Delete</Text>
            <Text style={[styles.contextMenuDeleteLabel, !canDelete && styles.contextMenuDisabledLabel]}>×</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function TasksScreen() {
  const { width, height } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && isDesktopWidth(width);
  const tasks = useAppStore((state) => state.tasks);
  const rawWorkspace = useAppStore((state) => state.taskWorkspace);
  const tasksView = useAppStore((state) => state.tasksView);
  const expandedTaskIds = useAppStore((state) => state.expandedTaskIds);
  const collapsedProjectIds = useAppStore((state) => state.collapsedTaskProjectIds);
  const setTasksView = useAppStore((state) => state.setTasksView);
  const setTaskSortMode = useAppStore((state) => state.setTaskSortMode);
  const toggleCompletedTasksAtBottom = useAppStore((state) => state.toggleCompletedTasksAtBottom);
  const toggleAutoMoveCompletedProjects = useAppStore((state) => state.toggleAutoMoveCompletedProjects);
  const toggleTaskExpanded = useAppStore((state) => state.toggleTaskExpanded);
  const toggleTaskProjectCollapsed = useAppStore((state) => state.toggleTaskProjectCollapsed);
  const saveTaskProject = useAppStore((state) => state.saveTaskProject);
  const deleteTaskProject = useAppStore((state) => state.deleteTaskProject);
  const moveTaskProject = useAppStore((state) => state.moveTaskProject);
  const moveProjectToColumn = useAppStore((state) => state.moveProjectToColumn);
  const renameTaskBoardColumn = useAppStore((state) => state.renameTaskBoardColumn);
  const addTaskBoardColumn = useAppStore((state) => state.addTaskBoardColumn);
  const removeTaskBoardColumn = useAppStore((state) => state.removeTaskBoardColumn);
  const moveTaskToProject = useAppStore((state) => state.moveTaskToProject);
  const saveTask = useAppStore((state) => state.saveTask);
  const deleteTask = useAppStore((state) => state.deleteTask);
  const toggleTaskDone = useAppStore((state) => state.toggleTaskDone);
  const saveSubtask = useAppStore((state) => state.saveSubtask);
  const deleteSubtask = useAppStore((state) => state.deleteSubtask);
  const toggleSubtaskDone = useAppStore((state) => state.toggleSubtaskDone);
  const moveSubtask = useAppStore((state) => state.moveSubtask);
  const moveTask = useAppStore((state) => state.moveTask);
  const startRunner = useAppStore((state) => state.startRunner);
  const { confettiOverlay, triggerConfetti } = useConfettiOverlay();

  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(blankTaskDraft());
  const [projectSheetOpen, setProjectSheetOpen] = useState(false);
  const [projectDraft, setProjectDraft] = useState<TaskProjectDraft>(blankProjectDraft());
  const [subtaskSheetOpen, setSubtaskSheetOpen] = useState(false);
  const [subtaskTaskId, setSubtaskTaskId] = useState<string | null>(null);
  const [subtaskDraft, setSubtaskDraft] = useState<SubtaskDraft>({ e: '📌', n: '', why: '' });
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [configSheetOpen, setConfigSheetOpen] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [quickTask, setQuickTask] = useState('');
  const [quickProjectId, setQuickProjectId] = useState(DEFAULT_TASK_PROJECT_ID);
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedSubtask, setSelectedSubtask] = useState<{ taskId: string; id: string } | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [taskMenu, setTaskMenu] = useState<TaskMenuState | null>(null);
  const [projectMenu, setProjectMenu] = useState<ProjectMenuState | null>(null);
  const [renameTaskId, setRenameTaskId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null);
  const [renameProjectText, setRenameProjectText] = useState('');
  const listRef = useRef<FlatList<TaskListRow>>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const dropZoneRegistrationsRef = useRef(new Map<string, DropZoneRegistration>());
  const measuredDropZonesRef = useRef<MeasuredTaskDropZone[]>([]);
  const measureGenerationRef = useRef(0);
  const listScrollOffsetRef = useRef(0);
  const listViewportRef = useRef<{ top: number; bottom: number } | null>(null);
  const lastDragPointRef = useRef<TaskDragPoint | null>(null);

  const workspace = useMemo(() => normalizeTaskWorkspace(rawWorkspace), [rawWorkspace]);
  const columns = useMemo(() => [...workspace.columns].sort((left, right) => left.order - right.order), [workspace.columns]);
  const projects = useMemo(() => [...workspace.projects].sort((left, right) => left.order - right.order), [workspace.projects]);
  const activeView: 'list' | 'board' = tasksView === 'board' ? 'board' : 'list';
  const workspaceStats = useMemo(() => getWorkspaceStats(tasks), [tasks]);
  const quickProject = projects.find((project) => project.id === quickProjectId) ?? projects[0];

  useEffect(() => { if (tasksView === 'insights') setTasksView('list'); }, [setTasksView, tasksView]);
  useEffect(() => {
    if (!projects.some((project) => project.id === quickProjectId)) setQuickProjectId(projects[0]?.id ?? DEFAULT_TASK_PROJECT_ID);
  }, [projects, quickProjectId]);

  const registerDropZone = useCallback(
    (key: string, target: TaskDropZoneTarget, node: DropZoneNode | null) => {
      if (!node) {
        dropZoneRegistrationsRef.current.delete(key);
        return;
      }
      dropZoneRegistrationsRef.current.set(key, { node, target });
      node.measureInWindow((x, y, zoneWidth, zoneHeight) => {
        if (zoneWidth <= 0 || zoneHeight <= 0) return;
        measuredDropZonesRef.current = [
          ...measuredDropZonesRef.current.filter((zone) => zone.key !== key),
          { key, target, x, y, width: zoneWidth, height: zoneHeight },
        ];
      });
    },
    [],
  );

  const measureDropZones = useCallback(() => {
    const generation = ++measureGenerationRef.current;
    const measured: MeasuredTaskDropZone[] = [];
    measuredDropZonesRef.current = measured;

    dropZoneRegistrationsRef.current.forEach(({ node, target }, key) => {
      node.measureInWindow((x, y, zoneWidth, zoneHeight) => {
        if (generation !== measureGenerationRef.current || zoneWidth <= 0 || zoneHeight <= 0) return;
        measured.push({ key, target, x, y, width: zoneWidth, height: zoneHeight });
        measuredDropZonesRef.current = [...measured];
      });
    });
  }, []);

  const setCurrentDrag = useCallback((next: DragState | null) => {
    dragStateRef.current = next;
    setDragState(next);
  }, []);

  const handleDragStart = useCallback(
    (source: TaskDragSource, point: TaskDragPoint) => {
      const next = { source, target: null };
      lastDragPointRef.current = point;
      setTaskMenu(null);
      setProjectMenu(null);
      setSelectedProjectId(null);
      setSelectedTaskId(null);
      setSelectedSubtask(null);
      setCurrentDrag(next);
      measureDropZones();
      setTimeout(measureDropZones, 0);

      const nativeScrollRef = listRef.current?.getNativeScrollRef?.() as unknown as DropZoneNode | undefined;
      nativeScrollRef?.measureInWindow((_x, y, _width, viewportHeight) => {
        listViewportRef.current = { top: y, bottom: y + viewportHeight };
      });

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [measureDropZones, setCurrentDrag],
  );

  const handleDragMove = useCallback(
    (point: TaskDragPoint) => {
      const current = dragStateRef.current;
      if (!current) return;

      lastDragPointRef.current = point;
      const target = pickTaskDropTarget(current.source, measuredDropZonesRef.current, point);
      const previousTarget = current.target;
      const changed = !sameDropTarget(previousTarget, target);
      if (changed) {
        setCurrentDrag({ ...current, target });
        if (target) void Haptics.selectionAsync();
      }

      const viewport = listViewportRef.current;
      if (!viewport || activeView !== 'list') return;

      const edge = 72;
      const delta = point.y < viewport.top + edge ? -18 : point.y > viewport.bottom - edge ? 18 : 0;
      if (!delta) return;

      const nextOffset = Math.max(0, listScrollOffsetRef.current + delta);
      listScrollOffsetRef.current = nextOffset;
      listRef.current?.scrollToOffset({ offset: nextOffset, animated: false });
      setTimeout(measureDropZones, 0);
    },
    [activeView, measureDropZones, setCurrentDrag],
  );

  const handleDragEnd = useCallback(
    (didMove: boolean) => {
      const current = dragStateRef.current;
      setCurrentDrag(null);
      lastDragPointRef.current = null;
      listViewportRef.current = null;
      if (!didMove || !current?.target) return;

      const { source, target } = current;
      if (source.kind === 'project' && target.kind === 'project') {
        moveTaskProject(source.projectId, target.projectId, target.before);
      } else if (source.kind === 'task' && target.kind === 'task') {
        moveTaskToProject(source.taskId, target.projectId);
        moveTask(source.taskId, target.taskId, target.before);
        setTaskSortMode('custom');
      } else if (source.kind === 'task' && target.kind === 'project') {
        moveTaskToProject(source.taskId, target.projectId);
        setTaskSortMode('custom');
      } else if (source.kind === 'subtask' && target.kind === 'subtask') {
        moveSubtask(source.taskId, source.subtaskId, target.subtaskId, target.before);
        setTaskSortMode('custom');
      } else if (source.kind === 'board-project' && target.kind === 'board-project') {
        moveProjectToColumn(source.projectId, target.columnId);
        moveTaskProject(source.projectId, target.projectId, target.before);
      } else if (source.kind === 'board-project' && target.kind === 'board-column') {
        moveProjectToColumn(source.projectId, target.columnId);
      }

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [
      moveProjectToColumn,
      moveSubtask,
      moveTask,
      moveTaskProject,
      moveTaskToProject,
      setCurrentDrag,
      setTaskSortMode,
    ],
  );

  const dragCallbacks = useMemo<DragCallbacks>(
    () => ({
      onDragStart: handleDragStart,
      onDragMove: handleDragMove,
      onDragEnd: handleDragEnd,
    }),
    [handleDragEnd, handleDragMove, handleDragStart],
  );

  const showTaskMenu = useCallback(
    (task: Task, event: GestureResponderEvent) => {
      const menuWidth = 208;
      const menuHeight = 176;
      const left = Math.max(12, Math.min(event.nativeEvent.pageX - 24, width - menuWidth - 12));
      const top = Math.max(12, Math.min(event.nativeEvent.pageY + 12, height - menuHeight - 12));
      setTaskMenu({ taskId: task.id, left, top });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    [height, width],
  );

  const showProjectMenu = useCallback(
    (project: TaskProject, event: GestureResponderEvent) => {
      const menuWidth = 208;
      const menuHeight = 176;
      const left = Math.max(12, Math.min(event.nativeEvent.pageX - 24, width - menuWidth - 12));
      const top = Math.max(12, Math.min(event.nativeEvent.pageY + 12, height - menuHeight - 12));
      setTaskMenu(null);
      setProjectMenu({ projectId: project.id, left, top });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    [height, width],
  );

  const activeMenuTask = taskMenu
    ? tasks.find((task) => task.id === taskMenu.taskId) ?? null
    : null;
  const activeMenuProject = projectMenu
    ? projects.find((project) => project.id === projectMenu.projectId) ?? null
    : null;

  const rankByTaskId = useMemo(() => {
    const backlogId = columns[0]?.id;
    const projectById = new Map(projects.map((project) => [project.id, project]));
    const ranked = tasks
      .filter((task) => !task.done && projectById.get(resolveTaskProjectId(task, workspace))?.columnId !== backlogId)
      .sort((left, right) => right.elo - left.elo);
    return new Map(ranked.map((task, index) => [task.id, index + 1]));
  }, [columns, projects, tasks, workspace]);

  const listRows = useMemo<TaskListRow[]>(() => {
    const columnIndex = new Map(columns.map((column, index) => [column.id, index]));
    const lastColumnId = columns[columns.length - 1]?.id;
    const firstColumnId = columns[0]?.id;
    const visibleProjects = projects
      .filter((project) => !filterProjectId || project.id === filterProjectId)
      .sort((left, right) => {
        const leftIndex = columnIndex.get(left.columnId) ?? 0;
        const rightIndex = columnIndex.get(right.columnId) ?? 0;
        const tier = (project: TaskProject, index: number) => project.columnId === lastColumnId ? 2 : index === 0 ? 1 : 0;
        return tier(left, leftIndex) - tier(right, rightIndex) || left.order - right.order;
      });
    const rows: TaskListRow[] = [];
    visibleProjects.forEach((project) => {
      const collapsed = collapsedProjectIds.includes(project.id) && !filterProjectId;
      const tag = project.columnId === firstColumnId ? 'BACKLOG' : project.columnId === lastColumnId ? 'DONE' : null;
      rows.push({ id: `project:${project.id}`, kind: 'project', project, collapsed, tag });
      if (collapsed) return;
      const projectTasks = sortWorkspaceTasks(
        tasks.filter((task) => resolveTaskProjectId(task, workspace) === project.id),
        workspace.preferences.sort,
        workspace.preferences.completedAtBottom,
      );
      if (!projectTasks.length) rows.push({ id: `empty:${project.id}`, kind: 'empty', project });
      else projectTasks.forEach((task) => rows.push({ id: `task:${task.id}`, kind: 'task', task, project, rank: rankByTaskId.get(task.id) ?? null }));
    });
    return rows;
  }, [collapsedProjectIds, columns, filterProjectId, projects, rankByTaskId, tasks, workspace]);

  const taskToDraft = (task: Task): TaskDraft => ({
    id: task.id,
    e: task.e,
    n: task.n,
    t: task.t,
    dl: task.dl,
    ess: task.ess,
    detail: task.detail ?? '',
    dueLabel: task.dueLabel,
    projectId: resolveTaskProjectId(task, workspace),
  });
  const openTaskEditor = (task?: Task, projectId?: string) => {
    setTaskDraft(task ? taskToDraft(task) : blankTaskDraft(projectId ?? quickProject?.id ?? DEFAULT_TASK_PROJECT_ID));
    setTaskSheetOpen(true);
  };
  const beginRenameTask = (task: Task) => {
    setTaskMenu(null);
    setRenameTaskId(task.id);
    setRenameText(task.n);
  };
  const saveRenamedTask = () => {
    const task = tasks.find((entry) => entry.id === renameTaskId);
    const title = renameText.trim();
    if (!task || !title) return;
    saveTask({ ...taskToDraft(task), n: title });
    setRenameTaskId(null);
    setRenameText('');
  };
  const confirmDeleteTask = (task: Task) => {
    setTaskMenu(null);
    confirmDestructiveAction('Delete task?', 'This also removes its steps.', () => deleteTask(task.id));
  };
  const openProjectEditor = (project?: TaskProject, columnId?: string) => {
    setProjectDraft(project ? { id: project.id, code: project.code, name: project.name, color: project.color, columnId: project.columnId } : blankProjectDraft(columnId ?? columns[1]?.id ?? columns[0]?.id));
    setProjectSheetOpen(true);
  };
  const beginRenameProject = (project: TaskProject) => {
    setProjectMenu(null);
    setRenameProjectId(project.id);
    setRenameProjectText(project.name);
  };
  const saveRenamedProject = () => {
    const project = projects.find((entry) => entry.id === renameProjectId);
    const name = renameProjectText.trim();
    if (!project || !name) return;
    saveTaskProject({
      id: project.id,
      code: project.code,
      name,
      color: project.color,
      columnId: project.columnId,
    });
    setRenameProjectId(null);
    setRenameProjectText('');
  };
  const confirmDeleteProject = (project: TaskProject) => {
    if (project.id === DEFAULT_TASK_PROJECT_ID) return;
    setProjectMenu(null);
    confirmDestructiveAction('Delete project?', 'Its tasks will move to Personal.', () => deleteTaskProject(project.id));
  };
  const openSubtaskEditor = (taskId: string, subtask?: Subtask) => {
    setSubtaskTaskId(taskId);
    setSubtaskDraft(subtask ? { id: subtask.id, e: subtask.e, n: subtask.n, why: subtask.why ?? '' } : { e: '📌', n: '', why: '' });
    setSubtaskSheetOpen(true);
  };
  const submitQuickTask = () => {
    const title = quickTask.trim();
    if (!title) return;
    saveTask({ ...blankTaskDraft(quickProject?.id), e: '📝', n: title });
    setQuickTask('');
  };
  const handleTaskPress = (task: Task, project: TaskProject, rowIndex: number) => {
    if (selectedTaskId && selectedTaskId !== task.id) {
      moveTaskToProject(selectedTaskId, project.id);
      moveTask(selectedTaskId, task.id);
      setSelectedTaskId(null);
      setTaskSortMode('custom');
      return;
    }
    if (selectedTaskId === task.id) return setSelectedTaskId(null);
    if (!task.subtasks.length) {
      openTaskEditor(task);
      return;
    }
    toggleTaskExpanded(task.id);
    if (!expandedTaskIds.includes(task.id)) setTimeout(() => listRef.current?.scrollToIndex({ index: rowIndex, animated: true, viewPosition: 0.18 }), 60);
  };

  const renderListRow: ListRenderItem<TaskListRow> = ({ item, index }) => {
    if (item.kind === 'project') {
      return (
        <ProjectHeader
          project={item.project}
          stats={getProjectStats(item.project.id, tasks, workspace)}
          collapsed={item.collapsed}
          tag={item.tag}
          selected={selectedProjectId === item.project.id}
          dragState={dragState}
          registerDropZone={registerDropZone}
          dragCallbacks={dragCallbacks}
          onOpenMenu={(event) => showProjectMenu(item.project, event)}
          onPress={() => {
            if (selectedTaskId) {
              moveTaskToProject(selectedTaskId, item.project.id);
              setSelectedTaskId(null);
              setTaskSortMode('custom');
            } else if (selectedProjectId && selectedProjectId !== item.project.id) {
              moveTaskProject(selectedProjectId, item.project.id);
              setSelectedProjectId(null);
            } else toggleTaskProjectCollapsed(item.project.id);
          }}
          onMovePress={() => setSelectedProjectId((current) => current === item.project.id ? null : item.project.id)}
        />
      );
    }
    if (item.kind === 'empty') return <Pressable onPress={() => openTaskEditor(undefined, item.project.id)} style={styles.emptyProject}><Text style={styles.emptyProjectText}>Nothing here yet · add a task</Text></Pressable>;
    const expanded = expandedTaskIds.includes(item.task.id);
    const taskDropPosition = dropPosition(dragState?.target, 'task', item.task.id);
    return (
      <View
        ref={(node) => registerDropZone(
          `task:${item.task.id}`,
          { kind: 'task', taskId: item.task.id, projectId: item.project.id },
          node,
        )}
        collapsable={false}
        style={styles.taskCardWrap}
      >
        {taskDropPosition ? <DropIndicator before={taskDropPosition === 'before'} /> : null}
        <TaskCard
          task={item.task}
          project={item.project}
          rank={item.rank}
          expanded={expanded}
          selected={selectedTaskId === item.task.id}
          selectedSubtaskId={selectedSubtask?.taskId === item.task.id ? selectedSubtask.id : null}
          onPress={() => handleTaskPress(item.task, item.project, index)}
          onToggleDone={() => { if (!item.task.done) triggerConfetti({ count: 34 }); toggleTaskDone(item.task.id); }}
          onOpenMenu={(event) => showTaskMenu(item.task, event)}
          onMovePress={() => { setSelectedProjectId(null); setSelectedSubtask(null); setSelectedTaskId((current) => current === item.task.id ? null : item.task.id); }}
          onToggleExpanded={() => handleTaskPress(item.task, item.project, index)}
          onAddSubtask={() => openSubtaskEditor(item.task.id)}
          onEditSubtask={(subtask) => openSubtaskEditor(item.task.id, subtask)}
          onToggleSubtask={(subtask) => {
            const remaining = item.task.subtasks.filter((entry) => !entry.done && entry.id !== subtask.id);
            if (!subtask.done && remaining.length === 0) triggerConfetti({ count: 42 });
            toggleSubtaskDone(item.task.id, subtask.id);
          }}
          onMoveSubtask={(subtask) => {
            if (selectedSubtask?.taskId === item.task.id && selectedSubtask.id !== subtask.id) {
              moveSubtask(item.task.id, selectedSubtask.id, subtask.id);
              setSelectedSubtask(null);
              setTaskSortMode('custom');
            } else setSelectedSubtask((current) => current?.taskId === item.task.id && current.id === subtask.id ? null : { taskId: item.task.id, id: subtask.id });
          }}
          onStart={() => startTransition(() => { startRunner(item.task.id); router.push({ pathname: '/runner', params: { taskId: item.task.id } }); })}
          dragState={dragState}
          registerDropZone={registerDropZone}
          dragCallbacks={dragCallbacks}
        />
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.content, desktop && styles.contentDesktop]}>
        <View style={styles.header}><Text style={styles.headerTitle}>Tasks</Text><ModeSwitch value={activeView} onChange={setTasksView} /></View>

        {activeView === 'list' ? (
          <>
            <View style={styles.listToolbar}>
              {filterProjectId ? <Pressable onPress={() => setFilterProjectId(null)} style={styles.toolbarButton}><Text style={styles.toolbarActive}>← All projects</Text></Pressable> : <Pressable onPress={() => setSortSheetOpen(true)} style={styles.toolbarButton}><Text style={styles.toolbarLabel}>{SORT_OPTIONS.find((option) => option.value === workspace.preferences.sort)?.label} ▾</Text></Pressable>}
              <Text style={styles.weekSummary}>{workspaceStats.open} open · {workspaceStats.percent}% this week</Text>
              <View style={[styles.toolbarUnderline, { width: `${Math.max(14, workspaceStats.percent)}%` }]} />
            </View>
            <FlatList
              ref={listRef}
              data={listRows}
              renderItem={renderListRow}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              initialNumToRender={12}
              maxToRenderPerBatch={8}
              updateCellsBatchingPeriod={32}
              windowSize={7}
              removeClippedSubviews={Platform.OS !== 'web'}
              onScroll={(event) => {
                listScrollOffsetRef.current = event.nativeEvent.contentOffset.y;
                if (dragStateRef.current) measureDropZones();
              }}
              scrollEventThrottle={16}
              onScrollToIndexFailed={({ index, averageItemLength }) => listRef.current?.scrollToOffset({ offset: Math.max(0, index * averageItemLength - 60), animated: true })}
              ListEmptyComponent={<View style={styles.emptyState}><Text style={styles.emptyStateTitle}>No projects yet</Text><Text style={styles.emptyStateCopy}>Create a project, then add the first task.</Text><ActionButton label="Create project" tone="primary" onPress={() => openProjectEditor()} /></View>}
            />
            <View style={styles.quickAddFade} pointerEvents="box-none">
              <View style={styles.quickAdd}>
                <Text style={styles.quickPlus}>+</Text>
                <TextInput value={quickTask} onChangeText={setQuickTask} onSubmitEditing={submitQuickTask} returnKeyType="done" placeholder="Add a task…" placeholderTextColor={Colors.t3} style={styles.quickInput} accessibilityLabel="Quick add a task" />
                <Pressable onPress={() => setProjectPickerOpen(true)} style={styles.quickProjectButton} accessibilityRole="button" accessibilityLabel="Choose a project">
                  <View style={[styles.quickProjectDot, { backgroundColor: quickProject?.color ?? Colors.violet }]} />
                  <Text numberOfLines={1} style={styles.quickProjectLabel}>{quickProject ? `${quickProject.code} · ${quickProject.name}` : 'Project'}</Text><Text style={styles.quickProjectChevron}>▾</Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.boardToolbar}><Text style={styles.boardToolbarCopy}>Project tracker · drag ⠿ between columns</Text><Pressable onPress={() => setConfigSheetOpen(true)}><Text style={styles.configureLabel}>Configure</Text></Pressable></View>
            <FlatList
              horizontal
              data={columns}
              keyExtractor={(column) => column.id}
              style={styles.boardList}
              contentContainerStyle={styles.boardListContent}
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToAlignment="start"
              snapToInterval={262}
              disableIntervalMomentum
              initialNumToRender={2}
              maxToRenderPerBatch={2}
              windowSize={3}
              removeClippedSubviews={Platform.OS !== 'web'}
              renderItem={({ item: column, index }) => {
                const columnProjects = projects.filter((project) => project.columnId === column.id);
                return (
                  <View
                    ref={(node) => registerDropZone(
                      `board-column:${column.id}`,
                      { kind: 'board-column', columnId: column.id },
                      node,
                    )}
                    collapsable={false}
                    style={styles.boardColumn}
                  >
                    <View style={styles.boardColumnHeader}><Text style={styles.boardColumnTitle}>{column.name}</Text><View style={styles.boardCountPill}><Text style={styles.boardCount}>{columnProjects.length}</Text></View></View>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.boardColumnContent} nestedScrollEnabled decelerationRate="normal">
                      {columnProjects.map((project) => (
                        <BoardProjectCard
                          key={project.id}
                          project={project}
                          columnId={column.id}
                          stats={getProjectStats(project.id, tasks, workspace)}
                          previous={columns[index - 1]}
                          next={columns[index + 1]}
                          dragState={dragState}
                          registerDropZone={registerDropZone}
                          dragCallbacks={dragCallbacks}
                          onOpen={() => { setFilterProjectId(project.id); setTasksView('list'); }}
                          onOpenMenu={(event) => showProjectMenu(project, event)}
                          onMove={(columnId) => moveProjectToColumn(project.id, columnId)}
                        />
                      ))}
                      {!columnProjects.length ? <View style={styles.boardEmpty}><Text style={styles.boardEmptyText}>Drop a project here</Text></View> : null}
                    </ScrollView>
                  </View>
                );
              }}
            />
          </>
        )}
      </View>

      {confettiOverlay}

      <EntityContextMenu
        title={activeMenuTask?.n ?? null}
        menu={taskMenu}
        onClose={() => setTaskMenu(null)}
        onRename={() => activeMenuTask && beginRenameTask(activeMenuTask)}
        onEdit={() => {
          if (!activeMenuTask) return;
          setTaskMenu(null);
          openTaskEditor(activeMenuTask);
        }}
        onDelete={() => activeMenuTask && confirmDeleteTask(activeMenuTask)}
      />

      <EntityContextMenu
        title={activeMenuProject?.name ?? null}
        menu={projectMenu}
        editLabel="Edit project"
        canDelete={activeMenuProject?.id !== DEFAULT_TASK_PROJECT_ID}
        onClose={() => setProjectMenu(null)}
        onRename={() => activeMenuProject && beginRenameProject(activeMenuProject)}
        onEdit={() => {
          if (!activeMenuProject) return;
          setProjectMenu(null);
          openProjectEditor(activeMenuProject);
        }}
        onDelete={() => activeMenuProject && confirmDeleteProject(activeMenuProject)}
      />

      <Sheet open={renameTaskId !== null} title="Rename task" onClose={() => setRenameTaskId(null)}>
        <Field
          label="Task name"
          value={renameText}
          onChangeText={setRenameText}
          placeholder="Task name"
        />
        <ActionButton label="Save name" tone="primary" onPress={saveRenamedTask} />
      </Sheet>

      <Sheet open={renameProjectId !== null} title="Rename project" onClose={() => setRenameProjectId(null)}>
        <Field
          label="Project name"
          value={renameProjectText}
          onChangeText={setRenameProjectText}
          placeholder="Project name"
        />
        <ActionButton label="Save name" tone="primary" onPress={saveRenamedProject} />
      </Sheet>

      <Sheet open={taskSheetOpen} title={taskDraft.id ? 'Edit task' : 'Add task'} onClose={() => setTaskSheetOpen(false)}>
        <EmojiPicker values={EMOJIS} value={taskDraft.e} onChange={(e) => setTaskDraft((current) => ({ ...current, e }))} />
        <Field label="Title" value={taskDraft.n} onChangeText={(n) => setTaskDraft((current) => ({ ...current, n }))} placeholder="What needs to happen?" />
        <View style={styles.twoColumnFields}><View style={styles.flexField}><Field label="Due label" value={taskDraft.dueLabel ?? ''} onChangeText={(dueLabel) => setTaskDraft((current) => ({ ...current, dueLabel }))} placeholder="Due Fri" /></View><View style={styles.flexField}><Field label="Estimate" value={taskDraft.t} onChangeText={(t) => setTaskDraft((current) => ({ ...current, t }))} placeholder="30 min" /></View></View>
        <Field label="Details" value={taskDraft.detail ?? ''} onChangeText={(detail) => setTaskDraft((current) => ({ ...current, detail }))} placeholder="Optional notes" />
        <Text style={styles.sheetSectionLabel}>Project</Text>
        {projects.map((project) => <SheetOption key={project.id} active={(taskDraft.projectId ?? DEFAULT_TASK_PROJECT_ID) === project.id} title={`${project.code} · ${project.name}`} color={project.color} onPress={() => setTaskDraft((current) => ({ ...current, projectId: project.id }))} />)}
        <Text style={styles.sheetSectionLabel}>Timing</Text>
        <SegmentedControl items={[{ label: 'No date', value: 'none' }, { label: 'Today', value: 'today' }, { label: 'This week', value: 'this week' }]} value={taskDraft.dl ?? 'none'} onChange={(value) => setTaskDraft((current) => ({ ...current, dl: value === 'none' ? null : value }))} />
        <ToggleRow label="Essential" subtitle="Keep this task out of arena comparisons." active={taskDraft.ess} onPress={() => setTaskDraft((current) => ({ ...current, ess: !current.ess }))} />
        <ActionButton label="Save task" tone="primary" onPress={() => { if (!taskDraft.n.trim()) return; saveTask(taskDraft); setTaskSheetOpen(false); }} />
        {taskDraft.id ? <ActionButton label="Delete task" onPress={() => confirmDestructiveAction('Delete task?', 'This also removes its steps.', () => { deleteTask(taskDraft.id!); setTaskSheetOpen(false); })} /> : null}
      </Sheet>

      <Sheet open={subtaskSheetOpen} title={subtaskDraft.id ? 'Edit step' : 'Add step'} onClose={() => setSubtaskSheetOpen(false)}>
        <EmojiPicker values={SUBTASK_EMOJIS} value={subtaskDraft.e} onChange={(e) => setSubtaskDraft((current) => ({ ...current, e }))} />
        <Field label="Step" value={subtaskDraft.n} onChangeText={(n) => setSubtaskDraft((current) => ({ ...current, n }))} placeholder="Name the next action" />
        <Field label="Estimate or note" value={subtaskDraft.why ?? ''} onChangeText={(why) => setSubtaskDraft((current) => ({ ...current, why }))} placeholder="10 min" />
        <ActionButton label="Save step" tone="primary" onPress={() => { if (!subtaskTaskId || !subtaskDraft.n.trim()) return; saveSubtask(subtaskTaskId, subtaskDraft); setSubtaskSheetOpen(false); }} />
        {subtaskDraft.id && subtaskTaskId ? <ActionButton label="Delete step" onPress={() => { deleteSubtask(subtaskTaskId, subtaskDraft.id!); setSubtaskSheetOpen(false); }} /> : null}
      </Sheet>

      <Sheet open={sortSheetOpen} title="Sort tasks" onClose={() => setSortSheetOpen(false)}>
        {SORT_OPTIONS.map((option) => <SheetOption key={option.value} active={workspace.preferences.sort === option.value} title={option.label} subtitle={option.detail} onPress={() => { setTaskSortMode(option.value); setSortSheetOpen(false); }} />)}
        <ToggleRow label="Completed at the bottom" subtitle="Finished tasks stay visible below open work." active={workspace.preferences.completedAtBottom} onPress={toggleCompletedTasksAtBottom} />
        <Text style={styles.gestureHint}>Drag ⠿ to reorder projects, tasks, and steps. Press and hold a task or project for more actions.</Text>
      </Sheet>

      <Sheet open={projectPickerOpen} title="Add to project" onClose={() => setProjectPickerOpen(false)}>
        {projects.map((project) => {
          const stats = getProjectStats(project.id, tasks, workspace);
          const column = columns.find((entry) => entry.id === project.columnId);
          return <SheetOption key={project.id} active={quickProject?.id === project.id} title={`${project.code} · ${project.name}`} subtitle={`${stats.taskCount} task${stats.taskCount === 1 ? '' : 's'} · ${column?.name ?? ''}`} color={project.color} onPress={() => { setQuickProjectId(project.id); setProjectPickerOpen(false); }} />;
        })}
        <ActionButton label="Create project" onPress={() => { setProjectPickerOpen(false); openProjectEditor(); }} />
      </Sheet>

      <Sheet open={configSheetOpen} title="Board columns" onClose={() => setConfigSheetOpen(false)}>
        <ActionButton label="New project" tone="primary" onPress={() => openProjectEditor()} />
        <Text style={styles.sheetSectionLabel}>Columns</Text>
        {columns.map((column) => {
          const count = projects.filter((project) => project.columnId === column.id).length;
          const removable = count === 0 && columns.length > 2;
          return (
            <View key={column.id} style={styles.columnConfigRow}>
              <TextInput defaultValue={column.name} onEndEditing={(event) => renameTaskBoardColumn(column.id, event.nativeEvent.text)} style={styles.columnConfigInput} accessibilityLabel={`Rename ${column.name}`} />
              <Text style={styles.columnConfigCount}>{count ? `${count} proj.` : 'empty'}</Text>
              <Pressable disabled={!removable} onPress={() => removeTaskBoardColumn(column.id)} style={[styles.columnRemoveButton, !removable && styles.columnRemoveDisabled]} accessibilityRole="button" accessibilityState={{ disabled: !removable }}><Text style={styles.columnRemoveLabel}>×</Text></Pressable>
            </View>
          );
        })}
        <Pressable onPress={addTaskBoardColumn} style={styles.addColumnButton}><Text style={styles.addColumnLabel}>+ Add column</Text></Pressable>
        <ToggleRow label="Auto-move at 100%" subtitle="Move a project to the last column when all its tasks are done." active={workspace.preferences.autoMoveCompletedProjects} onPress={toggleAutoMoveCompletedProjects} />
        <Text style={styles.sheetSectionLabel}>Projects</Text>
        {projects.map((project) => <Pressable key={project.id} onPress={() => openProjectEditor(project)} style={styles.projectConfigRow}><View style={[styles.projectDot, { backgroundColor: project.color }]} /><Text numberOfLines={1} style={styles.projectConfigName}>{project.code} · {project.name}</Text><Text style={styles.projectConfigEdit}>Edit</Text></Pressable>)}
      </Sheet>

      <Sheet open={projectSheetOpen} title={projectDraft.id ? 'Edit project' : 'New project'} onClose={() => setProjectSheetOpen(false)}>
        <View style={styles.twoColumnFields}><View style={styles.projectCodeField}><Field label="Code" value={projectDraft.code} onChangeText={(code) => setProjectDraft((current) => ({ ...current, code }))} placeholder="PERSONAL" /></View><View style={styles.flexField}><Field label="Name" value={projectDraft.name} onChangeText={(name) => setProjectDraft((current) => ({ ...current, name }))} placeholder="Personal" /></View></View>
        <Text style={styles.sheetSectionLabel}>Color</Text>
        <View style={styles.colorRow}>{TASK_PROJECT_COLORS.map((color) => <Pressable key={color} onPress={() => setProjectDraft((current) => ({ ...current, color }))} style={[styles.colorChoice, { backgroundColor: color }, projectDraft.color === color && styles.colorChoiceActive]} accessibilityRole="radio" accessibilityState={{ selected: projectDraft.color === color }} />)}</View>
        <Text style={styles.sheetSectionLabel}>Column</Text>
        {columns.map((column) => <SheetOption key={column.id} active={projectDraft.columnId === column.id} title={column.name} onPress={() => setProjectDraft((current) => ({ ...current, columnId: column.id }))} />)}
        <ActionButton label="Save project" tone="primary" onPress={() => {
          if (!projectDraft.name.trim()) return;
          saveTaskProject(projectDraft);
          if (!projectDraft.id) setTimeout(() => { const latest = useAppStore.getState().taskWorkspace.projects; const created = latest[latest.length - 1]; if (created) setQuickProjectId(created.id); }, 0);
          setProjectSheetOpen(false);
        }} />
        {projectDraft.id && projectDraft.id !== DEFAULT_TASK_PROJECT_ID ? <ActionButton label="Delete project" onPress={() => confirmDestructiveAction('Delete project?', 'Its tasks will move to Personal.', () => { deleteTaskProject(projectDraft.id!); setProjectSheetOpen(false); })} /> : null}
      </Sheet>
    </View>
  );
}

function EmojiPicker({ values, value, onChange }: { values: string[]; value: string; onChange: (value: string) => void }) {
  return <View style={styles.emojiRow}>{values.map((emoji) => <Pressable key={emoji} onPress={() => onChange(emoji)} style={[styles.emojiChip, value === emoji && styles.emojiChipActive]}><Text style={styles.emojiChoice}>{emoji}</Text></Pressable>)}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { flex: 1, width: '100%', alignSelf: 'center' },
  contentDesktop: { maxWidth: Layout.narrowMaxWidth },
  header: {
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontFamily: Fonts.display, fontSize: 22, color: Colors.t1 },
  modeSwitch: {
    width: 116,
    height: 36,
    padding: 3,
    borderRadius: 13,
    flexDirection: 'row',
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b1,
  },
  modeButton: { flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modeButtonActive: { backgroundColor: Colors.s1, borderWidth: 1, borderColor: Colors.b2 },
  modeLabel: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.t3 },
  modeLabelActive: { color: Colors.t1 },
  pressed: { opacity: 0.72 },
  listToolbar: {
    marginHorizontal: 18,
    height: 34,
    borderBottomWidth: 2,
    borderBottomColor: Colors.s2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  toolbarButton: { flex: 1, minWidth: 0 },
  toolbarLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.t2 },
  toolbarActive: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.violet },
  weekSummary: { fontFamily: Fonts.body, fontSize: 12, color: Colors.t2 },
  toolbarUnderline: {
    position: 'absolute',
    left: 0,
    bottom: -2,
    height: 3,
    maxWidth: '100%',
    borderRadius: 2,
    backgroundColor: Colors.violet,
  },
  list: { flex: 1 },
  listContent: { paddingBottom: 94 },
  projectHeaderWrap: {
    position: 'relative',
    marginTop: 22,
    marginHorizontal: 18,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectHeader: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  projectChevron: { width: 10, fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.t3 },
  projectPill: { maxWidth: '54%', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  projectPillLabel: { fontFamily: Fonts.bodyBold, fontSize: 11, letterSpacing: 0.25 },
  projectTag: { fontFamily: Fonts.bodyBold, fontSize: 9, letterSpacing: 0.8, color: Colors.t3 },
  projectProgressTrack: { flex: 1, minWidth: 24, height: 3, borderRadius: 2, backgroundColor: Colors.s3, overflow: 'hidden' },
  projectProgressFill: { height: '100%', borderRadius: 2 },
  projectPercent: { width: 42, textAlign: 'right', fontFamily: Fonts.display, fontSize: 10 },
  gripButton: { width: 28, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  dragHandleInteraction: { touchAction: 'none' },
  gripButtonSelected: { backgroundColor: 'rgba(167,139,250,0.14)' },
  grip: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.t4 },
  gripSelected: { color: Colors.violet },
  taskCardWrap: { position: 'relative', paddingHorizontal: 18, marginTop: 8 },
  taskCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(14,14,28,0.36)',
    overflow: 'hidden',
  },
  taskCardExpanded: { backgroundColor: Colors.s1, borderColor: Colors.b2 },
  taskCardSelected: { borderColor: Colors.violet, shadowColor: Colors.violet, shadowOpacity: 0.25, shadowRadius: 12 },
  draggingCard: { borderColor: Colors.blue, shadowColor: Colors.blue, shadowOpacity: 0.4, shadowRadius: 16, opacity: 0.82 },
  draggingRow: { borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.08)', opacity: 0.82 },
  taskCardDone: { opacity: 0.48 },
  taskRow: {
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taskBodyButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
  },
  taskRowPressed: { backgroundColor: 'rgba(167,139,250,0.06)' },
  taskLeadButton: { width: 24, height: 28, alignItems: 'center', justifyContent: 'center' },
  taskTriangle: { fontSize: 19, color: Colors.violet, transform: [{ rotate: '0deg' }] },
  taskTriangleExpanded: { transform: [{ rotate: '90deg' }] },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.b3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckboxDone: { borderColor: Colors.green, backgroundColor: Colors.green },
  taskCheckmark: { fontFamily: Fonts.bodyBold, fontSize: 14, color: '#062316' },
  taskEmojiBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  taskEmojiBoxDone: { backgroundColor: Colors.s2 },
  taskEmoji: { fontSize: 20 },
  taskCopy: { flex: 1, minWidth: 0 },
  taskTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  taskTitle: { flexShrink: 1, fontFamily: Fonts.bodyBold, fontSize: 15, lineHeight: 19, color: Colors.t1 },
  doneText: { color: Colors.t2, textDecorationLine: 'line-through' },
  taskRank: { fontFamily: Fonts.bodyBold, fontSize: 10 },
  taskMetaRow: { marginTop: 3, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  taskMeta: { fontFamily: Fonts.body, fontSize: 11, color: Colors.t2 },
  dueMeta: { fontFamily: Fonts.body, fontSize: 11, color: Colors.t2 },
  essentialMeta: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.gold },
  doneMeta: { fontFamily: Fonts.body, fontSize: 11, color: Colors.t3 },
  eloMeta: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.violet },
  metaDot: { fontFamily: Fonts.body, fontSize: 10, color: Colors.t3 },
  taskPercent: { fontFamily: Fonts.display, fontSize: 13 },
  subtaskPanel: { paddingHorizontal: 12, paddingBottom: 12 },
  segmentTrack: { height: 4, flexDirection: 'row', gap: 4 },
  progressSegment: { flex: 1, borderRadius: 3, backgroundColor: Colors.s3 },
  progressSegmentFilled: { backgroundColor: Colors.violet },
  subtaskDivider: { height: 1, backgroundColor: Colors.b1, marginTop: 12, marginBottom: 7 },
  subtaskRow: {
    position: 'relative',
    minHeight: 46,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtaskBodyButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 10,
  },
  subtaskRowHover: { backgroundColor: 'rgba(255,255,255,0.035)' },
  subtaskRowSelected: { backgroundColor: 'rgba(167,139,250,0.09)' },
  subtaskTriangle: { width: 24, textAlign: 'center', fontSize: 17, color: Colors.violet },
  subtaskTriangleDone: { color: Colors.green },
  subtaskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.b3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskCheckboxDone: { borderColor: Colors.green, backgroundColor: Colors.green },
  subtaskCheckboxNext: { borderColor: Colors.violet, shadowColor: Colors.violet, shadowOpacity: 0.65, shadowRadius: 5 },
  subtaskCheckmark: { fontFamily: Fonts.bodyBold, fontSize: 13, color: '#062316' },
  subtaskTitle: { flex: 1, minWidth: 0, fontFamily: Fonts.body, fontSize: 14, color: Colors.t1 },
  subtaskGroupTitle: { fontFamily: Fonts.bodyBold },
  subtaskDoneText: { color: Colors.t3, textDecorationLine: 'line-through' },
  subtaskRight: {
    maxWidth: 104,
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.45,
  },
  subtaskNext: { color: Colors.violet },
  subtaskGripButton: { width: 24, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  subtaskActions: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.b1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textAction: { paddingVertical: 8, paddingHorizontal: 5 },
  textActionLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.t2 },
  startTaskButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: 'rgba(167,139,250,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
  },
  startTaskLabel: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.violet },
  emptyProject: { marginHorizontal: 18, paddingLeft: 28, paddingVertical: 12 },
  emptyProjectText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.t3 },
  emptyState: {
    margin: 24,
    padding: 20,
    gap: 10,
    borderRadius: 20,
    backgroundColor: Colors.s1,
    borderWidth: 1,
    borderColor: Colors.b1,
  },
  emptyStateTitle: { fontFamily: Fonts.display, fontSize: 16, color: Colors.t1 },
  emptyStateCopy: { fontFamily: Fonts.body, fontSize: 13, color: Colors.t2 },
  quickAddFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
    backgroundColor: 'rgba(7,7,13,0.96)',
  },
  quickAdd: {
    height: 54,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.b2,
    backgroundColor: Colors.s1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.42,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  quickPlus: { fontFamily: Fonts.body, fontSize: 20, color: Colors.violet },
  quickInput: { flex: 1, minWidth: 0, paddingVertical: 10, fontFamily: Fonts.body, fontSize: 14, color: Colors.t1 },
  quickProjectButton: {
    maxWidth: 145,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: Colors.s2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickProjectDot: { width: 6, height: 6, borderRadius: 3 },
  quickProjectLabel: { flex: 1, minWidth: 0, fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.t2 },
  quickProjectChevron: { fontSize: 9, color: Colors.t2 },
  boardToolbar: {
    paddingHorizontal: 18,
    paddingTop: 2,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  boardToolbarCopy: { fontFamily: Fonts.body, fontSize: 12, color: Colors.t2 },
  configureLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.violet },
  boardList: { flex: 1 },
  boardListContent: { paddingHorizontal: 18, paddingBottom: 18, gap: 12 },
  boardColumn: { width: 250 },
  boardColumnHeader: { paddingHorizontal: 4, paddingBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  boardColumnTitle: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.t1 },
  boardCountPill: { minWidth: 21, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 9, backgroundColor: Colors.s2, alignItems: 'center' },
  boardCount: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.t2 },
  boardColumnContent: { gap: 8, paddingBottom: 30 },
  boardCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: Colors.s1,
    borderWidth: 1,
    borderColor: Colors.b1,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  dropIndicator: {
    position: 'absolute',
    left: 4,
    right: 4,
    zIndex: 30,
    height: 3,
    borderRadius: 3,
    backgroundColor: Colors.blue,
    shadowColor: Colors.blue,
    shadowOpacity: 0.8,
    shadowRadius: 7,
  },
  dropIndicatorBefore: { top: -3 },
  dropIndicatorAfter: { bottom: -3 },
  boardCardPressable: { marginTop: 2, gap: 7 },
  boardCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  projectDot: { width: 8, height: 8, borderRadius: 4 },
  boardCode: { flex: 1, fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.t2, letterSpacing: 0.3 },
  boardGrip: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.t4 },
  boardProjectName: { minHeight: 38, fontFamily: Fonts.bodyBold, fontSize: 15, lineHeight: 19, color: Colors.t1 },
  boardProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  boardProgressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.s3, overflow: 'hidden' },
  boardProgressFill: { height: '100%', borderRadius: 2 },
  boardPercent: { fontFamily: Fonts.display, fontSize: 12 },
  boardSummary: { fontFamily: Fonts.body, fontSize: 12, color: Colors.t2 },
  boardMoveRow: { marginTop: 12, flexDirection: 'row', gap: 6 },
  boardMoveButton: {
    flex: 1,
    minWidth: 0,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.s2,
  },
  boardMoveButtonNext: { backgroundColor: 'rgba(167,139,250,0.12)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.26)' },
  boardMoveDisabled: { opacity: 0.25 },
  boardMoveLabel: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.t2 },
  boardMoveLabelActive: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.t1 },
  boardEmpty: { minHeight: 76, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.b2, alignItems: 'center', justifyContent: 'center' },
  boardEmptyText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.t3 },
  contextMenuLayer: { flex: 1 },
  contextMenu: {
    position: 'absolute',
    width: 208,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.b3,
    backgroundColor: 'rgba(21,21,42,0.99)',
    shadowColor: '#000',
    shadowOpacity: 0.62,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  contextMenuTitle: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.t3,
  },
  contextMenuItem: {
    minHeight: 46,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.b1,
  },
  contextMenuItemPressed: { backgroundColor: 'rgba(255,255,255,0.07)' },
  contextMenuItemDisabled: { opacity: 0.42 },
  contextMenuLabel: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.t1 },
  contextMenuIcon: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.t2 },
  contextMenuDeleteItem: { borderTopColor: 'rgba(248,113,113,0.12)' },
  contextMenuDeletePressed: { backgroundColor: 'rgba(248,113,113,0.12)' },
  contextMenuDeleteLabel: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.red },
  contextMenuDisabledLabel: { color: Colors.t3 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  emojiChip: { width: 44, height: 44, borderRadius: 13, borderWidth: 1, borderColor: Colors.b1, backgroundColor: Colors.s2, alignItems: 'center', justifyContent: 'center' },
  emojiChipActive: { borderColor: Colors.violet, backgroundColor: 'rgba(167,139,250,0.12)' },
  emojiChoice: { fontSize: 20 },
  twoColumnFields: { flexDirection: 'row', gap: 8 },
  flexField: { flex: 1, minWidth: 0 },
  projectCodeField: { width: 116 },
  sheetSectionLabel: { marginTop: 8, marginBottom: 2, fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.t3, textTransform: 'uppercase', letterSpacing: 1 },
  sheetOption: {
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.b1,
    backgroundColor: Colors.s2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetOptionActive: { borderColor: 'rgba(167,139,250,0.3)', backgroundColor: 'rgba(167,139,250,0.1)' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.b3, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: Colors.violet },
  radioFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.violet },
  sheetOptionCopy: { flex: 1, minWidth: 0 },
  sheetOptionTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.t1 },
  sheetOptionSubtitle: { marginTop: 2, fontFamily: Fonts.bodyLight, fontSize: 12, color: Colors.t2 },
  selectedLabel: { fontFamily: Fonts.bodyBold, fontSize: 9, color: Colors.violet, letterSpacing: 0.6 },
  gestureHint: { marginTop: 4, fontFamily: Fonts.bodyLight, fontSize: 12, lineHeight: 18, color: Colors.t3 },
  columnConfigRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  columnConfigInput: { flex: 1, minWidth: 0, height: 46, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: Colors.b2, backgroundColor: Colors.s2, fontFamily: Fonts.body, fontSize: 14, color: Colors.t1 },
  columnConfigCount: { width: 52, fontFamily: Fonts.body, fontSize: 11, color: Colors.t2 },
  columnRemoveButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(248,113,113,0.08)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.18)', alignItems: 'center', justifyContent: 'center' },
  columnRemoveDisabled: { opacity: 0.28 },
  columnRemoveLabel: { fontSize: 18, color: Colors.red },
  addColumnButton: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.b2, alignItems: 'center', justifyContent: 'center' },
  addColumnLabel: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.violet },
  projectConfigRow: { minHeight: 48, paddingHorizontal: 12, borderRadius: 13, backgroundColor: Colors.s2, flexDirection: 'row', alignItems: 'center', gap: 9 },
  projectConfigName: { flex: 1, minWidth: 0, fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.t1 },
  projectConfigEdit: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.violet },
  colorRow: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
  colorChoice: { width: 34, height: 34, borderRadius: 17 },
  colorChoiceActive: { borderWidth: 3, borderColor: Colors.t1 },
});
