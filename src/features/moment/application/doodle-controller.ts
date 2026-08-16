import {
  addDoodleStroke,
  clearDoodleDocument,
  emptyDoodleDocument,
  mergeDoodleDocuments,
  undoDoodleStroke,
  type DailyMoment,
  type DoodleDocument,
  type DoodlePoint,
  type DoodleState,
} from '@/features/moment/domain/moment';

export type DoodleRealtimeEvent =
  | { document: DoodleDocument; type: 'snapshot' }
  | { connected: boolean; type: 'connection' }
  | { memberCount: number; type: 'presence' };

export type DoodleSession = DoodleState & { userId: string };

export interface DoodleRepository {
  completeDoodle(momentId: string, completionId: string): Promise<DailyMoment>;
  getDoodleSession(momentId: string): Promise<DoodleSession>;
  saveDoodleSnapshot(
    momentId: string,
    document: DoodleDocument,
    operationId: string,
  ): Promise<DoodleDocument>;
  subscribeToDoodle(momentId: string, listener: (event: DoodleRealtimeEvent) => void): () => void;
}

export type DoodleErrorCode =
  | 'configuration'
  | 'doodleNotReady'
  | 'network'
  | 'notAllowed'
  | 'unexpected';

export type DoodleSnapshot = {
  busy: boolean;
  connected: boolean;
  document: DoodleDocument;
  error: DoodleErrorCode | null;
  memberCount: number;
  momentId: string | null;
  ownCompleted: boolean;
  partnerCompleted: boolean;
  syncPending: boolean;
  userId: string | null;
};

const initialSnapshot: DoodleSnapshot = {
  busy: false,
  connected: false,
  document: emptyDoodleDocument(),
  error: null,
  memberCount: 1,
  momentId: null,
  ownCompleted: false,
  partnerCompleted: false,
  syncPending: false,
  userId: null,
};

function createClientId(prefix: string) {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function errorCode(error: unknown): DoodleErrorCode {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('not_ready')) {
      return 'doodleNotReady';
    }
    if (message.includes('not_allowed')) {
      return 'notAllowed';
    }
  }
  return 'unexpected';
}

export class DoodleController {
  private listeners = new Set<() => void>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushPromise: Promise<boolean> | null = null;
  private flushMomentId: string | null = null;
  private localPendingDocument: DoodleDocument | null = null;
  private operation = 0;
  private snapshot = initialSnapshot;
  private unsubscribeRepository: (() => void) | null = null;

  constructor(
    private readonly repository: DoodleRepository,
    private readonly onMomentChanged: (moment: DailyMoment) => void,
  ) {}

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  open(momentId: string) {
    if (this.snapshot.momentId === momentId) {
      return;
    }
    if (this.localPendingDocument && this.snapshot.momentId) {
      void this.flush();
    }
    this.operation += 1;
    this.unsubscribeRepository?.();
    this.flushPromise = null;
    this.flushMomentId = null;
    this.localPendingDocument = null;
    this.snapshot = {
      ...initialSnapshot,
      momentId,
    };
    this.emit();
    this.unsubscribeRepository = this.repository.subscribeToDoodle(momentId, (event) => {
      this.handleRealtimeEvent(event);
    });
    void this.refresh(momentId);
  }

  stop() {
    if (this.localPendingDocument && this.snapshot.momentId) {
      void this.flush();
    }
    this.operation += 1;
    this.unsubscribeRepository?.();
    this.unsubscribeRepository = null;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.localPendingDocument = null;
    this.flushPromise = null;
    this.flushMomentId = null;
    this.snapshot = initialSnapshot;
    this.emit();
  }

  async refresh(momentId = this.snapshot.momentId) {
    if (!momentId) {
      return;
    }
    const operation = this.operation;
    try {
      const session = await this.repository.getDoodleSession(momentId);
      if (operation !== this.operation || this.snapshot.momentId !== momentId) {
        return;
      }
      const document = this.localPendingDocument
        ? mergeDoodleDocuments(session.document, this.localPendingDocument)
        : session.document;
      this.update({
        connected: true,
        document,
        error: null,
        memberCount: Math.max(1, session.partnerCompleted ? 2 : 1),
        ownCompleted: session.ownCompleted,
        partnerCompleted: session.partnerCompleted,
        userId: session.userId,
      });
      if (this.localPendingDocument) {
        this.scheduleFlush();
      }
    } catch (error) {
      if (operation === this.operation && this.snapshot.momentId === momentId) {
        this.update({ connected: false, error: errorCode(error) });
      }
    }
  }

  addStroke(input: {
    color: string;
    mode: 'brush' | 'eraser';
    points: DoodlePoint[];
    width: number;
  }) {
    const userId = this.snapshot.userId;
    if (!userId || input.points.length === 0) {
      return;
    }
    const document = addDoodleStroke(this.snapshot.document, {
      ...input,
      createdAt: new Date().toISOString(),
      id: createClientId('stroke'),
      userId,
    });
    this.markLocalDocument(document);
  }

  undo() {
    if (!this.snapshot.userId) {
      return;
    }
    this.markLocalDocument(undoDoodleStroke(this.snapshot.document, this.snapshot.userId));
  }

  clear() {
    if (!this.snapshot.userId) {
      return;
    }
    this.markLocalDocument(clearDoodleDocument(this.snapshot.document, this.snapshot.userId));
  }

  async complete() {
    const momentId = this.snapshot.momentId;
    if (!momentId || this.snapshot.ownCompleted) {
      return;
    }
    const synced = await this.flush();
    if (!synced) {
      return;
    }
    this.update({ busy: true, error: null });
    try {
      const moment = await this.repository.completeDoodle(momentId, createClientId('complete'));
      this.update({
        busy: false,
        error: null,
        ownCompleted: true,
        partnerCompleted: Boolean(moment.doodle?.partnerCompleted),
      });
      this.onMomentChanged(moment);
    } catch (error) {
      this.update({ busy: false, error: errorCode(error) });
    }
  }

  private markLocalDocument(document: DoodleDocument) {
    if (document === this.snapshot.document) {
      return;
    }
    this.localPendingDocument = document;
    this.update({ document, error: null, syncPending: true });
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (!this.snapshot.momentId) {
      return;
    }
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, 250);
  }

  private async flush() {
    if (!this.snapshot.momentId || !this.localPendingDocument) {
      return true;
    }
    if (this.flushPromise && this.flushMomentId === this.snapshot.momentId) {
      return this.flushPromise;
    }
    const momentId = this.snapshot.momentId;
    const document = this.localPendingDocument;
    const operationId = createClientId('snapshot');
    const flushMomentId = momentId;
    const request = this.repository
      .saveDoodleSnapshot(momentId, document, operationId)
      .then((savedDocument) => {
        if (this.snapshot.momentId === momentId && this.localPendingDocument === document) {
          this.localPendingDocument = null;
          this.update({ document: savedDocument, error: null, syncPending: false });
        }
        return true;
      })
      .catch((error) => {
        if (this.snapshot.momentId === momentId) {
          this.update({ connected: false, error: errorCode(error), syncPending: true });
        }
        return false;
      })
      .finally(() => {
        if (this.flushMomentId === flushMomentId) {
          this.flushPromise = null;
          this.flushMomentId = null;
          if (this.localPendingDocument && this.snapshot.momentId === momentId) {
            this.scheduleFlush();
          }
        }
      });
    this.flushMomentId = flushMomentId;
    this.flushPromise = request;
    return request;
  }

  private handleRealtimeEvent(event: DoodleRealtimeEvent) {
    if (event.type === 'connection') {
      this.update({ connected: event.connected });
      if (event.connected && this.localPendingDocument) {
        void this.flush();
      }
      return;
    }
    if (event.type === 'presence') {
      this.update({ memberCount: Math.max(1, event.memberCount) });
      return;
    }
    if (event.document.version < this.snapshot.document.version) {
      return;
    }
    const document = this.localPendingDocument
      ? mergeDoodleDocuments(event.document, this.localPendingDocument)
      : event.document;
    if (this.localPendingDocument) {
      this.localPendingDocument = document;
    }
    this.update({
      connected: true,
      document,
      syncPending: this.localPendingDocument !== null,
    });
    if (this.localPendingDocument) {
      this.scheduleFlush();
    }
  }

  private update(patch: Partial<DoodleSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit();
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}
