/**
 * @file AppLogo.tsx
 * @description CATUNE 品牌 Logo（Web 用 LOGO (1).svg，原生用同源 PNG）。
 */
import React from 'react';
import {Image, ImageStyle, Platform, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';

import {LOGO_PNG, LOGO_SVG_URI} from '../../constants/logo';

type Props = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

export function AppLogo({size = 48, style, imageStyle}: Props): React.JSX.Element {
  const radius = Math.round(size * 0.24);
  const source = Platform.OS === 'web' ? {uri: LOGO_SVG_URI} : LOGO_PNG;

  return (
    <View style={[styles.wrap, {width: size, height: size, borderRadius: radius}, style]}>
      <Image
        source={source}
        style={[{width: size, height: size, borderRadius: radius}, imageStyle]}
        resizeMode="cover"
        accessibilityLabel="CATUNE logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
});
