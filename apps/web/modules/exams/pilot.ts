export function syntheticPilotDocumentIds() {
  const pilotEnvironment = process.env.VERCEL_ENV === "preview"
    || (!process.env.VERCEL_ENV && process.env.NODE_ENV === "development");
  if (process.env.VIVANCE_EXAM_TEXT_PILOT !== "synthetic" || !pilotEnvironment)
    return [];
  return (process.env.VIVANCE_SYNTHETIC_EXAM_DOCUMENT_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function syntheticPilotAllows(document: string) {
  return syntheticPilotDocumentIds().includes(document);
}
