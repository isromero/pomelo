import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppearance } from '@/appearance/appearance-provider';
import { fonts, radii, type SemanticColors } from '@/constants/pomelo-theme';
import type { MomentErrorCode } from '@/features/moment/application/moment-controller';
import {
  emptyPhotoDraft,
  isPhotoDraftComplete,
  type DailyMoment,
  type PhotoCapture,
  type PhotoDraft,
  type PhotoSide,
} from '@/features/moment/domain/moment';
import { PhotoCompositionPreview } from '@/features/moment/presentation/photo-composition-preview';
import { useLocale } from '@/localization/locale-provider';

type PhotoMomentCardProps = {
  busy: boolean;
  error: MomentErrorCode | null;
  moment: DailyMoment;
  onDraftChange(draft: PhotoDraft): void;
  onReveal(): void;
  onSubmit(): void;
  onUseTestPhotos(): Promise<void>;
  createPrivateMediaUrl(path: string): Promise<string>;
  photoDraft: PhotoDraft | null;
  syncPending: boolean;
};

function errorKey(error: MomentErrorCode) {
  switch (error) {
    case 'draftStorage':
      return 'moment.error.draftStorage' as const;
    case 'momentClosed':
      return 'moment.error.momentClosed' as const;
    case 'momentNotReady':
      return 'moment.error.momentNotReady' as const;
    case 'network':
      return 'moment.error.network' as const;
    case 'photoIncomplete':
      return 'moment.photo.error.incomplete' as const;
    default:
      return 'moment.error.unexpected' as const;
  }
}

function PhotoCapturePanel({
  draft,
  disabled,
  onChange,
}: {
  disabled: boolean;
  draft: PhotoDraft;
  onChange(draft: PhotoDraft): void;
}) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [libraryPermission, requestLibraryPermission] = ImagePicker.useMediaLibraryPermissions();
  const [captureSide, setCaptureSide] = useState<PhotoSide | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  const updateSide = (side: PhotoSide, capture: PhotoCapture) => {
    onChange({ ...draft, [side]: capture });
    setCaptureSide(null);
    setCameraReady(false);
  };

  const openSettings = () => {
    void Linking.openSettings().catch(() => {});
  };

  const openCamera = async (side: PhotoSide) => {
    if (disabled || (side === 'front' && !draft.rear)) {
      return;
    }
    try {
      if (!cameraPermission?.granted) {
        if (cameraPermission?.canAskAgain === false) {
          openSettings();
          return;
        }
        const nextPermission = await requestCameraPermission();
        if (!nextPermission.granted) {
          return;
        }
      }
      setCaptureSide(side);
      setCameraReady(false);
    } catch {
      openSettings();
    }
  };

  const capture = async () => {
    if (!captureSide || !cameraReady || !cameraRef.current) {
      return;
    }
    try {
      const result = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!result) {
        return;
      }
      updateSide(captureSide, {
        height: result.height,
        mimeType: 'image/jpeg',
        uri: result.uri,
        width: result.width,
      });
    } catch {
      setCaptureSide(null);
      openSettings();
    }
  };

  const openLibrary = async (side: PhotoSide) => {
    if (disabled || (side === 'front' && !draft.rear)) {
      return;
    }
    try {
      const hasAccess = Boolean(
        libraryPermission?.granted || libraryPermission?.accessPrivileges === 'limited',
      );
      if (!hasAccess) {
        if (libraryPermission?.canAskAgain === false) {
          openSettings();
          return;
        }
        const nextPermission = await requestLibraryPermission();
        if (!nextPermission.granted && nextPermission.accessPrivileges !== 'limited') {
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        mediaTypes: ['images'],
        quality: 0.85,
      });
      if (result.canceled || !result.assets[0]) {
        return;
      }
      const asset = result.assets[0];
      updateSide(side, {
        height: asset.height,
        mimeType: asset.mimeType ?? 'image/jpeg',
        uri: asset.uri,
        width: asset.width,
      });
    } catch {
      openSettings();
    }
  };

  if (captureSide) {
    return (
      <View style={styles.cameraPanel}>
        <CameraView
          ref={cameraRef}
          facing={captureSide === 'rear' ? 'back' : 'front'}
          onCameraReady={() => setCameraReady(true)}
          style={styles.camera}
        />
        <View style={styles.cameraControls}>
          <Pressable onPress={() => setCaptureSide(null)} style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!cameraReady}
            onPress={() => void capture()}
            style={[styles.shutter, !cameraReady && styles.disabled]}>
            <View style={styles.shutterInner} />
          </Pressable>
          <View style={styles.cameraSpacer} />
        </View>
      </View>
    );
  }

  const sideCard = (side: PhotoSide) => {
    const capture = draft[side];
    const sideDisabled = disabled || (side === 'front' && !draft.rear);
    const label = side === 'rear' ? t('moment.photo.rear') : t('moment.photo.front');
    return (
      <View key={side} style={styles.captureCard}>
        {capture ? (
          <Image resizeMode="cover" source={{ uri: capture.uri }} style={styles.capturePreview} />
        ) : (
          <View style={styles.capturePlaceholder}>
            <Text style={styles.capturePlaceholderText}>{label}</Text>
          </View>
        )}
        <View style={styles.captureCardFooter}>
          <Text style={styles.captureLabel}>{label}</Text>
          <View style={styles.captureActions}>
            <Pressable
              accessibilityRole="button"
              disabled={sideDisabled}
              onPress={() => void openCamera(side)}
              style={[styles.smallAction, sideDisabled && styles.disabled]}>
              <Text style={styles.smallActionText}>{t('moment.photo.camera')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={sideDisabled}
              onPress={() => void openLibrary(side)}
              style={[styles.smallAction, sideDisabled && styles.disabled]}>
              <Text style={styles.smallActionText}>{t('moment.photo.gallery')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return <View style={styles.captureGrid}>{(['rear', 'front'] as PhotoSide[]).map(sideCard)}</View>;
}

export function PhotoMomentCard({
  busy,
  error,
  moment,
  onDraftChange,
  onReveal,
  onSubmit,
  onUseTestPhotos,
  createPrivateMediaUrl,
  photoDraft,
  syncPending,
}: PhotoMomentCardProps) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  const draft = photoDraft ?? emptyPhotoDraft();
  const submitted = moment.ownContribution !== null;
  const revealed = moment.status === 'revealed';
  const ready = moment.status === 'ready';
  const [testPhotosBusy, setTestPhotosBusy] = useState(false);
  const [testPhotosError, setTestPhotosError] = useState(false);

  const fillTestPhotos = async () => {
    if (testPhotosBusy || busy) {
      return;
    }
    setTestPhotosBusy(true);
    setTestPhotosError(false);
    try {
      await onUseTestPhotos();
    } catch {
      setTestPhotosError(true);
    } finally {
      setTestPhotosBusy(false);
    }
  };

  const formBusy = busy || testPhotosBusy;

  return (
    <View style={styles.card}>
      <View style={styles.metaRow}>
        <View style={styles.kindChip}>
          <Text style={styles.kindText}>{t('moment.kind.photo')}</Text>
        </View>
        <Text style={styles.privacy}>{t('moment.photo.privacy')}</Text>
      </View>
      <Text style={styles.promptLabel}>{t('moment.promptLabel')}</Text>
      <Text style={styles.prompt}>{moment.prompt.text}</Text>
      {!submitted ? (
        <>
          <Text style={styles.helper}>{t('moment.photo.sequence')}</Text>
          {__DEV__ ? (
            <Pressable
              accessibilityRole="button"
              disabled={formBusy}
              onPress={() => void fillTestPhotos()}
              style={[styles.testPhotosAction, formBusy && styles.disabled]}>
              <Text style={styles.testPhotosActionText}>
                {testPhotosBusy ? t('moment.photo.devFilling') : t('moment.photo.devFill')}
              </Text>
            </Pressable>
          ) : null}
          <PhotoCapturePanel disabled={formBusy} draft={draft} onChange={onDraftChange} />
          {syncPending ? <Text style={styles.sync}>{t('moment.syncPending')}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={formBusy || !isPhotoDraftComplete(draft)}
            onPress={onSubmit}
            style={[styles.primaryAction, (formBusy || !isPhotoDraftComplete(draft)) && styles.disabled]}>
            <Text style={styles.primaryActionText}>{t('moment.photo.submit')}</Text>
          </Pressable>
          {testPhotosError ? <Text style={styles.error}>{t('moment.photo.devError')}</Text> : null}
        </>
      ) : (
        <>
          <View style={styles.waitingPanel}>
            <Text style={styles.waitingTitle}>
              {revealed ? t('moment.photo.revealed') : t('moment.photo.saved')}
            </Text>
            <Text style={styles.waitingBody}>
              {revealed ? t('moment.photo.revealedBody') : t('moment.photo.waiting')}
            </Text>
          </View>
          {revealed ? (
            <PhotoCompositionPreview
              createPrivateMediaUrl={createPrivateMediaUrl}
              ownContribution={moment.ownContribution}
              partner={moment.partner}
            />
          ) : null}
        </>
      )}
      {ready && !revealed ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onReveal}
          style={[styles.primaryAction, busy && styles.disabled]}>
          <Text style={styles.primaryActionText}>{t('moment.action.reveal')}</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={styles.error}>{t(errorKey(error))}</Text> : null}
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 28,
      borderWidth: 1,
      gap: 14,
      padding: 18,
    },
    metaRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    kindChip: {
      backgroundColor: colors.actionSoft,
      borderRadius: radii.full,
      paddingHorizontal: 13,
      paddingVertical: 8,
    },
    kindText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.5 },
    privacy: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 },
    promptLabel: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.6 },
    prompt: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 21, lineHeight: 26 },
    helper: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
    testPhotosAction: { alignSelf: 'flex-start', borderColor: colors.action, borderRadius: radii.full, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
    testPhotosActionText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 10 },
    captureGrid: { flexDirection: 'row', gap: 10 },
    captureCard: { backgroundColor: colors.backgroundRaised, borderRadius: 18, flex: 1, overflow: 'hidden' },
    capturePreview: { aspectRatio: 0.78, width: '100%' },
    capturePlaceholder: { alignItems: 'center', aspectRatio: 0.78, justifyContent: 'center', padding: 10 },
    capturePlaceholderText: { color: colors.muted, fontFamily: fonts.bodySemiBold, fontSize: 11, textAlign: 'center' },
    captureCardFooter: { gap: 7, padding: 9 },
    captureLabel: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 10 },
    captureActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    smallAction: { backgroundColor: colors.surface, borderRadius: radii.full, paddingHorizontal: 7, paddingVertical: 5 },
    smallActionText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 9 },
    primaryAction: {
      alignItems: 'center',
      backgroundColor: colors.action,
      borderRadius: radii.full,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: 18,
    },
    primaryActionText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 12 },
    secondaryAction: { alignItems: 'center', justifyContent: 'center', minWidth: 72 },
    secondaryActionText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 12 },
    disabled: { opacity: 0.45 },
    sync: { color: colors.actionDeep, fontFamily: fonts.bodySemiBold, fontSize: 11 },
    waitingPanel: { backgroundColor: colors.backgroundRaised, borderRadius: 18, gap: 7, padding: 16 },
    waitingTitle: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 17 },
    waitingBody: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
    error: { color: colors.actionDeep, fontFamily: fonts.bodySemiBold, fontSize: 11, lineHeight: 17 },
    cameraPanel: { backgroundColor: colors.ink, borderRadius: 20, overflow: 'hidden' },
    camera: { aspectRatio: 0.76, width: '100%' },
    cameraControls: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
    cameraSpacer: { minWidth: 72 },
    shutter: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.action, borderRadius: 36, borderWidth: 4, height: 64, justifyContent: 'center', width: 64 },
    shutterInner: { backgroundColor: colors.action, borderRadius: 25, height: 44, width: 44 },
  });
