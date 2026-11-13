import { NextResponse } from "next/server";
import { clearSession } from "../../../../lib/auth-session";

export async function POST() {
  try {
    // The login state lives only in our own signed cookie, so clearing it is
    // the whole logout. (The old code also called supabase.auth.signOut() on a
    // shared server client, which did nothing useful.)
    await clearSession();

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[auth/logout] failed:", error);
    return NextResponse.json(
      { error: "লগআউট সম্পন্ন হয়নি। আবার চেষ্টা করুন।" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}