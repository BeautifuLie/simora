import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { PasswordInput } from './PasswordInput';

export type PasswordModalMode = 'export' | 'import';

interface PasswordModalProps {
    mode: PasswordModalMode;
    onConfirm: (_password: string) => void;
    onCancel: () => void;
}

export function PasswordModal({ mode, onConfirm, onCancel }: PasswordModalProps) {
    const [password, setPassword] = React.useState('');
    const [confirm, setConfirm] = React.useState('');
    const inputRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handle = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', handle);
        return () => document.removeEventListener('keydown', handle);
    }, [onCancel]);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!password) return;
        if (mode === 'export' && password !== confirm) return;
        onConfirm(password);
    }

    const mismatch = mode === 'export' && confirm !== '' && password !== confirm;
    const canSubmit = password.length > 0 && (mode === 'import' || password === confirm);

    const title = mode === 'export' ? 'Export with credentials' : 'Import encrypted collection';
    const description =
        mode === 'export'
            ? 'Set a password to encrypt credentials in the export file. You will need this password when importing on another machine.'
            : 'Enter the password that was used when this collection was exported.';
    const submitLabel = mode === 'export' ? 'Export' : 'Import';

    return createPortal(
        <div
            className="fixed inset-0 z-[600] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
            onMouseDown={e => {
                if (e.target === e.currentTarget) onCancel();
            }}
        >
            <div
                ref={inputRef}
                className="flex flex-col"
                style={{
                    width: 380,
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border-2)',
                    borderRadius: 'var(--r-lg)',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
                    overflow: 'hidden',
                }}
                onMouseDown={e => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between shrink-0"
                    style={{
                        padding: '14px 16px 12px',
                        borderBottom: '1px solid var(--border-1)',
                    }}
                >
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)' }}>
                        {title}
                    </span>
                    <button
                        className="cursor-pointer transition-colors hover:text-[var(--text-1)]"
                        style={{ color: 'var(--text-2)' }}
                        onClick={onCancel}
                        aria-label="Close"
                    >
                        <X style={{ width: 14, height: 14 }} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={submit} style={{ padding: '16px' }}>
                    <p
                        style={{
                            fontSize: 12,
                            color: 'var(--text-2)',
                            lineHeight: 1.5,
                            marginBottom: 14,
                        }}
                    >
                        {description}
                    </p>

                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label
                                style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-1)' }}
                            >
                                Password
                            </label>
                            <PasswordInput
                                value={password}
                                onChange={setPassword}
                                placeholder="Enter password"
                            />
                        </div>

                        {mode === 'export' && (
                            <div className="flex flex-col gap-1.5">
                                <label
                                    style={{
                                        fontSize: 11.5,
                                        fontWeight: 500,
                                        color: 'var(--text-1)',
                                    }}
                                >
                                    Confirm password
                                </label>
                                <PasswordInput
                                    value={confirm}
                                    onChange={setConfirm}
                                    placeholder="Confirm password"
                                />
                                {mismatch && (
                                    <span style={{ fontSize: 11, color: 'var(--red)' }}>
                                        Passwords do not match
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2" style={{ marginTop: 18 }}>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="cursor-pointer rounded-[var(--r-sm)] transition-colors"
                            style={{
                                height: 28,
                                padding: '0 12px',
                                fontSize: 12,
                                fontWeight: 500,
                                color: 'var(--text-1)',
                                border: '1px solid var(--border-1)',
                                background: 'var(--bg-3)',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="cursor-pointer rounded-[var(--r-sm)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                                height: 28,
                                padding: '0 12px',
                                fontSize: 12,
                                fontWeight: 500,
                                color: 'white',
                                background: 'var(--accent)',
                                border: '1px solid var(--accent)',
                            }}
                        >
                            {submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
