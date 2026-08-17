import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { useAccount } from '@/features/account/presentation/account-provider';
import { useMoment } from '@/features/moment/moment-api';
import { usePomProgress } from '@/features/pom/presentation/progress-provider';
import type { AccessoryId } from '@/features/pom/domain/progress';
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
  const { history } = useMoment();
  const { progress } = usePomProgress();
  const premium = usePremium();
  const { t } = useLocale();
  const [snapshotUpdated, setSnapshotUpdated] = useState(false);

  useEffect(() => {
    try {
      const locked = history.length > 0 && premium.access !== 'premium';
      PomeloStatusWidget.updateSnapshot({
        accessoryLabel: progress?.equippedAccessory
          ? t(accessoryLabels[progress.equippedAccessory])
          : undefined,
        action: t(locked ? 'premium.unlock' : 'widget.action'),
        title: t(locked ? 'premium.widget.title' : 'widget.title'),
      });
    } catch {
      captureDiagnostic({ area: 'widget', code: 'snapshot-failed', recoverable: true });
    } finally {
      setSnapshotUpdated(true);
    }
  }, [history.length, premium.access, progress?.equippedAccessory, t]);

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
