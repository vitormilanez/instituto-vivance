export type PrescriptionSource =
  | { type: "document"; documentId: string }
  | { type: "memed"; url: string };

export type PrescriptionArchiveItem = {
  id: string;
  title: string;
  prescribedOn: string;
  sourceType: "document" | "memed";
  documentId: string | null;
  memedUrl: string | null;
  visibility: "internal" | "shared";
  createdAt: string;
};

export type PrescriptionCursor = {
  prescribedOn: string;
  createdAt: string;
  id: string;
};

export type PrescriptionArchive =
  | { available: false; prescriptions: [] }
  | {
      available: true;
      prescriptions: PrescriptionArchiveItem[];
      nextCursor: PrescriptionCursor | null;
    };
