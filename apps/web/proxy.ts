import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "./lib/supabase/config";
import type { Database } from "./lib/supabase/database.types";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/") return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const { url, key } = supabaseConfig();
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
      },
    },
  });
  await supabase.auth.getClaims();
  // Never CDN-cache pages, RSC payloads, APIs or responses containing cookies.
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|sw.js|manifest.webmanifest|icon-192.png|icon-512.png|apple-touch-icon.png).*)"],
};
