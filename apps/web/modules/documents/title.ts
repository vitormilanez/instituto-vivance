// Título legível de um documento. O nome original do arquivo é mantido quando
// diz algo; quando é só um código (UUID) ou um nome genérico de câmera, a tela
// mostra o tipo e a data — o arquivo baixado continua com o nome original.
const technical = [
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  /^(img|image|photo|foto|pxl|dsc|file|arquivo|document|documento|scan)[-_ ]?\d*(\.\w{2,5})?$/i,
  /^(img|pxl|dsc)[-_]\d{8}[-_]\w+(\.\w{2,5})?$/i,
];

export function isTechnicalFilename(name: string) {
  const trimmed = name.trim();
  return !trimmed || technical.some((pattern) => pattern.test(trimmed));
}

const brDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

export function documentTitle(document: {
  original_filename: string;
  created_at: string;
  content_type?: string | null;
  category?: string | null;
}) {
  if (!isTechnicalFilename(document.original_filename)) return document.original_filename;
  const kind =
    document.category === "exam"
      ? "Exame"
      : document.content_type?.startsWith("image/")
        ? "Foto"
        : document.content_type === "application/pdf"
          ? "PDF"
          : "Documento";
  return `${kind} de ${brDate(document.created_at)}`;
}
