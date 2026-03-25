import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
    value: string;
    onChange: (_v: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function PasswordInput({ value, onChange, placeholder, disabled }: PasswordInputProps) {
    const [visible, setVisible] = React.useState(false);

    return (
        <div className="relative w-full">
            <input
                type={visible ? 'text' : 'password'}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder ?? '••••••••'}
                disabled={disabled}
                className="w-full bg-[var(--bg-3)] outline-none rounded-[var(--r-sm)] focus:border-[var(--border-focus)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                    height: 'var(--input-height)',
                    padding: '0 36px 0 10px',
                    fontSize: 'var(--text-base)',
                    fontFamily: "'JetBrains Mono Variable', monospace",
                    color: 'var(--text-0)',
                    border: '1px solid var(--border-1)',
                }}
                spellCheck={false}
            />
            <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer transition-colors hover:text-[var(--text-1)] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: 'var(--text-2)' }}
                onClick={() => setVisible(v => !v)}
                disabled={disabled}
                tabIndex={-1}
                aria-label={visible ? 'Hide password' : 'Show password'}
            >
                {visible ? (
                    <EyeOff style={{ width: 14, height: 14 }} />
                ) : (
                    <Eye style={{ width: 14, height: 14 }} />
                )}
            </button>
        </div>
    );
}
