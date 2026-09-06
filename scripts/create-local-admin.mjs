// Explicit local provisioning. Never called by login, build, or deployment.
import { webcrypto } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const username = process.env.VIVANS_ADMIN_USERNAME ?? 'admin.vivans';
const password = process.env.VIVANS_ADMIN_PASSWORD ?? 'VivansLocal@2026';
if (!/^[a-z0-9._-]{3,80}$/u.test(username) || password.length < 10 || password.length > 200) throw new Error('Usuário ou senha local inválidos.');
const salt = webcrypto.getRandomValues(new Uint8Array(16));
const key = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
const hash = await webcrypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
const quote = value => `'${value.replaceAll("'", "''")}'`;
const now = new Date().toISOString();
const directory = mkdtempSync(join(tmpdir(), 'vivans-local-admin-'));
const file = join(directory, 'admin.sql');
try {
  writeFileSync(file, `INSERT INTO users (id,username,display_name,role,password_hash,password_salt,password_iterations,status,created_at,updated_at)
    VALUES (${quote(`usr-${username}`)},${quote(username)},'Administrador VIVANCE','admin',${quote(Buffer.from(hash).toString('base64url'))},${quote(Buffer.from(salt).toString('base64url'))},100000,'active',${quote(now)},${quote(now)})
    ON CONFLICT(id) DO UPDATE SET display_name = excluded.display_name, updated_at = excluded.updated_at;`, { mode: 0o600 });
  const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'site-creator-d1', '--local', '--config', 'wrangler.jsonc', '--file', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  else console.log(`Administrador local preparado: ${username}. Uma conta existente e sua senha são preservadas.`);
} finally { rmSync(directory, { recursive: true }); }
