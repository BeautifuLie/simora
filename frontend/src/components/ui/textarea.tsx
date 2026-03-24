import React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    'flex w-full rounded border border-[var(--border-default)]',
                    'bg-[var(--bg-elevated)] px-3 py-2 text-[12px] font-mono',
                    'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
                    'transition-all duration-150 resize-none',
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
Textarea.displayName = 'Textarea';
