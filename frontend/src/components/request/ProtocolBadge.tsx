import { useAppStore, selectEditing, type Protocol } from '@/store/app';
import { Globe, Zap, Radio, MessageSquare, Wifi } from 'lucide-react';
import React from 'react';

// ── Protocol metadata ─────────────────────────────────────────────────────

export const PROTOCOL_META: {
    id: Protocol;
    label: string;
    color: string;
    icon: React.ElementType;
}[] = [
    { id: 'http', label: 'HTTP', color: 'var(--accent)', icon: Globe },
    { id: 'grpc', label: 'gRPC', color: 'var(--purple)', icon: Zap },
    { id: 'kafka', label: 'Kafka', color: 'var(--orange)', icon: Radio },
    { id: 'sqs', label: 'SQS', color: 'var(--yellow)', icon: MessageSquare },
    { id: 'websocket', label: 'WS', color: '#22c55e', icon: Wifi },
];

export function getProtocolMeta(id: Protocol) {
    return PROTOCOL_META.find(p => p.id === id) ?? PROTOCOL_META[0];
}

// ── ProtocolBadge — display only ──────────────────────────────────────────

export function ProtocolBadge() {
    const protocol = useAppStore(s => selectEditing(s)?.protocol ?? 'http');
    const meta = getProtocolMeta(protocol);
    const Icon = meta.icon;

    return (
        <div
            className="flex items-center gap-1.5 rounded shrink-0"
            style={{
                height: 'var(--input-height)',
                padding: '0 8px',
                background: 'var(--bg-2)',
                border: '1px solid var(--border-1)',
            }}
        >
            <Icon style={{ width: 12, height: 12, color: meta.color }} />
            <span
                style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    color: meta.color,
                    letterSpacing: '0.03em',
                }}
            >
                {meta.label}
            </span>
        </div>
    );
}
