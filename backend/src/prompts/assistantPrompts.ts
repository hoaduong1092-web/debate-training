/**
 * Assistant Prompts — Re-export module
 *
 * Provides consolidated access to Speech Draft and Motion Analysis prompt builders.
 * Conforms to Step 3.1 specifications.
 */

export {
  buildSpeechDraftPrompt,
  SpeechDraftPromptInput,
  SpeechDraftPromptResult,
} from './speechDraft';

export {
  buildMotionAnalysisPrompt,
  MotionAnalysisPromptInput,
  MotionAnalysisPromptResult,
} from './motionAnalysis';
