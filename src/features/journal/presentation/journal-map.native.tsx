import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { useAppearance } from '@/appearance/appearance-provider';
import { fonts, type SemanticColors } from '@/constants/pomelo-theme';
import type { JournalMapEntry } from '@/features/journal/domain/journal';
import { useLocale } from '@/localization/locale-provider';

type Filter = 'lived' | 'upcoming';

function cluster(entries: JournalMapEntry[]) {
  const groups = new Map<string, JournalMapEntry[]>();
  for (const entry of entries) {
    const key = `${Math.round(entry.location.latitude * 25)}:${Math.round(entry.location.longitude * 25)}`;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  return [...groups.values()];
}

export function JournalMap({ entries, onOpen }: { entries: JournalMapEntry[]; onOpen(id: string): void }) {
  const { colors } = useAppearance();
  const { locale } = useLocale();
  const styles = createStyles(colors);
  const mapRef = useRef<MapView>(null);
  const [filters, setFilters] = useState<Filter[]>(['lived', 'upcoming']);
  const [selected, setSelected] = useState<JournalMapEntry | null>(null);
  const copy = locale === 'es' ? { empty: 'Las entradas con un lugar confirmado aparecerán aquí.', lived: 'Vivido', upcoming: 'Por vivir', open: 'Abrir entrada' }
    : { empty: 'Entries with a confirmed place will appear here.', lived: 'Lived', upcoming: 'Still to live', open: 'Open entry' };
  const visible = useMemo(() => entries.filter((entry) => filters.includes(entry.state === 'upcoming' ? 'upcoming' : 'lived')), [entries, filters]);
  const groups = useMemo(() => cluster(visible), [visible]);
  const counts = useMemo(() => ({
    lived: entries.filter((entry) => entry.state !== 'upcoming').length,
    upcoming: entries.filter((entry) => entry.state === 'upcoming').length,
  }), [entries]);
  const first = visible[0];
  const initialRegion = useMemo(() => {
    const latitudes = visible.map((entry) => entry.location.latitude);
    const longitudes = visible.map((entry) => entry.location.longitude);
    const minLatitude = Math.min(...latitudes);
    const maxLatitude = Math.max(...latitudes);
    const minLongitude = Math.min(...longitudes);
    const maxLongitude = Math.max(...longitudes);
    return {
      latitude: (minLatitude + maxLatitude) / 2,
      latitudeDelta: Math.max(0.35, (maxLatitude - minLatitude) * 1.45),
      longitude: (minLongitude + maxLongitude) / 2,
      longitudeDelta: Math.max(0.35, (maxLongitude - minLongitude) * 1.45),
    };
  }, [visible]);

  const toggle = (filter: Filter) => {
    setFilters((current) => current.includes(filter)
      ? current.length === 1 ? current : current.filter((item) => item !== filter)
      : [...current, filter]);
    setSelected(null);
  };

  const fitMarkers = useCallback(() => {
    const coordinates = visible.map((entry) => ({
      latitude: entry.location.latitude,
      longitude: entry.location.longitude,
    }));
    if (coordinates.length === 1) {
      mapRef.current?.animateToRegion({ ...coordinates[0], latitudeDelta: 0.35, longitudeDelta: 0.35 }, 300);
    } else if (coordinates.length > 1) {
      mapRef.current?.fitToCoordinates(coordinates, {
        animated: true,
        edgePadding: { bottom: 130, left: 55, right: 55, top: 100 },
      });
    }
  }, [visible]);

  useEffect(() => {
    const timer = setTimeout(fitMarkers, 250);
    return () => clearTimeout(timer);
  }, [fitMarkers]);

  if (!first) {
    return (
      <View style={styles.empty}>
        <Ionicons color={colors.actionDeep} name="map-outline" size={30} />
        <Text style={styles.emptyText}>{copy.empty}</Text>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <View style={styles.filters}>
        {(['lived', 'upcoming'] as const).map((filter) => (
          <Pressable key={filter} onPress={() => toggle(filter)} style={[styles.filter, filters.includes(filter) && styles.filterActive]}>
            <View style={[styles.dot, { backgroundColor: filter === 'lived' ? colors.positive : colors.action }]} />
            <Text style={styles.filterText}>{copy[filter]} {counts[filter]}</Text>
          </Pressable>
        ))}
      </View>
      <MapView initialRegion={initialRegion} onMapReady={fitMarkers} ref={mapRef} style={styles.map}>
        {groups.map((group) => {
          const entry = group[0];
          const upcoming = entry.state === 'upcoming';
          return (
            <Marker coordinate={entry.location} key={group.map((item) => item.id).join(':')} onPress={() => setSelected(entry)}>
              <View style={[styles.pin, { backgroundColor: upcoming ? colors.action : colors.positive }]}>
                {group.length > 1 ? <Text style={styles.pinCount}>{group.length}</Text> : <Ionicons color={colors.white} name={upcoming ? 'sparkles' : 'heart'} size={15} />}
              </View>
            </Marker>
          );
        })}
      </MapView>
      {selected ? (
        <Pressable onPress={() => onOpen(selected.id)} style={styles.sheet}>
          <View style={styles.sheetCopy}>
            <Text style={styles.sheetDate}>{selected.startDate} - {selected.state === 'upcoming' ? copy.upcoming : copy.lived}</Text>
            <Text style={styles.sheetTitle}>{selected.title}</Text>
            <Text numberOfLines={1} style={styles.sheetPlace}>{selected.location.label}</Text>
          </View>
          <View style={styles.open}><Ionicons color={colors.white} name="arrow-forward" size={18} /></View>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  dot: { borderRadius: 5, height: 8, width: 8 },
  empty: { alignItems: 'center', backgroundColor: colors.backgroundRaised, borderRadius: 24, gap: 10, padding: 38 },
  emptyText: { color: colors.inkSecondary, fontFamily: fonts.bodyMedium, fontSize: 13, textAlign: 'center' },
  filter: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  filterActive: { borderColor: colors.action },
  filters: { flexDirection: 'row', gap: 8, left: 12, position: 'absolute', top: 12, zIndex: 2 },
  filterText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 11 },
  map: { flex: 1 },
  open: { alignItems: 'center', backgroundColor: colors.action, borderRadius: 18, height: 38, justifyContent: 'center', width: 38 },
  pin: { alignItems: 'center', borderColor: colors.white, borderRadius: 22, borderWidth: 3, height: 42, justifyContent: 'center', width: 42 },
  pinCount: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 12 },
  sheet: { alignItems: 'center', backgroundColor: colors.surfaceStrong, borderRadius: 20, bottom: 12, flexDirection: 'row', left: 12, padding: 14, position: 'absolute', right: 12 },
  sheetCopy: { flex: 1, gap: 2 },
  sheetDate: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 10, textTransform: 'uppercase' },
  sheetPlace: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 11 },
  sheetTitle: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 17 },
  shell: { borderRadius: 24, height: 520, overflow: 'hidden' },
});
