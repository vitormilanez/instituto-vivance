import type { AdsUploader } from './conversion-pipeline.ts';

const dataManagerEventsEndpoint = 'https://datamanager.googleapis.com/v1/events:ingest';

export type AccessTokenProvider = () => Promise<string>;

/**
 * Thin Data Manager transport. Authentication stays behind an injected token
 * provider so this module never reads, stores or logs credentials.
 */
export function createDataManagerUploader(dependencies: {
  accessToken: AccessTokenProvider;
  fetch?: typeof fetch;
}): AdsUploader {
  const request = dependencies.fetch ?? fetch;
  return async body => {
    const token = await dependencies.accessToken();
    if (!token) throw new Error('Data Manager access token unavailable');
    const response = await request(dataManagerEventsEndpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    });
    if (!response.ok) {
      // Do not include the provider response body: it can contain request data.
      throw new Error(`Data Manager submission failed with status ${response.status}`);
    }
    const result: unknown = await response.json();
    if (!result || typeof result !== 'object' || Array.isArray(result) ||
        typeof (result as Record<string, unknown>).requestId !== 'string') {
      throw new Error('Data Manager response did not include a request ID');
    }
    return (result as { requestId: string }).requestId;
  };
}
