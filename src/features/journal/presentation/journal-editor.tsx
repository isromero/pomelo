import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '@/appearance/appearance-provider';
import { fonts, type SemanticColors } from '@/constants/pomelo-theme';
import type { JournalEntry, JournalEntryInput, JournalLocation, JournalMedia, JournalPhotoDraft } from '@/features/journal/domain/journal';
import { useJournal } from '@/features/journal/presentation/journal-provider';
import { LocationPicker } from '@/features/journal/presentation/location-picker';
import { useLocale } from '@/localization/locale-provider';

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function mediaId() {
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `media-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function PrivatePhoto({ media, onRemove }: { media: JournalMedia; onRemove(): void }) {
  const { media: repository } = useJournal();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    void repository.createMediaUrl(media.path).then((value) => { if (mounted) setUrl(value); }).catch(() => {});
    return () => { mounted = false; };
  }, [media.path, repository]);
  return (
    <View style={stylesBase.photo}>
      {url ? <Image cachePolicy="none" contentFit="cover" source={{ uri: url }} style={StyleSheet.absoluteFill} /> : <ActivityIndicator />}
      <Pressable onPress={onRemove} style={stylesBase.photoRemove}><Ionicons color="#FFFFFF" name="close" size={15} /></Pressable>
    </View>
  );
}

export function JournalEditor({ entry, onClose, visible }: { entry: JournalEntry | null; onClose(): void; visible: boolean }) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const { access, busy, controller, error, media: repository } = useJournal();
  const dynamic = createStyles(colors);
  const [title, setTitle] = useState(entry?.title ?? '');
  const [body, setBody] = useState(entry?.body ?? '');
  const [startDate, setStartDate] = useState(entry?.startDate ?? today());
  const [endDate, setEndDate] = useState(entry?.endDate ?? '');
  const [startTime, setStartTime] = useState(entry?.startTime ?? '');
  const [recurrence, setRecurrence] = useState<'once' | 'yearly'>(entry?.recurrence ?? 'once');
  const [widgetHidden, setWidgetHidden] = useState(entry?.widgetHidden ?? false);
  const [location, setLocation] = useState<JournalLocation | null>(entry?.location ?? null);
  const [drafts, setDrafts] = useState<JournalPhotoDraft[]>([]);
  const [savingMedia, setSavingMedia] = useState(false);
  const [expectedVersion] = useState(entry?.version ?? null);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const copy = {
    body: t('journal.editor.body'), cancel: t('common.cancel'), confirmDelete: t('journal.editor.confirmDelete'),
    date: t('journal.editor.date'), delete: t('journal.editor.delete'), editTitle: t('journal.editor.edit'),
    end: t('journal.editor.end'), failed: t('journal.editor.failed'), newTitle: t('journal.editor.new'),
    photos: t('journal.editor.photos'), premium: t('journal.editor.premium'), readOnly: t('journal.editor.readOnly'),
    repeat: t('journal.editor.repeat'), save: t('journal.editor.save'), savedPartial: t('journal.editor.partial'),
    time: t('journal.editor.time'), title: t('journal.editor.title'), widget: t('journal.editor.widget'),
  };

  const selectPhotos = async () => {
    const remaining = 10 - (entry?.media.length ?? 0) - drafts.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      exif: false,
      mediaTypes: ['images'],
      quality: 1,
      selectionLimit: remaining,
    });
    if (!result.canceled) {
      setDrafts((current) => [...current, ...result.assets.slice(0, remaining).map((asset) => ({
        height: asset.height, uri: asset.uri, width: asset.width,
      }))]);
    }
  };

  const input: JournalEntryInput = {
    body,
    endDate: endDate.trim() || null,
    location,
    mediaCount: (entry?.media.length ?? 0) + drafts.length,
    recurrence,
    startDate,
    startTime: startTime.trim() || null,
    timeZone,
    title,
    widgetHidden,
  };

  const save = async () => {
    const saved = entry
      ? await controller.updateEntry(entry.id, expectedVersion ?? entry.version, input)
      : await controller.createEntry(input);
    if (!saved) return;
    if (drafts.length) {
      setSavingMedia(true);
      const usedPositions = new Set(saved.media.map((media) => media.position));
      const availablePositions = Array.from({ length: 10 }, (_, position) => position)
        .filter((position) => !usedPositions.has(position));
      const uploads = await Promise.allSettled(drafts.map((draft, index) => repository.addPhoto(saved, draft, availablePositions[index], mediaId())));
      setSavingMedia(false);
      await controller.refresh();
      if (uploads.some((result) => result.status === 'rejected')) Alert.alert(copy.savedPartial);
    }
    onClose();
  };

  const removeExisting = async (media: JournalMedia) => {
    await repository.removePhoto(media);
    await controller.refresh();
  };

  const removeEntry = () => {
    if (!entry) return;
    Alert.alert(copy.delete, copy.confirmDelete, [
      { style: 'cancel', text: copy.cancel },
      { style: 'destructive', text: copy.delete, onPress: () => void controller.deleteEntry(entry.id).then((deleted) => { if (deleted) onClose(); }) },
    ]);
  };

  const disabled = busy || savingMedia || !title.trim() || access.readOnly || (!entry && !access.canCreate);

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <SafeAreaView style={[stylesBase.screen, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={stylesBase.flex}>
          <View style={dynamic.header}>
            <Pressable onPress={onClose}><Text style={dynamic.cancel}>{copy.cancel}</Text></Pressable>
            <Text style={dynamic.heading}>{entry ? copy.editTitle : copy.newTitle}</Text>
            <Pressable disabled={disabled} onPress={() => void save()}><Text style={[dynamic.save, disabled && dynamic.disabled]}>{copy.save}</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={stylesBase.content} keyboardShouldPersistTaps="handled">
            {!entry && !access.canCreate ? <Text style={dynamic.premium}>{copy.premium}</Text> : null}
            {access.readOnly ? <Text style={dynamic.premium}>{copy.readOnly}</Text> : null}
            {error ? <Text style={dynamic.error}>{copy.failed}</Text> : null}
            <TextInput maxLength={120} onChangeText={setTitle} placeholder={copy.title} placeholderTextColor={colors.muted} style={[dynamic.input, dynamic.titleInput]} value={title} />
            <TextInput maxLength={5000} multiline onChangeText={setBody} placeholder={copy.body} placeholderTextColor={colors.muted} style={[dynamic.input, dynamic.bodyInput]} value={body} />
            <View style={stylesBase.row}>
              <View style={stylesBase.flex}><Text style={dynamic.label}>{copy.date}</Text><TextInput autoCapitalize="none" onChangeText={setStartDate} placeholder="YYYY-MM-DD" style={dynamic.input} value={startDate} /></View>
              <View style={stylesBase.small}><Text style={dynamic.label}>{copy.time}</Text><TextInput autoCapitalize="none" onChangeText={setStartTime} placeholder="HH:MM" style={dynamic.input} value={startTime} /></View>
            </View>
            <Text style={dynamic.label}>{copy.end}</Text>
            <TextInput autoCapitalize="none" onChangeText={setEndDate} placeholder="YYYY-MM-DD" style={dynamic.input} value={endDate} />
            <View style={dynamic.setting}><Text style={dynamic.settingText}>{copy.repeat}</Text><Switch onValueChange={(enabled) => setRecurrence(enabled ? 'yearly' : 'once')} value={recurrence === 'yearly'} /></View>
            <View style={dynamic.setting}><Text style={dynamic.settingText}>{copy.widget}</Text><Switch onValueChange={setWidgetHidden} value={widgetHidden} /></View>
            <LocationPicker onChange={setLocation} value={location} />
            <View style={stylesBase.photoHeading}><Text style={dynamic.label}>{copy.photos} ({(entry?.media.length ?? 0) + drafts.length}/10)</Text><Pressable onPress={() => void selectPhotos()}><Ionicons color={colors.actionDeep} name="add-circle" size={25} /></Pressable></View>
            <View style={stylesBase.photos}>
              {entry?.media.map((media) => <PrivatePhoto key={media.id} media={media} onRemove={() => void removeExisting(media)} />)}
              {drafts.map((draft, index) => (
                <View key={`${draft.uri}-${index}`} style={stylesBase.photo}>
                  <Image contentFit="cover" source={{ uri: draft.uri }} style={StyleSheet.absoluteFill} />
                  <Pressable onPress={() => setDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={stylesBase.photoRemove}><Ionicons color="#FFFFFF" name="close" size={15} /></Pressable>
                </View>
              ))}
            </View>
            {entry ? <Pressable onPress={removeEntry} style={dynamic.delete}><Text style={dynamic.deleteText}>{copy.delete}</Text></Pressable> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const stylesBase = StyleSheet.create({
  bodyInput: { minHeight: 100, textAlignVertical: 'top' }, content: { gap: 14, padding: 20, paddingBottom: 60 }, flex: { flex: 1 },
  photo: { alignItems: 'center', backgroundColor: '#E8E1D2', borderRadius: 14, height: 90, justifyContent: 'center', overflow: 'hidden', width: 90 },
  photoHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, photoRemove: { alignItems: 'center', backgroundColor: 'rgba(16,36,27,0.75)', borderRadius: 12, height: 24, justifyContent: 'center', position: 'absolute', right: 5, top: 5, width: 24 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, row: { flexDirection: 'row', gap: 10 }, screen: { flex: 1 }, small: { width: 120 },
});

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  bodyInput: {}, cancel: { color: colors.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 13 },
  delete: { alignItems: 'center', borderColor: colors.action, borderRadius: 16, borderWidth: 1, marginTop: 10, padding: 14 }, deleteText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 13 },
  disabled: { opacity: 0.35 }, header: { alignItems: 'center', borderBottomColor: colors.borderSoft, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  error: { color: colors.actionDeep, fontFamily: fonts.bodyMedium, fontSize: 12 },
  heading: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 18 }, input: { backgroundColor: colors.surfaceStrong, borderColor: colors.borderSoft, borderRadius: 16, borderWidth: 1, color: colors.ink, fontFamily: fonts.body, fontSize: 14, minHeight: 50, paddingHorizontal: 14, paddingVertical: 13 },
  label: { color: colors.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 11, marginBottom: 5 }, premium: { backgroundColor: colors.rewardSoft, borderRadius: 16, color: colors.inkSecondary, fontFamily: fonts.bodyMedium, fontSize: 12, padding: 13 },
  save: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 13 }, setting: { alignItems: 'center', backgroundColor: colors.backgroundRaised, borderRadius: 17, flexDirection: 'row', justifyContent: 'space-between', padding: 13 },
  settingText: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13 }, titleInput: { fontFamily: fonts.displayBold, fontSize: 20 },
});
