// components/CharacterDetails/EditSettingsClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CharacterSettingsBlock from "@/components/CharacterDetails/CharacterSettingsBlock";
import { readThemeFromPreferences } from "@/lib/validation/theme";


type Props = {
    characterId: string;
    initialName: string;
    initialAvatarUrl: string;
    initialPreferences: unknown | null;
    asInlineIcon?: boolean; // when true, show small pencil next to the name
};

export default function EditSettingsClient(props: Props) {
    const [open, setOpen] = useState(false);
    const theme = readThemeFromPreferences(props.initialPreferences as any);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const lastFocused = useRef<HTMLElement | null>(null);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (!open) return;
        const { overflow } = document.body.style;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = overflow;
        };
    }, [open]);

    // Close helpers

    const router = useRouter();
    const close = useCallback(() => {
        setOpen(false);
        // ensure any last-second debounced PATCH is reflected
        router.refresh();
        // restore focus
        setTimeout(() => {
            (lastFocused.current as HTMLElement | null)?.focus?.();
        }, 0);
    }, [router]);

    // ESC to close
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, close]);

    // Click backdrop to close
    const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) close();
    };

    const onOpen = () => {
        lastFocused.current = document.activeElement as HTMLElement | null;
        setOpen(true);
    };

    const triggerClasses = props.asInlineIcon
        ? "ml-1 inline-flex items-center justify-center rounded-md border border-slate-600/70 hover:bg-slate-800 text-slate-200 w-7 h-7"
        : "rounded-lg bg-slate-700/70 hover:bg-slate-600 px-3 py-1.5 text-xs font-semibold";

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={onOpen}
                className={triggerClasses}
                aria-label="Edit Character"
                aria-haspopup="dialog"
            >
                {props.asInlineIcon ? (
                    // pencil icon
                    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="opacity-90">
                        <path
                            d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm14.71-9.54a1.003 1.003 0 0 0 0-1.42l-2-2a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.5-1.5z"
                            fill="currentColor"
                        />
                    </svg>
                ) : (
                    "Edit Settings"
                )}
            </button>

            {open &&
                createPortal(
                    <div
                        data-testid="char-settings-backdrop"
                        className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
                        onMouseDown={onBackdropClick}
                        role="presentation"
                    >
                        {/* Dialog */}
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="char-settings-title"
                            className={`relative rounded-2xl border shadow-2xl w-[420px] max-w-[90vw] max-h-[85vh] overflow-hidden
                                ${theme === "ember"
                                    ? "bg-red-950/90 border-red-700/70"
                                    : theme === "azure"
                                        ? "bg-blue-950/90 border-blue-700/70"
                                        : theme === "verdant"
                                            ? "bg-green-950/90 border-green-700/70"
                                            : theme === "amethyst"
                                                ? "bg-purple-950/90 border-purple-700/70"
                                                : "bg-slate-950 border-slate-800"
                                }
                            `} onMouseDown={(e) => e.stopPropagation()} // prevent backdrop close when clicking inside
                        >
                            {/* Top bar with back (left arrow) */}
                            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
                                <button
                                    type="button"
                                    onClick={close}
                                    aria-label="Close settings"
                                    className="inline-flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-slate-800"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor" />
                                    </svg>
                                    <span className="hidden sm:inline">Back</span>
                                </button>

                                <h2 id="char-settings-title" className="text-sm font-semibold">
                                    Edit Character Preferences
                                </h2>

                                {/* spacer to balance layout */}
                                <div className="w-12" />
                            </div>

                            {/* Scrollable content */}
                            <div className="p-4 overflow-y-auto max-h-[calc(85vh-96px)]">
                                <CharacterSettingsBlock
                                    characterId={props.characterId}
                                    initialName={props.initialName}
                                    initialAvatarUrl={props.initialAvatarUrl}
                                    initialPreferences={props.initialPreferences}
                                // We handle Save/Cancel via footer buttons; form itself saves on change.
                                />
                            </div>

                            {/* Footer with Default (left), Cancel/Save (right) */}
                            <ModalFooter
                                onDefault={() =>
                                    document.dispatchEvent(new CustomEvent("char-settings-default", { detail: null }))
                                }
                                onCancel={() =>
                                    document.dispatchEvent(new CustomEvent("char-settings-cancel", { detail: null }))
                                }
                                onSave={close}
                            />
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}

function ModalFooter({
    onDefault,
    onCancel,
    onSave,
}: {
    onDefault: () => void;
    onCancel: () => void;
    onSave: () => void;
}) {
    return (
        <div className="flex items-center justify-between gap-2 px-3 py-3 border-t border-slate-800">
            <button
                type="button"
                onClick={onDefault}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs hover:bg-slate-800"
            >
                Default
            </button>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs hover:bg-slate-800"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onSave}
                    className="rounded-lg bg-slate-200 text-slate-900 hover:bg-white px-3 py-1.5 text-xs font-semibold"
                >
                    Save
                </button>
            </div>
        </div>
    );
}
