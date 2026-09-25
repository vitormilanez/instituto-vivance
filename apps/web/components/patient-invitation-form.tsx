"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type InvitationDoctor = { id: string; displayName: string };

type CreatedInvitation = {
  invitation: {
    id: string;
    displayName: string;
    channel: "email" | "whatsapp";
    delivery?: { status: "requested" | "not_applicable" | "failed" };
  };
  shareUrl?: string;
};

export function PatientInvitationForm({
  tenantId,
  role,
  doctors = [],
  targetPatient,
}: {
  tenantId: string;
  role: "doctor" | "admin";
  doctors?: InvitationDoctor[];
  targetPatient?: { id: string; displayName: string };
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<"email" | "whatsapp">("whatsapp");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedInvitation>();
  const [copied, setCopied] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const enteredPhone = String(form.get("phone") ?? "").trim();
    const phoneDigits = enteredPhone.replace(/\D/g, "");
    const phone = enteredPhone.startsWith("+")
      ? `+${phoneDigits}`
      : [10, 11].includes(phoneDigits.length)
        ? `+55${phoneDigits}`
        : `+${phoneDigits}`;
    setPending(true);
    setError("");
    setCreated(undefined);
    try {
      const response = await fetch(
        `/api/v1/clinics/${tenantId}/patient-invitations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: String(form.get("displayName") ?? "").trim(),
            channel,
            ...(channel === "email"
              ? { email: String(form.get("email") ?? "").trim() }
              : { phone }),
            ...(role === "admin"
              ? { doctorId: String(form.get("doctorId") ?? "") }
              : {}),
            ...(targetPatient ? { targetPatientId: targetPatient.id } : {}),
          }),
        },
      );
      const payload = (await response.json()) as CreatedInvitation & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error ?? "Não foi possível criar o convite.");
      setCreated(payload);
      if (!targetPatient) router.refresh();
      setCopied(false);
      setWhatsappUrl(
        channel === "whatsapp" && payload.shareUrl
          ? `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Você recebeu um convite da Vivance. Comece seu cadastro por este link: ${window.location.origin}${payload.shareUrl}`)}`
          : "",
      );
      formElement.reset();
      setChannel("whatsapp");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível criar o convite.",
      );
    } finally {
      setPending(false);
    }
  }

  async function copyLink() {
    if (!created?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${created.shareUrl}`,
      );
      setCopied(true);
    } catch {
      setError(
        "Não foi possível copiar o link. Selecione-o e copie manualmente.",
      );
    }
  }

  return (
    <section
      className="panel patient-invitation-form invitation-refined"
      aria-labelledby="patient-invitation-title"
    >
      <h2 id="patient-invitation-title">
        {targetPatient ? "Enviar acolhimento ao paciente" : "Convidar para o app"}
      </h2>
      <p>
        {targetPatient
          ? "A pessoa confirma a própria identidade, aceita o acesso e continua no mesmo prontuário."
          : "O paciente recebe um link seguro, confirma a própria identidade e começa o cadastro."}
      </p>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="patient-invitation-name">Pessoa convidada</label>
          <input
            id="patient-invitation-name"
            name="displayName"
            autoComplete="name"
            minLength={2}
            maxLength={120}
            required
            disabled={pending}
            readOnly={Boolean(targetPatient)}
            defaultValue={targetPatient?.displayName}
          />
        </div>
        {role === "admin" ? (
          <div className="field">
            <label htmlFor="patient-invitation-doctor">
              Médico responsável
            </label>
            <select
              id="patient-invitation-doctor"
              name="doctorId"
              required
              disabled={pending || !doctors.length}
              defaultValue=""
            >
              <option value="" disabled>
                {doctors.length
                  ? "Selecione o médico"
                  : "Nenhum médico ativo disponível"}
              </option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.displayName}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <fieldset className="channel-choice">
          <legend>Como enviar o convite?</legend>
          <label>
            <input
              type="radio"
              name="channel"
              checked={channel === "email"}
              onChange={() => setChannel("email")}
              disabled={pending}
            />{" "}
            Enviar por e-mail
          </label>
          <label>
            <input
              type="radio"
              name="channel"
              checked={channel === "whatsapp"}
              onChange={() => setChannel("whatsapp")}
              disabled={pending}
            />{" "}
              Gerar link para WhatsApp
          </label>
        </fieldset>
        {channel === "email" ? (
          <div className="field">
            <label htmlFor="patient-invitation-email">E-mail</label>
            <input
              id="patient-invitation-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              disabled={pending}
            />
          </div>
        ) : (
          <div className="field">
            <label htmlFor="patient-invitation-phone">Telefone com DDD</label>
            <input
              id="patient-invitation-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={32}
              required
              disabled={pending}
            />
            <small>
              Você receberá um link para enviar. A pessoa informará e
              confirmará o próprio e-mail antes de entrar.
            </small>
          </div>
        )}
        <button
          type="submit"
          disabled={pending || (role === "admin" && !doctors.length)}
        >
          {pending
            ? "Criando convite…"
            : targetPatient
              ? channel === "whatsapp"
                ? "Gerar link de acolhimento"
                : "Enviar convite por e-mail"
              : channel === "whatsapp"
                ? "Gerar link seguro"
                : "Enviar convite por e-mail"}
        </button>
      </form>
      {error ? (
        <p className="feedback" role="alert">
          {error}
        </p>
      ) : null}
      {created ? (
        <div className="inline-confirm invitation-result" role="status">
          <h3>Convite pronto</h3>
          <p>
            {created.shareUrl
              ? "Envie este link à pessoa convidada. Ela confirmará a própria identidade antes de acessar o cadastro."
              : "O convite está registrado. Confira abaixo o status do envio."}
          </p>
          {whatsappUrl && (
            <a
              className="button"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir WhatsApp para enviar
            </a>
          )}
          {created.shareUrl ? (
            <div className="share-link">
              <input
                aria-label="Link do convite"
                value={`${typeof window === "undefined" ? "" : window.location.origin}${created.shareUrl}`}
                readOnly
              />
              <button className="secondary" type="button" onClick={copyLink}>
                {copied ? "Link copiado" : "Copiar link seguro"}
              </button>
            </div>
          ) : (
            <p
              role={
                created.invitation.delivery?.status === "failed"
                  ? "alert"
                  : undefined
              }
            >
              {created.invitation.delivery?.status === "failed"
                ? "O e-mail não foi enviado. Você pode criar um convite por WhatsApp ou pedir à clínica para verificar o serviço de e-mail."
                : created.invitation.delivery?.status === "not_applicable"
                  ? "Esta pessoa já tem uma conta. Peça que entre com seu e-mail e senha para revisar o convite em Minhas clínicas."
                  : "O envio do e-mail foi solicitado. A pessoa deve conferir também a caixa de spam."}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
