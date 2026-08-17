import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import type { PhotoCapture, PhotoDraft } from '@/features/moment/domain/moment';
import type { PhotoDraftStore } from '@/features/moment/application/moment-controller';

const keyPrefix = 'pomelo.private.photo-draft.';
const directoryName = 'pomelo-photo-drafts/';

function key(momentId: string) {
  return `${keyPrefix}${momentId}`;
}

function parseCapture(value: unknown): PhotoCapture | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const capture = value as Record<string, unknown>;
  if (
    typeof capture.uri !== 'string' ||
    typeof capture.width !== 'number' ||
    typeof capture.height !== 'number' ||
    typeof capture.mimeType !== 'string'
  ) {
    return null;
  }
  return {
    height: capture.height,
    mimeType: capture.mimeType,
    uri: capture.uri,
    width: capture.width,
  };
}

export function parsePhotoDraft(value: string | null): PhotoDraft | null {
  if (!value) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    const draft = parsed as Record<string, unknown>;
    const front = parseCapture(draft.front);
    const rear = parseCapture(draft.rear);
    if (!front && !rear) {
      return null;
    }
    return { front, rear };
  } catch {
    return null;
  }
}

export class LocalPhotoDraftStore implements PhotoDraftStore {
  async get(momentId: string) {
    return parsePhotoDraft(await AsyncStorage.getItem(key(momentId)));
  }

  async remove(momentId: string) {
    const draft = parsePhotoDraft(await AsyncStorage.getItem(key(momentId)));
    await AsyncStorage.removeItem(key(momentId));
    await Promise.all(
      [draft?.front, draft?.rear]
        .filter(
          (capture): capture is PhotoCapture =>
            capture !== undefined && capture !== null && isOwnedUri(capture.uri),
        )
        .map((capture) => FileSystem.deleteAsync(capture.uri, { idempotent: true })),
    );
  }

  async save(momentId: string, draft: PhotoDraft) {
    const previous = parsePhotoDraft(await AsyncStorage.getItem(key(momentId)));
    const persisted: PhotoDraft = {
      front: draft.front ? await persistCapture(momentId, 'front', draft.front) : null,
      rear: draft.rear ? await persistCapture(momentId, 'rear', draft.rear) : null,
    };
    await AsyncStorage.setItem(key(momentId), JSON.stringify(persisted));
    await Promise.all(
      [previous?.front, previous?.rear]
        .filter(
          (capture): capture is PhotoCapture =>
            capture !== undefined &&
            capture !== null &&
            isOwnedUri(capture.uri) &&
            ![persisted.front?.uri, persisted.rear?.uri].includes(capture.uri),
        )
        .map((capture) => FileSystem.deleteAsync(capture.uri, { idempotent: true })),
    );
    return persisted;
  }
}

function isOwnedUri(uri: string) {
  return Boolean(FileSystem.documentDirectory && uri.startsWith(draftDirectory()));
}

function draftDirectory() {
  if (!FileSystem.documentDirectory) {
    throw new Error('documentDirectory unavailable');
  }
  return `${FileSystem.documentDirectory}${directoryName}`;
}

async function persistCapture(
  momentId: string,
  side: 'front' | 'rear',
  capture: PhotoCapture,
) {
  const directory = draftDirectory();
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const destination = `${directory}${momentId}-${side}.jpg`;
  if (capture.uri !== destination) {
    await FileSystem.deleteAsync(destination, { idempotent: true });
    await FileSystem.copyAsync({ from: capture.uri, to: destination });
  }
  return { ...capture, uri: destination };
}
