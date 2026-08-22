import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { DebateArena } from './DebateArena';
import { HistoryTab } from './HistoryTab';
import { AssistantPanel } from './AssistantPanel';
import PlazaTab from './PlazaTab';
import ProfileTab from './ProfileTab';
import { ThinkingProfileTab } from './ThinkingProfileTab';
import { PricingModal } from './PricingModal';
import { GentleEvictionModal } from './GentleEvictionModal';
import { DebateStance, FinalDebateDraft, ArenaHandoffPayload } from '../lib/api';
import { translations, Language } from '../lib/i18n';
import { stopSpeaking } from '../utils/tts';

export type DashboardTab = 'arena' | 'assistant' | 'plaza' | 'history' | 'thinking' | 'profile';

export const Dashboard: React.FC = () => {
  const { user, logout, isEvicted, dismissEviction } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<DashboardTab>('arena');
  const [showPricing, setShowPricing] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app_lang');
    return saved === 'en' ? 'en' : 'vi';
  });
  const t = translations[language];

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  // Stop any active TTS / audio playback when switching tabs
  useEffect(() => {
    stopSpeaking();
  }, [activeTab]);

  // Stop audio when unmounting dashboard
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  // Assistant & Arena handoff state
  const [assistantTopic, setAssistantTopic] = useState<string>('Trí tuệ nhân tạo sẽ thay thế giáo viên trong tương lai');
  const [assistantStance, setAssistantStance] = useState<DebateStance>('AFFIRMATIVE');
  const [arenaPrefilledTopic, setArenaPrefilledTopic] = useState<string>('');
  const [arenaPrefilledStance, setArenaPrefilledStance] = useState<DebateStance | undefined>(undefined);
  const [arenaPrefilledDraft, setArenaPrefilledDraft] = useState<string>('');
  const [arenaFinalDraft, setArenaFinalDraft] = useState<FinalDebateDraft | null>(null);

  const handlePrefillArena = (
    payloadOrTopic: ArenaHandoffPayload | string,
    stance?: DebateStance,
    draftText?: string
  ) => {
    if (typeof payloadOrTopic === 'object' && payloadOrTopic !== null) {
      setArenaPrefilledTopic(payloadOrTopic.topic);
      setArenaPrefilledStance(payloadOrTopic.stance);
      setArenaFinalDraft(payloadOrTopic.finalDraft || null);
      setArenaPrefilledDraft(payloadOrTopic.legacyDraftText || '');
    } else {
      setArenaPrefilledTopic(payloadOrTopic as string);
      if (stance) setArenaPrefilledStance(stance);
      setArenaPrefilledDraft(draftText || '');
      setArenaFinalDraft(null);
    }
    setActiveTab('arena');
  };

  const handleOpenAssistant = (currentTopic?: string, currentStance?: DebateStance) => {
    if (currentTopic) setAssistantTopic(currentTopic);
    if (currentStance) setAssistantStance(currentStance);
    setActiveTab('assistant');
  };

  return (
    <div className="cyber-grid-bg min-h-screen bg-slate-100 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200 transition-colors duration-200">
      {/* ── TOP NAVBAR: UNIFIED HEADER & CONTROLS ── */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-950/75 backdrop-blur-2xl border-b border-slate-200 dark:border-white/10 px-4 lg:px-8 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Mark & Main Navigation Tabs */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('arena')}>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30 border border-indigo-400/30 shrink-0">
                <svg width="16" height="16" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m13 2-2 10h9L7 22l2-10H1z"/>
                </svg>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-sm tracking-wider uppercase bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 dark:from-white dark:via-slate-200 dark:to-indigo-200 bg-clip-text text-transparent">
                  THINKING OS
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 shadow-sm">
                  v16.0
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('arena')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'arena'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>⚔️ {t.navArena}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('assistant')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'assistant'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🤖 {t.navAssistant}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('plaza')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'plaza'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🏛️ {t.navPlaza}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>📜 {t.navHistory}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('thinking')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'thinking'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🧠 {language === 'vi' ? 'Hồ Sơ Tư Duy' : 'Thinking Profile'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>👤 {language === 'vi' ? 'Gói Cước' : 'Pricing & Plans'}</span>
              </button>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* User Profile Pill */}
            {user && (user.displayName || user.phoneNumber) && (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{user.displayName || user.phoneNumber}</span>
              </div>
            )}

            {/* Quota Balance Pill */}
            <button
              type="button"
              onClick={() => setShowPricing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/15 hover:shadow-lg hover:shadow-amber-500/10 transition-all shrink-0 active:scale-95 cursor-pointer"
            >
              <svg width="14" height="14" className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3h12l4 6-10 12L2 9z"/>
              </svg>
              <span className="font-mono font-semibold">
                {user?.quota?.textTurnsRemaining ?? 20} Text | {user?.quota?.voiceMinsRemaining ?? 15}m Voice
              </span>
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Chuyển chế độ sáng tối"
              title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-500/40 transition-all shrink-0 active:scale-95 cursor-pointer"
            >
              {theme === 'dark' ? (
                // Sun Icon (Chuyển Sáng)
                <svg width="15" height="15" className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                // Moon Icon (Chuyển Tối)
                <svg width="15" height="15" className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-200 dark:border-slate-800 hover:border-rose-500/30 transition-all shrink-0 active:scale-95 cursor-pointer"
              title="Đăng xuất tài khoản"
              aria-label="Đăng xuất"
            >
              <svg width="15" height="15" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE NAV BAR ── */}
      <div className="md:hidden flex items-center justify-around bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-2 text-xs font-semibold overflow-x-auto gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('arena')}
          className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'arena' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
        >
          ⚔️ {t.navArena}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('assistant')}
          className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'assistant' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
        >
          🤖 {t.navAssistant}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('plaza')}
          className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'plaza' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
        >
          🏛️ {t.navPlaza}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
        >
          📜 {t.navHistory}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('thinking')}
          className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'thinking' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
        >
          🧠 {language === 'vi' ? 'Hồ Sơ Tư Duy' : 'Thinking Profile'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
        >
          👤 {language === 'vi' ? 'Gói Cước' : 'Pricing & Plans'}
        </button>
      </div>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 flex flex-col">
        <div className={activeTab === 'arena' ? 'block' : 'hidden'}>
          <DebateArena
            onNavigateToHistory={() => setActiveTab('history')}
            onOpenAssistant={handleOpenAssistant}
            prefilledTopic={arenaPrefilledTopic}
            prefilledStance={arenaPrefilledStance}
            prefilledDraft={arenaPrefilledDraft}
            finalDraft={arenaFinalDraft}
            onClearPrefill={() => {
              setArenaPrefilledTopic('');
              setArenaPrefilledStance(undefined);
              setArenaPrefilledDraft('');
              setArenaFinalDraft(null);
            }}
            language={language}
            t={t}
          />
        </div>
        <div className={activeTab === 'assistant' ? 'block' : 'hidden'}>
          <AssistantPanel
            onPrefillArena={handlePrefillArena}
            initialTopic={assistantTopic}
            initialStance={assistantStance}
            language={language}
          />
        </div>
        <div className={activeTab === 'plaza' ? 'block' : 'hidden'}>
          <PlazaTab t={t} language={language} hidden={activeTab !== 'plaza'} />
        </div>
        <div className={activeTab === 'history' ? 'block' : 'hidden'}>
          <HistoryTab onStartNewDebate={() => setActiveTab('arena')} language={language} t={t} />
        </div>
        <div className={activeTab === 'thinking' ? 'block' : 'hidden'}>
          <ThinkingProfileTab language={language} t={t} />
        </div>
        <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
          <ProfileTab
            t={t}
            language={language}
            onLanguageChange={handleLanguageChange}
            onTabChange={(tab) => setActiveTab(tab as DashboardTab)}
            hidden={activeTab !== 'profile'}
          />
        </div>
      </main>

      {/* ── MODALS ── */}
      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} language={language} t={t} />
      <GentleEvictionModal isOpen={isEvicted} onConfirm={dismissEviction} />
    </div>
  );
};

export default Dashboard;
