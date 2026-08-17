import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'react-native';

import type { PhotoCapture, PhotoDraft, PhotoSide } from '@/features/moment/domain/moment';

const testAssets: Record<PhotoSide, number> = {
  front: require('@/assets/images/pom/pom-surprised.png'),
  rear: require('@/assets/images/pom/pom-affectionate.png'),
};

export async function createDevelopmentPhotoDraft(momentId: string): Promise<PhotoDraft> {
  const captures = await Promise.all(
    (Object.keys(testAssets) as PhotoSide[]).map((side) => downloadTestPhoto(momentId, side)),
  );
  return captures.reduce<PhotoDraft>(
    (draft, capture) => ({ ...draft, [capture.side]: capture.photo }),
    { front: null, rear: null },
  );
}

async function downloadTestPhoto(momentId: string, side: PhotoSide) {
  const source = Image.resolveAssetSource(testAssets[side]);
  if (!source?.uri || !source.width || !source.height || !FileSystem.cacheDirectory) {
    throw new Error('Development photo asset unavailable');
  }

  const destination = `${FileSystem.cacheDirectory}pomelo-development-${momentId}-${side}.png`;
  await FileSystem.deleteAsync(destination, { idempotent: true });
  const local = source.uri.startsWith('file://')
    ? source.uri
    : (await FileSystem.downloadAsync(source.uri, destination)).uri;

  return {
    photo: {
      height: source.height,
      mimeType: 'image/png',
      uri: local,
      width: source.width,
    } satisfies PhotoCapture,
    side,
  };
}
