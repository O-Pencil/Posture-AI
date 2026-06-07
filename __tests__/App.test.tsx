/**
 * @file App.test.tsx
 * @description Jest 冒烟测试：用 react-test-renderer 验证 App 组件能挂载不抛错。
 *
 * [WHO] 默认导出无；调 `it('renders correctly', () => renderer.create(<App />))`
 * [FROM] 依赖 `react-native`、`@jest/globals` 的 `it`、`react-test-renderer`、本地 `App` 组件
 * [TO] 被 `npm test` 触发；是 RN 仪表盘的唯一自动化测试
 * [HERE] __tests__/App.test.tsx · RN 渲染冒烟测试
 */
/**
 * @format
 */

import React from 'react';

// Note: import explicitly to use the types shipped with jest.
import {it, jest} from '@jest/globals';

jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () =>
  jest.fn().mockImplementation(() => ({
    addListener: jest.fn(() => ({remove: jest.fn()})),
    removeAllListeners: jest.fn(),
  })),
);

jest.mock('react-native', () => {
  const ReactNative = jest.requireActual<typeof import('react-native')>(
    'react-native',
  );
  const MockNativeEventEmitter = jest.fn().mockImplementation(() => ({
    addListener: jest.fn(() => ({remove: jest.fn()})),
    removeAllListeners: jest.fn(),
  }));
  ReactNative.NativeModules.KinematicsModule = {
    getLatestState: jest.fn(() =>
      Promise.resolve({
        neckPitch: 0,
        lumbarRoll: 0,
        posture: 'NORMAL',
        postureLabel: 'Normal',
        score: 100,
      }),
    ),
    setSimulationScenario: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  };
  return new Proxy(ReactNative, {
    get(target, prop, receiver) {
      if (prop === 'NativeEventEmitter') return MockNativeEventEmitter;
      if (prop === 'useColorScheme') return jest.fn(() => 'dark');
      return Reflect.get(target, prop, receiver);
    },
  });
});

import 'react-native';
import App from '../App';

// Note: test renderer must be required after react-native.
import renderer, {act} from 'react-test-renderer';

it('renders correctly', async () => {
  await act(async () => {
    renderer.create(<App />);
  });
});
