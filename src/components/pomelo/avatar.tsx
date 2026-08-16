import { Image, StyleSheet, View } from 'react-native';

import { palette } from '@/constants/pomelo-theme';

const avatarSources = {
  affectionate: require('@/assets/images/pom/pom-affectionate.png'),
  calm: require('@/assets/images/pom/pom-calm.png'),
  surprised: require('@/assets/images/pom/pom-surprised.png'),
} as const;

type AvatarKey = keyof typeof avatarSources;

export function Avatar({ avatarKey, size = 120 }: { avatarKey: AvatarKey; size?: number }) {
  return (
    <View
      style={[
        styles.frame,
        { borderRadius: size / 2, height: size, width: size },
      ]}>
      <Image
        resizeMode="contain"
        source={avatarSources[avatarKey]}
        style={{ height: size * 0.78, width: size * 0.78 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    backgroundColor: palette.rewardSoft,
    borderColor: palette.surfaceStrong,
    borderWidth: 5,
    justifyContent: 'center',
  },
});
