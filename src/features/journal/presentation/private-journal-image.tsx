import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { useAppearance } from '@/appearance/appearance-provider';
import type { SemanticColors } from '@/constants/pomelo-theme';
import type { JournalMedia } from '@/features/journal/domain/journal';
import { useJournal } from '@/features/journal/presentation/journal-provider';
import { useLocale } from '@/localization/locale-provider';

export function PrivateJournalImage({
  media,
  onRemove,
  style,
}: {
  media: JournalMedia;
  onRemove?(): void;
  style: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const { media: repository } = useJournal();
  const styles = createStyles(colors);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void repository.createMediaUrl(media.path)
      .then((value) => { if (mounted) setUrl(value); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [media.path, repository]);

  return (
    <View style={style}>
      {url
        ? <Image cachePolicy="none" contentFit="cover" source={{ uri: url }} style={StyleSheet.absoluteFill} />
        : <ActivityIndicator />}
      {onRemove ? (
        <Pressable accessibilityLabel={t('journal.accessibility.removePhoto')} accessibilityRole="button" onPress={onRemove} style={styles.remove}>
          <Ionicons color={colors.white} name="close" size={15} />
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  remove: { alignItems: 'center', backgroundColor: colors.scrim, borderRadius: 12, height: 24, justifyContent: 'center', position: 'absolute', right: 5, top: 5, width: 24 },
});
