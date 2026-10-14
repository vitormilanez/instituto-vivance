import { createHash } from "node:crypto";

export function outreachRecipientKey(batchKey: string, patientId: string) {
  const hash = createHash("sha256").update(`vivance-outreach:${batchKey}:${patientId}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
