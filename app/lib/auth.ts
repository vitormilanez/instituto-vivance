import { cookies } from 'next/headers';
import { getD1 } from '@/db';

export const SESSION_COOKIE_NAME = 'vivans_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type AppRole = 'professional' | 'patient' | 'admin';

export type AppUser = {
  id: string;
  username: string;
  displayName: string;
  role: AppRole;
  patientId: string | null;
};

type UserCredentialRow = AppUser & {
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  status: 'active' | 'blocked';
};

// Cloudflare Workers currently caps Web Crypto PBKDF2 at 100,000 iterations.
const PASSWORD_ITERATIONS = 100_000;

const DEMO_USERS = [
  {
    id: 'usr-dr-guilherme',
    username: 'dr.guilherme',
    displayName: 'Dr. Guilherme Martins',
    role: 'professional',
    patientId: null,
    passwordHash: 'R64z-61r97-VMNoC2WBS8sfoZnOMgiujXV9mR0dhye8',
    passwordSalt: 'dTKSyLLkDi8aMc6_Xs-Rww',
    passwordIterations: PASSWORD_ITERATIONS,
  },
  {
    id: 'usr-marina',
    username: 'marina',
    displayName: 'Marina Costa',
    role: 'patient',
    patientId: 'pac-demo-001',
    passwordHash: 'F4Uo5u7NoukBzedBOpAPTFZSKlWp4XK4ASfcwTUpD9w',
    passwordSalt: 'q9ipglxgH6K0i68ib-OPgQ',
    passwordIterations: PASSWORD_ITERATIONS,
  },
  {
    id: 'usr-admin.vivans',
    username: 'admin.vivans',
    displayName: 'Administrador VIVANCE',
    role: 'admin',
    patientId: null,
    passwordHash: 'BxC5CTA5OPxkrgqCCmZyGnTaqWvSfRLQXztl3joen7Q',
    passwordSalt: 'qmduQLkJSt33dFNWqYkGUQ',
    passwordIterations: PASSWORD_ITERATIONS,
  },
] as const;

const DUMMY_PASSWORD = {
  hash: 'hKMSCSnpr_HkWpb-BcLilJ5VaBjuH1WepqrRM-iyMto',
  salt: 'tN2XSIXISqNSROWpoOIuTA',
  iterations: PASSWORD_ITERATIONS,
};

function normalizeUsername(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR');
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value: string) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function verifyPassword(
  password: string,
  expectedHash: string,
  salt: string,
  iterations: number,
) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: base64UrlToBytes(salt),
      iterations,
    },
    keyMaterial,
    256,
  );

  const actual = new Uint8Array(derived);
  const expected = base64UrlToBytes(expectedHash);
  if (actual.length !== expected.length) return false;

  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual[index] ^ expected[index];
  }
  return difference === 0;
}

export async function ensureDemoAccounts() {
  const database = getD1();
  const createdAt = '2026-09-04T00:00:00.000Z';

  await database.batch(
    DEMO_USERS.map((user) =>
      database
        .prepare(
          `INSERT INTO users (
            id, username, display_name, role, patient_id,
            password_hash, password_salt, password_iterations,
            status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
          ON CONFLICT DO NOTHING`,
        )
        .bind(
          user.id,
          user.username,
          user.displayName,
          user.role,
          user.patientId,
          user.passwordHash,
          user.passwordSalt,
          user.passwordIterations,
          createdAt,
          createdAt,
        ),
    ),
  );

  await database.batch([
    database
      .prepare(
        `INSERT OR IGNORE INTO care_relationships (
          id, professional_user_id, patient_user_id, patient_profile_id,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'active', ?, ?)`,
      )
      .bind(
        'care-dr-guilherme-marina',
        'usr-dr-guilherme',
        'usr-marina',
        'pac-demo-001',
        createdAt,
        createdAt,
      ),
    database
      .prepare(
        `INSERT OR IGNORE INTO conversations (
          id, relationship_id, created_at, last_message_at
        ) SELECT ?, id, ?, NULL FROM care_relationships WHERE id = ?`,
      )
      .bind('conversation-dr-guilherme-marina', createdAt, 'care-dr-guilherme-marina'),
  ]);
}

export async function authenticate(username: string, password: string) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername || normalizedUsername.length > 80 || !password || password.length > 200) {
    return null;
  }

  await ensureDemoAccounts();
  const database = getD1();
  const user = await database
    .prepare(
      `SELECT
        id,
        username,
        display_name AS displayName,
        role,
        patient_id AS patientId,
        password_hash AS passwordHash,
        password_salt AS passwordSalt,
        password_iterations AS passwordIterations,
        status
      FROM users
      WHERE username = ?
      LIMIT 1`,
    )
    .bind(normalizedUsername)
    .first<UserCredentialRow>();

  const passwordIsValid = await verifyPassword(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD.hash,
    user?.passwordSalt ?? DUMMY_PASSWORD.salt,
    user?.passwordIterations ?? DUMMY_PASSWORD.iterations,
  );

  if (!user || !passwordIsValid || user.status !== 'active') return null;

  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = bytesToBase64Url(tokenBytes);
  const tokenHash = await sha256(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1_000);

  await database.batch([
    database.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now.toISOString()),
    database
      .prepare(
        'INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
      )
      .bind(crypto.randomUUID(), user.id, tokenHash, now.toISOString(), expiresAt.toISOString()),
  ]);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      patientId: user.patientId,
    } satisfies AppUser,
  };
}

export async function getUserBySessionToken(token: string): Promise<AppUser | null> {
  if (!token || token.length > 200) return null;

  const database = getD1();
  const tokenHash = await sha256(token);
  return database
    .prepare(
      `SELECT
        users.id,
        users.username,
        users.display_name AS displayName,
        users.role,
        users.patient_id AS patientId
      FROM sessions
      INNER JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ?
        AND sessions.expires_at > ?
        AND users.status = 'active'
      LIMIT 1`,
    )
    .bind(tokenHash, new Date().toISOString())
    .first<AppUser>();
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return await getUserBySessionToken(token);
  } catch {
    return null;
  }
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  const tokenHash = await sha256(token);
  await getD1().prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
}

export function homeForUser(user: AppUser) {
  return user.role === 'admin' ? '/admin' : user.role === 'professional' ? '/medico' : `/paciente/${user.patientId ?? 'pac-demo-001'}`;
}

export async function hashPassword(password: string) {
  const salt = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: base64UrlToBytes(salt), iterations: PASSWORD_ITERATIONS }, key, 256);
  return { hash: bytesToBase64Url(new Uint8Array(bits)), salt, iterations: PASSWORD_ITERATIONS };
}
