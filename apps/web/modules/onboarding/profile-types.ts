export type Nutrition = {
  pattern: "" | "mixed" | "vegetarian" | "vegan" | "other";
  preferences: string;
  avoidedFoods: string;
  mealRoutine: { id: "breakfast" | "lunch" | "dinner" | "snack"; time: string; description: string }[];
};
export type ProfilePhotos = {
  frontDocumentId: string | null;
  sideDocumentId: string | null;
  backDocumentId: string | null;
};
export type ExamsStatus = "not_started" | "shared" | "none_now";
export type ProfileSection = "nutrition" | "photos" | "exams";
export type PatientProfileContext = {
  tenantId: string;
  patientId: string;
  version: number;
  nutrition: Nutrition;
  photos: ProfilePhotos;
  examsStatus: ExamsStatus;
  examsDocumentIds: string[];
  nutritionSubmittedAt: string | null;
  photosSubmittedAt: string | null;
  examsSubmittedAt: string | null;
  updatedAt: string | null;
};
export type SubmittedPatientProfileContext = {
  nutrition: (Nutrition & { submittedAt: string }) | null;
  photos: (ProfilePhotos & { submittedAt: string }) | null;
  exams: { status: Exclude<ExamsStatus, "not_started">; documentIds: string[]; submittedAt: string } | null;
};
export function emptyNutrition(): Nutrition {
  return { pattern: "", preferences: "", avoidedFoods: "", mealRoutine:
    (["breakfast", "lunch", "dinner", "snack"] as const).map((id) => ({ id, time: "", description: "" })) };
}
export function emptyPhotos(): ProfilePhotos {
  return { frontDocumentId: null, sideDocumentId: null, backDocumentId: null };
}
