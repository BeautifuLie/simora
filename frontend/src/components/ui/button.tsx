import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-all duration-150 select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
    {
        variants: {
            variant: {
                default:
                    'rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]',
                ghost: 'rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
                outline:
                    'rounded border border-[var(--border-default)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)]',
                accent: 'rounded bg-[var(--accent)] text-[#0d1117] font-semibold hover:brightness-110',
                destructive:
                    'rounded bg-[var(--error-muted)] text-[var(--error)] hover:bg-[var(--error)] hover:text-white',
                icon: 'rounded text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]',
            },
            size: {
                sm: 'h-6 px-2 text-[11px]',
                default: 'h-7 px-3 text-[12px]',
                lg: 'h-8 px-4 text-[13px]',
                icon: 'h-6 w-6',
                'icon-sm': 'h-5 w-5',
                'icon-lg': 'h-8 w-8',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';
export { buttonVariants };
