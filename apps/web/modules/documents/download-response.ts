// Response.redirect() has immutable headers. Build the private redirect with
// all headers at construction time, after the caller authorizes the download.
export function documentDownloadResponse(url: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
