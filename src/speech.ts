import { generateSpeech as speechSdkGenerateSpeech } from '@speech-sdk/core';
import {
  createCartesia,
  createDeepgram,
  createElevenLabs,
  createFishAudio,
  createGoogle,
  createMurf,
  createOpenAI,
  createResemble,
} from '@speech-sdk/core/providers';
import { VoiceGenerationRequest, VoiceGenerationResponse, VoiceSdkConfig } from './types';
import { normalizeProviderId, requiredEnv } from './utils';

const supportedProviders = new Set([
  'openai',
  'elevenlabs',
  'google',
  'cartesia',
  'murf',
  'resemble',
  'deepgram',
  'fish',
  'fishaudio',
]);

export function supportsSpeechGeneration(provider?: string, format?: string) {
  if (!supportedProviders.has(normalizeProviderId(provider))) {
    return false;
  }

  return !format || ['mp3', 'wav', 'pcm'].includes(format);
}

export async function generateVoiceSpeech(
  request: VoiceGenerationRequest,
  config: VoiceSdkConfig = {},
): Promise<VoiceGenerationResponse> {
  const env = config.env ?? process.env;
  const fetchFn = config.fetchFn ?? fetch;
  const provider = normalizeProviderId(request.provider);
  const output = resolveOutput(request.format);
  const result = await speechSdkGenerateSpeech({
    model: resolveModel(provider, request, env, fetchFn),
    text: request.input,
    voice: request.voice ?? defaultVoiceForProvider(provider),
    output,
    providerOptions: {
      ...request.options,
      instructions: request.stylePrompt,
    },
  });

  return {
    mimeType: result.audio.mediaType,
    audioBase64: result.audio.base64,
    script: request.input,
  };
}

function resolveModel(
  provider: string,
  request: VoiceGenerationRequest,
  env: NodeJS.ProcessEnv,
  fetchFn: typeof fetch,
) {
  switch (provider) {
    case 'openai':
      return createOpenAI({ apiKey: requiredEnv(env, 'OpenAI', ['OPENAI_API_KEY']), fetch: fetchFn })(request.model);
    case 'elevenlabs':
      return createElevenLabs({ apiKey: requiredEnv(env, 'ElevenLabs', ['ELEVENLABS_API_KEY']), fetch: fetchFn })(
        request.model,
      );
    case 'google':
      return createGoogle({
        apiKey: requiredEnv(env, 'Google AI', ['GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY']),
        fetch: fetchFn,
      })(request.model);
    case 'cartesia':
      return createCartesia({ apiKey: requiredEnv(env, 'Cartesia', ['CARTESIA_API_KEY']), fetch: fetchFn })(
        request.model,
      );
    case 'murf':
      return createMurf({ apiKey: requiredEnv(env, 'Murf', ['MURF_API_KEY']), fetch: fetchFn })(request.model);
    case 'resemble':
      return createResemble({ apiKey: requiredEnv(env, 'Resemble AI', ['RESEMBLE_API_KEY']), fetch: fetchFn })(
        request.model,
      );
    case 'deepgram':
      return createDeepgram({ apiKey: requiredEnv(env, 'Deepgram', ['DEEPGRAM_API_KEY']), fetch: fetchFn })(
        request.model,
      );
    case 'fish':
    case 'fishaudio':
      return createFishAudio({ apiKey: requiredEnv(env, 'Fish Audio', ['FISH_API_KEY']), fetch: fetchFn })(
        request.model,
      );
    default:
      throw new Error(`Unsupported SpeechSDK provider: ${request.provider}`);
  }
}

function resolveOutput(format: VoiceGenerationRequest['format']) {
  if (format === 'mp3' || format === 'wav' || format === 'pcm') {
    return { format };
  }

  return undefined;
}

function defaultVoiceForProvider(provider: string) {
  switch (provider) {
    case 'openai':
      return 'coral';
    case 'elevenlabs':
      return 'JBFqnCBsd6RMkjVDRZzb';
    case 'google':
      return 'Kore';
    case 'murf':
      return 'en-US-natalie';
    default:
      return 'default';
  }
}
