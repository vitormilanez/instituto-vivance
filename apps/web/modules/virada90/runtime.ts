import type { Virada90Runtime, Virada90RuntimeProvider } from './http.ts';

/**
 * Intentionally disabled composition root.
 *
 * Enabling this requires a durable, non-clinical ConversionStore, an approved
 * Google ADC/service-account token provider, and the confirmed Pulse webhook
 * authentication contract. Environment variables alone must not activate a
 * partially configured public endpoint.
 */
const configuredRuntime: Virada90Runtime | null = null;

export function virada90FeatureRequested(
  environment: Record<string, string | undefined> = process.env
) {
  return environment.VIRADA90_ATTRIBUTION_ENABLED === 'true';
}

export const virada90Runtime: Virada90RuntimeProvider = () =>
  virada90FeatureRequested() ? configuredRuntime : null;
