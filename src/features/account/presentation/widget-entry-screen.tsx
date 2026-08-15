import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { useAccount } from '@/features/account/presentation/account-provider';
import { captureDiagnostic } from '@/lib/diagnostics';
import { useLocale } from '@/localization/locale-provider';
import PomeloStatusWidget from '@/widgets/pomelo-status-widget';

export function WidgetEntryScreen() {
  const { status } = useAccount();
  const { t } = useLocale();
  const [snapshotUpdated, setSnapshotUpdated] = useState(false);

  useEffect(() => {
    try {
      PomeloStatusWidget.updateSnapshot({
        action: t('widget.action'),
        title: t('widget.title'),
      });
    } catch {
      captureDiagnostic({ area: 'widget', code: 'snapshot-failed', recoverable: true });
    } finally {
      setSnapshotUpdated(true);
    }
  }, [t]);

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
