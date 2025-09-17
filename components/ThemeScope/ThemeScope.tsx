// components/ThemeScope/ThemeScope.tsx
'use client';
import React from 'react';
import type { ThemeName } from '@/lib/validation/theme';

type Props = {
    theme?: ThemeName;
    className?: string;
    children: React.ReactNode;
};

export default function ThemeScope({ theme, className, children }: Props) {
    return (
        <div data-theme={theme} className={className}>
            {children}
        </div>
    );
}
