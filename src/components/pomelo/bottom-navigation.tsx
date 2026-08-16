import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '@/appearance/appearance-provider';
import { fonts, SemanticColors } from '@/constants/pomelo-theme';
import { TranslationKey } from '@/localization/catalogs';
import { useLocale } from '@/localization/locale-provider';

export type TabKey = 'home' | 'history' | 'map' | 'couple';

type BottomNavigationProps = {
  activeTab?: TabKey;
};

const tabRoutes = {
  couple: '/pair',
  history: '/history',
  home: '/home',
  map: '/map',
} as const;

const tabs: {
  key: TabKey;
  label: TranslationKey;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'home', label: 'nav.home', icon: 'home-outline', activeIcon: 'home-outline' },
  { key: 'history', label: 'nav.history', icon: 'journal-outline', activeIcon: 'journal' },
  { key: 'map', label: 'nav.map', icon: 'map-outline', activeIcon: 'map' },
  { key: 'couple', label: 'nav.pair', icon: 'heart-outline', activeIcon: 'heart' },
];

export function BottomNavigation({ activeTab = 'home' }: BottomNavigationProps) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  const handlePress = (tab: TabKey) => {
    void Haptics.selectionAsync();
    router.navigate(tabRoutes[tab]);
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
              color={isActive ? colors.action : colors.inkSecondary}
              name={isActive ? tab.activeIcon : tab.icon}
              size={22}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>{t(tab.label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 6,
    flexDirection: 'row',
    height: 72,
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 7,
    shadowColor: colors.ink,
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
    backgroundColor: colors.actionSoft,
  },
  tabPressed: {
    opacity: 0.65,
  },
  label: {
    color: colors.inkSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  labelActive: {
    color: colors.action,
  },
});
