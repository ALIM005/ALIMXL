import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { readSession } from "../../../../lib/auth-session";

export const maxDuration = 90;

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_BODY_BYTES = MAX_IMAGE_BYTES + 256 * 1024;
const MAX_OUTPUT_BYTES = 24 * 1024 * 1024;
const PROVIDER_TIMEOUT_MS = 70_000;

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

type ImageMime = "image/png" | "image/jpeg" | "image/webp";

class BodyLimitError extends Error {}

function json(
  requestId: string,
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    { ...body, requestId },
    {
      status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "X-Request-Id": requestId,
      },
    },
  );
}

function fail(
  requestId: string,
  status: number,
  code: string,
  error: string,
  extra: Record<string, unknown> = {},
) {
  return json(requestId, { error, code, ...extra }, status);
}

async function readLimited(
  stream: ReadableStream<Uint8Array> | null,
  limit: number,
): Promise<Buffer> {
  if (!stream) return Buffer.alloc(0);

  const reader = stream.getReader();
  const chunks: Buffer[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      total += value.byteLength;

      if (total > limit) {
        await reader.cancel().catch(() => undefined);
        throw new BodyLimitError("Body exceeds configured limit.");
      }

      chunks.push(Buffer.from(value));
    }

    return Buffer.concat(chunks, total);
  } finally {
    reader.releaseLock();
  }
}

function detectMime(bytes: Buffer): ImageMime | null {
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(PNG_SIGNATURE)
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getProviderErrorCode(bytes: Buffer): string | undefined {
  try {
    const parsed: unknown = JSON.parse(bytes.toString("utf8"));

    if (!isRecord(parsed) || !Array.isArray(parsed.errors)) {
      return undefined;
    }

    const first: unknown = parsed.errors[0];

    if (!isRecord(first) || typeof first.code !== "string") {
      return undefined;
    }

    return /^[a-zA-Z0-9_-]{1,100}$/.test(first.code)
      ? first.code
      : undefined;
  } catch {
    return undefined;
  }
}

function allowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (fetchSite === "cross-site") return false;

  // Browser calls must be same-origin. Non-browser clients still
  // need a valid authenticated session.
  if (!origin) return true;

  const configured = process.env.APP_ORIGIN?.trim();
  const expected = configured || new URL(request.url).origin;

  try {
    return new URL(origin).origin === new URL(expected).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const requestId = randomUUID();

  try {
    if (!allowedOrigin(request)) {
      return fail(
        requestId,
        403,
        "ORIGIN_NOT_ALLOWED",
        "এই ওয়েবসাইট থেকে AI request অনুমোদিত নয়।",
      );
    }

    const session = await readSession();

    if (!session) {
      return fail(
        requestId,
        401,
        "LOGIN_REQUIRED",
        "AI background removal ব্যবহার করতে আগে লগইন করুন।",
      );
    }

    const apiKey = process.env.REMOVE_BG_API_KEY?.trim();

    if (!apiKey) {
      return fail(
        requestId,
        503,
        "AI_NOT_CONFIGURED",
        "সার্ভারে REMOVE_BG_API_KEY সেট করা নেই।",
      );
    }

    const size = process.env.REMOVE_BG_SIZE?.trim() || "preview";

    if (!["preview", "auto", "full"].includes(size)) {
      return fail(
        requestId,
        503,
        "INVALID_AI_CONFIGURATION",
        "REMOVE_BG_SIZE অবশ্যই preview, auto অথবা full হতে হবে।",
      );
    }

    const contentType = request.headers.get("content-type") || "";

    if (
      !contentType.toLowerCase().startsWith("multipart/form-data;") ||
      !/boundary=/i.test(contentType)
    ) {
      return fail(
        requestId,
        415,
        "INVALID_CONTENT_TYPE",
        "multipart/form-data দিয়ে image ফাইলে ছবি পাঠাতে হবে।",
      );
    }

    const contentLength = request.headers.get("content-length");

    if (contentLength !== null) {
      const length = Number(contentLength);

      if (
        !Number.isSafeInteger(length) ||
        length < 0 ||
        length > MAX_BODY_BYTES
      ) {
        return fail(
          requestId,
          413,
          "REQUEST_TOO_LARGE",
          "ছবির আকার সর্বোচ্চ 20 MB হতে পারবে।",
        );
      }
    }

    let bodyBytes: Buffer;

    try {
      bodyBytes = await readLimited(request.body, MAX_BODY_BYTES);
    } catch (error) {
      if (error instanceof BodyLimitError) {
        return fail(
          requestId,
          413,
          "REQUEST_TOO_LARGE",
          "ছবির আকার সর্বোচ্চ 20 MB হতে পারবে।",
        );
      }

      throw error;
    }

    let form: FormData;

    try {
      form = await new Response(new Uint8Array(bodyBytes), {
        headers: { "Content-Type": contentType },
      }).formData();
    } catch {
      return fail(
        requestId,
        400,
        "INVALID_FORM",
        "ছবির upload data সঠিক নয়। আবার ছবি আপলোড করুন।",
      );
    }

    const files = form.getAll("image");

    if (files.length !== 1 || !(files[0] instanceof File)) {
      return fail(
        requestId,
        400,
        "IMAGE_REQUIRED",
        "image নামে একটি মাত্র ছবি পাঠান।",
      );
    }

    const file = files[0];

    if (!file.size || file.size > MAX_IMAGE_BYTES) {
      return fail(
        requestId,
        413,
        "INVALID_IMAGE_SIZE",
        "খালি ফাইল নয়; সর্বোচ্চ 20 MB ছবি ব্যবহার করুন।",
      );
    }

    const imageBytes = Buffer.from(await file.arrayBuffer());
    const mime = detectMime(imageBytes);

    if (!mime) {
      return fail(
        requestId,
        415,
        "UNSUPPORTED_IMAGE",
        "শুধু PNG, JPEG অথবা WebP ছবি ব্যবহার করুন।",
      );
    }

    const extension =
      mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";

    const upstreamForm = new FormData();

    upstreamForm.append(
      "image_file",
      new Blob([new Uint8Array(imageBytes)], { type: mime }),
      `photo.${extension}`,
    );
    upstreamForm.append("size", size);
    upstreamForm.append("format", "png");
    upstreamForm.append("type", "auto");
    upstreamForm.append("channels", "rgba");
    upstreamForm.append("crop", "false");

    // No automatic retry: retrying a paid request can consume credits.
    const response = await fetch(
      "https://api.remove.bg/v1.0/removebg",
      {
        method: "POST",
        headers: {
          "X-Api-Key": apiKey,
          Accept: "image/png",
        },
        body: upstreamForm,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      let providerCode: string | undefined;

      try {
        const errorBytes = await readLimited(response.body, 64 * 1024);
        providerCode = getProviderErrorCode(errorBytes);
      } catch {
        // Never return raw upstream error bodies or secret values.
      }

      console.warn("[ai/remove-background] provider failure", {
        requestId,
        providerStatus: response.status,
        providerCode,
      });

      const details = {
        providerStatus: response.status,
        ...(providerCode ? { providerCode } : {}),
      };

      if (response.status === 401 || response.status === 403) {
        return fail(
          requestId,
          502,
          "PROVIDER_AUTH_FAILED",
          "remove.bg API key গ্রহণ করেনি। সার্ভারের key পরীক্ষা করুন।",
          details,
        );
      }

      if (response.status === 402) {
        return fail(
          requestId,
          402,
          "INSUFFICIENT_CREDITS",
          "remove.bg-তে পর্যাপ্ত credit নেই। Preview mode বা account balance পরীক্ষা করুন।",
          details,
        );
      }

      if (response.status === 429) {
        return fail(
          requestId,
          429,
          "PROVIDER_RATE_LIMIT",
          "AI provider-এর request limit হয়েছে। কিছুক্ষণ পরে চেষ্টা করুন।",
          details,
        );
      }

      if (response.status === 400 || response.status === 422) {
        return fail(
          requestId,
          422,
          "IMAGE_PROCESSING_FAILED",
          "এই ছবিটি প্রক্রিয়া করা যায়নি। স্পষ্ট subject-সহ অন্য ছবি ব্যবহার করুন।",
          details,
        );
      }

      return fail(
        requestId,
        502,
        "PROVIDER_ERROR",
        "AI provider থেকে ব্যর্থ response এসেছে।",
        details,
      );
    }

    let output: Buffer;

    try {
      output = await readLimited(response.body, MAX_OUTPUT_BYTES);
    } catch (error) {
      if (error instanceof BodyLimitError) {
        return fail(
          requestId,
          502,
          "OUTPUT_TOO_LARGE",
          "AI output বেশি বড়। ছোট ছবি বা preview mode ব্যবহার করুন।",
        );
      }

      throw error;
    }

    if (
      output.length < 24 ||
      !output.subarray(0, 8).equals(PNG_SIGNATURE) ||
      output.toString("ascii", 12, 16) !== "IHDR"
    ) {
      return fail(
        requestId,
        502,
        "INVALID_PROVIDER_OUTPUT",
        "AI provider সঠিক PNG ছবি ফেরত দেয়নি।",
      );
    }

    const width = output.readUInt32BE(16);
    const height = output.readUInt32BE(20);

    if (!width || !height || width * height > 40_000_000) {
      return fail(
        requestId,
        502,
        "INVALID_OUTPUT_DIMENSIONS",
        "AI output-এর dimensions সমর্থিত নয়।",
      );
    }

    return json(requestId, {
      image: `data:image/png;base64,${output.toString("base64")}`,
      provider: "remove.bg",
      width,
      height,
    });
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");

    console.error("[ai/remove-background] request failed", {
      requestId,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });

    return fail(
      requestId,
      timedOut ? 504 : 500,
      timedOut ? "AI_TIMEOUT" : "AI_REQUEST_FAILED",
      timedOut
        ? "AI processing-এর সময়সীমা শেষ হয়েছে। ছোট ছবি দিয়ে আবার চেষ্টা করুন।"
        : "সার্ভারে AI request ব্যর্থ হয়েছে। Request ID দিয়ে server log পরীক্ষা করুন।",
    );
  }
}