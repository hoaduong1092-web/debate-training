/**
 * TC-DSP: Voice Coach DSP-First Engine Test Suite (v15.0.0)
 *
 * Covers:
 *   TC-DSP-01: computeFromText — WPM & Vietnamese Filler Word Pattern Detection
 *   TC-DSP-02: computeFromTimestamps — Word Timestamps & Pause Detection (>1.2s)
 *   TC-DSP-03: Pace Evaluation Bands (TOO_SLOW < 110, OPTIMAL 110-175, TOO_FAST > 175)
 *   TC-DSP-04: Voice Coach Prompt Injection with Pre-computed Metrics
 *   TC-DSP-05: Edge Cases (Empty text, zero duration, single word)
 *
 * Zero Live AI calls. Deterministic offline DSP logic.
 */

import { VoiceDspService, WordTimestamp, VoiceDspMetrics } from '../services/voiceDspService';
import { buildVoiceCoachPrompt } from '../prompts/voiceCoach';

let pass = 0;
let fail = 0;
const failures: string[] = [];

function assert(name: string, cond: boolean, detail?: unknown): void {
  if (cond) {
    pass += 1;
    console.log('  ✅ PASS', name);
  } else {
    fail += 1;
    failures.push(name);
    console.log('  ❌ FAIL', name, detail !== undefined ? detail : '');
  }
}

function section(name: string): void {
  console.log(`\n▶ ${name}`);
}

export async function runVoiceDspTests(): Promise<boolean> {
  console.log('============================================================');
  console.log('  VOICE COACH DSP ENGINE TEST SUITE (v15.0.0)');
  console.log('============================================================\n');

  // ── TC-DSP-01: computeFromText ─────────────────────────────────────────────
  section('TC-DSP-01: computeFromText — WPM & Vietnamese Filler Word Detection');
  {
    const speech = 'Ờ tôi nghĩ kiểu như việc đồng phục học sinh thì là rất cần thiết';
    const durationMs = 6000; // 6 seconds = 0.1 min -> 15 words / 0.1 min = 150 WPM

    const metrics = VoiceDspService.computeFromText(speech, durationMs);
    assert('Word count calculated correctly (15 words)', metrics.wordCount === 15, metrics.wordCount);
    assert('WPM is 150', metrics.wpm === 150, metrics.wpm);
    assert('Filler words detected', metrics.fillerWordsCount >= 3, metrics.fillerWordsList);
    assert('Pace evaluation is OPTIMAL', metrics.paceEvaluation === 'OPTIMAL', metrics.paceEvaluation);
  }

  // ── TC-DSP-02: computeFromTimestamps ───────────────────────────────────────
  section('TC-DSP-02: computeFromTimestamps — Word Timestamps & Pause Detection (>1.2s)');
  {
    const timestamps: WordTimestamp[] = [
      { word: 'Kính', start: 0.0, end: 0.3 },
      { word: 'thưa', start: 0.35, end: 0.6 },
      { word: 'giám', start: 0.65, end: 0.9 },
      { word: 'khảo', start: 0.95, end: 1.2 },
      // Pause 1: from 1.2s to 2.8s (gap = 1.6s >= 1.2s)
      { word: 'tôi', start: 2.8, end: 3.1 },
      { word: 'xin', start: 3.15, end: 3.4 },
      { word: 'phản', start: 3.45, end: 3.7 },
      { word: 'biện', start: 3.75, end: 4.0 },
      // Pause 2: from 4.0s to 5.5s (gap = 1.5s >= 1.2s)
      { word: 'luận', start: 5.5, end: 5.8 },
      { word: 'điểm', start: 5.85, end: 6.1 },
    ];

    const metrics = VoiceDspService.computeFromTimestamps(timestamps, 6500);
    assert('Word count matches timestamp array length', metrics.wordCount === 10, metrics.wordCount);
    assert('Detected exactly 2 long pauses (>1.2s)', metrics.pauseCount === 2, metrics.pauseCount);
    assert('Long silence accumulated (>3000ms)', metrics.longSilenceDurationMs >= 3000, metrics.longSilenceDurationMs);
  }

  // ── TC-DSP-03: Pace Evaluation Bands ───────────────────────────────────────
  section('TC-DSP-03: Pace Evaluation Bands');
  {
    // TOO_SLOW: 10 words in 10s = 60 WPM (< 110)
    const slowMetrics = VoiceDspService.computeFromText('Một hai ba bốn năm sáu bảy tám chín mười', 10000);
    assert('WPM 60 -> TOO_SLOW', slowMetrics.paceEvaluation === 'TOO_SLOW', slowMetrics);

    // OPTIMAL: 25 words in 10s = 150 WPM (110 - 175)
    const optSpeech = Array(25).fill('từ').join(' ');
    const optMetrics = VoiceDspService.computeFromText(optSpeech, 10000);
    assert('WPM 150 -> OPTIMAL', optMetrics.paceEvaluation === 'OPTIMAL', optMetrics);

    // TOO_FAST: 35 words in 10s = 210 WPM (> 175)
    const fastSpeech = Array(35).fill('nhanh').join(' ');
    const fastMetrics = VoiceDspService.computeFromText(fastSpeech, 10000);
    assert('WPM 210 -> TOO_FAST', fastMetrics.paceEvaluation === 'TOO_FAST', fastMetrics);
  }

  // ── TC-DSP-04: Voice Coach Prompt Injection ────────────────────────────────
  section('TC-DSP-04: Voice Coach Prompt Injection with Pre-computed Metrics');
  {
    const sampleMetrics: VoiceDspMetrics = {
      durationMs: 30000,
      wordCount: 75,
      wpm: 150,
      fillerWordsCount: 4,
      fillerWordsList: [
        { word: 'ờ', count: 2 },
        { word: 'kiểu như', count: 2 },
      ],
      pauseCount: 1,
      longSilenceDurationMs: 1400,
      paceEvaluation: 'OPTIMAL',
    };

    const prompt = buildVoiceCoachPrompt(sampleMetrics, 'Học sinh không nên sử dụng mạng xã hội quá 2 tiếng mỗi ngày.');
    assert('Prompt contains WPM 150', prompt.includes('150 từ/phút'));
    assert('Prompt contains paceEvaluation OPTIMAL', prompt.includes('OPTIMAL'));
    assert('Prompt contains filler count 4', prompt.includes('4'));
    assert('Prompt contains pause count 1', prompt.includes('1 lần'));
    assert('Prompt contains user speech text', prompt.includes('Học sinh không nên sử dụng mạng xã hội quá 2 tiếng mỗi ngày.'));
  }

  // ── TC-DSP-05: Edge Cases ──────────────────────────────────────────────────
  section('TC-DSP-05: Edge Cases');
  {
    const emptyMetrics = VoiceDspService.computeFromText('', 0);
    assert('Empty text yields 0 WPM', emptyMetrics.wpm === 0 && emptyMetrics.wordCount === 0);

    const emptyTimestampMetrics = VoiceDspService.computeFromTimestamps([], 0);
    assert('Empty timestamps yields 0 pauseCount', emptyTimestampMetrics.pauseCount === 0);
  }

  console.log('\n────────────────────────────────────────────────────────────');
  console.log(`  Total: ${pass + fail} | ✅ PASS: ${pass} | ❌ FAIL: ${fail}`);
  console.log('────────────────────────────────────────────────────────────\n');

  return fail === 0;
}

if (require.main === module) {
  runVoiceDspTests().then((ok) => process.exit(ok ? 0 : 1));
}
