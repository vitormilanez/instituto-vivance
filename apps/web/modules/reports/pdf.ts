import "server-only";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import type { Database } from "@/lib/supabase/database.types";

type Publication =
  Database["public"]["Tables"]["care_report_publications"]["Row"];

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 54;
const ink = rgb(0.027, 0.102, 0.227);
const muted = rgb(0.251, 0.337, 0.459);
const navy = rgb(0.012, 0.075, 0.176);
const gold = rgb(0.847, 0.69, 0.42);
const line = rgb(0.859, 0.894, 0.941);

function printable(font: PDFFont, value: string) {
  return [...value]
    .map((character) => {
      if (character === "\n" || character === "\r") return character;
      try {
        font.encodeText(character);
        return character;
      } catch {
        return "?";
      }
    })
    .join("");
}

function wrap(font: PDFFont, text: string, size: number, width: number) {
  const result: string[] = [];
  for (const paragraph of printable(font, text).split(/\r?\n/u)) {
    if (!paragraph.trim()) {
      result.push("");
      continue;
    }
    let current = "";
    for (const word of paragraph.trim().split(/\s+/u)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        current = candidate;
        continue;
      }
      if (current) result.push(current);
      current = word;
      while (font.widthOfTextAtSize(current, size) > width) {
        let end = 1;
        while (
          end < current.length &&
          font.widthOfTextAtSize(current.slice(0, end + 1), size) <= width
        )
          end += 1;
        result.push(current.slice(0, end));
        current = current.slice(end);
      }
    }
    if (current) result.push(current);
  }
  return result;
}

function date(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

function instant(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export async function buildReportPdf(publication: Publication) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(printable(regular, publication.patient_title));
  pdf.setAuthor(printable(regular, publication.doctor_display_name));
  pdf.setSubject("Relatório publicado ao paciente");
  pdf.setCreator("VIVANCE");
  pdf.setProducer("VIVANCE");

  const pages: PDFPage[] = [];
  let page = pdf.addPage([pageWidth, pageHeight]);
  pages.push(page);
  let y = pageHeight - 140;

  function header(target: PDFPage) {
    target.drawRectangle({ x: 0, y: pageHeight - 104, width: pageWidth, height: 104, color: navy });
    target.drawRectangle({ x: margin, y: pageHeight - 32, width: 34, height: 3, color: gold });
    target.drawText("VIVANCE", { x: margin, y: pageHeight - 58, size: 20, font: bold, color: rgb(1, 1, 1) });
    target.drawText("Relatório de acompanhamento", { x: margin, y: pageHeight - 80, size: 10, font: regular, color: rgb(0.82, 0.87, 0.94) });
  }

  function nextPage() {
    page = pdf.addPage([pageWidth, pageHeight]);
    pages.push(page);
    header(page);
    y = pageHeight - 136;
  }

  function ensure(height: number) {
    if (y - height < 68) nextPage();
  }

  function label(value: string) {
    ensure(26);
    page.drawText(printable(bold, value.toUpperCase()), {
      x: margin,
      y,
      size: 8,
      font: bold,
      color: muted,
    });
    y -= 17;
  }

  function lines(value: string, options?: { size?: number; bold?: boolean; gap?: number }) {
    const size = options?.size ?? 11;
    const selected = options?.bold ? bold : regular;
    const leading = options?.gap ?? size * 1.45;
    for (const content of wrap(selected, value, size, pageWidth - margin * 2)) {
      ensure(leading);
      if (content)
        page.drawText(content, { x: margin, y, size, font: selected, color: ink });
      y -= leading;
    }
  }

  header(page);
  lines(publication.patient_title, { size: 22, bold: true, gap: 28 });
  y -= 2;
  page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: line });
  y -= 24;
  label("Paciente");
  lines(publication.patient_display_name, { bold: true });
  y -= 9;
  label("Período acompanhado");
  lines(`${date(publication.period_start)} a ${date(publication.period_end)}`);
  y -= 9;
  label("Síntese compartilhada pelo médico");
  lines(publication.patient_summary);
  y -= 22;
  ensure(94);
  page.drawRectangle({
    x: margin,
    y: y - 72,
    width: pageWidth - margin * 2,
    height: 80,
    color: rgb(0.965, 0.976, 0.992),
    borderColor: line,
    borderWidth: 1,
  });
  page.drawText(printable(bold, "Responsabilidade médica"), {
    x: margin + 16,
    y: y - 15,
    size: 9,
    font: bold,
    color: muted,
  });
  page.drawText(printable(bold, publication.doctor_display_name), {
    x: margin + 16,
    y: y - 34,
    size: 11,
    font: bold,
    color: ink,
  });
  page.drawText(printable(regular, publication.clinic_display_name), {
    x: margin + 16,
    y: y - 51,
    size: 9,
    font: regular,
    color: muted,
  });
  page.drawText(
    printable(
      regular,
      `Versão ${publication.source_version} - aprovada em ${instant(publication.approved_at)} - publicada em ${instant(publication.published_at)}`,
    ),
    { x: margin + 16, y: y - 66, size: 8, font: regular, color: muted },
  );

  const total = pages.length;
  pages.forEach((current, index) => {
    current.drawLine({
      start: { x: margin, y: 48 },
      end: { x: pageWidth - margin, y: 48 },
      thickness: 0.7,
      color: line,
    });
    current.drawText(
      printable(regular, `Relatório publicado - versão ${publication.source_version}`),
      { x: margin, y: 30, size: 8, font: regular, color: muted },
    );
    const pageNumber = `Página ${index + 1} de ${total}`;
    current.drawText(pageNumber, {
      x: pageWidth - margin - regular.widthOfTextAtSize(pageNumber, 8),
      y: 30,
      size: 8,
      font: regular,
      color: muted,
    });
  });
  return pdf.save();
}
