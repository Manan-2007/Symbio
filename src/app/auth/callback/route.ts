import { NextResponse, type NextRequest } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const client = await serverSupabase();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(request.nextUrl.searchParams.get("recovery") === "1" ? "/reset-password" : "/dashboard", request.url));
  }
  return NextResponse.redirect(new URL("/login?error=confirmation", request.url));
}
