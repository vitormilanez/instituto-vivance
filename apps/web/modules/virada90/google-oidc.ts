import { getVercelOidcToken } from '@vercel/oidc';
import { ExternalAccountClient } from 'google-auth-library';
import type { AccessTokenProvider } from './google-data-manager.ts';

/** Keyless Vercel → Google service-account impersonation for server routes. */
export function createGoogleOidcTokenProvider(config: {
  projectNumber: string;
  poolId: string;
  providerId: string;
  serviceAccountEmail: string;
}): AccessTokenProvider {
  if (!/^\d+$/.test(config.projectNumber) ||
      !/^[a-z][a-z0-9_-]{3,31}$/.test(config.poolId) ||
      !/^[a-z][a-z0-9_-]{3,31}$/.test(config.providerId) ||
      !/^[a-z0-9-]+@[a-z0-9-]+\.iam\.gserviceaccount\.com$/.test(config.serviceAccountEmail)) {
    throw new Error('Invalid attribution identity configuration');
  }
  const provider = `projects/${config.projectNumber}/locations/global/workloadIdentityPools/${config.poolId}/providers/${config.providerId}`;
  const audience = `https://iam.googleapis.com/${provider}`;
  const client = ExternalAccountClient.fromJSON({
    type: 'external_account',
    audience: `//iam.googleapis.com/${provider}`,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${config.serviceAccountEmail}:generateAccessToken`,
    subject_token_supplier: {
      getSubjectToken: () => getVercelOidcToken({ audience })
    },
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/datamanager'
    ]
  });
  if (!client) throw new Error('Attribution identity unavailable');
  return async () => {
    const result = await client.getAccessToken();
    if (!result.token) throw new Error('Attribution access token unavailable');
    return result.token;
  };
}
