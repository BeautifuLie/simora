import React from 'react';
import { Globe, Braces, Zap, GitBranch, Cloud, ArrowRight, FileJson, Plus } from 'lucide-react';
import logo from '@/assets/logo.png';
import { useAppStore } from '@/store/app';
import { shortcut } from '@/lib/utils';

// ── Protocol cards ────────────────────────────────────────────────────────

interface ProtoCard {
    icon: React.FC<{ style?: React.CSSProperties }>;
    label: string;
    color: string;
    desc: string;
    badge?: string;
}

const PROTOCOLS: ProtoCard[] = [
    {
        icon: Globe,
        label: 'HTTP / REST',
        color: 'var(--m-get)',
        desc: 'GET, POST, PUT, PATCH, DELETE with headers, auth, params and body',
    },
    {
        icon: Braces,
        label: 'GraphQL',
        color: 'var(--purple)',
        desc: 'Queries and mutations with variable editor and response explorer',
    },
    {
        icon: Zap,
        label: 'gRPC',
        color: 'var(--blue)',
        desc: 'Invoke RPC methods via server reflection — no .proto file needed',
    },
    {
        icon: GitBranch,
        label: 'Kafka',
        color: 'var(--orange)',
        desc: 'Produce and consume messages with SASL auth and Protobuf support',
    },
    {
        icon: Cloud,
        label: 'AWS SQS',
        color: 'var(--yellow)',
        desc: 'Send and receive messages with credentials and message attributes',
    },
];

function ProtocolCard({ card }: { card: ProtoCard }) {
    return (
        <div
            className="flex flex-col gap-3"
            style={{
                background: 'var(--bg-2)',
                border: `1px solid var(--border-1)`,
                borderRadius: 'var(--r-lg)',
                padding: '16px',
            }}
        >
            <div className="flex items-center gap-2.5">
                <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--r-md)',
                        background: `color-mix(in srgb, ${card.color} 14%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${card.color} 25%, transparent)`,
                    }}
                >
                    <card.icon style={{ width: 15, height: 15, color: card.color }} />
                </div>
                <span
                    style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-0)',
                        letterSpacing: '-0.01em',
                    }}
                >
                    {card.label}
                </span>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>
                {card.desc}
            </p>
        </div>
    );
}

// ── Feature list ──────────────────────────────────────────────────────────

const FEATURES = [
    'Environment variables with  {{syntax}}  across all requests',
    'Transform responses — filter fields, export to CSV / YAML / JSON',
    'Script-based test runner with  pm.expect()  assertions',
    'Import Postman v2.1 and Insomnia v4 collections',
    'Native save dialog — no browser file-download hacks',
];

// ── WelcomeScreen ─────────────────────────────────────────────────────────

export function WelcomeScreen() {
    const { createOrganization, createProject, setActiveOrg, setActiveProject, organizations } =
        useAppStore();
    const [loading, setLoading] = React.useState(false);
    const mountedRef = React.useRef(true);
    React.useEffect(
        () => () => {
            mountedRef.current = false;
        },
        []
    );

    function handleGetStarted() {
        setLoading(true);
        const orgId = crypto.randomUUID();
        const projId = crypto.randomUUID();
        createOrganization('My Workspace');
        // createOrganization uses its own id logic; read back from state
        // Use setTimeout to let store settle, then navigate
        const t1 = setTimeout(() => {
            if (!mountedRef.current) return;
            const orgs = useAppStore.getState().organizations;
            const org = orgs[orgs.length - 1];
            if (!org) {
                setLoading(false);
                return;
            }
            createProject(org.id, 'Default Project');
            const t2 = setTimeout(() => {
                if (!mountedRef.current) return;
                const updatedOrg = useAppStore.getState().organizations.find(o => o.id === org.id);
                const proj = updatedOrg?.projects?.[updatedOrg.projects.length - 1];
                if (!proj) {
                    setLoading(false);
                    return;
                }
                setActiveOrg(org.id);
                setActiveProject(proj.id);
                setLoading(false);
            }, 0);
            void t2;
        }, 0);
        void t1;
        void orgId;
        void projId;
    }

    function handleLoadSamples() {
        setLoading(true);
        const orgId = crypto.randomUUID();
        const projId = crypto.randomUUID();
        void orgId;
        void projId;

        createOrganization('Sample Workspace');
        const t1 = setTimeout(() => {
            if (!mountedRef.current) return;
            const orgs = useAppStore.getState().organizations;
            const org = orgs[orgs.length - 1];
            if (!org) {
                setLoading(false);
                return;
            }

            createProject(org.id, 'Demo Project');
            const t2 = setTimeout(() => {
                if (!mountedRef.current) return;
                const updatedOrg = useAppStore.getState().organizations.find(o => o.id === org.id);
                const proj = updatedOrg?.projects?.[updatedOrg.projects.length - 1];
                if (!proj) {
                    setLoading(false);
                    return;
                }

                // Create a sample collection with starter requests
                const { importCollection } = useAppStore.getState();
                importCollection(org.id, proj.id, {
                    id: crypto.randomUUID(),
                    name: 'Starter Requests',
                    folders: [],
                    requests: [
                        {
                            id: crypto.randomUUID(),
                            name: 'GET JSONPlaceholder posts',
                            protocol: 'http',
                            method: 'GET',
                            url: 'https://jsonplaceholder.typicode.com/posts',
                            params: [],
                            headers: [],
                            body: '',
                            bodyType: 'json',
                            formFields: [],
                            binaryFileName: '',
                            auth: { type: 'none' },
                            notes: '',
                        } as any,
                        {
                            id: crypto.randomUUID(),
                            name: 'POST create post',
                            protocol: 'http',
                            method: 'POST',
                            url: 'https://jsonplaceholder.typicode.com/posts',
                            params: [],
                            headers: [
                                { key: 'Content-Type', value: 'application/json', enabled: true },
                            ],
                            body: '{\n  "title": "Hello Simora",\n  "body": "Testing the API client",\n  "userId": 1\n}',
                            bodyType: 'json',
                            formFields: [],
                            binaryFileName: '',
                            auth: { type: 'none' },
                            notes: '',
                        } as any,
                        {
                            id: crypto.randomUUID(),
                            name: 'GraphQL — SpaceX launches',
                            protocol: 'graphql',
                            method: 'POST',
                            url: 'https://spacex-production.up.railway.app/',
                            params: [],
                            headers: [],
                            body: '',
                            bodyType: 'json',
                            formFields: [],
                            binaryFileName: '',
                            auth: { type: 'none' },
                            notes: '',
                            graphql: {
                                query: 'query {\n  launchesPast(limit: 5) {\n    mission_name\n    launch_date_utc\n    rocket {\n      rocket_name\n    }\n  }\n}',
                                variables: '{}',
                            },
                        } as any,
                    ],
                } as any);

                setActiveOrg(org.id);
                setActiveProject(proj.id);
                setLoading(false);
            }, 0);
            void t2;
        }, 0);
        void t1;
    }

    // If orgs already exist but no tab open, don't show welcome
    if (organizations.length > 0) return null;

    return (
        <div className="flex flex-col h-full overflow-y-auto" style={{ background: 'var(--bg-1)' }}>
            <div
                className="flex flex-col items-center w-full"
                style={{ maxWidth: 760, margin: '0 auto', padding: '48px 32px 64px' }}
            >
                {/* ── Hero ─────────────────────────────────────────────────── */}
                <div
                    className="flex flex-col items-center text-center"
                    style={{ marginBottom: 48 }}
                >
                    {/* Logo mark */}
                    <img
                        src={logo}
                        alt="Simora"
                        style={{ width: 72, height: 72, borderRadius: 18, marginBottom: 20 }}
                    />

                    <h1
                        style={{
                            fontSize: 32,
                            fontWeight: 700,
                            color: 'var(--text-0)',
                            letterSpacing: '-0.04em',
                            lineHeight: 1.15,
                            marginBottom: 10,
                        }}
                    >
                        Welcome to Simora
                    </h1>
                    <p
                        style={{
                            fontSize: 14.5,
                            color: 'var(--text-2)',
                            lineHeight: 1.6,
                            maxWidth: 460,
                        }}
                    >
                        A desktop API client for HTTP, GraphQL, gRPC, Kafka and AWS SQS - all in one
                        app.
                    </p>
                </div>

                {/* ── CTA buttons ──────────────────────────────────────────── */}
                <div className="flex items-center gap-3" style={{ marginBottom: 56 }}>
                    <button
                        disabled={loading}
                        className="flex items-center gap-2 cursor-pointer rounded-[var(--r-md)] transition-all duration-150 hover:brightness-110 active:brightness-90 disabled:opacity-60"
                        style={{
                            height: 40,
                            padding: '0 20px',
                            background: 'var(--accent)',
                            color: 'white',
                            fontSize: 13.5,
                            fontWeight: 600,
                        }}
                        onClick={handleGetStarted}
                    >
                        <Plus style={{ width: 15, height: 15 }} />
                        Get started
                        <ArrowRight style={{ width: 14, height: 14, opacity: 0.8 }} />
                    </button>

                    <button
                        disabled={loading}
                        className="flex items-center gap-2 cursor-pointer rounded-[var(--r-md)] transition-all duration-150 hover:border-[var(--border-2)] hover:text-[var(--text-0)] disabled:opacity-60"
                        style={{
                            height: 40,
                            padding: '0 20px',
                            background: 'var(--bg-2)',
                            border: '1px solid var(--border-1)',
                            color: 'var(--text-1)',
                            fontSize: 13.5,
                            fontWeight: 500,
                        }}
                        onClick={handleLoadSamples}
                    >
                        <FileJson style={{ width: 14, height: 14 }} />
                        Load sample requests
                    </button>
                </div>

                {/* ── Protocols grid ───────────────────────────────────────── */}
                <div className="w-full" style={{ marginBottom: 48 }}>
                    <p
                        style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: 'var(--text-2)',
                            marginBottom: 14,
                        }}
                    >
                        Supported protocols
                    </p>
                    <div
                        className="grid gap-3"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
                    >
                        {PROTOCOLS.map(p => (
                            <ProtocolCard key={p.label} card={p} />
                        ))}
                    </div>
                </div>

                {/* ── Features list ────────────────────────────────────────── */}
                <div
                    className="w-full"
                    style={{
                        background: 'var(--bg-2)',
                        border: '1px solid var(--border-1)',
                        borderRadius: 'var(--r-lg)',
                        padding: '20px 24px',
                    }}
                >
                    <p
                        style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: 'var(--text-2)',
                            marginBottom: 14,
                        }}
                    >
                        What's included
                    </p>
                    <ul
                        className="flex flex-col gap-2.5"
                        style={{ listStyle: 'none', margin: 0, padding: 0 }}
                    >
                        {FEATURES.map(f => (
                            <li key={f} className="flex items-start gap-2.5">
                                <span
                                    className="shrink-0 flex items-center justify-center rounded-full"
                                    style={{
                                        width: 16,
                                        height: 16,
                                        marginTop: 1,
                                        background: 'var(--accent-dim)',
                                        color: 'var(--accent)',
                                        fontSize: 9,
                                        fontWeight: 700,
                                    }}
                                >
                                    ✓
                                </span>
                                <span
                                    style={{
                                        fontSize: 12.5,
                                        color: 'var(--text-1)',
                                        lineHeight: 1.5,
                                    }}
                                >
                                    {f.split(/(\s{2}[^]+?\s{2})/g).map((part, i) =>
                                        part.startsWith('  ') && part.endsWith('  ') ? (
                                            <code
                                                key={i}
                                                style={{
                                                    fontFamily:
                                                        "'JetBrains Mono Variable', monospace",
                                                    fontSize: 11,
                                                    background: 'var(--bg-4)',
                                                    borderRadius: 3,
                                                    padding: '1px 5px',
                                                    color: 'var(--accent)',
                                                }}
                                            >
                                                {part.trim()}
                                            </code>
                                        ) : (
                                            part
                                        )
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* ── Shortcut hint ────────────────────────────────────────── */}
                <p style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 32 }}>
                    Press{' '}
                    <kbd
                        style={{
                            fontFamily: "'JetBrains Mono Variable', monospace",
                            fontSize: 11,
                            background: 'var(--bg-3)',
                            border: '1px solid var(--border-2)',
                            borderRadius: 3,
                            padding: '1px 6px',
                            color: 'var(--text-1)',
                        }}
                    >
                        {shortcut('K')}
                    </kbd>{' '}
                    at any time to search or create a request
                </p>
            </div>
        </div>
    );
}
