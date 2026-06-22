import React from 'react';
import {StyleProp, ViewStyle} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
};

/** 统一安全区外壳：Android edge-to-edge 下顶开状态栏，iOS 处理刘海。 */
export function AppSafeArea({children, style, edges = ['top', 'left', 'right']}: Props): React.JSX.Element {
  return (
    <SafeAreaView style={style} edges={edges}>
      {children}
    </SafeAreaView>
  );
}
