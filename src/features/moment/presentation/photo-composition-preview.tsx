import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

import { useAppearance } from '@/appearance/appearance-provider';
import type { SemanticColors } from '@/constants/pomelo-theme';
import type { Contribution, MomentPartner } from '@/features/moment/domain/moment';

type PhotoCompositionPreviewProps = {
  createPrivateMediaUrl(path: string): Promise<string>;
  ownContribution: Contribution | null;
  partner: MomentPartner;
};

export function PhotoCompositionPreview({
  createPrivateMediaUrl,
  ownContribution,
  partner,
}: PhotoCompositionPreviewProps) {
  const { colors } = useAppearance();
  const styles = createStyles(colors);
  const ownPhoto = ownContribution?.photo ?? null;
  const partnerPhoto = partner.contribution?.photo ?? null;
  const [urls, setUrls] = useState<{
    ownFront: string | null;
    ownRear: string | null;
    partnerFront: string | null;
    partnerRear: string | null;
  }>({ ownFront: null, ownRear: null, partnerFront: null, partnerRear: null });

  useEffect(() => {
    let active = true;
    const ownFrontPath = ownPhoto?.front.path ?? null;
    const ownRearPath = ownPhoto?.rear.path ?? null;
    const partnerFrontPath = partnerPhoto?.front.path ?? null;
    const partnerRearPath = partnerPhoto?.rear.path ?? null;
    void Promise.all([
      ownFrontPath ? createPrivateMediaUrl(ownFrontPath) : Promise.resolve(null),
      ownRearPath ? createPrivateMediaUrl(ownRearPath) : Promise.resolve(null),
      partnerFrontPath ? createPrivateMediaUrl(partnerFrontPath) : Promise.resolve(null),
      partnerRearPath ? createPrivateMediaUrl(partnerRearPath) : Promise.resolve(null),
    ]).then(([ownFront, ownRear, partnerFront, partnerRear]) => {
      if (active) {
        setUrls({ ownFront, ownRear, partnerFront, partnerRear });
      }
    }).catch(() => {
      if (active) {
        setUrls({ ownFront: null, ownRear: null, partnerFront: null, partnerRear: null });
      }
    });
    return () => {
      active = false;
    };
  }, [
    createPrivateMediaUrl,
    ownPhoto?.front.path,
    ownPhoto?.rear.path,
    partnerPhoto?.front.path,
    partnerPhoto?.rear.path,
  ]);

  if (!ownPhoto || !partnerPhoto) {
    return (
      <View style={styles.photoPlaceholder}>
        <Ionicons color={colors.muted} name="images-outline" size={24} />
      </View>
    );
  }

  const loading = !urls.partnerRear || !urls.ownRear;
  return (
    <View style={styles.photoComposition}>
      <View style={styles.photoPrimary}>
        {urls.partnerRear ? (
          <Image resizeMode="cover" source={{ uri: urls.partnerRear }} style={styles.photoImage} />
        ) : null}
        {urls.partnerFront ? (
          <Image resizeMode="cover" source={{ uri: urls.partnerFront }} style={styles.photoPartnerFront} />
        ) : null}
        {loading ? <ActivityIndicator color={colors.action} size="small" style={styles.loader} /> : null}
      </View>
      <View style={styles.photoThumbnail}>
        {urls.ownRear ? <Image resizeMode="cover" source={{ uri: urls.ownRear }} style={styles.photoImage} /> : null}
        {urls.ownFront ? <Image resizeMode="cover" source={{ uri: urls.ownFront }} style={styles.photoOwnFront} /> : null}
      </View>
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    photoComposition: { aspectRatio: 1.3, flexDirection: 'row', gap: 8 },
    photoPrimary: { backgroundColor: colors.backgroundRaised, borderRadius: 18, flex: 1, overflow: 'hidden' },
    photoThumbnail: { alignSelf: 'flex-end', backgroundColor: colors.backgroundRaised, borderColor: colors.surface, borderRadius: 13, borderWidth: 3, bottom: 8, height: 72, overflow: 'hidden', position: 'absolute', right: 8, width: 58 },
    photoImage: { height: '100%', width: '100%' },
    photoOwnFront: { borderColor: colors.surface, borderRadius: 5, borderWidth: 1, bottom: 3, height: 30, position: 'absolute', right: 3, width: 24 },
    photoPartnerFront: { borderColor: colors.surface, borderRadius: 9, borderWidth: 2, bottom: 9, height: 82, position: 'absolute', right: 9, width: 64 },
    photoPlaceholder: { alignItems: 'center', aspectRatio: 1.3, backgroundColor: colors.backgroundRaised, borderRadius: 18, justifyContent: 'center' },
    loader: { ...StyleSheet.absoluteFill },
  });
