import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { listVoices } from '../src/index';

const providers = ['openai', 'elevenlabs', 'cartesia', 'murf', 'fish', 'resemble', 'deepgram'];

loadDotEnvLocal();

const report: Record<
  string,
  | {
      status: 'ok';
      count: number;
      categories: {
        languages: string[];
        genders: string[];
        accents: string[];
        tags: string[];
        customCount: number;
        previewCount: number;
        extensionKeys: string[];
      };
      voices: Array<{
        id: string;
        name: string;
        language?: string;
        gender?: string;
        accent?: string;
        tags?: string[];
        previewUrl?: string;
        isCustom?: boolean;
        model?: string;
        extensions?: Record<string, unknown>;
      }>;
    }
  | {
      status: 'error';
      error: string;
    }
> = {};

for (const provider of providers) {
  try {
    const result = await listVoices({ provider, limit: 10 });
    const voices = result.voices.map(({ raw: _raw, ...voice }) => voice);

    report[provider] = {
      status: 'ok',
      count: voices.length,
      categories: {
        languages: unique(voices.map((voice) => voice.language)),
        genders: unique(voices.map((voice) => voice.gender)),
        accents: unique(voices.map((voice) => voice.accent)),
        tags: unique(voices.flatMap((voice) => voice.tags ?? [])),
        customCount: voices.filter((voice) => voice.isCustom).length,
        previewCount: voices.filter((voice) => voice.previewUrl).length,
        extensionKeys: unique(voices.flatMap((voice) => Object.keys(voice.extensions ?? {}))),
      },
      voices,
    };
  } catch (error) {
    report[provider] = {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

writeFileSync(resolve('voice-catalog-inspection.json'), `${JSON.stringify(report, null, 2)}\n`);

for (const [provider, result] of Object.entries(report)) {
  if (result.status === 'error') {
    console.log(`FAIL ${provider}: ${result.error}`);
  } else {
    console.log(
      `OK ${provider}: ${result.count} voices, languages=${result.categories.languages.join(',') || '-'}, tags=${
        result.categories.tags.slice(0, 6).join(',') || '-'
      }`,
    );
  }
}

function unique(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
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
