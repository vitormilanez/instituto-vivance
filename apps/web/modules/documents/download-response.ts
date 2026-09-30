// Keep private files on the app's origin after authorization. A signed Storage
// redirect may be blocked by browser extensions and exposes the temporary URL.
export function documentDownloadResponse(file: Blob, filename: string, contentType: string) {
  const inline = ["application/pdf", "image/jpeg", "image/png"].includes(contentType);
  const safeContentType = inline ? contentType : "application/octet-stream";
  const disposition = inline ? "inline" : "attachment";
  return new Response(file.stream(), {
    status: 200,
    headers: {
      "Content-Type": safeContentType,
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
