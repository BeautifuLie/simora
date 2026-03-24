import React from 'react';
import { createPortal } from 'react-dom';
import { X, Keyboard } from 'lucide-react';

// ── Platform detection ────────────────────────────────────────────────────
const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

// ── Key badge ────────────────────────────────────────────────────────────

function Key({ children }: { children: React.ReactNode }) {
    return (
        <kbd
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 22,
                height: 22,
                padding: '0 6px',
                background: 'var(--bg-4)',
                border: '1px solid var(--border-2)',
                borderBottomWidth: 2,
                borderRadius: 'var(--r-sm)',
                fontSize: isMac ? 13 : 11,
                fontFamily: isMac ? 'inherit' : 'monospace',
                fontWeight: 500,
                color: 'var(--text-0)',
                lineHeight: 1,
                letterSpacing: 0,
            }}
        >
            {children}
        </kbd>
    );
}

function Keys({ keys }: { keys: string[] }) {
    return (
        <div className="flex items-center gap-1">
            {keys.map((k, i) => (
                <Key key={i}>{k}</Key>
            ))}
        </div>
    );
}

// ── Shortcut row ──────────────────────────────────────────────────────────

const mod = isMac ? '⌘' : 'Ctrl';
const alt = isMac ? '⌥' : 'Alt';
const shift = isMac ? '⇧' : 'Shift';
const enter = isMac ? '↵' : 'Enter';

// suppress unused variable warnings – alt/shift/enter are referenced in SHORTCUT_GROUPS
void alt;

interface Shortcut {
    keys: string[];
    label: string;
}

interface ShortcutGroup {
    title: string;
    shortcuts: Shortcut[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
    {
        title: 'Navigation',
        shortcuts: [
            { keys: [mod, 'K'], label: 'Command palette' },
            { keys: [mod, 'T'], label: 'New tab' },
            { keys: [mod, 'D'], label: 'Duplicate tab' },
            { keys: [mod, 'E'], label: 'Environments panel' },
            { keys: [mod, ','], label: 'Settings' },
            { keys: [mod, shift, '/'], label: 'Keyboard shortcuts' },
        ],
    },
    {
        title: 'Request',
        shortcuts: [
            { keys: [mod, enter], label: 'Send request' },
            { keys: [mod, 'S'], label: 'Save request' },
        ],
    },
    {
        title: 'Editor',
        shortcuts: [
            { keys: ['F2'], label: 'Rename item' },
            { keys: ['Esc'], label: 'Close panel / cancel' },
        ],
    },
];

// ── Modal ────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    onClose: () => void;
}

export function KeyboardShortcutsModal({ open, onClose }: Props) {
    React.useEffect(() => {
        if (!open) return;
        const h = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[600] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="relative flex flex-col animate-context-in overflow-hidden"
                style={{
                    width: 520,
                    maxHeight: '80vh',
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border-2)',
                    borderRadius: 'var(--r-xl)',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center gap-3 shrink-0 px-5"
                    style={{ height: 52, borderBottom: '1px solid var(--border-0)' }}
                >
                    <Keyboard
                        style={{ width: 15, height: 15, color: 'var(--accent)', flexShrink: 0 }}
                    />
                    <span
                        style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-0)', flex: 1 }}
                    >
                        Keyboard Shortcuts
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
                        {isMac ? 'macOS' : 'Windows / Linux'}
                    </span>
                    <button
                        className="flex items-center justify-center rounded-[var(--r-sm)] cursor-pointer transition-colors hover:bg-[var(--bg-3)]"
                        style={{ width: 26, height: 26, color: 'var(--text-2)', marginRight: -4 }}
                        onClick={onClose}
                    >
                        <X style={{ width: 13, height: 13 }} />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-5 flex flex-col gap-6">
                    {SHORTCUT_GROUPS.map(group => (
                        <div key={group.title} className="flex flex-col gap-1">
                            <div
                                style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    color: 'var(--text-2)',
                                    marginBottom: 6,
                                    paddingBottom: 5,
                                    borderBottom: '1px solid var(--border-0)',
                                }}
                            >
                                {group.title}
                            </div>
                            {group.shortcuts.map((s, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between"
                                    style={{ height: 34, padding: '0 4px' }}
                                >
                                    <span style={{ fontSize: 12.5, color: 'var(--text-1)' }}>
                                        {s.label}
                                    </span>
                                    <Keys keys={s.keys} />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div
                    className="flex items-center justify-center shrink-0 px-5"
                    style={{ height: 40, borderTop: '1px solid var(--border-0)' }}
                >
                    <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
                        Press <Key>Esc</Key> to close
                    </span>
                </div>
            </div>
        </div>,
        document.body
    );
}
