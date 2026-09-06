import { env } from 'cloudflare:workers';

export function getCareBucket() {
  if (!env.BUCKET) throw new Error('Armazenamento de documentos indisponível.');
  return env.BUCKET;
}

export function getD1() {
  if (!env.DB) {
    throw new Error(
      'Cloudflare D1 binding `DB` is unavailable. Configure the `d1` binding before using authentication.',
    );
  }

  return env.DB;
}
