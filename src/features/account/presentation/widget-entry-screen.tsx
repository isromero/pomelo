import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { useAccount } from '@/features/account/presentation/account-provider';
import { nextWidgetOccurrence, useJournal } from '@/features/journal/journal-api';
import { type AccessoryId, usePomProgress } from '@/features/pom/pom-api';
import { usePremium } from '@/features/premium/presentation/premium-provider';
import { captureDiagnostic } from '@/lib/diagnostics';
import { useLocale } from '@/localization/locale-provider';
import type { TranslationKey } from '@/localization/catalogs';
import PomeloStatusWidget from '@/widgets/pomelo-status-widget';

const accessoryLabels: Record<AccessoryId, TranslationKey> = {
  crown: 'pom.accessory.crown',
  ribbon: 'pom.accessory.ribbon',
  scarf: 'pom.accessory.scarf',
  sunhat: 'pom.accessory.sunhat',
};

export function WidgetEntryScreen() {
  const { status } = useAccount();
  const { entries, projection } = useJournal();
  const { progress } = usePomProgress();
  const premium = usePremium();
  const { locale, t } = useLocale();
  const [snapshotUpdated, setSnapshotUpdated] = useState(false);

  useEffect(() => {
    try {
      const locked = premium.access !== 'premium';
      const next = nextWidgetOccurrence(entries, projection.upcoming);
      PomeloStatusWidget.updateSnapshot({
        accessoryLabel: progress?.equippedAccessory
          ? t(accessoryLabels[progress.equippedAccessory])
          : undefined,
        action: locked ? t('premium.unlock') : next
          ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
            .format(new Date(`${next.startDate}T12:00:00`))
          : t('widget.action'),
        title: locked ? t('premium.widget.title') : next?.name ?? t('widget.title'),
        url: next?.kind === 'entry'
          ? `pomelo://diary?entryId=${encodeURIComponent(next.id)}`
          : 'pomelo://diary?view=calendar',
      });
    } catch {
      captureDiagnostic({ area: 'widget', code: 'snapshot-failed', recoverable: true });
    } finally {
      setSnapshotUpdated(true);
    }
  }, [entries, locale, premium.access, progress?.equippedAccessory, projection.upcoming, t]);

  if (!snapshotUpdated || status === 'booting') {
    return null;
  }
  if (status === 'ready') {
    return <Redirect href="/home" />;
  }
  if (status === 'profileRequired' || status === 'profileUnavailable') {
    return <Redirect href="/profile" />;
  }
  return <Redirect href="/" />;
}
