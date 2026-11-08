"use client";

import { useState, useEffect } from "react";
import * as Icons from "lucide-react";

interface TemplateCard {
    id: string;
    name: string;
    category: string;
    description: string;
}

interface RecentCard {
    id: string;
    name: string;
    openedAt: string;
}

interface AlimxlHomeProps {
    templates: readonly TemplateCard[];
    recentFiles: readonly RecentCard[];
    onBlank: () => void;
    onOpen: () => void;
    onTemplate: (id: string) => void;
    onRecent: (id: string) => void;
    onMyFiles: () => void;
    onContinue: () => void;
}

function relativeTime(iso: string): string {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return iso;
    const mins = Math.floor((Date.now() - t) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return new Date(t).toLocaleDateString();
}

const ACCENTS = [
    "#107C41",
    "#106EBE",
    "#7052A3",
    "#B45309",
    "#087E8B",
    "#BE4568",
];

export default function AlimxlHome({
    templates,
    recentFiles,
    onBlank,
    onOpen,
    onTemplate,
    onRecent,
    onMyFiles,
    onContinue,
}: AlimxlHomeProps) {
    const [tab, setTab] = useState<"home" | "new">("home");
    const [query, setQuery] = useState("");
    const [greetingText, setGreetingText] = useState("Good evening");

    useEffect(() => {
        const h = new Date().getHours();
        if (h < 12) {
            setGreetingText("Good morning");
        } else if (h < 17) {
            setGreetingText("Good afternoon");
        } else {
            setGreetingText("Good evening");
        }
    }, []);

    const search = query.trim().toLocaleLowerCase();

    const matchingTemplates = templates.filter((template) =>
        [
            template.name,
            template.category,
            template.description,
        ].some((value) => value.toLocaleLowerCase().includes(search))
    );

    const visibleTemplates =
        tab === "home" && !search
            ? matchingTemplates.slice(0, 5)
            : matchingTemplates;

    const matchingRecent = recentFiles.filter((file) =>
        file.name.toLocaleLowerCase().includes(search)
    );

    return (
        <section
            aria-label="ALIMXL Home"
            className="fixed inset-0 z-[100] flex flex-col bg-[#FAFAFA] text-[#242424] print:hidden"
        >
            <header className="flex min-h-14 flex-wrap items-center gap-3 border-b border-[#E1DFDD] bg-[#F3F3F3] px-4 py-2">
                <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded bg-[#107C41] text-sm font-black text-white">
                        AX
                    </span>

                    <span className="font-semibold">ALIMXL</span>
                </div>

                <label className="mx-auto w-full max-w-xl sm:w-auto sm:flex-1">
                    <span className="sr-only">Search templates and recent files</span>
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search templates and recent files"
                        className="w-full rounded-md border border-[#D2D0CE] bg-white px-4 py-2 text-sm outline-none focus:border-[#107C41] focus:ring-2 focus:ring-[#107C41]/20"
                    />
                </label>

                <button
                    type="button"
                    onClick={onContinue}
                    className="rounded-md border border-[#C8C6C4] bg-white px-3 py-2 text-sm hover:bg-[#EDEBE9]"
                >
                    Back to workbook
                </button>
            </header>

            <div className="flex min-h-0 flex-1">
                <aside className="flex w-24 shrink-0 flex-col bg-[#107C41] text-white sm:w-44">
                    <nav aria-label="Home navigation" className="pt-2">
                        {[
                            { key: "home", label: "Home", icon: Icons.Home, active: tab === "home", onClick: () => setTab("home") },
                            { key: "new", label: "New", icon: Icons.FilePlus, active: tab === "new", onClick: () => setTab("new") },
                            { key: "open", label: "Open", icon: Icons.FolderOpen, active: false, onClick: onOpen },
                            { key: "files", label: "My Files", icon: Icons.HardDrive, active: false, onClick: onMyFiles },
                        ].map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={item.onClick}
                                    aria-current={item.active ? "page" : undefined}
                                    className={`flex w-full flex-col items-center gap-2 px-2 py-5 text-sm ${
                                        item.active ? "bg-black/25" : "hover:bg-white/10"
                                    }`}
                                >
                                    <Icon size={26} strokeWidth={1.5} />
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>

                    <p className="mt-auto p-3 text-xs leading-5 text-white/75 sm:p-6">
                        ALIMXL
                        <br />
                        Your spreadsheet workspace
                    </p>
                </aside>

                <main className="min-w-0 flex-1 overflow-y-auto px-5 py-7 sm:px-10 lg:px-14">
                    <h1 className="text-2xl font-semibold sm:text-3xl">
                        {tab === "home" ? greetingText : "Create a new workbook"}
                    </h1>

                    <p className="mt-2 text-sm text-[#605E5C]">
                        Start with a blank workbook or choose a ready-made template.
                    </p>

                    <section aria-labelledby="alimxl-new-heading" className="mt-8">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <h2 id="alimxl-new-heading" className="text-xl font-semibold">
                                {tab === "home" ? "New" : "Template library"}
                            </h2>

                            {tab === "home" && (
                                <button
                                    type="button"
                                    onClick={() => setTab("new")}
                                    className="text-sm font-semibold text-[#107C41] hover:underline"
                                >
                                    More templates →
                                </button>
                            )}
                        </div>

                        <div
                            className={
                                tab === "home"
                                    ? "flex gap-5 overflow-x-auto pb-2"
                                    : "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
                            }
                        >
                            <button
                                type="button"
                                onClick={onBlank}
                                className={`group rounded-lg p-2 text-left outline-none hover:bg-[#EEF5F0] focus-visible:ring-2 focus-visible:ring-[#107C41] ${
                                    tab === "home" ? "w-44 shrink-0" : ""
                                }`}
                            >
                                <div className="relative h-36 overflow-hidden rounded border border-[#D2D0CE] bg-white">
                                    <div className="h-5 border-b border-[#D2D0CE] bg-[#F3F3F3]" />

                                    <div className="grid h-28 grid-cols-5 grid-rows-5">
                                        {Array.from({ length: 25 }, (_, index) => (
                                            <span
                                                key={index}
                                                className={`border-b border-r border-[#E8E8E8] ${
                                                    index === 0
                                                        ? "outline outline-2 -outline-offset-2 outline-[#107C41]"
                                                        : ""
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <p className="mt-3 text-center text-sm font-semibold">
                                    Blank workbook
                                </p>
                            </button>

                            {visibleTemplates.map((template, index) => {
                                const accent = ACCENTS[index % ACCENTS.length];

                                return (
                                    <button
                                        key={template.id}
                                        type="button"
                                        onClick={() => onTemplate(template.id)}
                                        className={`group rounded-lg p-2 text-left outline-none hover:bg-[#EEF5F0] focus-visible:ring-2 focus-visible:ring-[#107C41] ${
                                            tab === "home" ? "w-44 shrink-0" : ""
                                        }`}
                                    >
                                        <div className="relative h-36 overflow-hidden rounded border border-[#D2D0CE] bg-white">
                                            <div
                                                className="h-2"
                                                style={{ backgroundColor: accent }}
                                            />

                                            <div className="p-3">
                                                <p
                                                    className="text-[10px] font-bold uppercase tracking-wider"
                                                    style={{ color: accent }}
                                                >
                                                    {template.category}
                                                </p>

                                                <p className="mt-1 line-clamp-2 text-sm font-semibold">
                                                    {template.name}
                                                </p>

                                                <div className="mt-3 space-y-1.5" aria-hidden="true">
                                                    {[100, 85, 95].map((width, row) => (
                                                        <div
                                                            key={row}
                                                            className="h-2 rounded-sm"
                                                            style={{
                                                                width: `${width}%`,
                                                                backgroundColor: accent,
                                                                opacity: row === 0 ? 0.3 : 0.12,
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <p className="mt-3 text-center text-sm font-semibold">
                                            {template.name}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>

                        {matchingTemplates.length === 0 && (
                            <p className="mt-4 text-sm text-[#605E5C]">
                                No templates match your search.
                            </p>
                        )}
                    </section>

                    {tab === "home" && (
                        <section
                            aria-labelledby="alimxl-recent-heading"
                            className="mt-9 border-t border-[#E1DFDD] pt-6"
                        >
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <h2
                                    id="alimxl-recent-heading"
                                    className="border-b-4 border-[#107C41] pb-2 text-xl font-semibold"
                                >
                                    Recent
                                </h2>

                                <button
                                    type="button"
                                    onClick={onMyFiles}
                                    className="text-sm font-semibold text-[#107C41] hover:underline"
                                >
                                    More workbooks →
                                </button>
                            </div>

                            <div className="flex justify-between border-b border-[#E1DFDD] px-3 py-2 text-xs text-[#605E5C]">
                                <span>Name</span>
                                <span>Date modified</span>
                            </div>

                            {matchingRecent.length === 0 ? (
                                <p className="py-8 text-sm text-[#605E5C]">
                                    No recent workbooks found.
                                </p>
                            ) : (
                                matchingRecent.map((file) => (
                                    <button
                                        key={file.id}
                                        type="button"
                                        onClick={() => onRecent(file.id)}
                                        className="flex w-full items-center justify-between gap-4 border-b border-[#E1DFDD] px-3 py-4 text-left hover:bg-[#EEF5F0] focus-visible:outline-[#107C41]"
                                    >
                                        <span className="flex min-w-0 items-center gap-3">
                                            <span className="rounded bg-[#107C41] px-2 py-2 text-xs font-bold text-white">
                                                AX
                                            </span>

                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-semibold">
                                                    {file.name}
                                                </span>
                                                <span className="block text-xs text-[#605E5C]">
                                                    Recent workbook
                                                </span>
                                            </span>
                                        </span>

                                        <span className="shrink-0 text-xs text-[#605E5C]">
                                            {relativeTime(file.openedAt)}
                                        </span>
                                    </button>
                                ))
                            )}
                        </section>
                    )}
                </main>
            </div>
        </section>
    );
}