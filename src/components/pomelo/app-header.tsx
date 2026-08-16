import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '@/appearance/appearance-provider';
import { Avatar } from '@/components/pomelo/avatar';
import { fonts, radii, type SemanticColors } from '@/constants/pomelo-theme';
import type { AvatarKey } from '@/features/account/domain/profile';
import { useLocale } from '@/localization/locale-provider';

export function AppHeader({
  avatarKey,
  onAvatarPress,
  showStreak = true,
}: {
  avatarKey: AvatarKey;
  onAvatarPress(): void;
  showStreak?: boolean;
}) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);

  return (
    <View style={styles.header}>
      <Text style={styles.wordmark}>{t('home.wordmark')}</Text>
      <View style={styles.headerActions}>
        {showStreak && (
          <View style={styles.streak}>
            <Ionicons color={colors.action} name="flame" size={18} />
            <Text style={styles.streakText}>{t('home.streak')}</Text>
          </View>
        )}
        <Pressable
          accessibilityLabel={t('common.signOut')}
          accessibilityRole="button"
          onPress={onAvatarPress}
          style={styles.avatar}>
          <Avatar avatarKey={avatarKey} size={40} />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      height: 52,
      justifyContent: 'space-between',
      overflow: 'hidden',
      width: '100%',
    },
    wordmark: {
      color: colors.ink,
      fontFamily: fonts.displayExtraBold,
      fontSize: 26,
      letterSpacing: -1.1,
      lineHeight: 32,
    },
    headerActions: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'flex-end',
    },
    streak: {
      alignItems: 'center',
      backgroundColor: colors.actionSoft,
      borderRadius: radii.full,
      flexDirection: 'row',
      gap: 6,
      height: 40,
      justifyContent: 'center',
      width: 94,
    },
    streakText: {
      color: colors.ink,
      fontFamily: fonts.bodyBold,
      fontSize: 12,
    },
    avatar: {
      alignItems: 'center',
      borderRadius: 20,
      height: 40,
      justifyContent: 'center',
      overflow: 'hidden',
      width: 40,
    },
  });
