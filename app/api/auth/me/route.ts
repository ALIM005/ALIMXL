import { connection, NextResponse } from "next/server";
import { readSession } from "../../../../lib/auth-session";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  // Always evaluate per request (never prerender at build time).
  await connection();

  try {
    // Read the signed session cookie set at login. The old version looked for
    // an "Authorization: Bearer" header that the browser never sends, so it
    // always answered { user: null } even right after a successful login.
    const session = await readSession();

    if (!session) {
      return NextResponse.json({ user: null }, { headers: NO_STORE });
    }

    return NextResponse.json(
      { user: { id: session.id, email: session.email, name: session.name } },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error("[auth/me] failed:", error);
    return NextResponse.json(
      { user: null, error: "সেশন তথ্য লোড করা যায়নি।" },
      { status: 500, headers: NO_STORE },
    );
  }
}