import { VoiceListResult, VoiceOption, VoiceSearchQuery, VoiceSdkConfig } from './types';
import { assertOk, filterVoices, normalizeProviderId, requiredEnv } from './utils';

const openAiVoices: VoiceOption[] = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'nova',
  'onyx',
  'sage',
  'shimmer',
].map((name) => ({
  id: name,
  name,
  provider: 'openai',
  language: 'multi',
  tags: ['built-in'],
}));

const deepgramVoices: VoiceOption[] = [
  'aura-2-amalthea-en',
  'aura-2-andromeda-en',
  'aura-2-apollo-en',
  'aura-2-arcas-en',
  'aura-2-aries-en',
  'aura-2-asteria-en',
  'aura-2-athena-en',
  'aura-2-atlas-en',
  'aura-2-aurora-en',
  'aura-2-callista-en',
  'aura-2-cora-en',
  'aura-2-cordelia-en',
  'aura-2-delia-en',
  'aura-2-draco-en',
  'aura-2-electra-en',
  'aura-2-harmonia-en',
  'aura-2-helena-en',
  'aura-2-hera-en',
  'aura-2-hermes-en',
  'aura-2-hyperion-en',
  'aura-2-iris-en',
  'aura-2-janus-en',
  'aura-2-juno-en',
  'aura-2-jupiter-en',
  'aura-2-luna-en',
  'aura-2-mars-en',
  'aura-2-minerva-en',
  'aura-2-neptune-en',
  'aura-2-odysseus-en',
  'aura-2-ophelia-en',
  'aura-2-orion-en',
  'aura-2-orpheus-en',
  'aura-2-pandora-en',
  'aura-2-phoebe-en',
  'aura-2-pluto-en',
  'aura-2-saturn-en',
  'aura-2-selene-en',
  'aura-2-thalia-en',
  'aura-2-theia-en',
  'aura-2-vesta-en',
].map((model) => ({
  id: model,
  name: model.replace(/^aura-2-/, '').replace(/-en$/, ''),
  provider: 'deepgram',
  language: 'en',
  model,
  tags: ['aura-2'],
}));

export async function listVoices(
  query: VoiceSearchQuery,
  config: VoiceSdkConfig = {},
): Promise<VoiceListResult> {
  const env = config.env ?? process.env;
  const fetchFn = config.fetchFn ?? fetch;
  const provider = normalizeProviderId(query.provider);

  switch (provider) {
    case 'openai':
      return { voices: filterVoices(openAiVoices, query) };
    case 'deepgram':
      return { voices: filterVoices(deepgramVoices, query) };
    case 'elevenlabs':
      return listElevenLabsVoices(query, env, fetchFn);
    case 'cartesia':
      return listCartesiaVoices(query, env, fetchFn);
    case 'murf':
      return listMurfVoices(query, env, fetchFn);
    case 'fish':
    case 'fishaudio':
      return listFishVoices(query, env, fetchFn);
    case 'resemble':
      return listResembleVoices(query, env, fetchFn);
    default:
      throw new Error(`Voice list is not implemented for provider: ${query.provider}`);
  }
}

async function listElevenLabsVoices(query: VoiceSearchQuery, env: NodeJS.ProcessEnv, fetchFn: typeof fetch) {
  const apiKey = requiredEnv(env, 'ElevenLabs', ['ELEVENLABS_API_KEY']);
  const response = await fetchFn('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': apiKey },
  });
  await assertOk(response, 'https://api.elevenlabs.io/v1/voices');
  const json = (await response.json()) as {
    voices?: Array<{
      voice_id: string;
      name: string;
      category?: string;
      labels?: Record<string, string>;
      preview_url?: string;
    }>;
  };
  const voices =
    json.voices?.map((voice) => ({
      id: voice.voice_id,
      name: voice.name,
      provider: 'elevenlabs',
      language: voice.labels?.language,
      gender: voice.labels?.gender,
      accent: voice.labels?.accent,
      tags: [voice.category, ...Object.values(voice.labels ?? {})].filter((tag): tag is string => Boolean(tag)),
      previewUrl: voice.preview_url,
      isCustom: voice.category === 'cloned',
      raw: voice,
    })) ?? [];

  return { voices: filterVoices(voices, query) };
}

async function listCartesiaVoices(query: VoiceSearchQuery, env: NodeJS.ProcessEnv, fetchFn: typeof fetch) {
  const apiKey = requiredEnv(env, 'Cartesia', ['CARTESIA_API_KEY']);
  const url = new URL('https://api.cartesia.ai/voices');
  if (query.limit) {
    url.searchParams.set('limit', String(query.limit));
  }
  if (query.cursor) {
    url.searchParams.set('starting_after', query.cursor);
  }
  const response = await fetchFn(url, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Cartesia-Version': '2026-03-01' },
  });
  await assertOk(response, url.toString());
  const json = (await response.json()) as {
    data?: Array<{
      id: string;
      name: string;
      language?: string;
      preview_url?: string;
      is_owner?: boolean;
      tags?: string[];
    }>;
    has_more?: boolean;
  };
  const voices =
    json.data?.map((voice) => ({
      id: voice.id,
      name: voice.name,
      provider: 'cartesia',
      language: voice.language,
      tags: voice.tags,
      previewUrl: voice.preview_url,
      isCustom: voice.is_owner,
      raw: voice,
    })) ?? [];

  return { voices: filterVoices(voices, query), cursor: json.has_more ? voices.at(-1)?.id : undefined };
}

async function listMurfVoices(query: VoiceSearchQuery, env: NodeJS.ProcessEnv, fetchFn: typeof fetch) {
  const apiKey = requiredEnv(env, 'Murf', ['MURF_API_KEY']);
  const response = await fetchFn('https://api.murf.ai/v1/speech/voices/FALCON', {
    headers: { 'api-key': apiKey },
  });
  await assertOk(response, 'https://api.murf.ai/v1/speech/voices/FALCON');
  const json = (await response.json()) as Array<{
    voiceId: string;
    displayName?: string;
    name?: string;
    locale?: string;
    gender?: string;
    styles?: string[];
  }>;
  const voices = json.map((voice) => ({
    id: voice.voiceId,
    name: voice.displayName ?? voice.name ?? voice.voiceId,
    provider: 'murf',
    language: voice.locale,
    gender: voice.gender,
    tags: voice.styles,
    raw: voice,
  }));

  return { voices: filterVoices(voices, query) };
}

async function listFishVoices(query: VoiceSearchQuery, env: NodeJS.ProcessEnv, fetchFn: typeof fetch) {
  const apiKey = requiredEnv(env, 'Fish Audio', ['FISH_API_KEY']);
  const url = new URL('https://api.fish.audio/model');
  if (query.search) {
    url.searchParams.set('title', query.search);
  }
  if (query.limit) {
    url.searchParams.set('page_size', String(query.limit));
  }
  const response = await fetchFn(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  await assertOk(response, url.toString());
  const json = (await response.json()) as {
    items?: Array<{ id: string; title?: string; description?: string; language?: string; tags?: string[] }>;
  };
  const voices =
    json.items?.map((voice) => ({
      id: voice.id,
      name: voice.title ?? voice.id,
      provider: 'fish',
      language: voice.language,
      tags: voice.tags,
      isCustom: false,
      raw: voice,
    })) ?? [];

  return { voices: filterVoices(voices, query) };
}

async function listResembleVoices(query: VoiceSearchQuery, env: NodeJS.ProcessEnv, fetchFn: typeof fetch) {
  const apiKey = requiredEnv(env, 'Resemble AI', ['RESEMBLE_API_KEY']);
  const response = await fetchFn('https://app.resemble.ai/api/v2/voices', {
    headers: { Authorization: `Token token=${apiKey}` },
  });
  await assertOk(response, 'https://app.resemble.ai/api/v2/voices');
  const json = (await response.json()) as {
    items?: Array<{ uuid: string; name: string; language?: string }>;
    voices?: Array<{ uuid: string; name: string; language?: string }>;
  };
  const source = json.items ?? json.voices ?? [];
  const voices = source.map((voice) => ({
    id: voice.uuid,
    name: voice.name,
    provider: 'resemble',
    language: voice.language,
    isCustom: true,
    raw: voice,
  }));

  return { voices: filterVoices(voices, query) };
}
