import { getD1, getCareBucket } from '@/db';
import type { AppUser } from './auth';
import { CareError, careAccess } from './care-cycle';
import { encounterBelongsToPatient } from '../components/demo-routes';
import type { CareFile } from './care-cycle-contract';

export const MAX_CARE_FILE_BYTES = 8 * 1024 * 1024;
const mediaExtensions: Record<string, string[]> = {
  'application/pdf': ['pdf'], 'image/jpeg': ['jpg','jpeg'], 'image/png': ['png'],
  'audio/mpeg': ['mp3'], 'audio/wav': ['wav'], 'audio/webm': ['webm'], 'audio/mp4': ['m4a'],
};
export function validateCareFile(name: string, claimedType: string, bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_CARE_FILE_BYTES) throw new CareError('Escolha um arquivo de até 8 MB.', 413);
  const at = (start: number, text: string) => [...text].every((char, index) => bytes[start + index] === char.charCodeAt(0));
  const detected = at(0, '%PDF-') ? 'application/pdf'
    : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? 'image/jpeg'
    : [137,80,78,71,13,10,26,10].every((byte, index) => bytes[index] === byte) ? 'image/png'
    : at(0, 'RIFF') && at(8, 'WAVE') ? 'audio/wav'
    : at(0, 'ID3') || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) ? 'audio/mpeg'
    : [26,69,223,163].every((byte, index) => bytes[index] === byte) ? 'audio/webm'
    : at(4, 'ftyp') && ['M4A ', 'isom', 'mp42'].some((brand) => at(8, brand)) ? 'audio/mp4' : '';
  const extension = name.toLowerCase().split('.').at(-1) ?? '';
  const normalizedType = claimedType.split(';')[0].toLowerCase().replace('audio/x-wav', 'audio/wav');
  if (!detected || !mediaExtensions[detected].includes(extension)
    || (normalizedType && normalizedType !== 'application/octet-stream' && normalizedType !== detected)) {
    throw new CareError('Formato inválido. Use PDF, JPG, PNG, MP3, WAV, WebM de áudio ou M4A.');
  }
  const safeName = name.replace(/[\u0000-\u001f\u007f/\\]/gu, '_').slice(-160);
  return { name: safeName, mediaType: detected };
}

export async function storeCareFile(user: AppUser, patientId: string, encounterId: string, file: File): Promise<CareFile> {
  if (user.role !== 'patient') throw new CareError('O envio deve ser feito no perfil da paciente.', 403);
  const access = (await careAccess(user, patientId))[0];
  if (!access || !encounterBelongsToPatient(patientId, encounterId)) throw new CareError('Vínculo não autorizado.', 403);
  if (file.size > MAX_CARE_FILE_BYTES) throw new CareError('O limite é de 8 MB por arquivo.', 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const metadata = validateCareFile(file.name, file.type, bytes);
  const id = crypto.randomUUID();
  const objectKey = `care/${access.id}/${encounterId}/${id}`;
  const bucket = getCareBucket();
  await bucket.put(objectKey, bytes, { httpMetadata: { contentType: metadata.mediaType } });
  try {
    await getD1().prepare(`INSERT INTO care_files (id, relationship_id, encounter_id, uploaded_by, name, media_type, size, object_key, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, access.id, encounterId, user.id, metadata.name, metadata.mediaType, bytes.length, objectKey, new Date().toISOString()).run();
  } catch (error) { await bucket.delete(objectKey); throw error; }
  return { id, ...metadata, size: bytes.length };
}

export async function readCareFile(user: AppUser, id: string) {
  const file = await getD1().prepare(`SELECT f.id, f.name, f.media_type AS mediaType, f.size, f.object_key AS objectKey,
    f.uploaded_by AS uploadedBy, r.patient_profile_id AS patientId, f.encounter_id AS encounterId,
    r.professional_user_id AS professionalId, r.patient_user_id AS patientUserId
    FROM care_files f JOIN care_relationships r ON r.id = f.relationship_id
    WHERE f.id = ? AND r.status = 'active'`)
    .bind(id).first<CareFile & { objectKey: string; uploadedBy: string; patientId: string; encounterId: string; professionalId: string; patientUserId: string }>();
  if (!file || (user.role === 'patient' ? file.patientUserId !== user.id || file.patientId !== user.patientId : file.professionalId !== user.id)) throw new CareError('Documento não encontrado.', 404);
  // A staged upload is private until the patient confirms sending it.
  if (user.role === 'professional') {
    const cycle = await getD1().prepare(`SELECT c.data FROM care_cycles c JOIN care_relationships r ON r.id = c.relationship_id
      WHERE r.professional_user_id = ? AND r.patient_profile_id = ? AND c.encounter_id = ?`)
      .bind(user.id, file.patientId, file.encounterId).first<{ data: string }>();
    const submitted = cycle && (JSON.parse(cycle.data).submissions as { attachment: CareFile | null }[]).some((item) => item.attachment?.id === id);
    if (!submitted) throw new CareError('Documento ainda não confirmado pela paciente.', 404);
  }
  const object = await getCareBucket().get(file.objectKey);
  if (!object) throw new CareError('Arquivo indisponível.', 404);
  return { file, object };
}
