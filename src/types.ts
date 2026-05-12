export type VoiceGenerationRequest = {
  input: string;
  provider?: string;
  model?: string;
  voice?: string;
  format?: 'mp3' | 'wav' | 'pcm' | 'opus' | 'ogg' | 'flac' | 'aac';
  language?: string;
  stylePrompt?: string;
  options?: Record<string, unknown>;
};

export type VoiceGenerationResponse = {
  mimeType: string;
  audioBase64: string;
  script: string;
};

export type VoiceProviderId =
  | 'openai'
  | 'elevenlabs'
  | 'google'
  | 'cartesia'
  | 'playht'
  | 'murf'
  | 'resemble'
  | 'speechify'
  | 'deepgram'
  | 'fish'
  | 'azure';

export type VoiceSdkConfig = {
  env?: NodeJS.ProcessEnv;
  fetchFn?: typeof fetch;
};

export type VoiceOption = {
  id: string;
  name: string;
  provider: VoiceProviderId | string;
  language?: string;
  accent?: string;
  gender?: string;
  tags?: string[];
  previewUrl?: string;
  isCustom?: boolean;
  model?: string;
  raw?: unknown;
};

export type VoiceSearchQuery = {
  provider: VoiceProviderId | string;
  search?: string;
  language?: string;
  limit?: number;
  cursor?: string;
};

export type VoiceListResult = {
  voices: VoiceOption[];
  cursor?: string;
};
