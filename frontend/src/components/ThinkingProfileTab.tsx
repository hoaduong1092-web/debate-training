/**
 * ThinkingProfileTab Component (v15.0.0)
 *
 * Cyber-Academic Glassmorphism Bento Grid layout for Subsystem 2:
 * "Hồ sơ Tư duy & Cây kỹ năng" (Thinking Profile & Skill Tree).
 *
 * Blocks:
 *   Header: Period Filter (7D/30D/90D/ALL), Confidence Tier, Total Analyzed Sessions
 *   Block A: 4-Axis SVG Thinking Radar Chart (Logic, Structure, Reflex, Voice)
 *   Block B: Fallacy Diagnostic & Actionable Guidance Engine (Pedagogy tips)
 *   Block C: WPM History Curve with Optimal Band (120-150 WPM) & Telemetry Metrics
 *   Block D: 7-Level Interactive Pedagogical Skill Tree (90% Unlock & L3 Socratic tag)
 *
 * Strict Non-Identity Labeling: Focuses exclusively on "Skill Progress", never on personality judgments.
 * Pure derived analytics — Zero live AI calls, Zero quota deduction.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Brain,
  Sparkles,
  ShieldAlert,
  Mic,
  Activity,
  Award,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Layers,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  fetchThinkingProfileAnalytics,
  fetchSkillTreeProgress,
  ThinkingProfileAnalyticsResponse,
  SkillTreeProgressResponse,
  SkillLevelNode,
} from '../lib/api';

import { Strings, Language } from '../lib/i18n';

type AnalyticsPeriod = '7d' | '30d' | '90d' | 'all';

interface ThinkingProfileTabProps {
  language?: Language;
  t?: Strings;
}

export const ThinkingProfileTab: React.FC<ThinkingProfileTabProps> = ({ language = 'vi' }) => {
  const [period, setPeriod] = useState<AnalyticsPeriod>('all');
  const [analyticsData, setAnalyticsData] = useState<ThinkingProfileAnalyticsResponse | null>(null);
  const [skillTreeData, setSkillTreeData] = useState<SkillTreeProgressResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFallacy, setExpandedFallacy] = useState<string | null>(null);
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<SkillLevelNode | null>(null);

  const loadData = async (selectedPeriod: AnalyticsPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, skillTreeRes] = await Promise.all([
        fetchThinkingProfileAnalytics(selectedPeriod),
        fetchSkillTreeProgress(),
      ]);
      setAnalyticsData(analyticsRes);
      setSkillTreeData(skillTreeRes);
    } catch (err: any) {
      console.error('[THINKING_PROFILE_LOAD_ERROR]', err);
      setError(err?.message || 'Không thể tải dữ liệu Hồ sơ Tư duy.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(period);
  }, [period]);

  // ── SVG Radar Coordinate Computations ────────────────────────────────────────
  const radarAxes = useMemo(() => {
    const radar = analyticsData?.radar || { logic: 50, structure: 50, reflex: 50, voice: 50, overallScore: 50 };
    const avail = analyticsData?.dataAvailability || { logic: false, structure: false, reflex: false, voice: false };
    return [
      {
        key: 'logic',
        label: language === 'vi' ? 'Logic & Lập luận' : 'Logic & Reasoning',
        score: radar.logic,
        available: avail.logic,
        angle: -Math.PI / 2,
      },
      {
        key: 'structure',
        label: language === 'vi' ? 'Cấu trúc C-R-E' : 'C-R-E Structure',
        score: radar.structure,
        available: avail.structure,
        angle: 0,
      },
      {
        key: 'reflex',
        label: language === 'vi' ? 'Phản xạ & POI' : 'Reflex & POI',
        score: radar.reflex,
        available: avail.reflex,
        angle: Math.PI / 2,
      },
      {
        key: 'voice',
        label: language === 'vi' ? 'Giọng nói & DSP' : 'Voice & Speech DSP',
        score: radar.voice,
        available: avail.voice,
        angle: Math.PI,
      },
    ];
  }, [analyticsData, language]);

  const radarPolygonPoints = useMemo(() => {
    const cx = 150;
    const cy = 150;
    const maxRadius = 100;
    return radarAxes
      .map(axis => {
        const val = axis.available ? axis.score : 50;
        const r = (val / 100) * maxRadius;
        const x = cx + r * Math.cos(axis.angle);
        const y = cy + r * Math.sin(axis.angle);
        return `${x},${y}`;
      })
      .join(' ');
  }, [radarAxes]);

  if (loading && !analyticsData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center animate-spin">
          <Brain className="w-6 h-6 text-indigo-400" />
        </div>
        <p className="text-sm font-medium text-slate-400 animate-pulse">
          {language === 'vi' ? 'Đang tính toán Hồ sơ Tư duy & Cây kỹ năng...' : 'Computing Thinking Profile & Skill Tree analytics...'}
        </p>
      </div>
    );
  }

  if (error && !analyticsData) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl max-w-lg mx-auto my-12">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-200 mb-1">
          {language === 'vi' ? 'Không thể tải hồ sơ tư duy' : 'Failed to load thinking profile'}
        </h3>
        <p className="text-xs text-slate-400 mb-4">{error}</p>
        <button
          type="button"
          onClick={() => loadData(period)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
        >
          {language === 'vi' ? 'Thử lại' : 'Retry'}
        </button>
      </div>
    );
  }

  const confidence = analyticsData?.confidence;
  const radar = analyticsData?.radar;
  const topFallacies = analyticsData?.topFallacies || [];
  const voiceMetrics = analyticsData?.voiceMetrics;
  const wpmHistory = analyticsData?.wpmHistory || [];
  const skillLevels = skillTreeData?.levels || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── TOP HEADER & CONTROL BAR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xl shadow-indigo-950/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Brain className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                {language === 'vi' ? 'Hồ Sơ Tư Duy & Cây Kỹ Năng' : 'Thinking Profile & Skill Tree'}
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 rounded-md">
                v16.0
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'vi'
                ? 'Tiến trình rèn luyện 4 trục nhận thức và nấc thang thành thạo tranh biện'
                : 'Cognitive 4-axis progression and debate mastery skill tree'}
            </p>
          </div>
        </div>

        {/* Period Selector & Confidence Pill */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Confidence Badge */}
          {confidence && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                confidence.level === 'HIGH'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : confidence.level === 'MEDIUM'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
              }`}
              title={confidence.message}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>
                {language === 'vi' ? 'Độ tin cậy: ' : 'Confidence: '}
                {confidence.level === 'HIGH'
                  ? (language === 'vi' ? 'Đầy đủ' : 'High')
                  : confidence.level === 'MEDIUM'
                  ? (language === 'vi' ? 'Trung bình' : 'Medium')
                  : (language === 'vi' ? 'Đang hình thành' : 'Initial')}
              </span>
            </div>
          )}

          {/* Period Toggle Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            {(['7d', '30d', '90d', 'all'] as AnalyticsPeriod[]).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  period === p
                    ? 'bg-indigo-600 text-white shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p === '7d'
                  ? (language === 'vi' ? '7 Ngày' : '7 Days')
                  : p === '30d'
                  ? (language === 'vi' ? '30 Ngày' : '30 Days')
                  : p === '90d'
                  ? (language === 'vi' ? '90 Ngày' : '90 Days')
                  : (language === 'vi' ? 'Toàn Bộ' : 'All Time')}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => loadData(period)}
            title={language === 'vi' ? 'Làm mới dữ liệu' : 'Refresh data'}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-400 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── BENTO GRID LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── BLOCK A: 4-AXIS THINKING RADAR (5 Cols) ── */}
        <div className="lg:col-span-5 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xl shadow-indigo-950/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {language === 'vi' ? 'Thinking Radar (4 Trục)' : 'Thinking Radar (4 Axes)'}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'vi' ? 'Logic, Cấu trúc, Phản xạ, Giọng nói' : 'Logic, Structure, Reflex, Voice'}
                  </p>
                </div>
              </div>

              {radar && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs font-mono font-bold text-indigo-600 dark:text-indigo-300">
                  <span>{language === 'vi' ? 'Tổng hợp:' : 'Overall:'}</span>
                  <span className="text-sm">{radar.overallScore.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-400">/100</span>
                </div>
              )}
            </div>

            {/* Radar Chart SVG Visualizer */}
            <div className="relative w-full aspect-square max-w-[280px] mx-auto my-2 flex items-center justify-center">
              <svg viewBox="0 0 300 300" className="w-full h-full overflow-visible">
                {/* Background Concentric Rings (25%, 50%, 75%, 100%) */}
                {[0.25, 0.5, 0.75, 1.0].map((scale, i) => (
                  <polygon
                    key={i}
                    points={radarAxes
                      .map(a => `${150 + scale * 100 * Math.cos(a.angle)},${150 + scale * 100 * Math.sin(a.angle)}`)
                      .join(' ')}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-slate-200 dark:text-slate-800"
                    strokeDasharray={scale === 1.0 ? 'none' : '3 3'}
                  />
                ))}

                {/* Axis Spokes */}
                {radarAxes.map((a, i) => (
                  <line
                    key={i}
                    x1="150"
                    y1="150"
                    x2={150 + 100 * Math.cos(a.angle)}
                    y2={150 + 100 * Math.sin(a.angle)}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-slate-200 dark:text-slate-800"
                  />
                ))}

                {/* Data Polygon */}
                <polygon
                  points={radarPolygonPoints}
                  fill="url(#radarGradient)"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                  className="transition-all duration-700 ease-out drop-shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                />

                {/* Vertex Points */}
                {radarAxes.map((a, i) => {
                  const val = a.available ? a.score : 50;
                  const r = (val / 100) * 100;
                  const x = 150 + r * Math.cos(a.angle);
                  const y = 150 + r * Math.sin(a.angle);
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="4.5"
                      className="fill-white stroke-indigo-600 dark:stroke-indigo-400 stroke-2"
                    />
                  );
                })}

                <defs>
                  <linearGradient id="radarGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.15" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Radar Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/80">
            {radarAxes.map(axis => (
              <div
                key={axis.key}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 flex flex-col"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-400 font-medium truncate">{axis.label}</span>
                </div>
                {axis.available ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-mono font-extrabold text-slate-900 dark:text-white">
                      {axis.score.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-slate-400">/100</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-amber-500 font-medium italic">
                    {language === 'vi' ? 'Chưa đủ dữ liệu' : 'Insufficient data'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── BLOCK B: FALLACY DIAGNOSTICS & GUIDANCE (7 Cols) ── */}
        <div className="lg:col-span-7 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xl shadow-indigo-950/5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'vi' ? 'Chẩn đoán Ngụy biện & Hướng dẫn Khắc phục' : 'Fallacy Diagnostics & Mitigation Guide'}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'vi'
                    ? 'Nhận diện các mẫu sai lầm logic và phương pháp củng cố luận cứ'
                    : 'Identify logical fallacies and evidence strengthening recommendations'}
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
              {language === 'vi' ? 'Tổng phát hiện:' : 'Total detected:'} {analyticsData?.totalFallaciesDetected ?? 0}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[360px] pr-1 space-y-2.5">
            {topFallacies.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {language === 'vi' ? 'Không phát hiện lỗi ngụy biện' : 'No Fallacies Detected'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                  {language === 'vi'
                    ? 'Lập luận trong các phiên tranh biện của bạn duy trì tính mạch lạc và tuân thủ chuẩn logic cao.'
                    : 'Arguments across your debate sessions maintained sound reasoning and adherence to formal debate logic.'}
                </p>
              </div>
            ) : (
              topFallacies.map((item, idx) => {
                const isExpanded = expandedFallacy === item.name;
                const fallacyEnMap: Record<string, { title: string; tip: string }> = {
                  Strawman: {
                    title: 'Strawman Fallacy',
                    tip: "Quote and rebut your opponent's core proposition accurately rather than exaggerating or distorting their words.",
                  },
                  'Ad Hominem': {
                    title: 'Ad Hominem Fallacy',
                    tip: 'Separate the speaker from the argument. Challenge the validity of premises and evidence rather than personal characteristics.',
                  },
                  'Slippery Slope': {
                    title: 'Slippery Slope Fallacy',
                    tip: 'Substantiate each causal link with concrete evidence rather than asserting that the first step inevitably leads to catastrophe.',
                  },
                  'False Dilemma': {
                    title: 'False Dilemma / False Binary',
                    tip: 'Explore nuance and intermediate alternatives rather than forcing the issue into two extreme absolutes.',
                  },
                  'Appeal to Emotion': {
                    title: 'Appeal to Emotion',
                    tip: 'Incorporate empirical data, verified studies, and precedents rather than relying strictly on emotional sympathy.',
                  },
                  'Circular Reasoning': {
                    title: 'Circular Reasoning',
                    tip: 'Establish independent external premises to substantiate your conclusion rather than reiterating your initial claim.',
                  },
                  'Red Herring': {
                    title: 'Red Herring Fallacy',
                    tip: 'Stay anchored to the debate motion; ensure each argument directly proves or disproves the core proposition.',
                  },
                  'Non Sequitur': {
                    title: 'Non Sequitur Fallacy',
                    tip: 'Clarify the direct causal link between cause and effect; ensure conclusions follow logically from premises.',
                  },
                  'Hasty Generalization': {
                    title: 'Hasty Generalization',
                    tip: 'Increase sample size and representative diversity before asserting sweeping general conclusions.',
                  },
                  'Appeal to Authority': {
                    title: 'Appeal to False Authority',
                    tip: 'Ensure cited authorities possess relevant domain expertise and substantiate their underlying methodology.',
                  },
                  'Post Hoc': {
                    title: 'Post Hoc (Faulty Causality)',
                    tip: 'Distinguish between temporal correlation and true causal mechanisms with explicit impact links.',
                  },
                  'Post Hoc Ergo Propter Hoc': {
                    title: 'Post Hoc (Faulty Causality)',
                    tip: 'Distinguish between temporal correlation and true causal mechanisms with explicit impact links.',
                  },
                  Bandwagon: {
                    title: 'Bandwagon Fallacy',
                    tip: 'Popularity does not equal logical validity; assess arguments based on their intrinsic reasoning.',
                  },
                  'Appeal to Popularity': {
                    title: 'Appeal to Popularity',
                    tip: 'Popularity does not equal logical validity; assess arguments based on their intrinsic reasoning.',
                  },
                };

                const matchedEn = fallacyEnMap[item.name] || Object.entries(fallacyEnMap).find(([k]) => k.toLowerCase() === item.name.toLowerCase())?.[1];
                let displayTitle = item.vietnameseName;
                let displayTip = item.remediationTip;

                if (language === 'en') {
                  if (matchedEn) {
                    displayTitle = matchedEn.title;
                    displayTip = matchedEn.tip;
                  } else if (item.vietnameseName.startsWith('Lỗi ngụy biện: ')) {
                    displayTitle = item.vietnameseName.replace(/^Lỗi ngụy biện:\s*/i, 'Logical Fallacy: ');
                  } else {
                    displayTitle = item.name;
                  }
                }

                const lastSeenFormatted = new Date(item.lastSeen).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US');

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 transition-all hover:border-indigo-500/30"
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedFallacy(isExpanded ? null : item.name)}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.severity === 'HIGH'
                              ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                              : item.severity === 'MEDIUM'
                              ? 'bg-amber-500'
                              : 'bg-cyan-500'
                          }`}
                        />
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {displayTitle}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400">
                            {item.name} • {language === 'vi' ? 'Lần gần nhất:' : 'Last seen:'} {lastSeenFormatted}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 text-[11px] font-mono font-bold">
                          {item.count} {language === 'vi' ? 'lần' : (item.count === 1 ? 'time' : 'times')}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs space-y-2">
                        <div className="p-2.5 rounded-lg bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/20">
                          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] mb-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{language === 'vi' ? 'Gợi ý luyện tập / Hướng dẫn khắc phục:' : 'Practice Tip / Remediation Guide:'}</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                            {displayTip}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── BLOCK C: WPM PROGRESSION & VOICE TELEMETRY ── */}
      <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xl shadow-indigo-950/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Mic className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'vi' ? 'Biểu đồ Nhịp điệu WPM & Giọng nói Telemetry' : 'Voice DSP Speaking Pace & Telemetry Curve'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === 'vi'
                  ? 'Tốc độ phát âm qua các phiên đấu và dải nhịp chuẩn tối ưu (120–150 WPM)'
                  : 'Speaking pace progression and optimal cadence band (120–150 WPM)'}
              </p>
            </div>
          </div>

          {/* Telemetry Summary Badges */}
          <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
              <span className="text-slate-500">{language === 'vi' ? 'WPM Trung bình:' : 'Avg WPM:'}</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {voiceMetrics?.hasVoiceTelemetry ? `${voiceMetrics.averageWpm} WPM` : (language === 'vi' ? 'Chưa có telemetry mic' : 'No mic telemetry')}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span>{language === 'vi' ? 'Chuẩn nhịp (120-150):' : 'Optimal Band (120-150):'}</span>
              <span className="font-bold">{voiceMetrics?.optimalBandPercentage ?? 0}%</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <span>{language === 'vi' ? 'Từ đệm:' : 'Fillers:'}</span>
              <span className="font-bold">{voiceMetrics?.averageFillerRate ?? 0} {language === 'vi' ? 'từ/phút' : 'wpm'}</span>
            </div>
          </div>
        </div>

        {/* WPM Visual Curve / History Points */}
        {wpmHistory.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <p className="text-xs text-slate-400">
              {language === 'vi' ? 'Chưa có phiên tranh biện nào được ghi nhận trong khoảng thời gian này.' : 'No debate sessions recorded for this time window.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visual Step Timeline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {wpmHistory.slice(0, 8).map((pt, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                      {new Date(pt.date).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        pt.avgWpm >= 120 && pt.avgWpm <= 150
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : pt.avgWpm < 100
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {pt.avgWpm >= 120 && pt.avgWpm <= 150
                        ? (language === 'vi' ? 'Tối ưu' : 'Optimal')
                        : pt.avgWpm < 100
                        ? (language === 'vi' ? 'Chậm' : 'Slow')
                        : pt.avgWpm <= 119
                        ? (language === 'vi' ? 'Hơi chậm' : 'Slightly slow')
                        : pt.avgWpm <= 170
                        ? (language === 'vi' ? 'Hơi nhanh' : 'Slightly fast')
                        : (language === 'vi' ? 'Nhanh' : 'Fast')}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1.5 my-1">
                    <span className="text-xl font-mono font-extrabold text-slate-900 dark:text-white">
                      {pt.avgWpm}
                    </span>
                    <span className="text-xs text-slate-400">WPM</span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1" title={pt.topicTitle}>
                    {pt.topicTitle}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/60">
                    <span>{language === 'vi' ? 'Từ đệm:' : 'Fillers:'} {pt.fillerCount}</span>
                    <span>{language === 'vi' ? 'Nghỉ:' : 'Pause:'} {pt.pauseRatio}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── BLOCK D: 7-LEVEL PEDAGOGICAL SKILL TREE ── */}
      <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xl shadow-indigo-950/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'vi' ? 'Cây Kỹ Năng Tư Duy 7 Cấp Bậc (Cognitive Mastery Ladder)' : 'Debate Mastery Skill Tree (7 Pedagogical Levels)'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === 'vi'
                  ? 'Nấc thang tiến trình: Đạt ≥ 90.00% điểm thành thạo để mở khóa cấp độ kế tiếp'
                  : 'Mastery threshold: Reach ≥ 90.00% mastery score to unlock the next level'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold">
            <span className="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {language === 'vi' ? 'Cấp hiện tại: L' : 'Current: L'}{skillTreeData?.currentLevel ?? 1}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {language === 'vi' ? 'Đã mở khóa: ' : 'Unlocked: '}{skillTreeData?.unlockedCount ?? 1}/7
            </span>
          </div>
        </div>

        {/* Level Nodes Visual List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          {skillLevels.map(node => {
            const isCurrent = node.isCurrentLevel;
            const isUnlocked = node.unlocked;
            const levelTitlesEn: Record<number, string> = {
              1: 'Argument Construction (C-R-E)',
              2: 'Premises & Causal Logic',
              3: 'Fallacy Detection & Mitigation',
              4: 'Multi-dimensional Rebuttal & Impact',
              5: 'Impromptu & 15s POI Control',
              6: 'Tournament Formats WSDC / AP / BP',
              7: 'Role Switch & Match Summary',
            };
            const displayTitle = language === 'vi' ? node.title : (node.titleEn || levelTitlesEn[node.level] || node.title);

            return (
              <div
                key={node.level}
                onClick={() => setSelectedSkillLevel(node)}
                className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-gradient-to-b from-indigo-500/15 to-purple-500/10 border-indigo-500/50 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                    : isUnlocked
                    ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 hover:border-indigo-500/30'
                    : 'bg-slate-100/50 dark:bg-slate-950/20 border-slate-200/50 dark:border-slate-900/50 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      L{node.level}
                    </span>
                    {isUnlocked ? (
                      <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 min-h-[32px]">
                    {displayTitle}
                  </h3>

                  {node.socraticOnly && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-500 border border-amber-500/20">
                      {language === 'vi' ? '🧠 Vấn đáp Socratic' : '🧠 Socratic Inquiry'}
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/60">
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span className="text-slate-400">{language === 'vi' ? 'Tiến trình:' : 'Progress:'}</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {node.masteryProgress.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        node.masteryProgress >= 90
                          ? 'bg-emerald-500'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.min(100, node.masteryProgress)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SKILL LEVEL DETAIL MODAL / DRAWER ── */}
      {selectedSkillLevel && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-mono font-bold text-indigo-400">
                  L{selectedSkillLevel.level}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {language === 'vi' ? selectedSkillLevel.title : (selectedSkillLevel.titleEn || selectedSkillLevel.title)}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">{selectedSkillLevel.titleEn}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSkillLevel(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {selectedSkillLevel.description}
            </p>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>{language === 'vi' ? 'Trọng tâm Sư phạm:' : 'Pedagogical Focus:'}</span>
              </h4>
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                {selectedSkillLevel.pedagogyFocus.map((focus, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span>{focus}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'vi' ? 'Gợi ý Rèn luyện:' : 'Training Recommendations:'}</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                {selectedSkillLevel.remediationRecommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-400">{language === 'vi' ? 'Điều kiện mở khóa cấp tiếp theo:' : 'Next Level Requirement:'}</span>
              <span className="font-mono font-bold text-emerald-400">{language === 'vi' ? 'Điểm thành thạo ≥ 90.00%' : 'Mastery score ≥ 90.00%'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThinkingProfileTab;
