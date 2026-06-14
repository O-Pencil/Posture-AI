/**
 * @file ModelDownloadCard.tsx
 * @description Settings 内「下载端侧模型」卡片：用 expo-file-system 把 MNN 模型下到 App 私有目录（= 原生 filesDir，与 MnnDebugModule 读取路径一致），带进度。免 adb。
 *
 * [WHO] 导出 `ModelDownloadCard`
 * [FROM] 依赖 `react`、`react-native`、`expo-file-system/legacy`、`../theme`、`../primitives/Card`
 * [TO] 被 SettingsScreen 渲染
 * [HERE] src/ui/components/ModelDownloadCard.tsx · 模型下载卡片
 *
 * 用前必填 MODEL_BASE_URL（你托管的 MNN 模型地址）。模型须为 MNN 格式（config.json/llm.mnn/llm.mnn.weight），不是 AWQ/GGUF。
 */
import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
// SDK 54 经典 API 在 /legacy（documentDirectory / createDownloadResumable）
import * as FileSystem from 'expo-file-system/legacy';
import {theme} from '../theme';
import {Card} from '../primitives/Card';

// MNN 官方转好的 Qwen3-1.7B（INT4，~1.24GB）。HuggingFace resolve 直链。
// 国内慢/连不上 → 把域名换成镜像 'https://hf-mirror.com/...' 即可（路径不变）。
const MODEL_BASE_URL = 'https://huggingface.co/taobao-mnn/Qwen3-1.7B-MNN/resolve/main/';
// 与原生读取目录一致（MnnDebugModule / MnnPerceptionEngine: filesDir/mnn_models/qwen3-1.7b）
const MODEL_SUBDIR = 'mnn_models/qwen3-1.7b/';
// Qwen3-1.7B-MNN 实际文件（来自 HF 仓库 tree）
const MODEL_FILES = ['config.json', 'llm_config.json', 'llm.mnn', 'llm.mnn.weight', 'tokenizer.txt'];

type Status = 'idle' | 'checking' | 'ready' | 'downloading' | 'done' | 'error';

export function ModelDownloadCard(): React.JSX.Element {
  const docDir: string | null = FileSystem.documentDirectory ?? null;
  const supported = Boolean(docDir);
  const modelDir = supported ? docDir + MODEL_SUBDIR : '';

  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const checkExisting = useCallback(async () => {
    if (!supported) {
      return;
    }
    setStatus('checking');
    try {
      const info = await FileSystem.getInfoAsync(modelDir + 'config.json');
      setStatus(info.exists ? 'ready' : 'idle');
    } catch {
      setStatus('idle');
    }
  }, [supported, modelDir]);

  useEffect(() => {
    checkExisting();
  }, [checkExisting]);

  const download = async () => {
    if (!MODEL_BASE_URL) {
      setError('请先在 ModelDownloadCard.tsx 填 MODEL_BASE_URL（MNN 模型托管地址）。');
      setStatus('error');
      return;
    }
    setStatus('downloading');
    setError(null);
    setProgress(0);
    try {
      await FileSystem.makeDirectoryAsync(modelDir, {intermediates: true});
      for (let i = 0; i < MODEL_FILES.length; i++) {
        const f = MODEL_FILES[i];
        setCurrent(f);
        const dl = FileSystem.createDownloadResumable(MODEL_BASE_URL + f, modelDir + f, {}, p => {
          const filePct = p.totalBytesExpectedToWrite > 0 ? p.totalBytesWritten / p.totalBytesExpectedToWrite : 0;
          setProgress((i + filePct) / MODEL_FILES.length);
        });
        await dl.downloadAsync();
      }
      setProgress(1);
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  };

  const statusText =
    status === 'ready' || status === 'done'
      ? '✓ 模型已就绪'
      : status === 'downloading'
      ? `下载中：${current}  ${(progress * 100).toFixed(0)}%`
      : status === 'checking'
      ? '检查中…'
      : '未下载';

  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>端侧模型</Text>
      {!supported ? (
        <Text style={styles.hint}>下载仅手机端（iOS/Android）支持；Web 端不可用。</Text>
      ) : (
        <View>
          <Text style={styles.statusText}>{statusText}</Text>
          {status === 'downloading' ? (
            <View style={styles.bar}>
              <View style={[styles.barFill, {width: `${progress * 100}%`}]} />
            </View>
          ) : null}
          {error ? (
            <Text style={styles.error} numberOfLines={3}>
              {error}
            </Text>
          ) : null}
          <Pressable
            style={[styles.btn, status === 'downloading' && styles.btnDisabled]}
            disabled={status === 'downloading'}
            onPress={download}>
            <Text style={styles.btnText}>{status === 'ready' || status === 'done' ? '重新下载' : '下载模型'}</Text>
          </Pressable>
          <Text style={styles.hint}>
            下到 App 私有目录（{MODEL_SUBDIR}），与原生读取路径一致 → 下完即可在「MNN DEBUG」加载。{'\n'}
            模型须为 MNN 格式（config.json / llm.mnn / llm.mnn.weight），不是 AWQ / GGUF。
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {marginBottom: theme.spacing.md},
  cardTitle: {color: theme.colors.textPrimary, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold, marginBottom: 12},
  statusText: {color: theme.colors.textSecondary, fontSize: theme.font.sizeSm},
  bar: {height: 6, borderRadius: 3, backgroundColor: theme.colors.surfaceMuted, marginTop: 10, overflow: 'hidden'},
  barFill: {height: 6, borderRadius: 3, backgroundColor: theme.colors.primary},
  error: {color: '#C20A0A', fontSize: theme.font.sizeXs, marginTop: 10, lineHeight: 17},
  btn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: '#FCEAE0',
    alignItems: 'center',
  },
  btnDisabled: {opacity: 0.5},
  btnText: {color: theme.colors.primary, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
  hint: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginTop: 10, lineHeight: 18},
});
