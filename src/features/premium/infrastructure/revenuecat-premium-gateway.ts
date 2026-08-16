import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';
import { Platform } from 'react-native';

import {
  PremiumError,
  type PremiumGateway,
  type PremiumOffer,
} from '@/features/premium/application/premium-controller';

const premiumEntitlementIds = ['premium', 'Pomelo Premium'] as const;

type RevenueCatConfig = {
  apiKey: string | undefined;
};

function config(): RevenueCatConfig {
  const testStoreApiKey = process.env.EXPO_PUBLIC_REVENUECAT_TEST_STORE_API_KEY?.trim();
  if (__DEV__ && testStoreApiKey) {
    return { apiKey: testStoreApiKey };
  }

  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim()
      : Platform.OS === 'android'
        ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim()
        : process.env.EXPO_PUBLIC_REVENUECAT_WEB_API_KEY?.trim();

  return { apiKey };
}

function isPremium(customerInfo: CustomerInfo) {
  return premiumEntitlementIds.some((identifier) =>
    Boolean(customerInfo.entitlements.active[identifier]),
  );
}

function offerFromPackage(aPackage: PurchasesPackage): PremiumOffer {
  return {
    description: aPackage.product.description,
    packageId: aPackage.identifier,
    price: aPackage.product.priceString,
    title: aPackage.product.title,
  };
}

export class RevenueCatPremiumGateway implements PremiumGateway {
  private configured = false;
  private packageToPurchase: PurchasesPackage | null = null;

  async configure(userId: string) {
    const { apiKey } = config();
    if (!apiKey) {
      throw new PremiumError('configuration');
    }

    if (!this.configured) {
      await Purchases.setLogLevel(LOG_LEVEL.ERROR);
      Purchases.configure({ apiKey, appUserID: userId });
      this.configured = true;
      return;
    }

    const customerInfo = await Purchases.getCustomerInfo();
    if (customerInfo.originalAppUserId !== userId) {
      await Purchases.logIn(userId);
    }
  }

  async getState() {
    const [offerings, customerInfo] = await Promise.all([
      Purchases.getOfferings(),
      Purchases.getCustomerInfo(),
    ]);
    const current = offerings.current;
    this.packageToPurchase = current?.availablePackages[0] ?? null;

    if (!this.packageToPurchase) {
      throw new PremiumError('unavailable');
    }

    return {
      isPremium: isPremium(customerInfo),
      offer: offerFromPackage(this.packageToPurchase),
    };
  }

  async purchase() {
    if (!this.packageToPurchase) {
      throw new PremiumError('unavailable');
    }
    const { customerInfo } = await Purchases.purchasePackage(this.packageToPurchase);
    return isPremium(customerInfo);
  }

  async restore() {
    return isPremium(await Purchases.restorePurchases());
  }

  async reset() {
    this.packageToPurchase = null;
    if (this.configured) {
      await Purchases.logOut();
      this.configured = false;
    }
  }
}
