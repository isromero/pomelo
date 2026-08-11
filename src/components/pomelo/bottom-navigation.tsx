import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, palette } from '@/constants/pomelo-theme';

type TabKey = 'home' | 'history' | 'map' | 'couple';

type BottomNavigationProps = {
  activeTab?: TabKey;
  onSelect?: (tab: TabKey) => void;
};

const tabs: {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'home', label: 'Inicio', icon: 'home-outline', activeIcon: 'home-outline' },
  { key: 'history', label: 'Historia', icon: 'journal-outline', activeIcon: 'journal' },
  { key: 'map', label: 'Mapa', icon: 'map-outline', activeIcon: 'map' },
  { key: 'couple', label: 'Pareja', icon: 'heart-outline', activeIcon: 'heart' },
];

export function BottomNavigation({ activeTab = 'home', onSelect }: BottomNavigationProps) {
  const handlePress = (tab: TabKey) => {
    void Haptics.selectionAsync();
    onSelect?.(tab);
  };

  return (
    <View style={styles.bar}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={tab.key}
            onPress={() => handlePress(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              isActive && styles.tabActive,
              pressed && styles.tabPressed,
            ]}>
            <Ionicons
              color={isActive ? palette.action : palette.inkSecondary}
              name={isActive ? tab.activeIcon : tab.icon}
              size={22}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 6,
    flexDirection: 'row',
    height: 72,
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 7,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    width: '100%',
  },
  tab: {
    alignItems: 'center',
    borderRadius: 18,
    gap: 2,
    height: 58,
    justifyContent: 'center',
    paddingBottom: 4,
    paddingTop: 5,
    width: 78,
  },
  tabActive: {
    backgroundColor: palette.actionSoft,
  },
  tabPressed: {
    opacity: 0.65,
  },
  label: {
    color: palette.inkSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  labelActive: {
    color: palette.action,
  },
});
