import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateVoiceSpeech, listVoices, VoiceGenerationRequest } from '../src/index';

type ProviderCheck = {
  id: string;
  envKeys: string[];
  voice?: string;
  model?: string;
  canList: boolean;
  canGenerate: boolean;
};

const checks: ProviderCheck[] = [
  {
    id: 'openai',
    envKeys: ['OPENAI_API_KEY'],
    voice: 'coral',
    canList: true,
    canGenerate: true,
  },
  {
    id: 'elevenlabs',
    envKeys: ['ELEVENLABS_API_KEY'],
    canList: true,
    canGenerate: true,
  },
  {
    id: 'cartesia',
    envKeys: ['CARTESIA_API_KEY'],
    canList: true,
    canGenerate: true,
  },
  {
    id: 'murf',
    envKeys: ['MURF_API_KEY'],
    voice: 'en-US-natalie',
    canList: true,
    canGenerate: true,
  },
  {
    id: 'fish',
    envKeys: ['FISH_API_KEY'],
    canList: true,
    canGenerate: true,
  },
  {
    id: 'resemble',
    envKeys: ['RESEMBLE_API_KEY'],
    canList: true,
    canGenerate: true,
  },
  {
    id: 'google',
    envKeys: ['GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'],
    voice: 'Kore',
    canList: false,
    canGenerate: true,
  },
];

loadDotEnvLocal();

const results: Array<{
  provider: string;
  list?: string;
  generate?: string;
  skipped?: string;
  error?: string;
}> = [];

for (const check of checks) {
  const missing = check.envKeys.every((key) => !process.env[key]);

  if (missing) {
    results.push({
      provider: check.id,
      skipped: `missing ${check.envKeys.join(' or ')}`,
    });
    continue;
  }

  const result: (typeof results)[number] = { provider: check.id };

  try {
    if (check.canList) {
      const voices = await listVoices({ provider: check.id, limit: 3 });
      result.list = `${voices.voices.length} voices`;

      if (!check.voice && voices.voices[0]?.id) {
        check.voice = voices.voices[0].id;
      }
    }

    if (check.canGenerate) {
      const request: VoiceGenerationRequest = {
        provider: check.id,
        input: 'Voice Play test.',
        voice: check.voice,
        model: check.model,
        format: 'mp3',
      };
      const audio = await generateVoiceSpeech(request);
      result.generate =
        audio.audioBase64.length > 100 && audio.mimeType.startsWith('audio/')
          ? `${audio.mimeType}, ${audio.audioBase64.length} base64 chars`
          : `unexpected audio payload: ${audio.mimeType}, ${audio.audioBase64.length} chars`;
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  results.push(result);
}

writeFileSync(resolve('provider-verification.json'), `${JSON.stringify(results, null, 2)}\n`);

for (const result of results) {
  if (result.skipped) {
    console.log(`SKIP ${result.provider}: ${result.skipped}`);
  } else if (result.error) {
    console.log(`FAIL ${result.provider}: ${result.error}`);
  } else {
    console.log(`OK ${result.provider}: list=${result.list ?? 'not checked'} generate=${result.generate ?? 'not checked'}`);
  }
}

const failures = results.filter((result) => result.error);
if (failures.length > 0) {
  process.exitCode = 1;
}

function loadDotEnvLocal() {
  const path = resolve('.env.local');

  let text = '';
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return;
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
