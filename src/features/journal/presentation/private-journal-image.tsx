import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import type { JournalMedia } from '@/features/journal/domain/journal';
import { useJournal } from '@/features/journal/presentation/journal-provider';

export function PrivateJournalImage({
  media,
  onRemove,
  style,
}: {
  media: JournalMedia;
  onRemove?(): void;
  style: StyleProp<ViewStyle>;
}) {
  const { media: repository } = useJournal();
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
        <Pressable onPress={onRemove} style={styles.remove}>
          <Ionicons color="#FFFFFF" name="close" size={15} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  remove: { alignItems: 'center', backgroundColor: 'rgba(16,36,27,0.75)', borderRadius: 12, height: 24, justifyContent: 'center', position: 'absolute', right: 5, top: 5, width: 24 },
});
