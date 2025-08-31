"use client";

import React from "react";

export type DamageTypeSelectProps = {
    value: string | null;
    onChange: (next: string | null) => void;
    options: string[];            // built-ins + preferences.uniqueDamageTypes
    allowNull?: boolean;          // when true, user can pick null
    nullLabel?: string;           // e.g., "leave blank" or "None (base)"
    helperWhenNullText?: string;  // small hint when value === null
    hasError?: boolean;           // add red border when true
    className?: string;
    id?: string;
};

export default function DamageTypeSelect({
    value,
    onChange,
    options,
    allowNull = false,
    nullLabel = "leave blank",
    helperWhenNullText,
    hasError = false,
    className = "",
    id,
}: DamageTypeSelectProps) {
    return (
        <div className={className}>
            <select
                id={id}
                className={`w-full px-2 py-1 rounded-lg bg-slate-900 border ${hasError ? "border-red-500" : "border-slate-700"}`}
                value={value ?? "__NULL__"}
                onChange={(e) => onChange(e.target.value === "__NULL__" ? null : e.target.value)}
                aria-invalid={hasError}
            >
                {allowNull && <option value="__NULL__">{nullLabel}</option>}
                {options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                ))}
            </select>
            {helperWhenNullText && value === null && (
                <p className="text-[11px] text-slate-400 mt-1">{helperWhenNullText}</p>
            )}
        </div>
    );
}
