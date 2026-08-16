import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { useAccount } from '@/features/account/presentation/account-provider';
import { useMoment } from '@/features/moment/presentation/moment-provider';
import { usePremium } from '@/features/premium/presentation/premium-provider';
import { captureDiagnostic } from '@/lib/diagnostics';
import { useLocale } from '@/localization/locale-provider';
import PomeloStatusWidget from '@/widgets/pomelo-status-widget';

export function WidgetEntryScreen() {
  const { status } = useAccount();
  const { history } = useMoment();
  const premium = usePremium();
  const { t } = useLocale();
  const [snapshotUpdated, setSnapshotUpdated] = useState(false);

  useEffect(() => {
    try {
      const locked = history.length > 0 && premium.access !== 'premium';
      PomeloStatusWidget.updateSnapshot({
        action: t(locked ? 'premium.archive.unlock' : 'widget.action'),
        title: t(locked ? 'premium.widget.title' : 'widget.title'),
      });
    } catch {
      captureDiagnostic({ area: 'widget', code: 'snapshot-failed', recoverable: true });
    } finally {
      setSnapshotUpdated(true);
    }
  }, [history.length, premium.access, t]);

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
