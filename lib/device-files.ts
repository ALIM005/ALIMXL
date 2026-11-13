export interface DeviceFileType {
  description: string;
  accept: Record<string, string[]>;
}

export interface SaveDeviceFileOptions {
  suggestedName: string;
  blob: Blob;
  types?: DeviceFileType[];
}

export type SaveDeviceFileResult =
  | {
      status: "saved";
      method: "picker";
      fileName: string;
    }
  | {
      status: "download-started";
      method: "download";
      fileName: string;
    }
  | {
      status: "cancelled";
    };

interface WritableFile {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
  abort(): Promise<void>;
}

interface SaveFileHandle {
  name: string;
  createWritable(): Promise<WritableFile>;
}

interface SavePickerOptions {
  suggestedName: string;
  types?: DeviceFileType[];
}

type WindowWithSavePicker = Window & {
  showSaveFilePicker?: (
    options: SavePickerOptions
  ) => Promise<SaveFileHandle>;
};

function requireBrowser(): void {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined"
  ) {
    throw new Error(
      "ফাইল সেভের কাজ শুধু ব্রাউজার থেকে করা যাবে।"
    );
  }
}

export function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .trim()
    .replace(/[. ]+$/g, "");

  const result = cleaned || "ALIMXL-workbook";

  // Windows-এর সংরক্ষিত নাম এড়িয়ে চলা।
  if (
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(
      result
    )
  ) {
    return `_${result}`;
  }

  return result;
}

export function canUseSaveFilePicker(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const browser = window as WindowWithSavePicker;

  return (
    window.isSecureContext &&
    typeof browser.showSaveFilePicker === "function"
  );
}

function startDownload(
  blob: Blob,
  fileName: string
): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.style.display = "none";

  document.body.appendChild(link);

  try {
    link.click();
  } finally {
    link.remove();

    // ডাউনলোড শুরুর সুযোগ দিয়ে URL পরিষ্কার করা।
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60_000);
  }
}

export async function saveDeviceFile(
  options: SaveDeviceFileOptions
): Promise<SaveDeviceFileResult> {
  requireBrowser();

  const fileName = sanitizeFileName(
    options.suggestedName
  );

  if (canUseSaveFilePicker()) {
    const browser = window as WindowWithSavePicker;

    let handle: SaveFileHandle;

    try {
      handle = await browser.showSaveFilePicker!({
        suggestedName: fileName,
        types: options.types,
      });
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return { status: "cancelled" };
      }

      // অনুমতি বা অন্য error হলে গোপনে ডাউনলোড করব না।
      throw error;
    }

    const writable = await handle.createWritable();

    try {
      await writable.write(options.blob);
      await writable.close();
    } catch (error) {
      try {
        await writable.abort();
      } catch {
        // মূল write/close error-টাই ফেরত দেওয়া হবে।
      }

      throw error;
    }

    return {
      status: "saved",
      method: "picker",
      fileName: handle.name,
    };
  }

  startDownload(options.blob, fileName);

  return {
    status: "download-started",
    method: "download",
    fileName,
  };
}