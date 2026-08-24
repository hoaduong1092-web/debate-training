/**
 * AssistantPanel — Assistant Domain UI (v15 Glassmorphism Cyber-Academic)
 *
 * Full Persistent Storage & Seamless Arena Handoff:
 *   - Both sub-views stay mounted with CSS visibility toggling
 *   - Auto-saves all generated Speech Drafts & Motion Reports to localStorage
 *   - Collapsible "Lịch sử đã tạo gần đây" (Recent History) section in each tab
 *   - Instant restoration of past drafts and motion reports without regenerating
 *   - Non-destructive Arena Handoff: pre-fills Arena while preserving draft in Assistant
 *   - SAFE OBJECT / ARRAY PARSER: Eliminates all raw JSON rendering on UI
 *
 * Spec: 02_DOMAIN_SPEC.md §7, 04_API_SPEC.md §5
 */

import React, { useState, useEffect, FormEvent } from 'react';
import {
  BookOpen,
  BarChart2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  ArrowRightCircle,
  Copy,
  History,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit3,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ArenaApiError,
  DebateStance,
  SpeechDraftResult,
  MotionAnalysisResult,
  WorkspaceArgument,
  WorkspaceCounterargument,
  FinalDebateDraft,
  ArenaHandoffPayload,
  createSpeechDraft,
  createMotionAnalysis,
} from '../lib/api';

// ─── Storage Types & Constants ────────────────────────────────────────────────

export interface SavedDraftItem {
  id: string;
  topic: string;
  stance: DebateStance;
  createdAt: string;
  result: SpeechDraftResult;
  finalDraft?: FinalDebateDraft;
}

export interface SavedReportItem {
  id: string;
  topic: string;
  context?: string;
  createdAt: string;
  result: MotionAnalysisResult;
}

const STORAGE_KEY_DRAFTS = 'debate_assistant_drafts';
const STORAGE_KEY_REPORTS = 'debate_assistant_reports';

function loadSavedDrafts(): SavedDraftItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRAFTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistDrafts(items: SavedDraftItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(items));
  } catch {
    // Ignore storage write errors
  }
}

function loadSavedReports(): SavedReportItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistReports(items: SavedReportItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(items));
  } catch {
    // Ignore storage write errors
  }
}

// ─── Component Types ─────────────────────────────────────────────────────────

type AssistantInnerTab = 'speech' | 'motion';

interface AssistantPanelProps {
  onPrefillArena: (payloadOrTopic: ArenaHandoffPayload | string, stance?: DebateStance, draftText?: string) => void;
  language?: 'vi' | 'en';
  initialSubTab?: AssistantInnerTab;
  initialTopic?: string;
  initialStance?: DebateStance;
}

// ─── Safe Parser Helpers (Zero Raw JSON Guarantee) ───────────────────────────

export interface ParsedStakeholder {
  group: string;
  impact: string;
}

function parseStakeholderItem(item: any): ParsedStakeholder {
  if (!item) return { group: 'Bên liên quan', impact: '' };

  if (typeof item === 'string') {
    const trimmed = item.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'object' && parsed !== null) {
          return parseStakeholderItem(parsed);
        }
      } catch {}
    }

    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      return {
        group: parts[0]?.trim() || 'Bên liên quan',
        impact: parts.slice(1).join(':').trim(),
      };
    }
    if (trimmed.includes(' - ')) {
      const parts = trimmed.split(' - ');
      return {
        group: parts[0]?.trim() || 'Bên liên quan',
        impact: parts.slice(1).join(' - ').trim(),
      };
    }
    if (trimmed.includes(' — ')) {
      const parts = trimmed.split(' — ');
      return {
        group: parts[0]?.trim() || 'Bên liên quan',
        impact: parts.slice(1).join(' — ').trim(),
      };
    }

    return {
      group: trimmed,
      impact: '',
    };
  }

  if (typeof item === 'object') {
    const group =
      item.group ||
      item.stakeholder ||
      item.party ||
      item.name ||
      item.ben_lien_quan ||
      item.nhom ||
      item.title ||
      'Bên liên quan';

    const impact =
      item.impact ||
      item.interest ||
      item.effect ||
      item.role ||
      item.tac_dong ||
      item.quyen_loi ||
      item.description ||
      item.desc ||
      '';

    return {
      group: String(group),
      impact: String(impact),
    };
  }

  return {
    group: String(item),
    impact: '',
  };
}

export interface ParsedCase {
  claim: string;
  key_argument: string;
  burden_of_proof: string;
}

function parseCaseItem(item: any): ParsedCase {
  if (!item) return { claim: '', key_argument: '', burden_of_proof: '' };
  if (typeof item === 'string') {
    const trimmed = item.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseCaseItem(parsed);
      } catch {}
    }
    return { claim: trimmed, key_argument: '', burden_of_proof: '' };
  }
  if (typeof item === 'object') {
    return {
      claim: String(item.claim || item.luan_diem || item.title || item.point || ''),
      key_argument: String(item.key_argument || item.keyArgument || item.argument || item.lap_luan || item.reasoning || ''),
      burden_of_proof: String(item.burden_of_proof || item.burdenOfProof || item.burden || item.ganh_nang || item.ganh_nang_chung_minh || ''),
    };
  }
  return { claim: String(item), key_argument: '', burden_of_proof: '' };
}

function parseStringVector(item: any): string {
  if (!item) return '';
  if (typeof item === 'string') {
    const trimmed = item.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseStringVector(parsed);
      } catch {}
    }
    return trimmed;
  }
  if (typeof item === 'object') {
    return String(item.vector || item.clash || item.point || item.topic || item.name || Object.values(item).join(' - '));
  }
  return String(item);
}

function parseSpeechArgument(item: any): { claim: string; reasoning: string; evidence_suggestion: string } {
  if (!item) return { claim: '', reasoning: '', evidence_suggestion: '' };
  if (typeof item === 'string') {
    const trimmed = item.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseSpeechArgument(parsed);
      } catch {}
    }
    return { claim: trimmed, reasoning: '', evidence_suggestion: '' };
  }
  if (typeof item === 'object') {
    return {
      claim: String(item.claim || item.luan_diem || item.title || item.point || ''),
      reasoning: String(item.reasoning || item.lap_luan || item.ly_le || item.explanation || ''),
      evidence_suggestion: String(item.evidence_suggestion || item.evidenceSuggestion || item.evidence || item.dan_chung || item.support || ''),
    };
  }
  return { claim: String(item), reasoning: '', evidence_suggestion: '' };
}

function parseCounterargument(item: any): { opposing_point: string; rebuttal_strategy: string } {
  if (!item) return { opposing_point: '', rebuttal_strategy: '' };
  if (typeof item === 'string') {
    const trimmed = item.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseCounterargument(parsed);
      } catch {}
    }
    return { opposing_point: trimmed, rebuttal_strategy: '' };
  }
  if (typeof item === 'object') {
    return {
      opposing_point: String(item.opposing_point || item.opposingPoint || item.opposing || item.doi_phuong || item.counter || ''),
      rebuttal_strategy: String(item.rebuttal_strategy || item.rebuttalStrategy || item.rebuttal || item.phan_bac || item.strategy || ''),
    };
  }
  return { opposing_point: String(item), rebuttal_strategy: '' };
}

/**
 * Converts a SpeechDraftResult into readable, rich text for Arena input prefill.
 */
function speechDraftToArenaText(draft: SpeechDraftResult, isVi = true): string {
  const lines: string[] = [];
  if (draft.hook) {
    lines.push(isVi ? `🎯 [Mở đầu] ${draft.hook}` : `🎯 [Opening Hook] ${draft.hook}`);
    lines.push('');
  }
  const args = Array.isArray(draft.arguments) ? draft.arguments.map(parseSpeechArgument) : [];
  args.forEach((arg, i) => {
    lines.push(isVi ? `[Luận điểm ${i + 1}] ${arg.claim}` : `[Argument ${i + 1}] ${arg.claim}`);
    if (arg.reasoning) lines.push(isVi ? `→ Lý lẽ: ${arg.reasoning}` : `→ Reasoning: ${arg.reasoning}`);
    if (arg.evidence_suggestion) lines.push(isVi ? `📚 Dẫn chứng: ${arg.evidence_suggestion}` : `📚 Evidence: ${arg.evidence_suggestion}`);
    lines.push('');
  });

  const counters = Array.isArray(draft.counterarguments) ? draft.counterarguments.map(parseCounterargument) : [];
  if (counters.length > 0) {
    counters.forEach((ca, i) => {
      lines.push(isVi ? `[Phản biện đối phương ${i + 1}] ${ca.opposing_point}` : `[Opposing Point ${i + 1}] ${ca.opposing_point}`);
      if (ca.rebuttal_strategy) lines.push(isVi ? `→ Phản bác: ${ca.rebuttal_strategy}` : `→ Rebuttal: ${ca.rebuttal_strategy}`);
      lines.push('');
    });
  }
  if (draft.conclusion) {
    lines.push(isVi ? `✅ [Kết luận] ${draft.conclusion}` : `✅ [Conclusion] ${draft.conclusion}`);
  }
  return lines.join('\n').trim();
}

/**
 * Maps API error status to user-friendly Vietnamese/English message.
 */
function mapApiError(err: unknown, isVi: boolean): string {
  if (err instanceof ArenaApiError) {
    if (err.status === 401) {
      return isVi
        ? 'Vui lòng đăng nhập để sử dụng tính năng Trợ lý AI.'
        : 'Please log in to use AI Assistant features.';
    }
    if (err.status === 403) {
      return isVi
        ? 'Bạn đã dùng hết lượt Trợ lý tháng này. Vui lòng nâng cấp gói để tiếp tục.'
        : 'You have used all Assistant credits for this month. Please upgrade your plan.';
    }
    if (err.status === 422) {
      return isVi
        ? 'Hệ thống AI trả về kết quả không đúng định dạng. Vui lòng thử lại.'
        : 'AI returned an invalid format. Please try again.';
    }
    if (err.status === 502) {
      return isVi
        ? 'Dịch vụ AI tạm thời gián đoạn. Vui lòng thử lại sau ít phút.'
        : 'AI service is temporarily unavailable. Please try again in a moment.';
    }
    return isVi ? 'Đã xảy ra lỗi. Vui lòng thử lại.' : 'An error occurred. Please try again.';
  }
  return isVi ? 'Lỗi kết nối. Vui lòng kiểm tra mạng.' : 'Connection error. Please check your network.';
}

// ─── AssistantPanel Root ─────────────────────────────────────────────────────

export function AssistantPanel({
  onPrefillArena,
  language = 'vi',
  initialSubTab,
  initialTopic,
  initialStance,
}: AssistantPanelProps) {
  const [activeTab, setActiveTab] = useState<AssistantInnerTab>('speech');
  const isVi = language === 'vi';

  // ─── Speech Draft Persistent State ───────────────────────────
  const [draftTopic, setDraftTopic] = useState('');
  const [draftStance, setDraftStance] = useState<DebateStance>('AFFIRMATIVE');
  const [draftRawIdeas, setRawIdeas] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftResult, setDraftResult] = useState<SpeechDraftResult | null>(null);
  const [savedDrafts, setSavedDrafts] = useState<SavedDraftItem[]>([]);

  // ─── Motion Analysis Persistent State ────────────────────────
  const [motionTopic, setMotionTopic] = useState('');
  const [motionContext, setMotionContext] = useState('');
  const [motionLoading, setMotionLoading] = useState(false);
  const [motionError, setMotionError] = useState<string | null>(null);
  const [motionResult, setMotionResult] = useState<MotionAnalysisResult | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReportItem[]>([]);

  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    if (initialTopic && initialTopic.trim()) {
      const trimmed = initialTopic.trim();
      if (initialSubTab === 'motion') {
        setMotionTopic(trimmed);
        setMotionResult((prev) => (prev && prev.motion_title !== trimmed ? null : prev));
      } else {
        setDraftTopic(trimmed);
        setDraftResult((prev) => (prev && prev.title !== trimmed ? null : prev));
      }
    }
  }, [initialTopic, initialSubTab]);

  useEffect(() => {
    if (initialStance) {
      setDraftStance(initialStance);
    }
  }, [initialStance]);

  useEffect(() => {
    const loadedDrafts = loadSavedDrafts();
    setSavedDrafts(loadedDrafts);
    if (loadedDrafts.length > 0 && !draftResult && !initialTopic) {
      const recent = loadedDrafts[0];
      if (recent) {
        setDraftTopic(recent.topic);
        setDraftStance(recent.stance);
        setDraftResult(recent.result);
      }
    }

    const loadedReports = loadSavedReports();
    setSavedReports(loadedReports);
    if (loadedReports.length > 0 && !motionResult && !initialTopic) {
      const recent = loadedReports[0];
      if (recent) {
        setMotionTopic(recent.topic);
        setMotionContext(recent.context || '');
        setMotionResult(recent.result);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDraftGenerated(result: SpeechDraftResult, topic: string, stance: DebateStance) {
    setDraftResult(result);
    const item: SavedDraftItem = {
      id: `draft_${Date.now()}`,
      topic,
      stance,
      createdAt: new Date().toLocaleString(isVi ? 'vi-VN' : 'en-US'),
      result,
    };
    const updated = [item, ...savedDrafts.filter((d) => d.topic !== topic)].slice(0, 10);
    setSavedDrafts(updated);
    persistDrafts(updated);
  }

  function handleReportGenerated(result: MotionAnalysisResult, topic: string, context?: string) {
    setMotionResult(result);
    const item: SavedReportItem = {
      id: `report_${Date.now()}`,
      topic,
      context,
      createdAt: new Date().toLocaleString(isVi ? 'vi-VN' : 'en-US'),
      result,
    };
    const updated = [item, ...savedReports.filter((r) => r.topic !== topic)].slice(0, 10);
    setSavedReports(updated);
    persistReports(updated);
  }

  function handleDeleteDraft(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = savedDrafts.filter((d) => d.id !== id);
    setSavedDrafts(updated);
    persistDrafts(updated);
  }

  function handleDeleteReport(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = savedReports.filter((r) => r.id !== id);
    setSavedReports(updated);
    persistReports(updated);
  }

  return (
    <div className="w-full flex flex-col gap-5 animate-fade-in text-slate-900 dark:text-slate-100">
      {/* ── SUB-NAV TAB SELECTOR ── */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('speech')}
          className={`flex-1 min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'speech'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen size={15} />
          <span>{isVi ? 'Bản Thảo Bài Nói' : 'Speech Draft'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('motion')}
          className={`flex-1 min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'motion'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BarChart2 size={15} />
          <span>{isVi ? 'Phân Tích Kiến Nghị' : 'Motion Analysis'}</span>
        </button>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className={activeTab === 'speech' ? 'block' : 'hidden'}>
        <SpeechDraftView
          topic={draftTopic}
          setTopic={setDraftTopic}
          stance={draftStance}
          setStance={setDraftStance}
          rawIdeas={draftRawIdeas}
          setRawIdeas={setRawIdeas}
          loading={draftLoading}
          setLoading={setDraftLoading}
          error={draftError}
          setError={setDraftError}
          result={draftResult}
          setResult={setDraftResult}
          savedDrafts={savedDrafts}
          onDraftGenerated={handleDraftGenerated}
          onRestoreDraft={(item) => {
            setDraftTopic(item.topic);
            setDraftStance(item.stance);
            setDraftResult(item.result);
          }}
          onDeleteDraft={handleDeleteDraft}
          onPrefillArena={onPrefillArena}
          motionTopic={motionTopic}
          isVi={isVi}
        />
      </div>

      <div className={activeTab === 'motion' ? 'block' : 'hidden'}>
        <MotionAnalysisView
          topic={motionTopic}
          setTopic={setMotionTopic}
          context={motionContext}
          setContext={setMotionContext}
          loading={motionLoading}
          setLoading={setMotionLoading}
          error={motionError}
          setError={setMotionError}
          result={motionResult}
          setResult={setMotionResult}
          savedReports={savedReports}
          onReportGenerated={handleReportGenerated}
          onRestoreReport={(item) => {
            setMotionTopic(item.topic);
            setMotionContext(item.context || '');
            setMotionResult(item.result);
          }}
          onDeleteReport={handleDeleteReport}
          draftTopic={draftTopic}
          isVi={isVi}
        />
      </div>
    </div>
  );
}

// ─── SpeechDraftView (Draft Workspace — Contract Closure v1.1) ───────────────

interface SpeechDraftViewProps {
  topic: string;
  setTopic: (v: string) => void;
  stance: DebateStance;
  setStance: (v: DebateStance) => void;
  rawIdeas: string;
  setRawIdeas: (v: string) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  error: string | null;
  setError: (v: string | null) => void;
  result: SpeechDraftResult | null;
  setResult: (v: SpeechDraftResult | null) => void;
  savedDrafts: SavedDraftItem[];
  onDraftGenerated: (result: SpeechDraftResult, topic: string, stance: DebateStance) => void;
  onRestoreDraft: (item: SavedDraftItem) => void;
  onDeleteDraft: (id: string, e: React.MouseEvent) => void;
  onPrefillArena: (payloadOrTopic: ArenaHandoffPayload | string, stance?: DebateStance, draftText?: string) => void;
  motionTopic?: string;
  isVi: boolean;
}

function SpeechDraftView({
  topic,
  setTopic,
  stance,
  setStance,
  rawIdeas,
  setRawIdeas,
  loading,
  setLoading,
  error,
  setError,
  result,
  setResult,
  savedDrafts,
  onDraftGenerated,
  onRestoreDraft,
  onDeleteDraft,
  onPrefillArena,
  motionTopic,
  isVi,
}: SpeechDraftViewProps) {
  const [showHistory, setShowHistory] = useState(false);

  // ─── Draft Workspace Editable State (Learner Ownership) ───────────────────
  const [workspaceArgs, setWorkspaceArgs] = useState<WorkspaceArgument[]>([]);
  const [workspaceCounters, setWorkspaceCounters] = useState<WorkspaceCounterargument[]>([]);
  const [workspaceHook, setWorkspaceHook] = useState('');
  const [workspaceConclusion, setWorkspaceConclusion] = useState('');

  // Synchronize AI Candidate Scaffold into Draft Workspace State upon generation/restore
  useEffect(() => {
    if (result) {
      setWorkspaceHook(result.hook || '');
      setWorkspaceConclusion(result.conclusion || '');

      const initialArgs: WorkspaceArgument[] = (result.arguments || []).map((arg, idx) => {
        const parsed = parseSpeechArgument(arg);
        return {
          argumentId: (arg as any).argumentId || `arg_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
          order: idx + 1,
          claim: parsed.claim || '',
          reasoning: parsed.reasoning || '',
          evidenceSuggestion: parsed.evidence_suggestion || (arg as any).evidenceSuggestion || '',
          isCustomAdded: false,
        };
      });
      setWorkspaceArgs(initialArgs);

      const initialCounters: WorkspaceCounterargument[] = (result.counterarguments || []).map((ca, idx) => {
        const parsed = parseCounterargument(ca);
        return {
          counterargumentId: (ca as any).counterargumentId || `ca_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
          order: idx + 1,
          opponentArgument: parsed.opposing_point || (ca as any).opponentArgument || '',
          rebuttal: parsed.rebuttal_strategy || (ca as any).rebuttal || '',
          isCustomAdded: false,
        };
      });
      setWorkspaceCounters(initialCounters);
    } else {
      setWorkspaceArgs([]);
      setWorkspaceCounters([]);
      setWorkspaceHook('');
      setWorkspaceConclusion('');
    }
  }, [result]);

  // ─── Workspace Operations (Zero Quota / Zero AI Calls) ──────────────────────

  const handleUpdateArg = (
    argumentId: string,
    field: 'claim' | 'reasoning' | 'evidenceSuggestion',
    value: string
  ) => {
    setWorkspaceArgs((prev) =>
      prev.map((a) => (a.argumentId === argumentId ? { ...a, [field]: value } : a))
    );
  };

  const handleAddArg = () => {
    const newArg: WorkspaceArgument = {
      argumentId: `arg_custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      order: workspaceArgs.length + 1,
      claim: '',
      reasoning: '',
      evidenceSuggestion: '',
      isCustomAdded: true,
    };
    setWorkspaceArgs((prev) => [...prev, newArg]);
  };

  const handleDeleteArg = (argumentId: string) => {
    setWorkspaceArgs((prev) => {
      const filtered = prev.filter((a) => a.argumentId !== argumentId);
      // Renormalize order (1..N) while preserving IDs strictly invariant
      return filtered.map((a, idx) => ({ ...a, order: idx + 1 }));
    });
  };

  const handleMoveArg = (index: number, direction: 'up' | 'down') => {
    setWorkspaceArgs((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index]!;
      copy[index] = copy[targetIndex]!;
      copy[targetIndex] = temp;
      return copy.map((a, idx) => ({ ...a, order: idx + 1 }));
    });
  };

  const handleUpdateCounter = (
    counterargumentId: string,
    field: 'opponentArgument' | 'rebuttal',
    value: string
  ) => {
    setWorkspaceCounters((prev) =>
      prev.map((c) => (c.counterargumentId === counterargumentId ? { ...c, [field]: value } : c))
    );
  };

  const handleAddCounter = () => {
    const newCounter: WorkspaceCounterargument = {
      counterargumentId: `ca_custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      order: workspaceCounters.length + 1,
      opponentArgument: '',
      rebuttal: '',
      isCustomAdded: true,
    };
    setWorkspaceCounters((prev) => [...prev, newCounter]);
  };

  const handleDeleteCounter = (counterargumentId: string) => {
    setWorkspaceCounters((prev) => {
      const filtered = prev.filter((c) => c.counterargumentId !== counterargumentId);
      return filtered.map((c, idx) => ({ ...c, order: idx + 1 }));
    });
  };

  const handleMoveCounter = (index: number, direction: 'up' | 'down') => {
    setWorkspaceCounters((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index]!;
      copy[index] = copy[targetIndex]!;
      copy[targetIndex] = temp;
      return copy.map((c, idx) => ({ ...c, order: idx + 1 }));
    });
  };

  // ─── Validation (Derived from Live Data) ──────────────────────────────────
  const isTopicValid = topic.trim().length > 0;
  const hasMinArgs = workspaceArgs.length >= 1;
  const areClaimsFilled = workspaceArgs.length > 0 && workspaceArgs.every((a) => a.claim.trim().length > 0);
  const isWorkspaceValid = isTopicValid && hasMinArgs && areClaimsFilled;

  // ─── Confirmation & Structured Handoff ───────────────────────────────────
  function handleConfirmAndHandoff() {
    if (!isWorkspaceValid) return;

    const finalDraft: FinalDebateDraft = {
      draftId: `final_draft_${Date.now()}`,
      topic: topic.trim(),
      stance,
      hook: workspaceHook.trim(),
      arguments: workspaceArgs.map((a, idx) => ({
        argumentId: a.argumentId,
        order: idx + 1,
        claim: a.claim.trim(),
        reasoning: a.reasoning.trim(),
        evidenceSuggestion: a.evidenceSuggestion.trim(),
      })),
      counterarguments: workspaceCounters.map((ca, idx) => ({
        counterargumentId: ca.counterargumentId,
        order: idx + 1,
        opponentArgument: ca.opponentArgument.trim(),
        rebuttal: ca.rebuttal.trim(),
      })),
      conclusion: workspaceConclusion.trim(),
      isUserConfirmed: true,
      confirmedAt: new Date().toISOString(),
    };

    // Construct legacy text fallback without making it the canonical handoff mechanism
    const legacyDraftText = speechDraftToArenaText(
      {
        title: result?.title || topic.trim(),
        hook: finalDraft.hook,
        arguments: finalDraft.arguments.map((a) => ({
          claim: a.claim,
          reasoning: a.reasoning,
          evidence_suggestion: a.evidenceSuggestion,
        })),
        counterarguments: finalDraft.counterarguments.map((c) => ({
          opposing_point: c.opponentArgument,
          rebuttal_strategy: c.rebuttal,
        })),
        conclusion: finalDraft.conclusion,
      },
      isVi
    );

    const payload: ArenaHandoffPayload = {
      topic: topic.trim(),
      stance,
      finalDraft,
      legacyDraftText,
    };

    onPrefillArena(payload);
  }

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await createSpeechDraft({
        topic: topic.trim(),
        stance,
        rawIdeas: rawIdeas.trim() || undefined,
        language: isVi ? 'vi' : 'en',
      });
      onDraftGenerated(response.data, topic.trim(), stance);
    } catch (err) {
      setError(mapApiError(err, isVi));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {result ? (
        /* Interactive Draft Workspace (Contract Closure v1.1) */
        <div className="glass-panel-elevated rounded-3xl p-5 md:p-7 border border-indigo-500/20 shadow-xl flex flex-col gap-6">
          {/* Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Edit3 size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
                    {isVi ? 'KHÔNG GIAN BIÊN TẬP (DRAFT WORKSPACE)' : 'DRAFT WORKSPACE'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    • {isVi ? 'Gợi ý AI đã được nạp' : 'AI Scaffold loaded'}
                  </span>
                </div>
                <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {topic.trim() || result.title}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-xl border ${
                  stance === 'AFFIRMATIVE'
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                }`}
              >
                {stance === 'AFFIRMATIVE' ? (isVi ? 'Ủng hộ' : 'Affirmative') : (isVi ? 'Phản đối' : 'Negative')}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-center gap-2">
            <Sparkles size={14} className="text-indigo-500 shrink-0" />
            <span>
              {isVi
                ? 'AI gợi ý khung sườn ban đầu. Bạn có toàn quyền sửa, xóa, đổi thứ tự hoặc thêm luận điểm theo ý muốn trước khi đấu trường bắt đầu.'
                : 'AI generated the initial scaffold. You have full ownership to edit, delete, reorder, or add arguments before entering the Arena.'}
            </span>
          </div>

          {/* Section 1: Opening Hook */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col gap-2">
            <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <span>🎯 {isVi ? 'Mở đầu bài nói (Opening Hook)' : 'Opening Hook'}</span>
            </label>
            <textarea
              value={workspaceHook}
              onChange={(e) => setWorkspaceHook(e.target.value)}
              rows={2}
              placeholder={isVi ? 'Câu mở đầu gây ấn tượng, dẫn dắt vào vấn đề...' : 'Opening hook to capture attention...'}
              className="w-full text-xs md:text-sm bg-white dark:bg-slate-950/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition resize-y italic"
            />
          </div>

          {/* Section 2: Core Arguments Workspace (N >= 1) */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Layers size={15} className="text-indigo-500" />
                <span>
                  {isVi ? `Hệ thống luận điểm của bạn (${workspaceArgs.length} luận điểm)` : `Your Arguments (${workspaceArgs.length})`}
                </span>
              </span>
              <button
                type="button"
                onClick={handleAddArg}
                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5 active:scale-95"
              >
                <Plus size={14} />
                <span>{isVi ? 'Thêm Luận Điểm' : 'Add Argument'}</span>
              </button>
            </div>

            {workspaceArgs.length === 0 ? (
              <div className="p-6 border border-dashed border-rose-300 dark:border-rose-500/30 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 text-center flex flex-col items-center gap-2">
                <AlertCircle size={20} className="text-rose-500" />
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                  {isVi ? 'Bản thảo cần có ít nhất 1 luận điểm để xác nhận.' : 'Draft must contain at least 1 argument.'}
                </p>
                <button
                  type="button"
                  onClick={handleAddArg}
                  className="mt-1 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow transition"
                >
                  {isVi ? '+ Thêm Luận Điểm Đầu Tiên' : '+ Add First Argument'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {workspaceArgs.map((arg, i) => (
                  <div
                    key={arg.argumentId}
                    className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col gap-3 shadow-sm hover:border-indigo-500/40 transition"
                  >
                    {/* Card Control Bar */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                          {isVi ? `Luận Điểm ${arg.order}` : `Argument ${arg.order}`}
                        </span>
                        {arg.isCustomAdded && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                            {isVi ? 'Tự tạo' : 'Custom'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={i === 0}
                          onClick={() => handleMoveArg(i, 'up')}
                          title={isVi ? 'Chuyển lên' : 'Move up'}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={i === workspaceArgs.length - 1}
                          onClick={() => handleMoveArg(i, 'down')}
                          title={isVi ? 'Chuyển xuống' : 'Move down'}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteArg(arg.argumentId)}
                          title={isVi ? 'Xóa luận điểm này' : 'Delete argument'}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition ml-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Claim Field */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {isVi ? 'Luận điểm khẳng định (Claim)' : 'Claim'} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={arg.claim}
                        onChange={(e) => handleUpdateArg(arg.argumentId, 'claim', e.target.value)}
                        placeholder={isVi ? 'Nêu rõ luận điểm cốt lõi...' : 'State the core claim...'}
                        className={`w-full text-xs md:text-sm bg-white dark:bg-slate-950/80 p-2.5 rounded-xl border text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition font-medium ${
                          !arg.claim.trim()
                            ? 'border-rose-400 dark:border-rose-500/50'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      />
                    </div>

                    {/* Reasoning Field */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {isVi ? 'Lý giải logic (Reasoning)' : 'Reasoning'}
                      </label>
                      <textarea
                        value={arg.reasoning}
                        onChange={(e) => handleUpdateArg(arg.argumentId, 'reasoning', e.target.value)}
                        rows={2}
                        placeholder={isVi ? 'Giải thích mối quan hệ logic, nguyên nhân - kết quả...' : 'Explain the causal reasoning...'}
                        className="w-full text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 transition resize-y"
                      />
                    </div>

                    {/* Evidence Suggestion Field */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        📚 {isVi ? 'Dẫn chứng gợi ý (Evidence Suggestion)' : 'Evidence Suggestion'}
                      </label>
                      <input
                        type="text"
                        value={arg.evidenceSuggestion}
                        onChange={(e) => handleUpdateArg(arg.argumentId, 'evidenceSuggestion', e.target.value)}
                        placeholder={isVi ? 'Gợi ý số liệu, báo cáo, thực tế...' : 'Data points, studies, or examples...'}
                        className="w-full text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50/50 dark:bg-slate-950/80 p-2 rounded-xl border border-emerald-200 dark:border-emerald-500/20 focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Counterarguments Workspace (M >= 0) */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <span>🔄 {isVi ? `Dự báo phản biện (${workspaceCounters.length} phản biện)` : `Counterarguments (${workspaceCounters.length})`}</span>
              </span>
              <button
                type="button"
                onClick={handleAddCounter}
                className="px-3 py-1.5 bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5 active:scale-95"
              >
                <Plus size={14} />
                <span>{isVi ? 'Thêm Phản Biện' : 'Add Counterargument'}</span>
              </button>
            </div>

            {workspaceCounters.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {workspaceCounters.map((ca, i) => (
                  <div
                    key={ca.counterargumentId}
                    className="glass-panel p-4 rounded-2xl border border-rose-200 dark:border-rose-500/20 shadow-sm flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between border-b border-rose-100 dark:border-rose-900/40 pb-2">
                      <span className="text-[11px] font-mono font-bold text-rose-700 dark:text-rose-400">
                        {isVi ? `Phản Biện ${ca.order}` : `Counter ${ca.order}`}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={i === 0}
                          onClick={() => handleMoveCounter(i, 'up')}
                          className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={i === workspaceCounters.length - 1}
                          onClick={() => handleMoveCounter(i, 'down')}
                          className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCounter(ca.counterargumentId)}
                          className="p-1 text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-rose-700 dark:text-rose-400">
                        ⚠️ {isVi ? 'Luận điểm đối phương' : 'Opposing Point'}
                      </label>
                      <input
                        type="text"
                        value={ca.opponentArgument}
                        onChange={(e) => handleUpdateCounter(ca.counterargumentId, 'opponentArgument', e.target.value)}
                        placeholder={isVi ? 'Điểm đối phương có thể phản bác...' : 'What opponent might say...'}
                        className="w-full text-xs bg-white dark:bg-slate-950/80 p-2.5 rounded-xl border border-rose-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 transition"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        🛡️ {isVi ? 'Chiến lược phản bác của bạn' : 'Your Rebuttal Strategy'}
                      </label>
                      <textarea
                        value={ca.rebuttal}
                        onChange={(e) => handleUpdateCounter(ca.counterargumentId, 'rebuttal', e.target.value)}
                        rows={2}
                        placeholder={isVi ? 'Chiến lược và lý lẽ bạn sẽ bẻ gãy điểm này...' : 'How you will counter this point...'}
                        className="w-full text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 transition resize-y"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Conclusion */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col gap-2">
            <label className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
              <span>✅ {isVi ? 'Kết luận bài nói (Closing Statement)' : 'Conclusion'}</span>
            </label>
            <textarea
              value={workspaceConclusion}
              onChange={(e) => setWorkspaceConclusion(e.target.value)}
              rows={2}
              placeholder={isVi ? 'Tóm lược và đúc kết thông điệp cuối cùng...' : 'Summary and final takeaway...'}
              className="w-full text-xs md:text-sm bg-white dark:bg-slate-950/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 transition resize-y"
            />
          </div>

          {/* Validation Feedback Banner */}
          {!isWorkspaceValid && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 font-medium">
              <AlertCircle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                {!hasMinArgs
                  ? isVi ? 'Cần có ít nhất 1 luận điểm để xác nhận bản thảo.' : 'Must have at least 1 argument.'
                  : !areClaimsFilled
                  ? isVi ? 'Mỗi luận điểm phải có nội dung Claim không được để trống.' : 'All arguments must have non-empty Claim.'
                  : isVi ? 'Vui lòng điền đầy đủ chủ đề và luận điểm.' : 'Please fill all required fields.'}
              </span>
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={!isWorkspaceValid}
              onClick={handleConfirmAndHandoff}
              className={`px-5 py-3 text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95 flex items-center gap-2 ${
                isWorkspaceValid
                  ? 'shimmer-btn cursor-pointer'
                  : 'bg-slate-400 dark:bg-slate-700 opacity-60 cursor-not-allowed'
              }`}
            >
              <ArrowRightCircle size={16} />
              <span>{isVi ? '🚀 Xác nhận & Vào Đấu Trường Arena' : 'Confirm & Enter Arena'}</span>
            </button>
            <button
              type="button"
              className="px-4 py-3 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl transition active:scale-95 flex items-center gap-2"
              onClick={() => setResult(null)}
            >
              <RefreshCw size={14} />
              <span>{isVi ? 'Tạo bản thảo mới' : 'Generate new draft'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Form */
        <form onSubmit={handleGenerate} className="glass-panel-elevated rounded-3xl p-5 md:p-7 border border-slate-200 dark:border-white/10 shadow-xl flex flex-col gap-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white">
                {isVi ? 'Kiến nghị / Chủ đề tranh biện' : 'Motion / Topic'} <span className="text-rose-500">*</span>
              </label>
              {motionTopic && motionTopic.trim() && motionTopic !== topic && (
                <button
                  type="button"
                  onClick={() => setTopic(motionTopic)}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Copy size={11} />
                  <span>{isVi ? 'Lấy từ tab Phân tích' : 'Use Motion topic'}</span>
                </button>
              )}
            </div>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={isVi ? 'VD: Cấm học sinh dưới 15 tuổi sử dụng mạng xã hội' : 'E.g. Ban social media for under 15s'}
              required
              disabled={loading}
              className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
              {isVi ? 'Phe tranh luận của bạn' : 'Your Stance'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStance('AFFIRMATIVE')}
                className={`min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center ${
                  stance === 'AFFIRMATIVE'
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500 shadow-md'
                    : 'bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                ✅ {isVi ? 'Ủng Hộ (Affirmative)' : 'Affirmative'}
              </button>
              <button
                type="button"
                onClick={() => setStance('NEGATIVE')}
                className={`min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center ${
                  stance === 'NEGATIVE'
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500 shadow-md'
                    : 'bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                ❌ {isVi ? 'Phản Đối (Negative)' : 'Negative'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
              {isVi ? 'Ý tưởng thô / Từ khóa ban đầu (Tùy chọn)' : 'Raw ideas / Keywords (Optional)'}
            </label>
            <textarea
              rows={3}
              value={rawIdeas}
              onChange={(e) => setRawIdeas(e.target.value)}
              placeholder={isVi ? 'Nhập các luận cứ, số liệu bạn muốn đưa vào bài nói...' : 'Enter key points or statistics...'}
              disabled={loading}
              className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition resize-y"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="w-full min-h-[44px] py-3 shimmer-btn text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{isVi ? 'Trợ lý AI đang phác thảo bài nói...' : 'Generating Speech Draft...'}</span>
              </>
            ) : (
              <>
                <BookOpen size={16} />
                <span>{isVi ? 'Tạo Bản Thảo Bài Nói' : 'Generate Speech Draft'}</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* History */}
      {savedDrafts.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            <span className="flex items-center gap-2">
              <History size={14} />
              <span>{isVi ? 'Bản thảo đã lưu gần đây' : 'Recent Drafts'}</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px]">
                {savedDrafts.length}
              </span>
            </span>
            <ChevronDown size={14} className={`transform transition ${showHistory ? 'rotate-180' : ''}`} />
          </button>

          {showHistory && (
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {savedDrafts.map((d) => (
                <div key={d.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div
                    onClick={() => onRestoreDraft(d)}
                    className="flex-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition truncate"
                  >
                    <div className="font-bold truncate">{d.result.title || d.topic}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {d.createdAt} • {d.stance === 'AFFIRMATIVE' ? (isVi ? 'Ủng hộ' : 'Affirmative') : (isVi ? 'Phản đối' : 'Negative')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => onDeleteDraft(d.id, e)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MotionAnalysisView ───────────────────────────────────────────────────────

interface MotionAnalysisViewProps {
  topic: string;
  setTopic: (v: string) => void;
  context: string;
  setContext: (v: string) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  error: string | null;
  setError: (v: string | null) => void;
  result: MotionAnalysisResult | null;
  setResult: (v: MotionAnalysisResult | null) => void;
  savedReports: SavedReportItem[];
  onReportGenerated: (result: MotionAnalysisResult, topic: string, context?: string) => void;
  onRestoreReport: (item: SavedReportItem) => void;
  onDeleteReport: (id: string, e: React.MouseEvent) => void;
  draftTopic?: string;
  isVi: boolean;
}

function MotionAnalysisView({
  topic,
  setTopic,
  context,
  setContext,
  loading,
  setLoading,
  error,
  setError,
  result,
  setResult,
  savedReports,
  onReportGenerated,
  onRestoreReport,
  onDeleteReport,
  draftTopic,
  isVi,
}: MotionAnalysisViewProps) {
  const [showHistory, setShowHistory] = useState(false);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await createMotionAnalysis({
        topic: topic.trim(),
        context: context.trim() || undefined,
        language: isVi ? 'vi' : 'en',
      });
      onReportGenerated(response.data, topic.trim(), context.trim() || undefined);
    } catch (err) {
      setError(mapApiError(err, isVi));
    } finally {
      setLoading(false);
    }
  }

  // Safe parsed stakeholders, cases, and vectors
  const stakeholdersList: ParsedStakeholder[] = result && Array.isArray(result.stakeholders)
    ? result.stakeholders.map(parseStakeholderItem)
    : [];

  const affCases: ParsedCase[] = result && Array.isArray(result.affirmative_cases)
    ? result.affirmative_cases.map(parseCaseItem)
    : [];

  const negCases: ParsedCase[] = result && Array.isArray(result.negative_cases)
    ? result.negative_cases.map(parseCaseItem)
    : [];

  const vectors: string[] = result && Array.isArray(result.rebuttal_vectors)
    ? result.rebuttal_vectors.map(parseStringVector)
    : [];

  return (
    <div className="flex flex-col gap-4">
      {result ? (
        <div className="glass-panel-elevated rounded-3xl p-5 md:p-7 border border-slate-200 dark:border-white/10 shadow-xl flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  {isVi ? 'BÁO CÁO PHÂN TÍCH KIẾN NGHỊ ĐA CHIỀU' : 'MOTION ANALYSIS REPORT'}
                </span>
                <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">{result.motion_title}</h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setResult(null)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold transition active:scale-95 flex items-center gap-1.5"
            >
              <RefreshCw size={12} />
              <span>{isVi ? 'Phân tích chủ đề mới' : 'Analyze new'}</span>
            </button>
          </div>

          {/* Core conflict Bento */}
          {result.core_conflict && (
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
                <span>⚡ {isVi ? 'Xung đột giá trị cốt lõi (Core Conflict)' : 'Core Conflict'}</span>
              </div>
              <p className="text-xs md:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{result.core_conflict}</p>
            </div>
          )}

          {/* Stakeholders Bento Grid */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              👥 {isVi ? 'Các bên liên quan & Tác động (Stakeholders)' : 'Stakeholders & Impacts'}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {stakeholdersList.map((s, i) => (
                <div
                  key={i}
                  className="glass-panel p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-start hover:border-indigo-500/40 transition"
                >
                  <div className="mb-1.5">
                    <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                      {s.group}
                    </span>
                  </div>
                  {s.impact && (
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mt-1">
                      {s.impact}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Affirmative Cases Bento Grid */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              ✅ {isVi ? 'Lập luận phe Ủng hộ (Affirmative Cases)' : 'Affirmative Cases'}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {affCases.map((c, i) => (
                <div key={i} className="glass-panel p-4 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 shadow-sm flex flex-col justify-between gap-3">
                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-1.5">{c.claim}</h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{c.key_argument}</p>
                  </div>
                  {c.burden_of_proof && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-medium">
                      <strong>⚖️ {isVi ? 'Gánh nặng chứng minh: ' : 'Burden: '}</strong>{c.burden_of_proof}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Negative Cases Bento Grid */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              ❌ {isVi ? 'Lập luận phe Phản đối (Negative Cases)' : 'Negative Cases'}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {negCases.map((c, i) => (
                <div key={i} className="glass-panel p-4 rounded-2xl border border-rose-200 dark:border-rose-500/20 shadow-sm flex flex-col justify-between gap-3">
                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-rose-800 dark:text-rose-300 mb-1.5">{c.claim}</h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{c.key_argument}</p>
                  </div>
                  {c.burden_of_proof && (
                    <div className="bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl text-xs text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 font-medium">
                      <strong>⚖️ {isVi ? 'Gánh nặng chứng minh: ' : 'Burden: '}</strong>{c.burden_of_proof}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Rebuttal Vectors */}
          {vectors.length > 0 && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                🔄 {isVi ? 'Điểm đối đầu cốt lõi (Rebuttal Vectors)' : 'Rebuttal Vectors'}
              </span>
              <div className="space-y-2">
                {vectors.map((rv, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-white/5 text-xs text-slate-800 dark:text-slate-200 flex items-start gap-2">
                    <span className="text-purple-600 dark:text-purple-400 font-bold shrink-0">⚔️</span>
                    <span className="leading-relaxed">{rv}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Form */
        <form onSubmit={handleGenerate} className="glass-panel-elevated rounded-3xl p-5 md:p-7 border border-slate-200 dark:border-white/10 shadow-xl flex flex-col gap-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white">
                {isVi ? 'Chủ đề / Kiến nghị cần phân tích' : 'Motion / Topic'} <span className="text-rose-500">*</span>
              </label>
              {draftTopic && draftTopic.trim() && draftTopic !== topic && (
                <button
                  type="button"
                  onClick={() => setTopic(draftTopic)}
                  className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Copy size={11} />
                  <span>{isVi ? 'Lấy từ tab Bản thảo' : 'Use Draft topic'}</span>
                </button>
              )}
            </div>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={isVi ? 'VD: Cấm học sinh dưới 15 tuổi sử dụng mạng xã hội' : 'E.g. Ban social media for under 15s'}
              required
              disabled={loading}
              className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
              {isVi ? 'Bối cảnh thực tế (Tùy chọn)' : 'Context (Optional)'}
            </label>
            <textarea
              rows={3}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder={isVi ? 'Bổ sung bối cảnh: quốc gia, thời điểm, đối tượng áp dụng cụ thể...' : 'Additional context: region, timeframe, specific scope...'}
              disabled={loading}
              className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="w-full min-h-[44px] py-3 shimmer-btn text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{isVi ? 'Trợ lý AI đang bóc tách phân tích kiến nghị...' : 'Analyzing Motion...'}</span>
              </>
            ) : (
              <>
                <BarChart2 size={16} />
                <span>{isVi ? 'Bắt Đầu Phân Tích Kiến Nghị' : 'Analyze Motion'}</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* History */}
      {savedReports.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            <span className="flex items-center gap-2">
              <History size={14} />
              <span>{isVi ? 'Báo cáo phân tích đã lưu gần đây' : 'Recent Reports'}</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-[10px]">
                {savedReports.length}
              </span>
            </span>
            <ChevronDown size={14} className={`transform transition ${showHistory ? 'rotate-180' : ''}`} />
          </button>

          {showHistory && (
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {savedReports.map((r) => (
                <div key={r.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div
                    onClick={() => onRestoreReport(r)}
                    className="flex-1 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400 transition truncate"
                  >
                    <div className="font-bold truncate">{r.result.motion_title || r.topic}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {r.createdAt}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => onDeleteReport(r.id, e)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AssistantPanel;
