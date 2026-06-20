/**
 * @file TabBar.tsx
 * @description 底部 Haptic 标签栏（RN 原语 + SVG 图标，从 web/ TabBar 重写）：浮动胶囊条 + 选中态高亮 + 弹跳动画。
 *
 * [WHO] 导出 `Tab` 类型、`TabBar`
 * [FROM] 依赖 `react`、`react-native`(Animated/Pressable/View/Text)、`../theme`、`../icons`(IconProps)
 * [TO] 被 `AppShell` 消费
 * [HERE] src/ui/components/TabBar.tsx · 底部标签栏
 */
import React, {useEffect, useRef} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';
import {theme} from '../theme';
import {IconProps} from '../icons';

export type Tab = {value: string; label: string; Icon: React.FC<IconProps>};

function AnimatedTab({
  tab,
  active,
  onPress,
}: {
  tab: Tab;
  active: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const scale = useRef(new Animated.Value(active ? 1 : 0.92)).current;
  const color = active ? theme.colors.textPrimary : theme.colors.textMuted;
  const Icon = tab.Icon;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: active ? 1 : 0.92,
      useNativeDriver: true,
      stiffness: 400,
      damping: 20,
    }).start();
  }, [active]);

  return (
    <Pressable style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Animated.View style={{transform: [{scale}]}}>
        <Icon size={20} color={color} />
      </Animated.View>
      <Text style={[styles.label, {color}]}>{tab.label}</Text>
    </Pressable>
  );
}

export function TabBar({
  tabs,
  value,
  onChange,
}: {
  tabs: Tab[];
  value: string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bar}>
        {tabs.map(tab => (
          <AnimatedTab
            key={tab.value}
            tab={tab}
            active={tab.value === value}
            onPress={() => onChange(tab.value)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center'},
  bar: {
    flexDirection: 'row',
    gap: 4,
    margin: theme.spacing.lg,
    padding: 4,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxWidth: 480,
    width: '92%',
    ...theme.shadow.pill,
  },
  tab: {flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: theme.radius.md, gap: 3},
  tabActive: {backgroundColor: theme.colors.surface, ...theme.shadow.pill},
  label: {fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold},
});
