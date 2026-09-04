export type TaskDragPoint = { x: number; y: number };

export type TaskDragSource =
  | { kind: 'project'; projectId: string }
  | { kind: 'task'; taskId: string; projectId: string }
  | { kind: 'subtask'; taskId: string; subtaskId: string }
  | { kind: 'board-project'; projectId: string };

export type TaskDropZoneTarget =
  | { kind: 'project'; projectId: string }
  | { kind: 'task'; taskId: string; projectId: string }
  | { kind: 'subtask'; taskId: string; subtaskId: string }
  | { kind: 'board-project'; projectId: string; columnId: string }
  | { kind: 'board-column'; columnId: string };

export type MeasuredTaskDropZone = {
  key: string;
  target: TaskDropZoneTarget;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TaskDropTarget = TaskDropZoneTarget & { before: boolean };

function isCompatible(source: TaskDragSource, target: TaskDropZoneTarget) {
  if (source.kind === 'project') {
    return target.kind === 'project' && target.projectId !== source.projectId;
  }

  if (source.kind === 'task') {
    if (target.kind === 'task') return target.taskId !== source.taskId;
    return target.kind === 'project' && target.projectId !== source.projectId;
  }

  if (source.kind === 'subtask') {
    return (
      target.kind === 'subtask' &&
      target.taskId === source.taskId &&
      target.subtaskId !== source.subtaskId
    );
  }

  if (target.kind === 'board-project') return target.projectId !== source.projectId;
  return target.kind === 'board-column';
}

export function pickTaskDropTarget(
  source: TaskDragSource,
  zones: MeasuredTaskDropZone[],
  point: TaskDragPoint,
): TaskDropTarget | null {
  const zone = zones
    .filter(
      (candidate) =>
        point.x >= candidate.x &&
        point.x <= candidate.x + candidate.width &&
        point.y >= candidate.y &&
        point.y <= candidate.y + candidate.height &&
        isCompatible(source, candidate.target),
    )
    .sort((left, right) => left.width * left.height - right.width * right.height)[0];

  if (!zone) return null;

  return {
    ...zone.target,
    before: point.y < zone.y + zone.height / 2,
  };
}
