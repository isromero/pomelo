export type MomentFormat = 'question' | 'photo' | 'doodle';
export type MomentStatus =
  | 'expired_incomplete'
  | 'open'
  | 'partially_submitted'
  | 'ready'
  | 'revealed';
export type MomentWindow = 'complete' | 'expired' | 'normal' | 'recovery';
export type QuestionResponseType = 'choice' | 'text';

export type PhotoSide = 'front' | 'rear';

export type PhotoAsset = {
  height: number;
  mimeType: string;
  path: string;
  width: number;
};

export type PhotoContribution = {
  front: PhotoAsset;
  rear: PhotoAsset;
};

export type PhotoCapture = Omit<PhotoAsset, 'path'> & { uri: string };

export type PhotoDraft = {
  front: PhotoCapture | null;
  rear: PhotoCapture | null;
};

export type PhotoComposition = {
  layout: 'partner_rear_primary_own_rear_thumbnail';
  version: 1;
};

export type DoodlePoint = {
  x: number;
  y: number;
};

export type DoodleStroke = {
  color: string;
  createdAt: string;
  id: string;
  mode: 'brush' | 'eraser';
  points: DoodlePoint[];
  userId: string;
  width: number;
};

export type DoodleDocument = {
  clearedAt?: string;
  removedStrokeIds?: string[];
  strokes: DoodleStroke[];
  version: number;
};

export type DoodleState = {
  document: DoodleDocument;
  ownCompleted: boolean;
  partnerCompleted: boolean;
};

export type MediaPrompt = {
  conceptKey: string;
  text: string;
};

export type MomentPrompt = QuestionPrompt | MediaPrompt;

export type MomentLifecycle = {
  normalExpiresAt: string;
  recoveryExpiresAt: string;
  window: MomentWindow;
};

export type StreakState = {
  best: number;
  current: number;
  lastCompletedLocalDate: string | null;
  recoveryAvailable: boolean;
  recoveryLimit: number;
  recoveryUsed: number;
};

export const STREAK_RECOVERY_LIMIT = 1;

export const initialStreakState: StreakState = {
  best: 0,
  current: 0,
  lastCompletedLocalDate: null,
  recoveryAvailable: true,
  recoveryLimit: STREAK_RECOVERY_LIMIT,
  recoveryUsed: 0,
};

export type QuestionPrompt = {
  conceptKey: string;
  options: string[];
  responseType: QuestionResponseType;
  text: string;
};

export type Contribution = {
  id: string;
  photo?: PhotoContribution | null;
  responseChoice: string | null;
  responseText: string | null;
  submittedAt: string;
  userId: string;
};

export type MomentPartner = {
  avatarKey: 'affectionate' | 'calm' | 'surprised';
  contribution: Contribution | null;
  displayName: string;
  submitted: boolean;
  userId: string;
};

export type DailyMoment = {
  format: MomentFormat;
  id: string;
  isFree: boolean;
  lifecycle: MomentLifecycle;
  localDate: string;
  memoryId: string | null;
  ownContribution: Contribution | null;
  pairId: string;
  partner: MomentPartner;
  pomState: 'calm' | 'celebrating' | null;
  prompt: MomentPrompt;
  doodle?: DoodleState | null;
  streak: StreakState;
  status: MomentStatus;
};

export type Memory = {
  format?: MomentFormat;
  id: string;
  localDate: string;
  momentId: string;
  ownContribution: Contribution | null;
  pairId: string;
  partner: MomentPartner;
  pomState: 'calm' | 'celebrating';
  prompt: MomentPrompt;
  doodleDocument?: DoodleDocument | null;
  photoComposition?: PhotoComposition | null;
  widgetVisualEnabled?: boolean;
  revealedAt: string;
};

export type QuestionResponse = {
  choice?: string;
  text?: string;
};

export type QuestionResponseError = 'empty' | 'invalidChoice' | 'tooLong';

export const PHOTO_SIDES: PhotoSide[] = ['rear', 'front'];

export function emptyPhotoDraft(): PhotoDraft {
  return { front: null, rear: null };
}

export function isPhotoDraftComplete(draft: PhotoDraft | null | undefined) {
  return Boolean(draft?.rear && draft.front);
}

export function validatePhotoDraft(draft: PhotoDraft | null | undefined) {
  if (!draft?.rear || !draft.front) {
    return 'missingCapture' as const;
  }
  if (
    draft.rear.width <= 0 ||
    draft.rear.height <= 0 ||
    draft.front.width <= 0 ||
    draft.front.height <= 0
  ) {
    return 'invalidCapture' as const;
  }
  return null;
}

export type PhotoDraftError = ReturnType<typeof validatePhotoDraft>;

export function emptyDoodleDocument(): DoodleDocument {
  return { strokes: [], version: 0 };
}

export function addDoodleStroke(document: DoodleDocument, stroke: DoodleStroke): DoodleDocument {
  if (document.strokes.some((existing) => existing.id === stroke.id)) {
    return document;
  }
  return {
    strokes: [...document.strokes, stroke],
    version: document.version + 1,
  };
}

export function undoDoodleStroke(document: DoodleDocument, userId: string): DoodleDocument {
  const index = document.strokes.reduce(
    (lastIndex, stroke, strokeIndex) => (stroke.userId === userId ? strokeIndex : lastIndex),
    -1,
  );
  if (index < 0) {
    return document;
  }
  const removedStrokeIds = new Set(document.removedStrokeIds ?? []);
  removedStrokeIds.add(document.strokes[index].id);
  return {
    strokes: document.strokes.filter((_, strokeIndex) => strokeIndex !== index),
    ...(removedStrokeIds.size > 0 ? { removedStrokeIds: [...removedStrokeIds] } : {}),
    version: document.version + 1,
  };
}

export function clearDoodleDocument(document: DoodleDocument, userId: string): DoodleDocument {
  const ownStrokeIds = document.strokes
    .filter((stroke) => stroke.userId === userId)
    .map((stroke) => stroke.id);
  if (ownStrokeIds.length === 0) {
    return document;
  }
  const removedStrokeIds = new Set(document.removedStrokeIds ?? []);
  ownStrokeIds.forEach((strokeId) => removedStrokeIds.add(strokeId));
  return {
    removedStrokeIds: [...removedStrokeIds],
    strokes: document.strokes.filter((stroke) => stroke.userId !== userId),
    version: document.version + 1,
  };
}

export function mergeDoodleDocuments(
  current: DoodleDocument,
  incoming: DoodleDocument,
): DoodleDocument {
  const strokes = new Map(current.strokes.map((stroke) => [stroke.id, stroke]));
  incoming.strokes.forEach((stroke) => strokes.set(stroke.id, stroke));
  const removedStrokeIds = new Set([
    ...(current.removedStrokeIds ?? []),
    ...(incoming.removedStrokeIds ?? []),
  ]);
  const clearedDates = [current.clearedAt, incoming.clearedAt]
    .filter((value): value is string => Boolean(value))
    .sort();
  const clearedAt = clearedDates[clearedDates.length - 1];
  return {
    ...(clearedAt ? { clearedAt } : {}),
    ...(removedStrokeIds.size > 0 ? { removedStrokeIds: [...removedStrokeIds] } : {}),
    strokes: [...strokes.values()]
      .filter(
        (stroke) =>
          !removedStrokeIds.has(stroke.id) &&
          (!clearedAt || stroke.createdAt > clearedAt),
      )
      .sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
      ),
    version: Math.max(current.version, incoming.version),
  };
}

export function isDoodleDocument(value: unknown): value is DoodleDocument {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const candidate = value as {
    clearedAt?: unknown;
    removedStrokeIds?: unknown;
    strokes?: unknown;
    version?: unknown;
  };
  if (typeof candidate.version !== 'number' || !Array.isArray(candidate.strokes)) {
    return false;
  }
  if (
    (candidate.clearedAt !== undefined && typeof candidate.clearedAt !== 'string') ||
    (candidate.removedStrokeIds !== undefined &&
      (!Array.isArray(candidate.removedStrokeIds) ||
        !candidate.removedStrokeIds.every((id) => typeof id === 'string')))
  ) {
    return false;
  }
  return candidate.strokes.every((stroke) => {
    if (typeof stroke !== 'object' || stroke === null || Array.isArray(stroke)) {
      return false;
    }
    const item = stroke as Record<string, unknown>;
    return (
      typeof item.id === 'string' &&
      typeof item.userId === 'string' &&
      typeof item.color === 'string' &&
      typeof item.width === 'number' &&
      (item.mode === 'brush' || item.mode === 'eraser') &&
      typeof item.createdAt === 'string' &&
      Array.isArray(item.points) &&
      item.points.every((point) => {
        if (typeof point !== 'object' || point === null || Array.isArray(point)) {
          return false;
        }
        const coordinates = point as Record<string, unknown>;
        return typeof coordinates.x === 'number' && typeof coordinates.y === 'number';
      })
    );
  });
}

export function validateQuestionResponse(
  prompt: QuestionPrompt,
  response: QuestionResponse,
): QuestionResponseError | null {
  if (prompt.responseType === 'choice') {
    return prompt.options.includes(response.choice ?? '') ? null : 'invalidChoice';
  }

  const text = response.text?.trim() ?? '';
  if (!text) {
    return 'empty';
  }
  return text.length > 1000 ? 'tooLong' : null;
}

export function isMomentReady(moment: Pick<DailyMoment, 'status'>) {
  return moment.status === 'ready';
}

export function isMomentRevealed(moment: Pick<DailyMoment, 'status'>) {
  return moment.status === 'revealed';
}

export function getMomentWindow(
  moment: Pick<DailyMoment, 'status'> & {
    lifecycle: Pick<MomentLifecycle, 'normalExpiresAt' | 'recoveryExpiresAt'>;
  },
  now = new Date(),
): MomentWindow {
  if (moment.status === 'ready' || moment.status === 'revealed') {
    return 'complete';
  }
  if (moment.status === 'expired_incomplete') {
    return 'expired';
  }

  const normalExpiresAt = Date.parse(moment.lifecycle.normalExpiresAt);
  const recoveryExpiresAt = Date.parse(moment.lifecycle.recoveryExpiresAt);
  if (!Number.isFinite(normalExpiresAt) || !Number.isFinite(recoveryExpiresAt)) {
    return 'expired';
  }
  if (now.getTime() < normalExpiresAt) {
    return 'normal';
  }
  return now.getTime() < recoveryExpiresAt ? 'recovery' : 'expired';
}

export function momentRemainingMs(
  moment: Pick<DailyMoment, 'status'> & {
    lifecycle: Pick<MomentLifecycle, 'normalExpiresAt' | 'recoveryExpiresAt'>;
  },
  now = new Date(),
) {
  const window = getMomentWindow(moment, now);
  if (window !== 'normal' && window !== 'recovery') {
    return 0;
  }
  const expiresAt = window === 'normal'
    ? moment.lifecycle.normalExpiresAt
    : moment.lifecycle.recoveryExpiresAt;
  return Math.max(0, Date.parse(expiresAt) - now.getTime());
}

export function formatMomentRemaining(milliseconds: number) {
  const minutes = Math.max(0, Math.ceil(milliseconds / 60_000));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0
    ? `${hours}h ${String(remainingMinutes).padStart(2, '0')}m`
    : `${remainingMinutes}m`;
}
