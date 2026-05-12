# Voice Play SDK

Unified voice helpers for character voice applications.

This package wraps SpeechSDK generation and adds the missing voice catalog layer that Voice Play needs:

- Generate TTS through provider-specific API keys.
- Normalize generated audio into base64 + MIME type.
- List and normalize provider voices into one `VoiceOption` shape.
- Support static voice catalogs for providers that do not expose a broad voice-list API.

## Install

```bash
npm install @youndukn/voice-play-sdk
```

## Generate Speech

```ts
import { generateVoiceSpeech } from '@youndukn/voice-play-sdk';

const audio = await generateVoiceSpeech({
  provider: 'openai',
  input: 'Snow has a new voiced reply.',
  voice: 'coral',
  format: 'mp3',
});

console.log(audio.mimeType);
console.log(audio.audioBase64);
```

## List Voices

```ts
import { listVoices } from '@youndukn/voice-play-sdk';

const result = await listVoices({
  provider: 'elevenlabs',
  search: 'narrator',
});

console.log(result.voices);
```

## Environment Variables

Generation and catalog calls use provider API keys from `process.env` by default.

Common keys:

```bash
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
CARTESIA_API_KEY=
MURF_API_KEY=
DEEPGRAM_API_KEY=
FISH_API_KEY=
RESEMBLE_API_KEY=
GOOGLE_API_KEY=
```

You can also pass a custom `env` and `fetchFn` for tests or server environments:

```ts
await listVoices(
  { provider: 'elevenlabs' },
  {
    env: { ELEVENLABS_API_KEY: 'test-key' } as NodeJS.ProcessEnv,
    fetchFn: fetch,
  },
);
```

## Supported Voice Catalogs

- OpenAI: static built-in voices
- Deepgram: static Aura model catalog
- ElevenLabs: API voice list
- Cartesia: API voice list
- Murf: API voice list
- Fish Audio: API model list
- Resemble AI: API voice list

## Provider Verification

Create `.env.local` with whichever keys you have, then run:

```bash
npm run verify:providers
```

The verifier skips missing providers and writes `provider-verification.json`.

Currently excluded from the verifier: Deepgram, PlayHT, Azure, AWS Polly, and IBM Watson.

## License

Apache-2.0.
