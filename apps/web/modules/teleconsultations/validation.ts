import { InputError } from "../../lib/validation.ts";

export type TeleconsultationDeliveryMode = "in_person" | "video";

export type TeleconsultationInput = {
  deliveryMode: TeleconsultationDeliveryMode;
  joinUrl: string | null;
  version: number;
};

const googleMeetPattern =
  /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/;

export function teleconsultationInput(value: unknown): TeleconsultationInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Configuração do atendimento inválida.");
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).some(
      (key) => !["delivery_mode", "join_url", "version"].includes(key),
    )
  )
    throw new InputError("A configuração contém campos não permitidos.");
  if (input.delivery_mode !== "in_person" && input.delivery_mode !== "video")
    throw new InputError("Escolha atendimento presencial ou por vídeo.");
  if (
    !Number.isInteger(input.version) ||
    (input.version as number) < 0 ||
    (input.version as number) > 2_147_483_647
  )
    throw new InputError("Atualize o agendamento antes de salvar.");
  if (input.delivery_mode === "in_person") {
    if (input.join_url !== null)
      throw new InputError("Atendimento presencial não usa link de acesso.");
  } else if (
    typeof input.join_url !== "string" ||
    !googleMeetPattern.test(input.join_url)
  ) {
    throw new InputError(
      "Informe um link Google Meet no formato https://meet.google.com/xxx-xxxx-xxx.",
    );
  }
  return {
    deliveryMode: input.delivery_mode,
    joinUrl: input.join_url as string | null,
    version: input.version as number,
  };
}
