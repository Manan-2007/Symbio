import { NextResponse, type NextRequest } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (hash && (type === "email" || type === "signup" || type === "recovery")) {
    const client = await serverSupabase();
    const { error } = await client.auth.verifyOtp({ token_hash: hash, type });
    if (!error) return NextResponse.redirect(new URL(type === "recovery" ? "/reset-password" : "/dashboard", request.url));
  }
  return NextResponse.redirect(new URL("/login?error=confirmation", request.url));
}
