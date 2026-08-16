export type PremiumPlanId = 'annual' | 'monthly';

export type PremiumAccess = 'archive' | 'free' | 'premium';

export type PremiumEntitlementStatus =
  | 'active'
  | 'cancelled'
  | 'expired'
  | 'gracePeriod'
  | 'none';

export type PremiumEntitlement = {
  expiresAt: string | null;
  productId: string | null;
  status: PremiumEntitlementStatus;
  subscriberId: string | null;
  willRenew: boolean;
};

export type PremiumAccessState = {
  access: PremiumAccess;
  entitlement: PremiumEntitlement | null;
};

export type PremiumOffer = {
  amount: number;
  currencyCode: string;
  description: string;
  packageId: string;
  plan: PremiumPlanId;
  price: string;
  pricePerMonth: number | null;
  title: string;
};

export type PremiumStoreState = {
  isPremium: boolean;
  offers: PremiumOffer[];
};

export type PremiumErrorCode =
  | 'configuration'
  | 'network'
  | 'purchaseNotActivated'
  | 'unexpected'
  | 'unavailable';

export type PremiumSnapshot = {
  access: PremiumAccess;
  busy: boolean;
  entitlement: PremiumEntitlement | null;
  error: PremiumErrorCode | null;
  offers: PremiumOffer[];
  status: 'error' | 'idle' | 'loading' | 'ready';
  storeEntitled: boolean;
};

export interface PremiumGateway {
  configure(userId: string): Promise<void>;
  getState(): Promise<PremiumStoreState>;
  purchase(plan: PremiumPlanId): Promise<boolean>;
  restore(): Promise<boolean>;
  reset(): Promise<void>;
}

export interface PremiumAccessRepository {
  getState(): Promise<PremiumAccessState>;
  sync?(): Promise<void>;
}

const initialSnapshot: PremiumSnapshot = {
  access: 'free',
  busy: false,
  entitlement: null,
  error: null,
  offers: [],
  status: 'idle',
  storeEntitled: false,
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
    this.name = 'PremiumError';
  }
}

export class PremiumController {
  private listeners = new Set<() => void>();
  private operation = 0;
  private snapshot = initialSnapshot;

  constructor(
    private readonly gateway: PremiumGateway,
    private readonly accessRepository: PremiumAccessRepository,
  ) {}

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async start(userId: string) {
    const operation = ++this.operation;
    this.update({ busy: true, error: null, status: 'loading' });

    try {
      await this.gateway.configure(userId);
      await this.loadAndSyncState(operation);
    } catch (error) {
      if (operation !== this.operation) {
        return;
      }
      this.update({ busy: false, error: errorCode(error), status: 'error' });
    }
  }

  async refresh() {
    if (this.snapshot.busy) {
      return;
    }
    const operation = this.operation;
    this.update({ busy: true, error: null, status: 'loading' });

    try {
      await this.loadAndSyncState(operation);
    } catch (error) {
      if (operation === this.operation) {
        this.update({ busy: false, error: errorCode(error), status: 'error' });
      }
    }
  }

  async purchase(plan: PremiumPlanId) {
    if (this.snapshot.busy || this.snapshot.access === 'premium') {
      return;
    }
    if (!this.snapshot.offers.some((offer) => offer.plan === plan)) {
      this.update({ error: 'unavailable' });
      return;
    }

    const operation = this.operation;
    this.update({ busy: true, error: null });
    try {
      const storeEntitled = await this.gateway.purchase(plan);
      this.update({ storeEntitled });
      await this.syncStoreAccess(operation, storeEntitled);
      if (operation === this.operation && !storeEntitled) {
        this.update({ error: 'purchaseNotActivated' });
      }
    } catch (error) {
      if (operation === this.operation) {
        this.update({ busy: false, error: errorCode(error) });
      }
    }
  }

  async restore() {
    if (this.snapshot.busy) {
      return;
    }

    const operation = this.operation;
    this.update({ busy: true, error: null });
    try {
      const storeEntitled = await this.gateway.restore();
      this.update({ storeEntitled });
      await this.syncStoreAccess(operation, storeEntitled);
    } catch (error) {
      if (operation === this.operation) {
        this.update({ busy: false, error: errorCode(error) });
      }
    }
  }

  clearError() {
    this.update({ error: null });
  }

  async stop() {
    this.operation += 1;
    try {
      await this.gateway.reset();
    } finally {
      this.snapshot = initialSnapshot;
      this.emit();
    }
  }

  private async syncStoreAccess(operation: number, storeEntitled: boolean) {
    if (storeEntitled && this.accessRepository.sync) {
      try {
        await this.accessRepository.sync();
      } catch {
      }
    }
    await this.loadState(operation, storeEntitled);
  }

  private async loadAndSyncState(operation: number) {
    await this.loadState(operation);
    if (operation === this.operation && this.snapshot.storeEntitled && this.snapshot.access !== 'premium') {
      await this.syncStoreAccess(operation, true);
    }
  }

  private async loadState(operation: number, storeEntitled?: boolean) {
    const [storeState, accessState] = await Promise.all([
      this.gateway.getState(),
      this.accessRepository.getState(),
    ]);
    if (operation !== this.operation) {
      return;
    }
    this.update({
      access: accessState.access,
      busy: false,
      entitlement: accessState.entitlement,
      error: null,
      offers: storeState.offers,
      status: 'ready',
      storeEntitled: storeEntitled ?? storeState.isPremium,
    });
  }

  private update(patch: Partial<PremiumSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit();
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}
