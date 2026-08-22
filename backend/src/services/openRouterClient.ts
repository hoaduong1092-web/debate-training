/**
 * OpenRouter Client wrapper — re-exports from generic openAICompatibleClient.
 */

export {
  OpenAIChatRequest as OpenRouterChatRequest,
  OpenAIChatResult as OpenRouterChatResult,
  getOpenAIModel as getOpenRouterModel,
  getOpenAIBaseUrl as getOpenRouterBaseUrl,
  createOpenAIChatCompletion as createOpenRouterChatCompletion,
} from './openAICompatibleClient';
