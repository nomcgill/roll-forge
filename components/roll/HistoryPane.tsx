"use client";
import { useEffect } from "react";

export default function HistoryPane({ onHasHistoryChange }: { onHasHistoryChange?: (has: boolean) => void }) {
    // For now, there is no history until M5 implement, then true/false will be passed to onHasHistoryChange
    useEffect(() => {
        onHasHistoryChange?.(false);
    }, [onHasHistoryChange]);

    return (
        <div className="min-h-full">
            <div className="text-center text-slate-400 mt-8">
                <p className="text-sm">No rolls yet.</p>
                <p className="text-xs mt-1">Use “Roll Them Bones” to create your first Action Group.</p>
            </div>
        </div>
    );
}
