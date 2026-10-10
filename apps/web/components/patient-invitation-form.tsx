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
  const [contact, setContact] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedInvitation>();
  const [copied, setCopied] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const enteredContact = String(form.get("contact") ?? "").trim();
    const channel = enteredContact.includes("@") ? "email" : "whatsapp";
    const enteredPhone = enteredContact;
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
              ? { email: enteredContact }
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
          ? `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Você recebeu um convite da Vivance. Abra este link, confirme seu e-mail e entre na sua conta ou crie seu acesso: ${window.location.origin}${payload.shareUrl}`)}`
          : "",
      );
      formElement.reset();
      setContact("");
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
      <p className="invitation-intro">
        {targetPatient
          ? "Envie o acesso para que a pessoa confirme sua identidade e continue na mesma ficha."
          : "Informe nome e contato. Você poderá enviar o link pelo WhatsApp ou convidar por e-mail."}
      </p>
      <form onSubmit={submit}>
        <div className="field invitation-name">
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
        <div className="field invitation-contact">
          <label htmlFor="patient-invitation-contact">WhatsApp com DDD ou e-mail</label>
          <input
            id="patient-invitation-contact"
            name="contact"
            type="text"
            autoComplete="off"
            maxLength={254}
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder="(11) 99999-9999 ou nome@email.com"
            required
            disabled={pending}
          />
        </div>
        <button
          type="submit"
          className="invitation-submit"
          disabled={pending || (role === "admin" && !doctors.length)}
        >
          {pending
            ? "Criando convite…"
            : contact.includes("@")
              ? "Convidar por e-mail"
              : "Gerar link para WhatsApp"}
        </button>
      </form>
      {!created && <p className="invitation-help">
        {contact.includes("@")
          ? "Se a pessoa já tiver conta, o convite aparecerá ao entrar em Minhas clínicas; nenhum novo e-mail será enviado."
          : "Após gerar, abra o WhatsApp para enviar o link. A pessoa confirmará o e-mail antes de começar."}
      </p>}
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
              ? "Link gerado. Envie pelo WhatsApp e peça que a pessoa confirme o e-mail. Se já tiver conta, ela entra com o acesso existente."
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
                  ? "Esta pessoa já tem uma conta; nenhum novo e-mail foi enviado. Peça que entre em Minhas clínicas para aceitar o convite."
                  : "O envio do e-mail foi solicitado. A pessoa deve conferir também a caixa de spam."}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
