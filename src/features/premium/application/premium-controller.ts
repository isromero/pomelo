export type PremiumOffer = {
  description: string;
  packageId: string;
  price: string;
  title: string;
};

export type PremiumErrorCode = 'configuration' | 'network' | 'unavailable' | 'unexpected';

export type PremiumSnapshot = {
  busy: boolean;
  error: PremiumErrorCode | null;
  isPremium: boolean;
  offer: PremiumOffer | null;
  status: 'idle' | 'ready' | 'error';
};

export interface PremiumGateway {
  configure(userId: string): Promise<void>;
  getState(): Promise<{ isPremium: boolean; offer: PremiumOffer | null }>;
  purchase(): Promise<boolean>;
  restore(): Promise<boolean>;
  reset(): Promise<void>;
}

const initialSnapshot: PremiumSnapshot = {
  busy: false,
  error: null,
  isPremium: false,
  offer: null,
  status: 'idle',
};

function errorCode(error: unknown): PremiumErrorCode {
  if (error instanceof PremiumError) {
    return error.code;
  }
  return 'unexpected';
}

export class PremiumError extends Error {
  constructor(public readonly code: PremiumErrorCode) {
    super(code);
  }
}

export class PremiumController {
  private listeners = new Set<() => void>();
  private operation = 0;
  private snapshot = initialSnapshot;

  constructor(private readonly gateway: PremiumGateway) {}

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async start(userId: string) {
    const operation = ++this.operation;
    this.update({ busy: true, error: null, status: 'idle' });

    try {
      await this.gateway.configure(userId);
      const state = await this.gateway.getState();
      if (operation !== this.operation) {
        return;
      }
      this.update({ busy: false, ...state, status: 'ready' });
    } catch (error) {
      if (operation !== this.operation) {
        return;
      }
      this.update({ busy: false, error: errorCode(error), status: 'error' });
    }
  }

  async purchase() {
    if (this.snapshot.busy || !this.snapshot.offer) {
      return;
    }

    this.update({ busy: true, error: null });
    try {
      const isPremium = await this.gateway.purchase();
      this.update({ busy: false, isPremium });
    } catch (error) {
      this.update({ busy: false, error: errorCode(error) });
    }
  }

  async restore() {
    if (this.snapshot.busy) {
      return;
    }

    this.update({ busy: true, error: null });
    try {
      const isPremium = await this.gateway.restore();
      this.update({ busy: false, isPremium });
    } catch (error) {
      this.update({ busy: false, error: errorCode(error) });
    }
  }

  async stop() {
    this.operation += 1;
    await this.gateway.reset();
    this.snapshot = initialSnapshot;
    this.emit();
  }

  private update(patch: Partial<PremiumSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit();
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}
