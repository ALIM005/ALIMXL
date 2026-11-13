import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthConfigError, getSupabase } from "../../../../lib/auth-db";

const schema = z.object({
  email: z.string().trim().email().transform((v) => v.toLowerCase()),
});

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "অনুরোধের তথ্য সঠিক নয়।" },
        { status: 400, headers: NO_STORE },
      );
    }

    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "সঠিক ইমেইল ঠিকানা দিন।" },
        { status: 400, headers: NO_STORE },
      );
    }

    const { email } = parsed.data;
    const origin = (process.env.APP_URL?.trim() || new URL(request.url).origin).replace(/\/+$/, "");

    // The link in the e-mail opens /login (the page that really exists – the
    // old "/reset-password" page was never created, giving a 404). The
    // "implicit" flow puts the recovery token in the URL #hash, which the
    // login page reads. A PKCE code could not work here because the code
    // verifier would be lost between server requests.
    const { error } = await getSupabase("implicit").auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/login`,
    });

    if (error) {
      // Logged only; the user always gets the same answer (no account probing).
      console.error("[auth/forgot-password] supabase error:", error.code, error.status, error.message);
    }

    return NextResponse.json(
      {
        ok: true,
        message: "ইমেইলটি নিবন্ধিত থাকলে পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে।",
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    if (error instanceof AuthConfigError) {
      console.error("[auth/forgot-password] config:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE });
    }

    console.error("[auth/forgot-password] exception:", error);
    return NextResponse.json(
      { error: "রিকভারি অনুরোধ সম্পন্ন হয়নি।" },
      { status: 500, headers: NO_STORE },
    );
  }
}