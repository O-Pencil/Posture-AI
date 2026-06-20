/**
 * @file ModelDownloadCard.tsx
 * @description 端侧模型管理：模型选择（推荐内嵌）/下载/激活 + 设备指标（底部折叠）。
 * 推荐徽章 ✓ 贴在被推荐模型的卡片右上角，1 行简短理由；选中≠推荐时显示 hint。
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert, NativeModules, Pressable, StyleSheet, Text, View} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {DEFAULT_MODEL_ID, getDefaultModel, getModelById, MnnModelDef, MODEL_CATALOG} from '../../mnn/modelCatalog';
import {cancelModelDownloadAndCleanup, formatSpeed, getDownloadSnapshot, startModelDownload, subscribeModelDownload} from '../../mnn/modelDownloadService';
import {
  deleteModelFiles,
  formatBytes,
  getModelInstallState,
  InstalledModelInfo,
  listInstalledModels,
  readActiveModelId,
  readDownloadState,
  writeActiveModelId,
} from '../../mnn/modelStorage';
import {
  DeviceTier,
  getDeviceProfile,
  getTierLabel,
  ModelRecommendation,
  recommendModel,
} from '../../mnn/deviceProfile';
import {theme} from '../theme';
import {Card} from '../primitives/Card';
import {useLocale, useT} from '../i18n';

type Props = {
  onModelsChanged?: () => void;
};

type UiStatus = 'idle' | 'checking' | 'downloading' | 'error';

type CatuneMnnModule = {
  releaseModel?: () => Promise<boolean>;
};

const CatuneMnn = NativeModules.CatuneMnn as CatuneMnnModule | undefined;

async function releaseNativeModel(): Promise<void> {
  try {
    await CatuneMnn?.releaseModel?.();
  } catch {
    // ignore
  }
}

// ─── 子组件：模型选项卡（推荐内嵌） ──────────────────────────────────────────

type ModelOptionProps = {
  model: MnnModelDef;
  selected: boolean;
  installed: 'missing' | 'partial' | 'ready';
  isRecommended: boolean;
  recommendedReason: string | null;
  disabled: boolean;
  onPress: () => void;
};

const TIER_BADGE: Record<DeviceTier, {bg: string; fg: string}> = {
  entry: {bg: '#FFF1E8', fg: '#B05A1F'},
  mainstream: {bg: '#EAF4FF', fg: '#1B5E8E'},
  high: {bg: '#E9F8EE', fg: '#1B7A3E'},
};

function ModelOptionCard({
  model,
  selected,
  installed,
  isRecommended,
  recommendedReason,
  disabled,
  onPress,
}: ModelOptionProps): React.JSX.Element {
  const t = useT();
  const statusLabel =
    installed === 'ready'
      ? t('model.card.installed')
      : installed === 'partial'
        ? t('model.card.partial')
        : t('model.card.missing');
  const statusStyle =
    installed === 'ready'
      ? optionStyles.statusPillReady
      : installed === 'partial'
        ? optionStyles.statusPillWarn
        : optionStyles.statusPillMuted;
  return (
    <Pressable
      style={[
        optionStyles.card,
        selected && optionStyles.cardSelected,
        disabled && optionStyles.cardDisabled,
      ]}
      disabled={disabled}
      onPress={onPress}>
      {isRecommended ? (
        <View style={optionStyles.recBadge}>
          <Text style={optionStyles.recBadgeText}>{t('model.card.recBadge')}</Text>
        </View>
      ) : null}

      <Text style={optionStyles.label} numberOfLines={1}>
        {model.label}
      </Text>
      <Text style={optionStyles.sizeHint} numberOfLines={1}>
        {model.sizeHint}
      </Text>

      <View style={[optionStyles.statusPill, statusStyle]}>
        <Text style={optionStyles.statusPillText}>{statusLabel}</Text>
      </View>

      {isRecommended && recommendedReason ? (
        <Text style={optionStyles.reason} numberOfLines={2}>
          {recommendedReason}
        </Text>
      ) : null}
    </Pressable>
  );
}

const optionStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    paddingTop: 14,
    position: 'relative',
    minHeight: 110,
    justifyContent: 'flex-start',
  },
  cardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#FCEAE0',
  },
  cardDisabled: {opacity: 0.5},
  recBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: '#1B7A3E',
  },
  recBadgeText: {color: '#FFFFFF', fontSize: 10, fontWeight: theme.font.weightBold},
  label: {color: theme.colors.textPrimary, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold},
  sizeHint: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginTop: 2},
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: theme.radius.pill,
  },
  statusPillReady: {backgroundColor: '#E9F8EE'},
  statusPillWarn: {backgroundColor: '#FFF4DC'},
  statusPillMuted: {backgroundColor: theme.colors.surfaceMuted},
  statusPillText: {fontSize: 10, color: theme.colors.textSecondary, fontWeight: theme.font.weightBold},
  reason: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginTop: 6, lineHeight: 16},
});

// ─── 子组件：设备指标（折叠） ────────────────────────────────────────────────

type DeviceMetricsProps = {
  recommendation: ModelRecommendation | null;
  loading: boolean;
  freeDiskBytes: number;
};

function formatGB(bytes: number): string {
  if (bytes <= 0) return '—';
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

function DeviceMetricsSection({recommendation, loading, freeDiskBytes}: DeviceMetricsProps): React.JSX.Element {
  const {locale} = useLocale();
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <View style={metricsStyles.wrap}>
        <Text style={metricsStyles.placeholder}>{t('model.card.devicesLoading')}</Text>
      </View>
    );
  }

  if (!recommendation) {
    return <View />;
  }

  const r = recommendation;
  const tier = r.tier;
  const badge = TIER_BADGE[tier];

  // 1 行摘要（折叠态展示）
  const summary = t('model.card.tierDisk', {
    tier: getTierLabel(tier, locale),
    disk: formatGB(freeDiskBytes),
  });

  return (
    <View style={metricsStyles.wrap}>
      <Pressable style={metricsStyles.header} onPress={() => setExpanded(v => !v)}>
        <View style={metricsStyles.headerLeft}>
          <View style={[metricsStyles.tierBadge, {backgroundColor: badge.bg}]}>
            <Text style={[metricsStyles.tierBadgeText, {color: badge.fg}]}>{getTierLabel(tier, locale)}</Text>
          </View>
          <Text style={metricsStyles.summary} numberOfLines={1}>
            {summary}
          </Text>
        </View>
        <Text style={metricsStyles.toggle}>
          {expanded ? t('model.card.toggleCollapse') : t('model.card.toggleExpand')}
        </Text>
      </Pressable>

      {expanded ? (
        <View style={metricsStyles.detail}>
          {r.details.map((line, i) => (
            <Text key={i} style={metricsStyles.detailLine}>
              · {line}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const metricsStyles = StyleSheet.create({
  wrap: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  headerLeft: {flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0},
  tierBadge: {paddingVertical: 2, paddingHorizontal: 8, borderRadius: theme.radius.pill},
  tierBadgeText: {fontSize: 10, fontWeight: theme.font.weightBold},
  summary: {color: theme.colors.textSecondary, fontSize: theme.font.sizeXs, flex: 1},
  toggle: {color: theme.colors.primary, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold, flexShrink: 0},
  detail: {marginTop: 8, paddingLeft: 4},
  detailLine: {color: theme.colors.textSecondary, fontSize: theme.font.sizeXs, lineHeight: 17, marginBottom: 2},
  placeholder: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, lineHeight: 16},
});

// ─── 主组件 ──────────────────────────────────────────────────────────────────

export function ModelDownloadCard({onModelsChanged}: Props): React.JSX.Element {
  const t = useT();
  const docDir: string | null = FileSystem.documentDirectory ?? null;
  const supported = Boolean(docDir);

  const [uiStatus, setUiStatus] = useState<UiStatus>('checking');
  const [selectedId, setSelectedId] = useState(DEFAULT_MODEL_ID);
  const [activeId, setActiveId] = useState(DEFAULT_MODEL_ID);
  const [installState, setInstallState] = useState<'missing' | 'partial' | 'ready'>('missing');
  const [installed, setInstalled] = useState<InstalledModelInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasPendingDownload, setHasPendingDownload] = useState(false);
  const [downloadJob, setDownloadJob] = useState(getDownloadSnapshot());
  const [recommendation, setRecommendation] = useState<ModelRecommendation | null>(null);
  const [recLoading, setRecLoading] = useState(true);

  const selectedModel = getModelById(selectedId) ?? getDefaultModel();
  const isActive = activeId === selectedId && installState === 'ready';
  const isDownloading = uiStatus === 'downloading';

  const loadRecommendation = useCallback(async () => {
    setRecLoading(true);
    try {
      const profile = await getDeviceProfile();
      setRecommendation(recommendModel(profile));
    } catch {
      setRecommendation(null);
    } finally {
      setRecLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecommendation();
  }, [loadRecommendation]);

  const refresh = useCallback(async () => {
    if (!docDir) {
      return;
    }
    const model = getModelById(selectedId) ?? getDefaultModel();
    setUiStatus('checking');
    setError(null);
    try {
      const [nextActive, nextInstalled, pending] = await Promise.all([
        readActiveModelId(docDir),
        listInstalledModels(docDir),
        readDownloadState(docDir),
      ]);
      setActiveId(nextActive);
      setInstalled(nextInstalled);
      setHasPendingDownload(Boolean(pending && pending.modelId === selectedId));
      const state = await getModelInstallState(docDir, model);
      setInstallState(state);
      const job = getDownloadSnapshot();
      setUiStatus(job.status === 'downloading' && job.modelId === selectedId ? 'downloading' : 'idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setUiStatus('error');
    }
  }, [docDir, selectedId]);

  useEffect(() => {
    refresh();
  }, [refresh, selectedId]);

  useEffect(
    () =>
      subscribeModelDownload(job => {
        if (job.modelId === selectedId || job.status === 'idle' || job.status === 'cancelled') {
          setDownloadJob(job);
        }
        if (job.modelId !== selectedId && job.status === 'downloading') {
          return;
        }
        if (job.status === 'downloading') {
          setUiStatus('downloading');
          setError(null);
        } else if (job.status === 'error') {
          setUiStatus('error');
          setError(job.error);
          setHasPendingDownload(true);
        } else if (job.status === 'done' || job.status === 'cancelled') {
          setUiStatus('idle');
          if (job.status === 'done') {
            refresh().then(() => onModelsChanged?.());
          } else {
            refresh();
          }
        }
      }),
    [onModelsChanged, refresh, selectedId],
  );

  // 选中≠推荐时：1 行 hint 引导换回
  const selectedButNotRecommended = useMemo(() => {
    if (!recommendation) return null;
    if (recommendation.model.id === selectedId) return null;
    return t('model.card.swapHint', {name: recommendation.model.label});
  }, [recommendation, selectedId, t]);

  // 模型选项卡的"已安装"状态
  const installedMap = useMemo(() => {
    const m = new Map<string, 'missing' | 'partial' | 'ready'>();
    installed.forEach(item => {
      m.set(item.model.id, item.state);
    });
    return m;
  }, [installed]);

  const activateModel = useCallback(
    async (modelId: string) => {
      if (!docDir) return;
      const model = getModelById(modelId);
      if (!model) return;
      const state = await getModelInstallState(docDir, model);
      if (state !== 'ready') {
        setError(t('model.card.incomplete'));
        return;
      }
      await writeActiveModelId(docDir, modelId);
      await releaseNativeModel();
      setActiveId(modelId);
      await refresh();
      onModelsChanged?.();
    },
    [docDir, onModelsChanged, refresh, t],
  );

  const runDownload = async (replaceExisting: boolean) => {
    setError(null);
    try {
      await startModelDownload(selectedId, replaceExisting);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setHasPendingDownload(true);
      setUiStatus('error');
    }
  };

  const onPressDownload = () => {
    if (installState === 'ready') {
      Alert.alert(
        t('model.card.replace'),
        t('model.card.confirmReplace', {name: selectedModel.label}),
        [
          {text: t('common.cancel'), style: 'cancel'},
          {text: t('model.card.continue'), style: 'destructive', onPress: () => runDownload(true)},
        ],
      );
      return;
    }
    runDownload(false);
  };

  const onPressDelete = () => {
    Alert.alert(
      t('model.action.delete'),
      t('model.card.confirmDelete', {name: selectedModel.label, size: selectedModel.sizeHint}),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('model.card.confirmDeleteAction'),
          style: 'destructive',
          onPress: async () => {
            if (!docDir) return;
            await deleteModelFiles(docDir, selectedModel);
            if (activeId === selectedId) {
              const remaining = installed.filter(x => x.model.id !== selectedId && x.state === 'ready');
              if (remaining.length > 0) {
                await writeActiveModelId(docDir, remaining[0].model.id);
              } else {
                await FileSystem.deleteAsync(docDir + 'mnn_models/.active', {idempotent: true});
              }
              await releaseNativeModel();
            }
            setInstallState('missing');
            await refresh();
            onModelsChanged?.();
          },
        },
      ],
    );
  };

  const primaryLabel = (() => {
    if (isDownloading) return t('model.card.status.downloading').split('\n')[0] ?? t('model.status.downloading');
    if (hasPendingDownload && installState !== 'ready') return t('model.card.resumeDownload');
    if (installState === 'ready') return isActive ? t('model.card.replace') : t('model.card.activateThis');
    if (installState === 'partial') return t('model.card.resumeDownload');
    return t('model.card.download');
  })();

  const onPressPrimary = () => {
    if (isDownloading) return;
    if (installState === 'ready' && !isActive) {
      activateModel(selectedId);
      return;
    }
    onPressDownload();
  };

  const onCancelDownload = () => {
    Alert.alert(
      t('model.card.cancelDownload'),
      t('model.card.cancelDownloadBody'),
      [
        {text: t('model.card.resumeDownload'), style: 'cancel'},
        {
          text: t('model.card.cancelAndDelete'),
          style: 'destructive',
          onPress: async () => {
            await cancelModelDownloadAndCleanup();
            setHasPendingDownload(false);
            setInstallState('missing');
            await refresh();
            onModelsChanged?.();
          },
        },
      ],
    );
  };

  const statusLine = (() => {
    if (isDownloading) {
      const pct = (downloadJob.progress * 100).toFixed(0);
      const speed = formatSpeed(downloadJob.speedBps);
      const file = downloadJob.currentFile || '…';
      return t('model.card.status.downloading', {pct, speed, file});
    }
    if (installState === 'ready' && isActive) return t('model.card.status.activeReady');
    if (installState === 'ready') return t('model.card.status.ready');
    if (installState === 'partial' || hasPendingDownload) return t('model.card.status.partial');
    return t('model.card.status.missing');
  })();

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>{t('model.card.title')}</Text>
        {recommendation ? (
          <Text style={styles.titleHint} numberOfLines={1}>
            {recommendation.reason}
          </Text>
        ) : null}
      </View>

      {!supported ? (
        <Text style={styles.hint}>{t('model.card.hint.web')}</Text>
      ) : (
        <View>
          {/* 模型选项（卡片化 + 推荐内嵌） */}
          <View style={styles.optionsRow}>
            {MODEL_CATALOG.map(m => {
              const inst = installedMap.get(m.id) ?? 'missing';
              const isRec = recommendation?.model.id === m.id;
              return (
                <ModelOptionCard
                  key={m.id}
                  model={m}
                  selected={selectedId === m.id}
                  installed={inst}
                  isRecommended={isRec}
                  recommendedReason={isRec ? recommendation?.reason ?? null : null}
                  disabled={isDownloading}
                  onPress={() => setSelectedId(m.id)}
                />
              );
            })}
          </View>

          {/* 选中≠推荐时的 hint */}
          {selectedButNotRecommended ? (
            <Text style={styles.swapHint} numberOfLines={1}>
              {selectedButNotRecommended}
            </Text>
          ) : null}

          {/* 状态 + 进度条 + 错误 */}
          <Text style={styles.statusText} numberOfLines={2} ellipsizeMode="tail">
            {statusLine}
          </Text>

          {isDownloading ? (
            <View style={styles.bar}>
              <View style={[styles.barFill, {width: `${Math.max(downloadJob.progress, 0.02) * 100}%`}]} />
            </View>
          ) : null}

          {error ? (
            <Text style={styles.error} numberOfLines={4}>
              {error}
            </Text>
          ) : null}

          {/* 操作按钮 */}
          <View style={styles.rowGap}>
            {isDownloading ? (
              <Pressable style={[styles.btn, styles.btnDanger, styles.btnFlex]} onPress={onCancelDownload}>
                <Text style={styles.btnDangerText}>{t('model.card.cancelDownload')}</Text>
              </Pressable>
            ) : (
              <>
                <Pressable style={[styles.btn, styles.btnPrimary, styles.btnFlex]} onPress={onPressPrimary}>
                  <Text style={styles.btnText}>{primaryLabel}</Text>
                </Pressable>
                {(installState === 'ready' || installState === 'partial' || hasPendingDownload) ? (
                  <Pressable style={[styles.btn, styles.btnDanger]} onPress={onPressDelete}>
                    <Text style={styles.btnDangerText}>{t('model.action.delete')}</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>

          {/* 已安装列表 */}
          {installed.length > 0 ? (
            <View style={styles.installedBlock}>
              <Text style={styles.sectionLabel}>{t('model.card.installedTitle')}</Text>
              {installed.map(item => (
                <Text key={item.model.id} style={styles.installedRow}>
                  {item.model.label}
                  {item.state === 'partial' ? t('model.card.installedPartial') : ''}
                  {activeId === item.model.id && item.state === 'ready' ? t('model.card.installedActive') : ''}
                  {' · '}
                  {formatBytes(item.dirSizeBytes)}
                </Text>
              ))}
            </View>
          ) : null}

          <Text style={styles.hint}>{t('model.card.hint.arm')}</Text>

          {/* 设备指标（折叠，放最下面） */}
          <DeviceMetricsSection
            recommendation={recommendation}
            loading={recLoading}
            freeDiskBytes={recommendation?.freeDiskBytes ?? 0}
          />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {marginBottom: theme.spacing.md},
  titleRow: {flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, gap: 8},
  cardTitle: {color: theme.colors.textPrimary, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold},
  titleHint: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, flex: 1, textAlign: 'right'},
  optionsRow: {flexDirection: 'row', gap: theme.spacing.sm, marginBottom: 6},
  swapHint: {color: theme.colors.primary, fontSize: theme.font.sizeXs, marginTop: 4, lineHeight: 16, fontStyle: 'italic'},
  sectionLabel: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginBottom: 8},
  statusText: {color: theme.colors.textSecondary, fontSize: theme.font.sizeSm, marginTop: 8, lineHeight: 18},
  bar: {height: 6, borderRadius: 3, backgroundColor: theme.colors.surfaceMuted, marginTop: 8, overflow: 'hidden'},
  barFill: {height: 6, borderRadius: 3, backgroundColor: theme.colors.primary},
  error: {color: '#C20A0A', fontSize: theme.font.sizeXs, marginTop: 8, lineHeight: 17},
  rowGap: {flexDirection: 'row', gap: theme.spacing.sm, marginTop: 10, flexWrap: 'wrap'},
  btnFlex: {flex: 1},
  btn: {paddingVertical: 10, paddingHorizontal: 16, borderRadius: theme.radius.md, borderWidth: 1, alignItems: 'center'},
  btnPrimary: {borderColor: theme.colors.primary, backgroundColor: '#FCEAE0'},
  btnDanger: {borderColor: '#C20A0A', backgroundColor: '#FFF5F5'},
  btnText: {color: theme.colors.primary, fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
  btnDangerText: {color: '#C20A0A', fontSize: theme.font.sizeSm, fontWeight: theme.font.weightBold},
  installedBlock: {marginTop: 12},
  installedRow: {color: theme.colors.textSecondary, fontSize: theme.font.sizeXs, lineHeight: 18},
  hint: {color: theme.colors.textMuted, fontSize: theme.font.sizeXs, marginTop: 10, lineHeight: 18},
});