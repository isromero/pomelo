import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppearance } from '@/appearance/appearance-provider';
import { fonts, radii, type SemanticColors } from '@/constants/pomelo-theme';
import type {
  PremiumErrorCode,
  PremiumOffer,
  PremiumPlanId,
} from '@/features/premium/application/premium-controller';
import { usePremium } from '@/features/premium/presentation/premium-provider';
import type { TranslationKey } from '@/localization/catalogs';
import { useLocale } from '@/localization/locale-provider';

function errorKey(error: PremiumErrorCode): TranslationKey {
  switch (error) {
    case 'configuration':
      return 'premium.error.configuration';
    case 'network':
      return 'premium.error.network';
    case 'unavailable':
      return 'premium.error.unavailable';
    default:
      return 'premium.error.unexpected';
  }
}

function monthlyAmountPerPerson(offer: PremiumOffer | undefined) {
  if (!offer) {
    return null;
  }
  const monthlyAmount = offer.pricePerMonth ?? (offer.plan === 'annual' ? offer.amount / 12 : offer.amount);
  return monthlyAmount > 0 ? monthlyAmount / 2 : null;
}

function formatCurrency(
  amount: number | null,
  currencyCode: string | null,
  locale: 'en' | 'es',
) {
  if (amount === null || !currencyCode) {
    return null;
  }
  try {
    return new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', {
      currency: currencyCode,
      style: 'currency',
    }).format(amount);
  } catch {
    return null;
  }
}

function savingsPercent(
  annualOffer: PremiumOffer | undefined,
  monthlyOffer: PremiumOffer | undefined,
) {
  if (!annualOffer || !monthlyOffer || monthlyOffer.amount <= 0) {
    return null;
  }
  const annualAtMonthlyPrice = monthlyOffer.amount * 12;
  if (annualOffer.amount >= annualAtMonthlyPrice) {
    return null;
  }
  return Math.round((1 - annualOffer.amount / annualAtMonthlyPrice) * 100);
}

function replaceValue(template: string, key: string, value: string | number) {
  return template.replace(`{${key}}`, String(value));
}

export function PremiumPaywall({
  onClose,
  visible,
}: {
  onClose(): void;
  visible: boolean;
}) {
  const { colors } = useAppearance();
  const { locale, t } = useLocale();
  const insets = useSafeAreaInsets();
  const { access, busy, controller, entitlement, error, offers, storeEntitled } = usePremium();
  const styles = createStyles(colors);
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlanId>('annual');
  const annualOffer = offers.find((offer) => offer.plan === 'annual');
  const monthlyOffer = offers.find((offer) => offer.plan === 'monthly');
  const annualPrice = annualOffer?.price ?? t('premium.price.unavailable');
  const monthlyPrice = monthlyOffer?.price ?? t('premium.price.unavailable');
  const annualPerPersonMonth = formatCurrency(
    monthlyAmountPerPerson(annualOffer),
    annualOffer?.currencyCode ?? null,
    locale,
  );
  const monthlyPerPersonMonth = formatCurrency(
    monthlyAmountPerPerson(monthlyOffer),
    monthlyOffer?.currencyCode ?? null,
    locale,
  );
  const annualSavings = savingsPercent(annualOffer, monthlyOffer);
  const annualTotal = replaceValue(
    t('premium.plan.annual.total'),
    'price',
    annualPrice,
  );
  const monthlyTotal = replaceValue(
    t('premium.plan.monthly.total'),
    'price',
    monthlyPrice,
  );
  const canPurchase = offers.length === 2 && access !== 'premium';
  const entitlementDate = entitlement?.expiresAt
    ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(
        new Date(entitlement.expiresAt),
      )
    : null;

  const openLegal = (kind: 'privacy' | 'terms') => {
    const url = kind === 'terms' ? process.env.EXPO_PUBLIC_TERMS_URL : process.env.EXPO_PUBLIC_PRIVACY_URL;
    if (url) {
      void Linking.openURL(url);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      visible={visible}>
      <View style={styles.screen}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            accessibilityLabel={t('common.close')}
            accessibilityRole="button"
            hitSlop={10}
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
            <Ionicons color={colors.ink} name="close" size={27} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void controller.restore()}
            style={({ pressed }) => [styles.restoreButton, busy && styles.disabled, pressed && styles.pressed]}>
            <Text style={styles.restoreText}>{t('premium.restore')}</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroEyebrowRow}>
              <Ionicons color={colors.action} name="sparkles" size={17} />
              <Text style={styles.heroEyebrow}>{t('premium.eyebrow')}</Text>
            </View>
            <Text style={styles.heroTitle}>{t('premium.title')}</Text>
            <Text style={styles.heroSubtitle}>{t('premium.subtitle')}</Text>
          </View>

          <View style={styles.valueSection}>
            <Text style={styles.sectionEyebrow}>{t('premium.features.eyebrow')}</Text>
            <View style={styles.valueCard}>
              <FeatureRow label={t('premium.feature.moments')} styles={styles} />
              <FeatureRow label={t('premium.feature.map')} styles={styles} />
              <FeatureRow label={t('premium.feature.widget')} styles={styles} />
            </View>
          </View>

          <PlanCard
            headline={annualTotal}
            label={t('premium.annual')}
            recommended
            savings={annualSavings}
            selected={selectedPlan === 'annual'}
            subline={annualPerPersonMonth
              ? replaceValue(t('premium.perPersonMonth'), 'price', annualPerPersonMonth)
              : null}
            onPress={() => setSelectedPlan('annual')}
            styles={styles}
          />
          <PlanCard
            headline={monthlyTotal}
            label={t('premium.monthly')}
            savings={null}
            selected={selectedPlan === 'monthly'}
            subline={monthlyPerPersonMonth
              ? replaceValue(t('premium.perPersonMonth'), 'price', monthlyPerPersonMonth)
              : null}
            onPress={() => setSelectedPlan('monthly')}
            styles={styles}
          />

          <Text style={styles.renewal}>{t('premium.renewal')}</Text>
          <Text style={styles.noTrial}>{t('premium.noTrial')}</Text>

          {error && <Text style={styles.error}>{t(errorKey(error))}</Text>}
          {storeEntitled && access !== 'premium' && (
            <Text style={styles.syncing}>{t('premium.purchaseSync')}</Text>
          )}
          {entitlement?.status === 'cancelled' && entitlementDate && (
            <Text style={styles.renewal}>{t('premium.cancelled').replace('{date}', entitlementDate)}</Text>
          )}
          {entitlement?.status === 'gracePeriod' && entitlementDate && (
            <Text style={styles.renewal}>{t('premium.gracePeriod').replace('{date}', entitlementDate)}</Text>
          )}
          {entitlement?.status === 'expired' && <Text style={styles.renewal}>{t('premium.expired')}</Text>}

          <Pressable
            accessibilityRole="button"
            disabled={busy || !canPurchase}
            onPress={() => void controller.purchase(selectedPlan)}
            style={({ pressed }) => [
              styles.primaryButton,
              (!canPurchase || busy) && styles.disabled,
              pressed && styles.pressed,
            ]}>
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>{t('premium.cta')}</Text>
                <Ionicons color={colors.white} name="arrow-forward" size={18} />
              </>
            )}
          </Pressable>

          <View style={styles.legalRow}>
            <Pressable accessibilityRole="link" onPress={() => openLegal('terms')}>
              <Text style={styles.legalText}>{t('premium.terms')}</Text>
            </Pressable>
            <Text style={styles.legalDivider}>|</Text>
            <Pressable accessibilityRole="link" onPress={() => openLegal('privacy')}>
              <Text style={styles.legalText}>{t('premium.privacy')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function FeatureRow({
  label,
  styles,
}: {
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const { colors } = useAppearance();
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Ionicons color={colors.white} name="checkmark" size={15} />
      </View>
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

function PlanCard({
  headline,
  label,
  recommended = false,
  savings,
  selected,
  subline,
  onPress,
  styles,
}: {
  headline: string;
  label: string;
  recommended?: boolean;
  savings: number | null;
  selected: boolean;
  subline: string | null;
  onPress(): void;
  styles: ReturnType<typeof createStyles>;
}) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.planCard,
        selected && styles.planCardSelected,
        savings !== null && styles.planCardWithBadge,
        pressed && styles.pressed,
      ]}>
      {savings !== null && (
        <View style={styles.savingsBadge}>
          <Text style={styles.savingsText}>{replaceValue(t('premium.save'), 'percent', savings)}</Text>
        </View>
      )}
      <View style={styles.planCopy}>
        <View style={styles.planTitleRow}>
          <Text style={[styles.planLabel, selected && styles.planTextSelected]}>{label}</Text>
          {recommended && <Text style={[styles.recommended, selected && styles.planTextSelected]}>{t('premium.recommended')}</Text>}
        </View>
        <Text style={[styles.planHeadline, selected && styles.planTextSelected]}>{headline}</Text>
        {subline && <Text style={[styles.planSubline, selected && styles.planSublineSelected]}>{subline}</Text>}
      </View>
      <View style={[styles.selection, selected && styles.selectionSelected]}>
        {selected && <Ionicons color={colors.white} name="checkmark" size={17} />}
      </View>
    </Pressable>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    topBar: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 5,
    },
    closeButton: {
      alignItems: 'center',
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    restoreButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
    restoreText: { color: colors.inkSecondary, fontFamily: fonts.bodyMedium, fontSize: 13 },
    scrollContent: { gap: 13, paddingHorizontal: 20, paddingTop: 4 },
    hero: {
      alignItems: 'center',
      backgroundColor: colors.ink,
      borderRadius: 30,
      gap: 13,
      paddingHorizontal: 24,
      paddingVertical: 28,
    },
    heroEyebrowRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
    heroEyebrow: {
      color: colors.action,
      fontFamily: fonts.bodyBold,
      fontSize: 9,
      letterSpacing: 0.65,
    },
    heroTitle: {
      color: colors.background,
      fontFamily: fonts.displayExtraBold,
      fontSize: 33,
      letterSpacing: -1.15,
      lineHeight: 37,
      textAlign: 'center',
    },
    heroSubtitle: {
      color: colors.background,
      fontFamily: fonts.bodyMedium,
      fontSize: 15,
      textAlign: 'center',
    },
    valueSection: { gap: 7 },
    sectionEyebrow: {
      color: colors.actionDeep,
      fontFamily: fonts.bodyBold,
      fontSize: 9,
      letterSpacing: 0.65,
      paddingHorizontal: 3,
    },
    valueCard: {
      backgroundColor: colors.surface,
      borderColor: colors.borderSoft,
      borderRadius: 24,
      borderWidth: 1,
      gap: 17,
      paddingHorizontal: 16,
      paddingVertical: 18,
    },
    featureRow: { alignItems: 'center', flexDirection: 'row', gap: 11 },
    featureIcon: {
      alignItems: 'center',
      backgroundColor: colors.positive,
      borderRadius: radii.full,
      height: 27,
      justifyContent: 'center',
      width: 27,
    },
    featureText: { color: colors.ink, flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
    planCard: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.borderSoft,
      borderRadius: 23,
      borderWidth: 1.5,
      flexDirection: 'row',
      gap: 12,
      minHeight: 106,
      paddingHorizontal: 16,
      paddingVertical: 14,
      position: 'relative',
    },
    planCardSelected: { backgroundColor: colors.actionSoft, borderColor: colors.action },
    planCardWithBadge: { marginTop: 9 },
    savingsBadge: {
      backgroundColor: colors.positive,
      borderRadius: radii.full,
      paddingHorizontal: 14,
      paddingVertical: 7,
      position: 'absolute',
      right: 17,
      top: -17,
      zIndex: 1,
    },
    savingsText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.2 },
    planCopy: { flex: 1, gap: 5 },
    planTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
    planLabel: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 13 },
    recommended: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 8, letterSpacing: 0.3 },
    planHeadline: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 21 },
    planSubline: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 11, lineHeight: 16 },
    planTextSelected: { color: colors.actionDeep },
    planSublineSelected: { color: colors.inkSecondary },
    selection: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: radii.full,
      borderWidth: 1.5,
      height: 28,
      justifyContent: 'center',
      width: 28,
    },
    selectionSelected: { backgroundColor: colors.action, borderColor: colors.action },
    renewal: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 10, lineHeight: 15 },
    noTrial: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, lineHeight: 15 },
    error: { color: colors.actionDeep, fontFamily: fonts.bodySemiBold, fontSize: 11, lineHeight: 17 },
    syncing: { color: colors.actionDeep, fontFamily: fonts.bodySemiBold, fontSize: 11, lineHeight: 17 },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: colors.action,
      borderRadius: radii.full,
      flexDirection: 'row',
      gap: 8,
      height: 56,
      justifyContent: 'center',
      marginTop: 3,
    },
    primaryButtonText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 12 },
    legalRow: { alignItems: 'center', flexDirection: 'row', gap: 9, justifyContent: 'center', paddingTop: 2 },
    legalText: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, textDecorationLine: 'underline' },
    legalDivider: { color: colors.border, fontFamily: fonts.body, fontSize: 10 },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.7 },
  });
