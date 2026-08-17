import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { useAppearance } from '@/appearance/appearance-provider';
import { fonts, type SemanticColors } from '@/constants/pomelo-theme';
import type { JournalLocation } from '@/features/journal/domain/journal';
import { useLocale } from '@/localization/locale-provider';

const fallbackRegion: Region = { latitude: 40.4168, longitude: -3.7038, latitudeDelta: 0.08, longitudeDelta: 0.08 };

export function LocationPicker({ onChange, value }: { onChange(value: JournalLocation | null): void; value: JournalLocation | null }) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState<Region>(value ? { ...value, latitudeDelta: 0.04, longitudeDelta: 0.04 } : fallbackRegion);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const copy = {
    add: t('journal.location.add'), cancel: t('common.cancel'), confirm: t('journal.location.confirm'),
    denied: t('journal.location.denied'), failure: t('journal.location.failure'), remove: t('journal.location.remove'),
    search: t('journal.location.search'), title: t('journal.location.title'),
  };

  const recenter = async () => {
    setBusy(true);
    setMessage(null);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setMessage(copy.denied);
      setBusy(false);
      return;
    }
    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setRegion((current) => ({ ...current, latitude: position.coords.latitude, longitude: position.coords.longitude }));
    } catch {
      setMessage(copy.failure);
    } finally {
      setBusy(false);
    }
  };

  const openPicker = () => {
    setOpen(true);
    if (!value) void recenter();
  };

  const search = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const results = await Location.geocodeAsync(query.trim());
      const first = results[0];
      if (!first) throw new Error('not-found');
      setRegion((current) => ({ ...current, latitude: first.latitude, longitude: first.longitude }));
    } catch {
      setMessage(copy.failure);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setMessage(null);
    let place: Location.LocationGeocodedAddress | undefined;
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: region.latitude, longitude: region.longitude });
      place = results[0];
    } catch {
      place = undefined;
    }
    const city = place?.city ?? place?.subregion ?? place?.region ?? null;
    const countryCode = place?.isoCountryCode?.toUpperCase() ?? null;
    const geocodedLabel = [place?.name && place.name !== city ? place.name : null, city, place?.country]
      .filter(Boolean).join(', ');
    const label = geocodedLabel || query.trim()
      || `${region.latitude.toFixed(5)}, ${region.longitude.toFixed(5)}`;
    onChange({ city, countryCode, label, latitude: region.latitude, longitude: region.longitude });
    setOpen(false);
    setBusy(false);
  };

  if (!open) {
    return (
      <View style={styles.summary}>
        <Pressable onPress={openPicker} style={styles.summaryAction}>
          <Ionicons color={colors.actionDeep} name="location-outline" size={20} />
          <Text style={styles.summaryText}>{value?.label ?? copy.add}</Text>
        </Pressable>
        {value ? <Pressable onPress={() => onChange(null)}><Text style={styles.remove}>{copy.remove}</Text></Pressable> : null}
      </View>
    );
  }

  return (
    <View style={styles.picker}>
      <Text style={styles.title}>{copy.title}</Text>
      <View style={styles.searchRow}>
        <TextInput onChangeText={setQuery} onSubmitEditing={() => void search()} placeholder={copy.search} placeholderTextColor={colors.muted} style={styles.input} value={query} />
        <Pressable onPress={() => void search()} style={styles.iconButton}><Ionicons color={colors.white} name="search" size={18} /></Pressable>
      </View>
      <View style={styles.mapShell}>
        <MapView onRegionChangeComplete={setRegion} region={region} style={StyleSheet.absoluteFill}>
          <Marker coordinate={region} draggable onDragEnd={(event) => setRegion((current) => ({ ...current, ...event.nativeEvent.coordinate }))} />
        </MapView>
        <Pressable onPress={() => void recenter()} style={styles.recenter}>
          {busy ? <ActivityIndicator color={colors.actionDeep} size="small" /> : <Ionicons color={colors.actionDeep} name="locate" size={20} />}
        </Pressable>
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <View style={styles.actions}>
        <Pressable onPress={() => setOpen(false)} style={styles.secondary}><Text style={styles.secondaryText}>{copy.cancel}</Text></Pressable>
        <Pressable disabled={busy} onPress={() => void confirm()} style={styles.primary}><Text style={styles.primaryText}>{copy.confirm}</Text></Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10 },
  iconButton: { alignItems: 'center', backgroundColor: colors.action, borderRadius: 14, height: 48, justifyContent: 'center', width: 48 },
  input: { backgroundColor: colors.surfaceStrong, borderColor: colors.borderSoft, borderRadius: 14, borderWidth: 1, color: colors.ink, flex: 1, fontFamily: fonts.body, height: 48, paddingHorizontal: 14 },
  mapShell: { borderRadius: 18, height: 260, overflow: 'hidden' },
  message: { color: colors.actionDeep, fontFamily: fonts.bodyMedium, fontSize: 12 },
  picker: { backgroundColor: colors.backgroundRaised, borderRadius: 20, gap: 12, padding: 12 },
  primary: { alignItems: 'center', backgroundColor: colors.action, borderRadius: 14, flex: 1, padding: 13 },
  primaryText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 12 },
  recenter: { alignItems: 'center', backgroundColor: colors.surfaceStrong, borderRadius: 18, bottom: 12, height: 42, justifyContent: 'center', position: 'absolute', right: 12, width: 42 },
  remove: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 11 },
  searchRow: { flexDirection: 'row', gap: 8 },
  secondary: { alignItems: 'center', borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, padding: 13 },
  secondaryText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 12 },
  summary: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  summaryAction: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 8 },
  summaryText: { color: colors.ink, flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  title: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 18 },
});
