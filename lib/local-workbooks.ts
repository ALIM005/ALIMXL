const DB_NAME = "alimxl-local";
const DB_VERSION = 1;
const STORE_NAME = "workbooks";

export interface LocalWorkbook {
  id?: string;
  name: string;
  pageSize: "A4" | "Letter" | "Legal";
  orientation: "portrait" | "landscape";
  activeSheetIndex: number;
  sheets: unknown[];
  updatedAt?: string;
}

export interface LocalWorkbookSummary {
  id: string;
  name: string;
  updatedAt: string;
}

type StoredWorkbook<T extends LocalWorkbook> = T & {
  id: string;
  updatedAt: string;
};

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (
    typeof window === "undefined" ||
    !("indexedDB" in window)
  ) {
    return Promise.reject(
      new Error("এই ব্রাউজারে স্থানীয় স্টোরেজ পাওয়া যাচ্ছে না।")
    );
  }

  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      db.onversionchange = () => {
        db.close();
        databasePromise = null;
      };

      resolve(db);
    };

    request.onerror = () => {
      databasePromise = null;

      reject(
        request.error ??
          new Error("স্থানীয় স্টোরেজ খোলা যায়নি।")
      );
    };

    request.onblocked = () => {
      console.warn(
        "ALIMXL storage update blocked. Close other ALIMXL tabs."
      );
    };
  });

  return databasePromise;
}

async function runRequest<T>(
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);

    let result: T;

    transaction.oncomplete = () => {
      resolve(result);
    };

    transaction.onabort = () => {
      reject(
        transaction.error ??
          new Error("স্টোরেজের কাজ সম্পন্ন হয়নি।")
      );
    };

    try {
      const request = createRequest(store);

      request.onsuccess = () => {
        result = request.result;
      };

      request.onerror = () => {
        reject(
          request.error ??
            new Error("স্টোরেজের কাজ ব্যর্থ হয়েছে।")
        );
      };
    } catch (error) {
      transaction.abort();
      reject(error);
    }
  });
}

function validateWorkbook(value: LocalWorkbook): void {
  if (!value || typeof value !== "object") {
    throw new Error("ওয়ার্কবুকের ডেটা সঠিক নয়।");
  }

  if (
    typeof value.name !== "string" ||
    !value.name.trim()
  ) {
    throw new Error("ওয়ার্কবুকের নাম দিন।");
  }

  if (
    !Array.isArray(value.sheets) ||
    value.sheets.length === 0
  ) {
    throw new Error("অন্তত একটি শিট থাকতে হবে।");
  }

  if (
    !Number.isInteger(value.activeSheetIndex) ||
    value.activeSheetIndex < 0 ||
    value.activeSheetIndex >= value.sheets.length
  ) {
    throw new Error("সক্রিয় শিটের অবস্থান সঠিক নয়।");
  }

  if (
    !["A4", "Letter", "Legal"].includes(value.pageSize) ||
    !["portrait", "landscape"].includes(value.orientation)
  ) {
    throw new Error("ওয়ার্কবুকের পেজ সেটিংস সঠিক নয়।");
  }
}

export async function saveLocalWorkbook<T extends LocalWorkbook>(
  snapshot: T
): Promise<LocalWorkbookSummary> {
  validateWorkbook(snapshot);

  const id = snapshot.id?.trim() || crypto.randomUUID();
  const updatedAt = new Date().toISOString();

  const stored: StoredWorkbook<T> = {
    ...snapshot,
    id,
    name: snapshot.name.trim(),
    updatedAt,
  };

  // Transaction সম্পন্ন হওয়ার পরই সফল ফল ফেরত দেওয়া হবে।
  await runRequest<IDBValidKey>(
    "readwrite",
    (store) => store.put(stored)
  );

  return {
    id,
    name: stored.name,
    updatedAt,
  };
}

export async function listLocalWorkbooks(): Promise<
  LocalWorkbookSummary[]
> {
  const items = await runRequest<StoredWorkbook<LocalWorkbook>[]>(
    "readonly",
    (store) => store.getAll()
  );

  return items
    .map((item) => ({
      id: item.id,
      name: item.name,
      updatedAt: item.updatedAt,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getLocalWorkbook<T extends LocalWorkbook>(
  id: string
): Promise<StoredWorkbook<T> | null> {
  const item = await runRequest<StoredWorkbook<T> | undefined>(
    "readonly",
    (store) => store.get(id)
  );

  if (!item) {
    return null;
  }

  validateWorkbook(item);

  return item;
}

export async function deleteLocalWorkbook(
  id: string
): Promise<void> {
  await runRequest<undefined>(
    "readwrite",
    (store) => store.delete(id)
  );
}