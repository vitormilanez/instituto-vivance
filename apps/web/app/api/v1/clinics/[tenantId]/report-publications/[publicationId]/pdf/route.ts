import { apiError } from "@/lib/api";
import { buildReportPdf } from "@/modules/reports/pdf";
import { reportPublicationForExport } from "@/modules/reports/publication-service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ tenantId: string; publicationId: string }>;
  },
) {
  try {
    const { tenantId, publicationId } = await params;
    const publication = await reportPublicationForExport(
      tenantId,
      publicationId,
    );
    const pdf = await buildReportPdf(publication);
    return new Response(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="relatorio-vivance-v${publication.source_version}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
        Pragma: "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
