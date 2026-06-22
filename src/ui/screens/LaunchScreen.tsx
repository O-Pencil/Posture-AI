/**
 * @file LaunchScreen.tsx
 * @description 欢迎启动页：welcome.png 背景 + Logo + 引导文案 + Get Start!
 */
import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';

import {APP_NAME} from '../../constants/appMeta';
import {AppSafeArea} from '../components/AppSafeArea';
import {AppLogo} from '../components/AppLogo';
import {WelcomeBreathOverlay} from '../components/WelcomeBreathOverlay';
import {theme} from '../theme';
import {useT} from '../i18n';

const WELCOME_BG = require('../../../public/welcome.png');

type Props = {
  onStart: () => void;
};

export function LaunchScreen({onStart}: Props): React.JSX.Element {
  const t = useT();

  return (
    <AppSafeArea style={styles.root}>
      <View style={styles.bgWrap}>
        <Image source={WELCOME_BG} style={styles.bg} resizeMode="cover" accessibilityIgnoresInvertColors />
        <WelcomeBreathOverlay />
      </View>
      <View style={styles.content}>
        <AppLogo size={132} style={styles.logo} />
        <Text style={styles.brand}>{APP_NAME}</Text>
        <Text style={styles.tagline}>{t('launch.tagline')}</Text>
      </View>
      <View style={styles.footer}>
        <Pressable
          style={({pressed}) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={onStart}
          accessibilityRole="button"
          accessibilityLabel={t('launch.cta')}>
          <Text style={styles.ctaText}>{t('launch.cta')}</Text>
        </Pressable>
      </View>
    </AppSafeArea>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  bgWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  bg: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.xxxl,
  },
  logo: {
    marginBottom: theme.spacing.xl,
  },
  brand: {
    color: theme.colors.textPrimary,
    fontSize: 34,
    fontFamily: theme.font.displayBold,
    letterSpacing: 1.5,
    marginBottom: theme.spacing.lg,
  },
  tagline: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center',
    fontFamily: 'Quicksand_600SemiBold',
    maxWidth: 300,
  },
  footer: {
    paddingHorizontal: theme.spacing.xxl,
    paddingBottom: theme.spacing.xxl,
  },
  cta: {
    backgroundColor: '#141414',
    borderRadius: theme.radius.pill,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.88,
    transform: [{scale: 0.99}],
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Quicksand_700Bold',
    letterSpacing: 0.2,
  },
});
