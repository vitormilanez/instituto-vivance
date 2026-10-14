export type MeetEntry = { name: string; speaker: string; startTime: string; endTime: string; text: string; languageCode: string | null };
export type MeetImport = { id: string; state: "imported"; conferenceName: string; transcriptName: string; importedAt: string; entries: MeetEntry[]; sourceHash: string; review: { decision: "reviewed" | "rejected"; note: string; reviewedAt: string } | null };
export type MeetRoom = { status: "ready" | "creating" | "recovery_required"; meetingUri: string | null; spaceName: string | null };
export type MeetStatus = { configured: boolean; available: boolean; connected: boolean; accountEmail: string | null; reason: "configuration_required" | "database_unavailable" | "not_connected" | null };
export type MeetTranscripts = { room: MeetRoom | null; status: "not_bound" | "consent_required" | "available"; consent: { confirmedAt: string; permissionNote: string } | null; imports: MeetImport[] };
