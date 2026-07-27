import React from 'react';
import { cn } from '@/lib/utils';
import type { HttpMethod } from '@/store/app';

const METHOD_STYLES: Record<HttpMethod, { color: string; bg: string }> = {
    GET: { color: 'var(--m-get)', bg: 'var(--m-get-bg)' },
    POST: { color: 'var(--m-post)', bg: 'var(--m-post-bg)' },
    PUT: { color: 'var(--m-put)', bg: 'var(--m-put-bg)' },
    PATCH: { color: 'var(--m-patch)', bg: 'var(--m-patch-bg)' },
    DELETE: { color: 'var(--m-delete)', bg: 'var(--m-delete-bg)' },
    HEAD: { color: 'var(--m-head)', bg: 'var(--m-head-bg)' },
    OPTIONS: { color: 'var(--m-options)', bg: 'var(--m-options-bg)' },
};

export function MethodBadge({
    method,
    compact = false,
}: {
    method: HttpMethod;
    compact?: boolean;
}) {
    const s = METHOD_STYLES[method] ?? METHOD_STYLES.GET;
    return (
        <span
            className={cn(
                'inline-flex items-center justify-center rounded shrink-0',
                'font-mono font-bold tracking-wider'
            )}
            style={{
                color: s.color,
                background: s.bg,
                fontSize: compact ? 9 : 10,
                height: compact ? 14 : 18,
                minWidth: compact ? 28 : 40,
                padding: compact ? '0 4px' : '0 6px',
            }}
        >
            {method}
        </span>
    );
}

export function StatusBadge({ status }: { status: number }) {
    const is2xx = status >= 200 && status < 300;
    const is3xx = status >= 300 && status < 400;
    const is4xx = status >= 400 && status < 500;
    const is5xx = status >= 500;

    const color = is2xx
        ? 'var(--green)'
        : is3xx
          ? 'var(--blue)'
          : is4xx
            ? 'var(--yellow)'
            : is5xx
              ? 'var(--red)'
              : 'var(--text-1)';
    const bg = is2xx
        ? 'var(--green-dim)'
        : is3xx
          ? 'var(--blue-dim)'
          : is4xx
            ? 'var(--yellow-dim)'
            : is5xx
              ? 'var(--red-dim)'
              : 'transparent';
    const label = is2xx
        ? 'OK'
        : is3xx
          ? 'Redirect'
          : is4xx
            ? 'Client Error'
            : is5xx
              ? 'Server Error'
              : '';

    return (
        <span
            className="inline-flex items-center gap-1.5 rounded font-medium"
            style={{ color, background: bg, fontSize: 'var(--text-base)', padding: '2px 8px' }}
        >
            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{status}</span>
            <span style={{ opacity: 0.75, fontSize: 'var(--text-sm)' }}>{label}</span>
        </span>
    );
}
