"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    deleteLocalWorkbook,
    listLocalWorkbooks,
    type LocalWorkbookSummary,
} from "../lib/local-workbooks";

interface MyFilesProps {
    open: boolean;
    onClose: () => void;
    onOpen: (id: string) => void | Promise<void>;
    activeWorkbookId?: string | null;
}

function formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleString("bn-BD");
}

function errorMessage(
    error: unknown,
    fallback: string
): string {
    return error instanceof Error ? error.message : fallback;
}

export default function MyFiles({
    open,
    onClose,
    onOpen,
    activeWorkbookId = null,
}: MyFilesProps) {
    const [files, setFiles] = useState<
        LocalWorkbookSummary[]
    >([]);

    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(
        null
    );
    const [error, setError] = useState("");

    const requestVersion = useRef(0);
    const actionLock = useRef(false);

    const refreshFiles = useCallback(async () => {
        const version = ++requestVersion.current;

        setLoading(true);
        setError("");

        try {
            const items = await listLocalWorkbooks();

            if (version === requestVersion.current) {
                setFiles(items);
            }
        } catch (cause) {
            if (version === requestVersion.current) {
                setError(
                    errorMessage(
                        cause,
                        "ওয়ার্কবুকের তালিকা খোলা যায়নি।"
                    )
                );
            }
        } finally {
            if (version === requestVersion.current) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        if (!open) {
            return;
        }

        setFiles([]);
        void refreshFiles();

        return () => {
            requestVersion.current += 1;
        };
    }, [open, refreshFiles]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                // পেছনের স্প্রেডশিটে Escape পৌঁছানো বন্ধ করি।
                event.stopPropagation();

                if (!actionLock.current) {
                    onClose();
                }
            }
        };

        window.addEventListener(
            "keydown",
            handleKeyDown,
            true
        );

        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown,
                true
            );
        };
    }, [open, onClose]);

    async function handleOpen(id: string) {
        if (actionLock.current) {
            return;
        }

        actionLock.current = true;
        setBusyId(id);
        setError("");

        try {
            // মূল পেজ ওয়ার্কবুক লোড করবে।
            // সফলভাবে লোড হলে প্যানেল বন্ধ করার দায়িত্বও
            // মূল পেজের থাকবে।
            await onOpen(id);
        } catch (cause) {
            setError(
                errorMessage(
                    cause,
                    "ওয়ার্কবুক খোলা যায়নি।"
                )
            );
        } finally {
            actionLock.current = false;
            setBusyId(null);
        }
    }

    async function handleDelete(
        file: LocalWorkbookSummary
    ) {
        if (actionLock.current) {
            return;
        }

        if (file.id === activeWorkbookId) {
            setError(
                "বর্তমানে খোলা ওয়ার্কবুক ডিলিট করা যাবে না। আগে অন্য ওয়ার্কবুক খুলুন।"
            );
            return;
        }

        const confirmed = window.confirm(
            `"${file.name}" ডিলিট করবেন?\n\nএই কাজ ফিরিয়ে নেওয়া যাবে না।`
        );

        if (!confirmed) {
            return;
        }

        actionLock.current = true;
        setBusyId(file.id);
        setError("");

        try {
            await deleteLocalWorkbook(file.id);

            setFiles((current) =>
                current.filter((item) => item.id !== file.id)
            );
        } catch (cause) {
            setError(
                errorMessage(
                    cause,
                    "ওয়ার্কবুক ডিলিট করা যায়নি।"
                )
            );
        } finally {
            actionLock.current = false;
            setBusyId(null);
        }
    }

    if (!open) {
        return null;
    }

    const busy = busyId !== null;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
            style={{ zIndex: 100000 }}
            onKeyDown={(event) => event.stopPropagation()}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="alimxl-my-files-title"
                aria-busy={loading || busy}
                className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-300 bg-white text-gray-900 shadow-2xl"
            >
                <header className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
                    <div>
                        <h2
                            id="alimxl-my-files-title"
                            className="text-lg font-bold text-[#106ebe]"
                        >
                            আমার ফাইল
                        </h2>

                        <p className="mt-1 text-sm text-gray-600">
                            এই ডিভাইসে অ্যাপের ভেতরে সেভ করা
                            ওয়ার্কবুক
                        </p>
                    </div>

                    <button
                        type="button"
                        autoFocus
                        disabled={busy}
                        onClick={onClose}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
                    >
                        বন্ধ করুন
                    </button>
                </header>

                <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-3">
                    <span className="text-sm text-gray-600">
                        {loading
                            ? "তালিকা লোড হচ্ছে..."
                            : `${files.length}টি ওয়ার্কবুক`}
                    </span>

                    <button
                        type="button"
                        disabled={loading || busy}
                        onClick={() => void refreshFiles()}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50"
                    >
                        তালিকা রিফ্রেশ
                    </button>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mx-5 mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                    >
                        {error}
                    </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    {loading ? (
                        <p role="status" className="text-sm text-gray-600">
                            অপেক্ষা করুন…
                        </p>
                    ) : files.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-600">
                            {error
                                ? "তালিকা পাওয়া যায়নি। আবার রিফ্রেশ করুন।"
                                : "এখনো কোনো ওয়ার্কবুক সেভ করা হয়নি।"}
                        </p>
                    ) : (
                        <ul className="space-y-3">
                            {files.map((file) => {
                                const isActive =
                                    file.id === activeWorkbookId;

                                return (
                                    <li
                                        key={file.id}
                                        className="rounded-lg border border-gray-200 p-4"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="wrap-break-word font-semibold">
                                                    {file.name}
                                                </p>

                                                <p className="mt-1 text-xs text-gray-500">
                                                    শেষ সেভ:{" "}
                                                    {formatDate(file.updatedAt)}
                                                </p>

                                                {isActive && (
                                                    <p className="mt-1 text-xs text-[#106ebe]">
                                                        বর্তমানে খোলা আছে
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex shrink-0 gap-2">
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() =>
                                                        void handleOpen(file.id)
                                                    }
                                                    className="rounded-md bg-[#106ebe] px-3 py-2 text-sm text-white hover:bg-[#005a9e] disabled:opacity-50"
                                                >
                                                    {busyId === file.id
                                                        ? "অপেক্ষা করুন"
                                                        : "ওপেন"}
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={busy || isActive}
                                                    onClick={() =>
                                                        void handleDelete(file)
                                                    }
                                                    className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                                                >
                                                    ডিলিট
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <footer className="border-t border-gray-200 px-5 py-3 text-xs text-gray-600">
                    এটি ক্লাউড স্টোরেজ নয়। ফাইলগুলো এই ডিভাইসের
                    স্থানীয় ব্রাউজার স্টোরেজে রাখা হচ্ছে।
                </footer>
            </section>
        </div>
    );
}