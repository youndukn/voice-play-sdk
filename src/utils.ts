export function normalizeProviderId(provider?: string) {
  return provider?.trim().toLowerCase().replace(/[\s_-]+/g, '') ?? '';
}

export function requiredEnv(env: NodeJS.ProcessEnv, provider: string, envKeys: string[]) {
  const value = envKeys.map((key) => env[key]).find((candidate) => candidate && candidate.trim().length > 0);

  if (!value) {
    throw new Error(`${provider} is not configured. Set ${envKeys.join(' or ')}.`);
  }

  return value;
}

export async function assertOk(response: Response, url: string) {
  if (response.ok) {
    return;
  }

  const errorText = await response.text().catch(() => '');
  throw new Error(`Voice catalog request failed for ${url}: ${response.status} ${errorText}`);
}

export function filterVoices<T extends { name: string; language?: string }>(
  voices: T[],
  query: { search?: string; language?: string; limit?: number },
) {
  const search = query.search?.trim().toLowerCase();
  const language = query.language?.trim().toLowerCase();

  return voices
    .filter((voice) => {
      if (search && !voice.name.toLowerCase().includes(search)) {
        return false;
      }

      if (language && !voice.language?.toLowerCase().startsWith(language)) {
        return false;
      }

      return true;
    })
    .slice(0, query.limit ?? 100);
}
