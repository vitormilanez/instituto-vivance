// O que o médico lê sobre a entrega de um convite, por canal. O convite por
// WhatsApp tem duas entregas diferentes — o link, que a clínica envia, e o
// e-mail de criação de conta, que sai quando a pessoa abre o link — e uma
// falha no segundo não invalida o primeiro. Dizer "falha no envio do e-mail"
// sem esse contexto levava a concluir que o convite tinha quebrado.
export type InvitationDelivery = {
  channel: string;
  status: string;
  deliveryStatus: string;
};

export function invitationDeliveryLabel(input: InvitationDelivery): string | null {
  if (input.status !== "pending") return null;
  if (input.channel === "email") {
    if (input.deliveryStatus === "failed")
      return "O e-mail de convite não foi enviado";
    return "Convite enviado por e-mail";
  }
  if (input.channel === "whatsapp") {
    if (input.deliveryStatus === "requested")
      return "Link de WhatsApp aberto · e-mail de criação de conta enviado";
    if (input.deliveryStatus === "failed")
      return "Link de WhatsApp ativo · o e-mail de criação de conta não foi enviado";
    return "Link de WhatsApp ativo, ainda não aberto";
  }
  return null;
}
