import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
export const AUTH_COOKIE = "alimxl_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const SESSION_ALGORITHM = "HS256";

function getSecret(): Uint8Array {
  const value = process.env.AUTH_SECRET;

  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET must be configured with at least 32 characters.");
  }

  return new TextEncoder().encode(value);
}

export async function createSession(user: {
  id: string;
  email: string;
  name: string;
}) {
  const token = await new SignJWT({
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: SESSION_ALGORITHM })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(getSecret());

  const store = await cookies();

  store.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function readSession() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: [SESSION_ALGORITHM],
    });

    if (
      !payload.sub ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string"
    ) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  } catch {
    return null;
  }
}

export async function clearSession() {
  const store = await cookies();

  store.set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
