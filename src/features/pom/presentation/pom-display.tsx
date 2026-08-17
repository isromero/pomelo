import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import {
  type AccessoryId,
  type PomExpression,
} from '@/features/pom/domain/progress';
import {
  reactionKeyPoses,
  type PomReaction,
} from '@/features/pom/domain/reactions';

export const POM_MASTER_ASSET = require('@/assets/images/pom/pom-symbol.png');

const expressionSources: Record<PomExpression, number> = {
  calm: POM_MASTER_ASSET,
  happy: require('@/assets/images/pom/pom-happy.svg'),
  excited: require('@/assets/images/pom/pom-excited.svg'),
  surprised: require('@/assets/images/pom/pom-surprised.png'),
  affectionate: require('@/assets/images/pom/pom-affectionate.png'),
  proud: require('@/assets/images/pom/pom-proud.svg'),
};

const accessorySources: Record<AccessoryId, { dark: number; light: number }> = {
  ribbon: {
    dark: require('@/assets/images/pom/accessories/ribbon-dark.svg'),
    light: require('@/assets/images/pom/accessories/ribbon-light.svg'),
  },
  sunhat: {
    dark: require('@/assets/images/pom/accessories/sunhat-dark.svg'),
    light: require('@/assets/images/pom/accessories/sunhat-light.svg'),
  },
  scarf: {
    dark: require('@/assets/images/pom/accessories/scarf-dark.svg'),
    light: require('@/assets/images/pom/accessories/scarf-light.svg'),
  },
  crown: {
    dark: require('@/assets/images/pom/accessories/crown-dark.svg'),
    light: require('@/assets/images/pom/accessories/crown-light.svg'),
  },
};

type PomDisplayProps = {
  accessory?: AccessoryId | null;
  accessibilityLabel?: string;
  dark?: boolean;
  expression: PomExpression;
  reaction?: PomReaction;
  size?: number;
};

export function PomDisplay({
  accessory = null,
  accessibilityLabel,
  dark = false,
  expression,
  reaction = 'idle',
  size = 120,
}: PomDisplayProps) {
  const [scale] = useState(() => new Animated.Value(1));
  const [translateY] = useState(() => new Animated.Value(0));

  useEffect(() => {
    scale.stopAnimation();
    translateY.stopAnimation();
    scale.setValue(1);
    translateY.setValue(0);
    const poses = reactionKeyPoses(reaction);
    const animation = Animated.sequence(
      poses.map((pose) =>
        Animated.parallel([
          Animated.timing(scale, {
            duration: pose.durationMs,
            easing: Easing.inOut(Easing.quad),
            toValue: pose.scale,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            duration: pose.durationMs,
            easing: Easing.inOut(Easing.quad),
            toValue: pose.translateY,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    if (reaction === 'idle') {
      const loop = Animated.loop(animation);
      loop.start();
      return () => loop.stop();
    }
    animation.start();
    return () => animation.stop();
  }, [reaction, scale, translateY]);

  const source = accessory ? accessorySources[accessory][dark ? 'dark' : 'light'] : null;
  return (
    <Animated.View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      style={[styles.container, { height: size, transform: [{ scale }, { translateY }] }, { width: size }]}
    >
      <Image contentFit="contain" source={expressionSources[expression]} style={styles.asset} />
      {source ? <Image contentFit="contain" source={source} style={styles.asset} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  asset: { height: '100%', position: 'absolute', width: '100%' },
  container: { alignItems: 'center', justifyContent: 'center' },
});
