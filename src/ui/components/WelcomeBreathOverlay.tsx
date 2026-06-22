/**
 * @file WelcomeBreathOverlay.tsx
 * @description 欢迎页背景呼吸：白色透明渐变蒙版 + 透明度循环动画。
 */
import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet} from 'react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';

export function WelcomeBreathOverlay(): React.JSX.Element {
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {toValue: 1, duration: 1000, useNativeDriver: true}),
        Animated.timing(breathe, {toValue: 0, duration: 1000, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  const overlayOpacity = breathe.interpolate({inputRange: [0, 1], outputRange: [0.18, 0.52]});

  return (
    <Animated.View style={[styles.overlay, {opacity: overlayOpacity}]} pointerEvents="none">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="welcome-breath" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.72" />
            <Stop offset="42%" stopColor="#FFFFFF" stopOpacity="0.28" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#welcome-breath)" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
