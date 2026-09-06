import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

let database: DatabaseSync;
export function resetDatabase() {
  database?.close();
  database = new DatabaseSync(':memory:');
  const migrations = new URL('../../drizzle/', import.meta.url);
  for (const name of readdirSync(migrations).filter((name) => /^\d+.*\.sql$/u.test(name)).sort()) database.exec(readFileSync(new URL(name, migrations), 'utf8'));
  objects.clear();
  database.exec(`INSERT INTO users (id, username, display_name, role, patient_id, password_hash, password_salt,
    password_iterations, created_at, updated_at) VALUES
    ('doctor', 'doctor', 'Dr. Teste', 'professional', NULL, 'unused', 'unused', 100000, '2026-09-06', '2026-09-06'),
    ('patient', 'patient', 'Marina fictícia', 'patient', 'pac-demo-001', 'unused', 'unused', 100000, '2026-09-06', '2026-09-06');
    INSERT INTO care_relationships (id, professional_user_id, patient_user_id, patient_profile_id, created_at, updated_at)
    VALUES ('relationship', 'doctor', 'patient', 'pac-demo-001', '2026-09-06', '2026-09-06');
    INSERT INTO clinical_policy_members (user_id, clinic_id) VALUES ('doctor', 'clinic-vivance-demo');
    INSERT INTO clinical_patient_permissions (relationship_id, authorized, paused, revision, updated_by, updated_at, basis)
    VALUES ('relationship', 1, 0, 0, 'doctor', '2026-09-06', 'Cenário fictício de teste, não consentimento real.');`);
}

export function getD1() {
  return {
    async batch(statements: { execute: () => { meta: { changes: number } } }[]) {
      database.exec('BEGIN');
      try { const results = statements.map((statement) => statement.execute()); database.exec('COMMIT'); return results; }
      catch (error) { database.exec('ROLLBACK'); throw error; }
    },
    prepare(sql: string) {
      return { bind(...values: (string | number | null)[]) {
        return {
          async first<T>() { return (database.prepare(sql).get(...values) ?? null) as T | null; },
          async all<T>() { return { results: database.prepare(sql).all(...values) as T[] }; },
          async run() { return { meta: { changes: Number(database.prepare(sql).run(...values).changes) } }; },
          execute() { return { meta: { changes: Number(database.prepare(sql).run(...values).changes) } }; },
        };
      } };
    },
  };
}

const objects = new Map<string, Uint8Array>();
export function getCareBucket() {
  return {
    async put(key: string, bytes: Uint8Array) { objects.set(key, bytes.slice()); },
    async delete(key: string) { objects.delete(key); },
    async get(key: string) {
      const value = objects.get(key);
      return value ? { body: new Blob([new Uint8Array(value)]).stream() } : null;
    },
  };
}
