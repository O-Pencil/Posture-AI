/**
 * 全局下载进度条：切 Tab 后仍可见；窄屏两行布局，避免文字溢出。
 */
import React, {useEffect, useMemo, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import {getModelById} from '../../mnn/modelCatalog';
import {
  cancelModelDownloadAndCleanup,
  formatSpeed,
  getDownloadSnapshot,
  subscribeModelDownload,
  type DownloadJobSnapshot,
} from '../../mnn/modelDownloadService';
import {theme} from '../theme';

type Props = {
  onOpenSettings?: () => void;
};

function trimFileName(name: string, maxLen: number): string {
  if (name.length <= maxLen) {
    return name;
  }
  const head = Math.max(4, Math.floor(maxLen * 0.45));
  const tail = Math.max(4, maxLen - head - 1);
  return `${name.slice(0, head)}…${name.slice(-tail)}`;
}

export function ModelDownloadBanner({onOpenSettings}: Props): React.JSX.Element | null {
  const {width} = useWindowDimensions();
  const compact = width < 390;
  const [job, setJob] = useState<DownloadJobSnapshot>(() => getDownloadSnapshot());

  useEffect(() => subscribeModelDownload(setJob), []);

  const label = useMemo(() => {
    if (!job.modelId) {
      return '';
    }
    return getModelById(job.modelId)?.label ?? job.modelId;
  }, [job.modelId]);

  if (job.status !== 'downloading' || !job.modelId) {
    return null;
  }

  const pct = `${(job.progress * 100).toFixed(0)}%`;
  const speed = formatSpeed(job.speedBps);
  const fileLabel = job.currentFile ? trimFileName(job.currentFile, compact ? 18 : 28) : '…';

  const onCancel = () => {
    Alert.alert('取消下载', '将停止下载并删除未完成的模型文件。', [
      {text: '继续', style: 'cancel'},
      {text: '取消并删除', style: 'destructive', onPress: () => cancelModelDownloadAndCleanup()},
    ]);
  };

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.main} onPress={onOpenSettings}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {compact ? '下载中' : `下载中 · ${label}`}
          </Text>
          <Text style={styles.stats} numberOfLines={1}>
            {pct} · {speed}
          </Text>
        </View>
        {!compact ? (
          <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
            {fileLabel}
          </Text>
        ) : null}
        <View style={styles.bar}>
          <View style={[styles.barFill, {width: `${Math.max(job.progress, 0.02) * 100}%`}]} />
        </View>
      </Pressable>
      <Pressable style={styles.cancelBtn} onPress={onCancel} hitSlop={8}>
        <Text style={styles.cancelText}>取消</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.sm,
    paddingVertical: 8,
    backgroundColor: '#FFF8F3',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 4,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    minWidth: 0,
    color: theme.colors.textSecondary,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightBold,
  },
  stats: {
    flexShrink: 0,
    color: theme.colors.primary,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightBold,
  },
  fileName: {
    marginTop: 2,
    color: theme.colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
  },
  bar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.surfaceMuted,
    marginTop: 6,
    overflow: 'hidden',
  },
  barFill: {height: 4, borderRadius: 2, backgroundColor: theme.colors.primary},
  cancelBtn: {
    flexShrink: 0,
    paddingHorizontal: 6,
    paddingTop: 2,
    minWidth: 36,
    alignItems: 'center',
  },
  cancelText: {color: '#C20A0A', fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold},
});
