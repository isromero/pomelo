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

import { useAppearance } from '@/appearance/appearance-provider';
import { fonts, radii, type SemanticColors } from '@/constants/pomelo-theme';
import type {
  PremiumErrorCode,
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

export function PremiumPaywall({
  onClose,
  visible,
}: {
  onClose(): void;
  visible: boolean;
}) {
  const { colors } = useAppearance();
  const { locale, t } = useLocale();
  const { access, busy, controller, entitlement, error, offers, storeEntitled } = usePremium();
  const styles = createStyles(colors);
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlanId>('annual');
  const annualOffer = offers.find((offer) => offer.plan === 'annual');
  const monthlyOffer = offers.find((offer) => offer.plan === 'monthly');
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
      transparent
      visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        <Pressable onPress={() => {}} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>{t('premium.eyebrow')}</Text>
              <Text style={styles.title}>{t('premium.title')}</Text>
            </View>
            <Pressable
              accessibilityLabel={t('common.close')}
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <Ionicons color={colors.inkSecondary} name="close" size={23} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <Text style={styles.body}>{t('premium.body')}</Text>

            <PlanCard
              billing={t('premium.billing.annual')}
              label={t('premium.annual')}
              offer={annualOffer?.price ?? t('premium.price.annual')}
              recommended
              selected={selectedPlan === 'annual'}
              onPress={() => setSelectedPlan('annual')}
              styles={styles}
            />
            <PlanCard
              billing={t('premium.billing.monthly')}
              label={t('premium.monthly')}
              offer={monthlyOffer?.price ?? t('premium.price.monthly')}
              selected={selectedPlan === 'monthly'}
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

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void controller.restore()}
              style={({ pressed }) => [styles.restoreButton, pressed && styles.pressed]}>
              <Text style={styles.restoreText}>{t('premium.restore')}</Text>
            </Pressable>

            <View style={styles.legalRow}>
              <Pressable
                accessibilityRole="link"
                onPress={() => openLegal('terms')}>
                <Text style={styles.legalText}>{t('premium.terms')}</Text>
              </Pressable>
              <Text style={styles.legalDivider}>|</Text>
              <Pressable
                accessibilityRole="link"
                onPress={() => openLegal('privacy')}>
                <Text style={styles.legalText}>{t('premium.privacy')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PlanCard({
  billing,
  label,
  offer,
  recommended = false,
  selected,
  onPress,
  styles,
}: {
  billing: string;
  label: string;
  offer: string;
  recommended?: boolean;
  selected: boolean;
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
        pressed && styles.pressed,
      ]}>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <View style={styles.planCopy}>
        <View style={styles.planTitleRow}>
          <Text style={styles.planLabel}>{label}</Text>
          {recommended && <Text style={styles.recommended}>{t('premium.recommended')}</Text>}
        </View>
        <Text style={styles.planBilling}>{billing}</Text>
      </View>
      <Text style={styles.planPrice}>{offer}</Text>
      <Ionicons
        color={selected ? colors.actionDeep : colors.muted}
        name="checkmark-circle-outline"
        size={20}
      />
    </Pressable>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    backdrop: {
      backgroundColor: 'rgba(16, 36, 27, 0.5)',
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      maxHeight: '94%',
      paddingHorizontal: 20,
      paddingTop: 10,
    },
    handle: {
      alignSelf: 'center',
      backgroundColor: colors.border,
      borderRadius: radii.full,
      height: 4,
      marginBottom: 13,
      width: 42,
    },
    header: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
    headerCopy: { flex: 1, gap: 6 },
    eyebrow: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.65 },
    title: { color: colors.ink, fontFamily: fonts.displayExtraBold, fontSize: 30, letterSpacing: -0.9, lineHeight: 34 },
    closeButton: {
      alignItems: 'center',
      backgroundColor: colors.backgroundRaised,
      borderRadius: radii.full,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    scrollContent: { gap: 10, paddingBottom: 28, paddingTop: 12 },
    body: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 12, lineHeight: 19 },
    planCard: {
      alignItems: 'center',
      backgroundColor: colors.backgroundRaised,
      borderColor: colors.borderSoft,
      borderRadius: 18,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 9,
      minHeight: 76,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    planCardSelected: { backgroundColor: colors.actionSoft, borderColor: colors.action },
    radio: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1.5,
      height: 20,
      justifyContent: 'center',
      width: 20,
    },
    radioSelected: { borderColor: colors.actionDeep },
    radioDot: { backgroundColor: colors.actionDeep, borderRadius: 5, height: 10, width: 10 },
    planCopy: { flex: 1, gap: 4 },
    planTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
    planLabel: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 13 },
    recommended: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 8, letterSpacing: 0.3 },
    planBilling: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 10, lineHeight: 15 },
    planPrice: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 12, textAlign: 'right' },
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
      height: 54,
      justifyContent: 'center',
      marginTop: 4,
    },
    primaryButtonText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 12 },
    disabled: { opacity: 0.5 },
    restoreButton: { alignItems: 'center', height: 38, justifyContent: 'center' },
    restoreText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 11 },
    legalRow: { alignItems: 'center', flexDirection: 'row', gap: 9, justifyContent: 'center', paddingTop: 3 },
    legalText: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, textDecorationLine: 'underline' },
    legalDivider: { color: colors.border, fontFamily: fonts.body, fontSize: 10 },
    pressed: { opacity: 0.7 },
  });
