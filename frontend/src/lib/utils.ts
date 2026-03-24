import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Platform detection
export const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

// Returns platform-aware modifier key label: '⌘' on Mac, 'Ctrl' on others
export const modKey = isMac ? '⌘' : 'Ctrl';

// Formats a keyboard shortcut for display, e.g. shortcut('K') → '⌘K' or 'Ctrl+K'
export function shortcut(key: string): string {
    return isMac ? `⌘${key}` : `Ctrl+${key}`;
}
