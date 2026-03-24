import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    'flex w-full rounded border border-[var(--border-default)]',
                    'bg-[var(--bg-elevated)] px-3 py-1.5 text-[12px]',
                    'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
                    'transition-all duration-150',
                    'hover:border-[var(--border-strong)]',
                    'focus:outline-none focus:border-[var(--border-focus)]',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = 'Input';
