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
    const { createOrganization, createProject, organizations } = useAppStore();

    // Zustand is synchronous — read state immediately after mutations via getState()
    function handleGetStarted() {
        createOrganization('My Workspace');
        const org = useAppStore.getState().organizations.at(-1);
        if (!org) return;
        createProject(org.id, 'Default Project');
        const proj = useAppStore
            .getState()
            .organizations.find(o => o.id === org.id)
            ?.projects?.at(-1);
        if (!proj) return;
        const { setActiveOrg, setActiveProject } = useAppStore.getState();
        setActiveOrg(org.id);
        setActiveProject(proj.id);
    }

    function handleLoadSamples() {
        createOrganization('Sample Workspace');
        const org = useAppStore.getState().organizations.at(-1);
        if (!org) return;
        createProject(org.id, 'Demo Project');
        const proj = useAppStore
            .getState()
            .organizations.find(o => o.id === org.id)
            ?.projects?.at(-1);
        if (!proj) return;

        const { importCollection, setActiveOrg, setActiveProject, setActiveCollection, openTab } =
            useAppStore.getState();
        const colId = crypto.randomUUID();

        // ── HTTP requests ──────────────────────────────────────────
        const httpGetId = crypto.randomUUID();
        const httpPostId = crypto.randomUUID();
        const httpPutId = crypto.randomUUID();
        const httpDeleteId = crypto.randomUUID();
        const httpAuthId = crypto.randomUUID();

        // ── GraphQL ────────────────────────────────────────────────
        const gqlQueryId = crypto.randomUUID();
        const gqlCountryId = crypto.randomUUID();

        // ── WebSocket ──────────────────────────────────────────────
        const wsId = crypto.randomUUID();

        // ── gRPC ───────────────────────────────────────────────────
        const grpcId = crypto.randomUUID();

        const col = {
            id: colId,
            name: 'Sample Requests',
            requests: [],
            folders: [
                {
                    id: crypto.randomUUID(),
                    name: 'HTTP / REST',
                    requests: [
                        {
                            id: httpGetId,
                            name: 'GET — list users',
                            protocol: 'http',
                            method: 'GET',
                            url: 'https://jsonplaceholder.typicode.com/users',
                            params: [{ key: '_limit', value: '5', enabled: true }],
                            headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
                            body: '',
                            bodyType: 'none',
                            formFields: [],
                            binaryFileName: '',
                            auth: {
                                type: 'none',
                                token: '',
                                username: '',
                                password: '',
                                headerName: '',
                                headerValue: '',
                                oauth2GrantType: '',
                                oauth2ClientId: '',
                                oauth2ClientSecret: '',
                                oauth2TokenUrl: '',
                                oauth2Scope: '',
                                oauth2AccessToken: '',
                            },
                            notes: 'Returns a list of users. Try the _limit param to control how many come back.',
                            tests: 'pm.test("Status is 200", () => pm.response.to.have.status(200));\npm.test("Returns array", () => {\n  const body = pm.response.json();\n  pm.expect(Array.isArray(body)).to.be.true;\n});',
                        } as any,
                        {
                            id: httpPostId,
                            name: 'POST — create post',
                            protocol: 'http',
                            method: 'POST',
                            url: 'https://jsonplaceholder.typicode.com/posts',
                            params: [],
                            headers: [
                                {
                                    key: 'Content-Type',
                                    value: 'application/json',
                                    enabled: true,
                                },
                            ],
                            body: JSON.stringify(
                                {
                                    title: 'Hello from Simora',
                                    body: 'This is a sample POST request',
                                    userId: 1,
                                },
                                null,
                                2
                            ),
                            bodyType: 'json',
                            formFields: [],
                            binaryFileName: '',
                            auth: {
                                type: 'none',
                                token: '',
                                username: '',
                                password: '',
                                headerName: '',
                                headerValue: '',
                                oauth2GrantType: '',
                                oauth2ClientId: '',
                                oauth2ClientSecret: '',
                                oauth2TokenUrl: '',
                                oauth2Scope: '',
                                oauth2AccessToken: '',
                            },
                            notes: 'Creates a new post. JSONPlaceholder is a fake API — it returns 201 but nothing is persisted.',
                            tests: 'pm.test("Status is 201", () => pm.response.to.have.status(201));\npm.test("Has id", () => {\n  const body = pm.response.json();\n  pm.expect(body).to.have.property("id");\n});',
                        } as any,
                        {
                            id: httpPutId,
                            name: 'PUT — update post',
                            protocol: 'http',
                            method: 'PUT',
                            url: 'https://jsonplaceholder.typicode.com/posts/1',
                            params: [],
                            headers: [
                                {
                                    key: 'Content-Type',
                                    value: 'application/json',
                                    enabled: true,
                                },
                            ],
                            body: JSON.stringify(
                                {
                                    id: 1,
                                    title: 'Updated title',
                                    body: 'Updated body content',
                                    userId: 1,
                                },
                                null,
                                2
                            ),
                            bodyType: 'json',
                            formFields: [],
                            binaryFileName: '',
                            auth: {
                                type: 'none',
                                token: '',
                                username: '',
                                password: '',
                                headerName: '',
                                headerValue: '',
                                oauth2GrantType: '',
                                oauth2ClientId: '',
                                oauth2ClientSecret: '',
                                oauth2TokenUrl: '',
                                oauth2Scope: '',
                                oauth2AccessToken: '',
                            },
                            notes: 'Full update of a post. Use PATCH to update only specific fields.',
                            tests: 'pm.test("Status is 200", () => pm.response.to.have.status(200));',
                        } as any,
                        {
                            id: httpDeleteId,
                            name: 'DELETE — remove post',
                            protocol: 'http',
                            method: 'DELETE',
                            url: 'https://jsonplaceholder.typicode.com/posts/1',
                            params: [],
                            headers: [],
                            body: '',
                            bodyType: 'none',
                            formFields: [],
                            binaryFileName: '',
                            auth: {
                                type: 'none',
                                token: '',
                                username: '',
                                password: '',
                                headerName: '',
                                headerValue: '',
                                oauth2GrantType: '',
                                oauth2ClientId: '',
                                oauth2ClientSecret: '',
                                oauth2TokenUrl: '',
                                oauth2Scope: '',
                                oauth2AccessToken: '',
                            },
                            notes: 'Deletes a post by ID. Returns 200 with an empty body on success.',
                            tests: 'pm.test("Status is 200", () => pm.response.to.have.status(200));',
                        } as any,
                        {
                            id: httpAuthId,
                            name: 'GET — bearer auth example',
                            protocol: 'http',
                            method: 'GET',
                            url: 'https://httpbin.org/bearer',
                            params: [],
                            headers: [],
                            body: '',
                            bodyType: 'none',
                            formFields: [],
                            binaryFileName: '',
                            auth: {
                                type: 'bearer',
                                token: 'my-sample-token',
                                username: '',
                                password: '',
                                headerName: '',
                                headerValue: '',
                                oauth2GrantType: '',
                                oauth2ClientId: '',
                                oauth2ClientSecret: '',
                                oauth2TokenUrl: '',
                                oauth2Scope: '',
                                oauth2AccessToken: '',
                            },
                            notes: 'Demonstrates Bearer token auth. httpbin.org echoes back the Authorization header it received.',
                            tests: 'pm.test("Status is 200", () => pm.response.to.have.status(200));\npm.test("Token echoed back", () => {\n  const body = pm.response.json();\n  pm.expect(body.authenticated).to.be.true;\n});',
                        } as any,
                    ],
                    folders: [],
                },
                {
                    id: crypto.randomUUID(),
                    name: 'GraphQL',
                    requests: [
                        {
                            id: gqlQueryId,
                            name: 'Query — countries list',
                            protocol: 'graphql',
                            method: 'POST',
                            url: 'https://countries.trevorblades.com/graphql',
                            params: [],
                            headers: [],
                            body: '',
                            bodyType: 'json',
                            formFields: [],
                            binaryFileName: '',
                            auth: {
                                type: 'none',
                                token: '',
                                username: '',
                                password: '',
                                headerName: '',
                                headerValue: '',
                                oauth2GrantType: '',
                                oauth2ClientId: '',
                                oauth2ClientSecret: '',
                                oauth2TokenUrl: '',
                                oauth2Scope: '',
                                oauth2AccessToken: '',
                            },
                            notes: 'Public Countries GraphQL API. No auth required. Try the Schema button to explore available fields.',
                            graphql: {
                                query: 'query GetCountries {\n  countries(filter: { continent: { eq: "EU" } }) {\n    code\n    name\n    capital\n    currency\n    languages {\n      name\n    }\n  }\n}',
                                variables: '{}',
                            },
                            tests: 'pm.test("Status is 200", () => pm.response.to.have.status(200));\npm.test("Has countries", () => {\n  const body = pm.response.json();\n  pm.expect(body.data.countries.length).to.be.above(0);\n});',
                        } as any,
                        {
                            id: gqlCountryId,
                            name: 'Query — country by code',
                            protocol: 'graphql',
                            method: 'POST',
                            url: 'https://countries.trevorblades.com/graphql',
                            params: [],
                            headers: [],
                            body: '',
                            bodyType: 'json',
                            formFields: [],
                            binaryFileName: '',
                            auth: {
                                type: 'none',
                                token: '',
                                username: '',
                                password: '',
                                headerName: '',
                                headerValue: '',
                                oauth2GrantType: '',
                                oauth2ClientId: '',
                                oauth2ClientSecret: '',
                                oauth2TokenUrl: '',
                                oauth2Scope: '',
                                oauth2AccessToken: '',
                            },
                            notes: 'Fetch a single country by its ISO code. Change the variable to any two-letter country code.',
                            graphql: {
                                query: 'query GetCountry($code: ID!) {\n  country(code: $code) {\n    name\n    native\n    capital\n    emoji\n    currency\n    languages {\n      code\n      name\n    }\n  }\n}',
                                variables: '{\n  "code": "UA"\n}',
                            },
                            tests: 'pm.test("Status is 200", () => pm.response.to.have.status(200));\npm.test("Country found", () => {\n  const body = pm.response.json();\n  pm.expect(body.data.country).to.not.be.null;\n});',
                        } as any,
                    ],
                    folders: [],
                },
                {
                    id: crypto.randomUUID(),
                    name: 'WebSocket',
                    requests: [
                        {
                            id: wsId,
                            name: 'Echo server',
                            protocol: 'websocket',
                            method: 'GET',
                            url: '',
                            params: [],
                            headers: [],
                            body: '',
                            bodyType: 'none',
                            formFields: [],
                            binaryFileName: '',
                            auth: {
                                type: 'none',
                                token: '',
                                username: '',
                                password: '',
                                headerName: '',
                                headerValue: '',
                                oauth2GrantType: '',
                                oauth2ClientId: '',
                                oauth2ClientSecret: '',
                                oauth2TokenUrl: '',
                                oauth2Scope: '',
                                oauth2AccessToken: '',
                            },
                            notes: 'WebSocket echo server — every message you send comes right back. Use wss://echo.websocket.org or run a local echo server.',
                            ws: {
                                url: 'wss://echo.websocket.org',
                                headers: [],
                                message: 'Hello from Simora!',
                                maxMessages: 10,
                                idleTimeout: 5,
                                tlsInsecure: false,
                            },
                        } as any,
                    ],
                    folders: [],
                },
                {
                    id: crypto.randomUUID(),
                    name: 'gRPC',
                    requests: [
                        {
                            id: grpcId,
                            name: 'List services (reflection)',
                            protocol: 'grpc',
                            method: 'GET',
                            url: '',
                            params: [],
                            headers: [],
                            body: '',
                            bodyType: 'none',
                            formFields: [],
                            binaryFileName: '',
                            auth: {
                                type: 'none',
                                token: '',
                                username: '',
                                password: '',
                                headerName: '',
                                headerValue: '',
                                oauth2GrantType: '',
                                oauth2ClientId: '',
                                oauth2ClientSecret: '',
                                oauth2TokenUrl: '',
                                oauth2Scope: '',
                                oauth2AccessToken: '',
                            },
                            notes: 'Connect to a gRPC server with reflection enabled. Click "Load" to discover services and methods automatically. Try grpcb.in:9001 as a public test server.',
                            grpc: {
                                server: 'grpcb.in:9001',
                                service: '',
                                method: '',
                                message: '{}',
                                meta: [],
                                tls: true,
                            },
                        } as any,
                    ],
                    folders: [],
                },
            ],
        } as any;

        importCollection(org.id, proj.id, col);
        setActiveOrg(org.id);
        setActiveProject(proj.id);
        setActiveCollection(colId);
        openTab(
            {
                orgId: org.id,
                projectId: proj.id,
                collectionId: colId,
                requestId: httpGetId,
                folderId: col.folders[0].id,
            },
            col.folders[0].requests[0]
        );
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
