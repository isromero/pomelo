import {
  PremiumController,
  type PremiumAccessRepository,
  type PremiumAccessState,
  type PremiumGateway,
  type PremiumOffer,
} from '@/features/premium/application/premium-controller';

const offers: PremiumOffer[] = [
  {
    amount: 29.99,
    description: 'Annual Pomelo Premium',
    currencyCode: 'EUR',
    packageId: '$rc_annual',
    plan: 'annual',
    price: 'EUR 29.99',
    pricePerMonth: 2.499166,
    title: 'Pomelo Premium Annual',
  },
  {
    amount: 7.99,
    description: 'Monthly Pomelo Premium',
    currencyCode: 'EUR',
    packageId: '$rc_monthly',
    plan: 'monthly',
    price: 'EUR 7.99',
    pricePerMonth: 7.99,
    title: 'Pomelo Premium Monthly',
  },
];

const freeState: PremiumAccessState = { access: 'free', entitlement: null };

class FakePremiumGateway implements PremiumGateway {
  purchasedPlan: 'annual' | 'monthly' | null = null;
  restored = false;
  storeEntitled = false;
  purchaseResult = true;
  availableOffers = offers;

  async configure() {}

  async getState() {
    return { isPremium: this.storeEntitled, offers: this.availableOffers };
  }

  async purchase(plan: 'annual' | 'monthly') {
    this.purchasedPlan = plan;
    this.storeEntitled = true;
    return this.purchaseResult;
  }

  async restore() {
    this.restored = true;
    return this.storeEntitled;
  }

  async reset() {}
}

class FakeAccessRepository implements PremiumAccessRepository {
  state = freeState;

  async getState() {
    return this.state;
  }
}

describe('PremiumController', () => {
  it('loads both store plans and the server-authoritative Pair access state', async () => {
    const gateway = new FakePremiumGateway();
    const controller = new PremiumController(gateway, new FakeAccessRepository());

    await controller.start('user-1');

    expect(controller.getSnapshot()).toMatchObject({
      access: 'free',
      offers,
      status: 'ready',
      storeEntitled: false,
    });
  });

  it('purchases the selected plan without allowing a duplicate Pair purchase', async () => {
    const gateway = new FakePremiumGateway();
    const accessRepository = new FakeAccessRepository();
    const controller = new PremiumController(gateway, accessRepository);
    await controller.start('user-1');

    await controller.purchase('monthly');

    expect(gateway.purchasedPlan).toBe('monthly');
    expect(controller.getSnapshot()).toMatchObject({
      access: 'free',
      busy: false,
      storeEntitled: true,
    });

    accessRepository.state = {
      access: 'premium',
      entitlement: {
        expiresAt: '2027-08-16T00:00:00.000Z',
        productId: 'pomelo_monthly',
        status: 'active',
        subscriberId: 'user-1',
        willRenew: true,
      },
    };
    await controller.refresh();
    await controller.purchase('annual');

    expect(gateway.purchasedPlan).toBe('monthly');
    expect(controller.getSnapshot().access).toBe('premium');
  });

  it('restores a subscription and keeps the entitlement status visible', async () => {
    const gateway = new FakePremiumGateway();
    gateway.storeEntitled = true;
    const accessRepository = new FakeAccessRepository();
    accessRepository.state = {
      access: 'premium',
      entitlement: {
        expiresAt: null,
        productId: 'pomelo_annual',
        status: 'active',
        subscriberId: 'user-1',
        willRenew: true,
      },
    };
    const controller = new PremiumController(gateway, accessRepository);
    await controller.start('user-1');
    await controller.restore();

    expect(gateway.restored).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({ access: 'premium', storeEntitled: true });
  });

  it('surfaces a RevenueCat purchase that did not activate the configured entitlement', async () => {
    const gateway = new FakePremiumGateway();
    gateway.purchaseResult = false;
    const controller = new PremiumController(gateway, new FakeAccessRepository());

    await controller.start('user-1');
    await controller.purchase('annual');

    expect(controller.getSnapshot()).toMatchObject({
      error: 'purchaseNotActivated',
      status: 'ready',
      storeEntitled: false,
    });
  });

  it('does not silently ignore a plan that is not loaded', async () => {
    const gateway = new FakePremiumGateway();
    gateway.availableOffers = [];
    const controller = new PremiumController(gateway, new FakeAccessRepository());
    await controller.start('user-1');

    await controller.purchase('annual');

    expect(controller.getSnapshot()).toMatchObject({ error: 'unavailable', busy: false });
    expect(gateway.purchasedPlan).toBeNull();
  });
});
