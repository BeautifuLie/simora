import { create } from 'zustand';
import { domain } from '../../wailsjs/go/models';
import * as OrganizationService from '../../wailsjs/go/service/OrganizationService';
import * as RequestService from '../../wailsjs/go/service/RequestService';
import * as KafkaService from '../../wailsjs/go/service/KafkaService';
import * as SqsService from '../../wailsjs/go/service/SqsService';
import * as GrpcService from '../../wailsjs/go/service/GrpcService';
import * as WsService from '../../wailsjs/go/service/WsService';
import * as SettingsService from '../../wailsjs/go/service/SettingsService';

// Re-export all shared types from types.ts so components can import from one place.
export type {
    Organization,
    Project,
    Collection,
    Folder,
    Request,
    RequestHeader,
    Response,
    HttpMethod,
    AuthType,
    AuthConfig,
    Protocol,
    GraphQLConfig,
    GrpcConfig,
    KafkaSaslMechanism,
    KafkaMessageFormat,
    KafkaConfig,
    SqsConfig,
    WsConfig,
    EnvVariable,
    Environment,
    QueryParam,
    BodyType,
    FormField,
    EditingRequest,
    TestResult,
    ActivePath,
    Tab,
    AppSettings,
} from './types';

export { resolveVars, hasVars } from './types';

import type {
    Organization,
    Collection,
    Request,
    Response,
    HttpMethod,
    AuthConfig,
    Protocol,
    GraphQLConfig,
    GrpcConfig,
    KafkaConfig,
    SqsConfig,
    WsConfig,
    EnvVariable,
    Environment,
    QueryParam,
    BodyType,
    FormField,
    EditingRequest,
    TestResult,
    ActivePath,
    Tab,
    AppSettings,
} from './types';

import { resolveVars } from './types';

// ── Recent requests ───────────────────────────────────────────────────────
export interface RecentRequest {
    id: string; // unique history entry id
    name: string;
    method: string;
    url: string;
    protocol: Protocol;
    path: ActivePath | null;
    sentAt: number; // unix ms
}

const MAX_RECENT = 20;

// ── Selectors (use in useAppStore(selector)) ──────────────────────────────
export const selectActiveTab = (s: AppState): Tab | null =>
    s.activeTabId ? (s.tabs.find(t => t.id === s.activeTabId) ?? null) : null;
export const selectEditing = (s: AppState): EditingRequest | null =>
    selectActiveTab(s)?.editing ?? null;
export const selectActivePath = (s: AppState): ActivePath | null =>
    selectActiveTab(s)?.path ?? null;
export const selectIsDirty = (s: AppState): boolean => selectActiveTab(s)?.isDirty ?? false;

// ── Store ──────────────────────────────────────────────────────────────────
interface AppState {
    // Data
    organizations: Organization[];
    dataLoading: boolean;
    dataError: string | null;
    settingsError: string | null;
    recentRequests: RecentRequest[];

    // Navigation
    protocol: Protocol;
    activeOrgId: string | null;
    activeProjectId: string | null;
    activeCollectionId: string | null;

    // Tabs
    tabs: Tab[];
    activeTabId: string | null;

    // Environments
    environments: Environment[];
    activeEnvId: string | null;
    envPanelOpen: boolean;

    // Request chaining — maps request name → last parsed response body
    chainCache: Record<string, unknown>;

    // Actions — data
    loadOrganizations: () => Promise<void>;

    // Actions — navigation
    setProtocol: (_p: Protocol) => void;
    setActiveOrg: (_id: string | null) => void;
    setActiveProject: (_id: string | null) => void;
    setActiveCollection: (_id: string | null) => void;

    // Actions — tabs
    openTab: (_path: ActivePath, _req: Request, _protocol?: Protocol) => void;
    closeTab: (_tabId: string) => void;
    switchTab: (_tabId: string) => void;
    newBlankTab: () => void;
    duplicateTab: () => void;

    // Actions — protocol switching
    setRequestProtocol: (_protocol: Protocol) => void;
    patchGraphQL: (_patch: Partial<GraphQLConfig>) => void;
    patchGrpc: (_patch: Partial<GrpcConfig>) => void;
    patchKafka: (_patch: Partial<KafkaConfig>) => void;
    patchSqs: (_patch: Partial<SqsConfig>) => void;
    patchWs: (_patch: Partial<WsConfig>) => void;
    setTests: (_code: string) => void;

    // Actions — editing (operate on active tab)
    setMethod: (_m: HttpMethod) => void;
    setUrl: (_url: string) => void;
    setBody: (_body: string) => void;
    setBodyType: (_t: BodyType) => void;
    setFormField: (_idx: number, _key: string, _value: string) => void;
    toggleFormField: (_idx: number) => void;
    addFormField: () => void;
    removeFormField: (_idx: number) => void;
    setBinaryFile: (_name: string, _content: string) => void;
    setAuth: (_patch: Partial<AuthConfig>) => void;
    setNotes: (_notes: string) => void;
    setHeader: (_idx: number, _key: string, _value: string) => void;
    toggleHeader: (_idx: number) => void;
    addHeader: () => void;
    removeHeader: (_idx: number) => void;
    setActiveTab: (_tab: string) => void;

    // Actions — params
    setParam: (_idx: number, _key: string, _value: string) => void;
    toggleParam: (_idx: number) => void;
    addParam: () => void;
    removeParam: (_idx: number) => void;

    // Actions — send / save
    sendRequest: () => Promise<void>;
    saveRequest: () => Promise<void>;
    setChainValue: (_name: string, _value: unknown) => void;
    clearRecentRequests: () => void;

    // Actions — organizations
    createOrganization: (_name: string) => void;
    renameOrganization: (_id: string, _name: string) => void;
    deleteOrganization: (_id: string) => void;

    // Actions — projects
    createProject: (_orgId: string, _name: string) => string;
    renameProject: (_orgId: string, _id: string, _name: string) => void;
    deleteProject: (_orgId: string, _id: string) => void;

    // Actions — folders
    createFolder: (
        _orgId: string,
        _projectId: string,
        _collectionId: string,
        _name: string
    ) => void;
    createSubFolder: (
        _orgId: string,
        _projectId: string,
        _collectionId: string,
        _parentFolderId: string,
        _name: string
    ) => void;
    renameFolder: (
        _orgId: string,
        _projectId: string,
        _collectionId: string,
        _folderId: string,
        _name: string
    ) => void;
    deleteFolder: (
        _orgId: string,
        _projectId: string,
        _collectionId: string,
        _folderId: string
    ) => void;

    // Actions — create / rename / delete
    createRequest: (
        _path: Omit<ActivePath, 'requestId'>,
        _name: string,
        _protocol?: Protocol
    ) => string;
    renameRequest: (_requestId: string, _name: string) => void;
    deleteRequest: (_requestId: string) => void;
    duplicateRequest: (_requestId: string) => void;
    duplicateFolder: (
        _orgId: string,
        _projectId: string,
        _collectionId: string,
        _folderId: string
    ) => void;
    moveRequest: (_requestId: string, _toCollectionId: string, _toFolderId: string | null) => void;
    reorderRequest: (
        _requestId: string,
        _targetRequestId: string,
        _position: 'before' | 'after'
    ) => void;
    reorderFolder: (
        _folderId: string,
        _targetFolderId: string,
        _position: 'before' | 'after'
    ) => void;
    createCollection: (_orgId: string, _projectId: string, _name: string) => string;
    importCollection: (_orgId: string, _projectId: string, _col: Collection) => void;
    renameCollection: (_collectionId: string, _name: string) => void;
    deleteCollection: (_collectionId: string) => void;
    setCollectionVariables: (_collectionId: string, _vars: EnvVariable[]) => void;

    // Actions — environments
    setActiveEnv: (_id: string | null) => void;
    openEnvPanel: () => void;
    closeEnvPanel: () => void;
    createEnv: (_name: string) => string; // returns new env id
    renameEnv: (_id: string, _name: string) => void;
    setEnvColor: (_id: string, _color: string) => void;
    deleteEnv: (_id: string) => void;
    addEnvVar: (_envId: string) => void;
    setEnvVar: (_envId: string, _idx: number, _key: string, _value: string) => void;
    toggleEnvVar: (_envId: string, _idx: number) => void;
    removeEnvVar: (_envId: string, _idx: number) => void;

    // Actions — response UI
    setActiveResponseTab: (_tab: Tab['activeResponseTab']) => void;

    // Settings
    settings: AppSettings;
    settingsPanelOpen: boolean;
    openSettingsPanel: () => void;
    closeSettingsPanel: () => void;
    updateSettings: (_patch: Partial<AppSettings>) => void;
}

// ── App settings ───────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
    timeout: 30000,
    followRedirects: true,
    validateSsl: true,
    maxRedirects: 10,
    sendOnEnter: false,
    fontSize: 'md',
    theme: 'dark',
    accentColor: '',
    bgPreset: 'midnight',
    customBgDark: '#101116',
    customBgLight: '#e8eaf5',
    crashReporterEnabled: false,
    autoUpdate: true,
};

// ── URL helpers ────────────────────────────────────────────────────────────
export function parseParams(url: string): QueryParam[] {
    const qIdx = url.indexOf('?');
    if (qIdx === -1) return [];
    return url
        .slice(qIdx + 1)
        .split('&')
        .filter(Boolean)
        .map(part => {
            const eqIdx = part.indexOf('=');
            const rawKey = eqIdx === -1 ? part : part.slice(0, eqIdx);
            const rawVal = eqIdx === -1 ? '' : part.slice(eqIdx + 1);
            try {
                return {
                    key: decodeURIComponent(rawKey),
                    value: decodeURIComponent(rawVal),
                    enabled: true,
                };
            } catch {
                return { key: rawKey, value: rawVal, enabled: true };
            }
        });
}

export function buildUrl(url: string, params: QueryParam[]): string {
    const base = url.split('?')[0];
    const enabled = params.filter(p => p.enabled && p.key);
    if (!enabled.length) return base;
    const qs = enabled
        .map(p => {
            try {
                return `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`;
            } catch {
                return `${p.key}=${p.value}`;
            }
        })
        .join('&');
    return `${base}?${qs}`;
}

function defaultGraphQL(): GraphQLConfig {
    return { query: 'query {\n  \n}', variables: '{}' };
}
function defaultGrpc(): GrpcConfig {
    return { server: '', service: '', method: '', message: '{\n  \n}', meta: [], tls: false };
}
function defaultKafka(): KafkaConfig {
    return {
        bootstrap: '',
        topic: '',
        key: '',
        message: '',
        headers: [],
        mode: 'produce',
        group: '',
        offset: 'latest',
        maxMessages: 50,
        saslMechanism: 'none',
        saslUsername: '',
        saslPassword: '',
        tls: false,
        messageFormat: 'json',
        protoSchema: '',
        protoMessageType: '',
        schemaRegistryUrl: '',
        schemaRegistrySubject: '',
        schemaRegistryUsername: '',
        schemaRegistryPassword: '',
    };
}
function defaultSqs(): SqsConfig {
    return {
        queueUrl: '',
        body: '',
        region: 'us-east-1',
        delaySeconds: 0,
        attributes: [],
        accessKeyId: '',
        secretAccessKey: '',
        sessionToken: '',
        messageGroupId: '',
        messageDeduplicationId: '',
    };
}

function defaultWs(): WsConfig {
    return {
        url: '',
        headers: [],
        message: '',
        maxMessages: 50,
        idleTimeout: 5,
        tlsInsecure: false,
    };
}

function defaultAuth(): AuthConfig {
    return {
        type: 'none',
        token: '',
        username: '',
        password: '',
        headerName: '',
        headerValue: '',
        oauth2GrantType: 'client_credentials',
        oauth2ClientId: '',
        oauth2ClientSecret: '',
        oauth2TokenUrl: '',
        oauth2Scope: '',
        oauth2AccessToken: '',
    };
}

// Wails serialises Go structs to JSON and the generated TS models don't expose
// every field (e.g. nested config structs are typed as `any` in models.ts).
// The explicit `as any` casts below are intentional — we spread into typed
// defaults so the result is always a fully-formed EditingRequest.
function editingFromRequest(req: Request): EditingRequest {
    const raw = req as any;
    return {
        id: req.id,
        name: req.name,
        protocol: (req.protocol as Protocol) || 'http',
        method: (req.method as HttpMethod) || 'GET',
        url: req.url,
        params: (req.params as QueryParam[]) ?? parseParams(req.url),
        headers: req.headers ?? [],
        body: req.body ?? '',
        bodyType: (req.bodyType as BodyType) ?? 'json',
        formFields: (req.formFields as FormField[]) ?? [],
        binaryFileName: req.binaryFileName ?? '',
        binaryContent: '', // never persisted — must re-select file
        auth: raw.auth ? ({ ...defaultAuth(), ...raw.auth } as AuthConfig) : defaultAuth(),
        notes: req.notes ?? '',
        activeTab: req.activeTab ?? 'params',
        graphql: raw.graphql ?? defaultGraphQL(),
        grpc: raw.grpc ? ({ ...defaultGrpc(), ...raw.grpc } as GrpcConfig) : defaultGrpc(),
        kafka: raw.kafka ? ({ ...defaultKafka(), ...raw.kafka } as KafkaConfig) : defaultKafka(),
        sqs: raw.sqs ? ({ ...defaultSqs(), ...raw.sqs } as SqsConfig) : defaultSqs(),
        ws: raw.ws ? ({ ...defaultWs(), ...raw.ws } as WsConfig) : defaultWs(),
        tests: raw.tests ?? '',
        testResults: [],
    };
}

// ── Path helpers ────────────────────────────────────────────────────────────
export function findRequestPath(orgs: Organization[], requestId: string): ActivePath | null {
    for (const org of orgs) {
        for (const proj of org.projects ?? []) {
            for (const col of proj.collections ?? []) {
                for (const req of col.requests ?? []) {
                    if (req.id === requestId)
                        return {
                            orgId: org.id,
                            projectId: proj.id,
                            collectionId: col.id,
                            requestId,
                        };
                }
                for (const fld of col.folders ?? []) {
                    for (const req of fld.requests ?? []) {
                        if (req.id === requestId)
                            return {
                                orgId: org.id,
                                projectId: proj.id,
                                collectionId: col.id,
                                requestId,
                                folderId: fld.id,
                            };
                    }
                }
            }
        }
    }
    return null;
}

function findCollectionPath(
    orgs: Organization[],
    collectionId: string
): { orgId: string; projectId: string } | null {
    for (const org of orgs) {
        for (const proj of org.projects ?? []) {
            for (const col of proj.collections ?? []) {
                if (col.id === collectionId) return { orgId: org.id, projectId: proj.id };
            }
        }
    }
    return null;
}

// ── Tab helpers ────────────────────────────────────────────────────────────
function makeTab(override: Partial<Tab> = {}): Tab {
    return {
        id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        path: null,
        editing: null,
        isDirty: false,
        response: null,
        responseLoading: false,
        responseError: null,
        activeResponseTab: 'body',
        testResults: [],
        ...override,
    };
}

// ── Test runner ───────────────────────────────────────────────────────────
const TEST_TIMEOUT_MS = 3000;

function runTests(code: string, response: Response): Promise<TestResult[]> {
    if (!code.trim()) return Promise.resolve([]);

    return new Promise(resolve => {
        let resolved = false;
        const worker = new Worker(new URL('./testWorker.ts', import.meta.url), { type: 'module' });

        const timer = setTimeout(() => {
            if (resolved) return;
            resolved = true;
            worker.terminate();
            resolve([
                {
                    name: 'Script timeout',
                    pass: false,
                    error: `Test script exceeded ${TEST_TIMEOUT_MS / 1000}s limit`,
                },
            ]);
        }, TEST_TIMEOUT_MS);

        worker.onmessage = (e: MessageEvent<TestResult[]>) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timer);
            worker.terminate();
            resolve(e.data);
        };

        worker.onerror = e => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timer);
            worker.terminate();
            resolve([{ name: 'Script error', pass: false, error: e.message }]);
        };

        worker.postMessage({
            code,
            response: {
                status: response.statusCode,
                body: response.body,
                headers: response.headers ?? {},
                time: response.time,
            },
        });
    });
}

function patchActiveTab(s: AppState, patch: Partial<Tab>): Pick<AppState, 'tabs'> {
    if (!s.activeTabId) return { tabs: s.tabs };
    return { tabs: s.tabs.map(t => (t.id === s.activeTabId ? { ...t, ...patch } : t)) };
}

function patchEditing(s: AppState, patch: Partial<EditingRequest>): Pick<AppState, 'tabs'> {
    const tab = selectActiveTab(s);
    if (!tab?.editing) return { tabs: s.tabs };
    return patchActiveTab(s, { editing: { ...tab.editing, ...patch }, isDirty: true });
}

// ── Wails detection ────────────────────────────────────────────────────────
const isWails = typeof window !== 'undefined' && !!window.go;

// ── Mock data ──────────────────────────────────────────────────────────────
const MOCK_ENVS: Environment[] = [
    {
        id: 'env1',
        name: 'Production',
        color: 'var(--green)',
        variables: [
            { key: 'base_url', value: 'https://api.example.com', enabled: true },
            { key: 'token', value: 'prod_tok_abc123xyz', enabled: true },
            { key: 'user_id', value: '01HX2KGTBX', enabled: true },
            { key: 'timeout', value: '30000', enabled: false },
        ],
    },
    {
        id: 'env2',
        name: 'Staging',
        color: 'var(--yellow)',
        variables: [
            { key: 'base_url', value: 'https://staging.example.com', enabled: true },
            { key: 'token', value: 'stg_tok_xyz789', enabled: true },
            { key: 'user_id', value: '01HX2KGTBX', enabled: true },
        ],
    },
    {
        id: 'env3',
        name: 'Local',
        color: 'var(--purple)',
        variables: [
            { key: 'base_url', value: 'http://localhost:8080', enabled: true },
            { key: 'token', value: 'dev_tok_000000', enabled: true },
        ],
    },
];

const MOCK_ORGS: Organization[] = [
    domain.Organisation.createFrom({
        id: 'org1',
        name: 'My Workspace',
        projects: [
            domain.Project.createFrom({
                id: 'proj1',
                name: 'Production API',
                collections: [
                    domain.Collection.createFrom({
                        id: 'col1',
                        name: 'Authentication',
                        requests: [
                            domain.Request.createFrom({
                                id: 'r1',
                                name: 'Sign In',
                                method: 'POST',
                                url: '{{base_url}}/auth/signin',
                                body: '{"email":"user@example.com","password":"secret"}',
                                headers: [
                                    {
                                        key: 'Content-Type',
                                        value: 'application/json',
                                        enabled: true,
                                    },
                                ],
                            }),
                            domain.Request.createFrom({
                                id: 'r2',
                                name: 'Refresh Token',
                                method: 'POST',
                                url: '{{base_url}}/auth/refresh',
                                body: '{"token":"{{token}}"}',
                                headers: [],
                            }),
                            domain.Request.createFrom({
                                id: 'r3',
                                name: 'Sign Out',
                                method: 'DELETE',
                                url: '{{base_url}}/auth/signout',
                                body: '',
                                headers: [],
                            }),
                        ],
                        folders: [],
                    }),
                    domain.Collection.createFrom({
                        id: 'col2',
                        name: 'Users',
                        requests: [],
                        folders: [
                            domain.Folder.createFrom({
                                id: 'fld1',
                                name: 'CRUD',
                                requests: [
                                    domain.Request.createFrom({
                                        id: 'r4',
                                        name: 'List Users',
                                        method: 'GET',
                                        url: '{{base_url}}/users?page=1&limit=20',
                                        body: '',
                                        headers: [
                                            {
                                                key: 'Authorization',
                                                value: 'Bearer {{token}}',
                                                enabled: true,
                                            },
                                        ],
                                    }),
                                    domain.Request.createFrom({
                                        id: 'r5',
                                        name: 'Get User',
                                        method: 'GET',
                                        url: '{{base_url}}/users/{{user_id}}',
                                        body: '',
                                        headers: [],
                                    }),
                                    domain.Request.createFrom({
                                        id: 'r6',
                                        name: 'Create User',
                                        method: 'POST',
                                        url: '{{base_url}}/users',
                                        body: '{"name":"","email":""}',
                                        headers: [],
                                    }),
                                    domain.Request.createFrom({
                                        id: 'r7',
                                        name: 'Update User',
                                        method: 'PATCH',
                                        url: '{{base_url}}/users/{{user_id}}',
                                        body: '{}',
                                        headers: [],
                                    }),
                                    domain.Request.createFrom({
                                        id: 'r8',
                                        name: 'Delete User',
                                        method: 'DELETE',
                                        url: '{{base_url}}/users/{{user_id}}',
                                        body: '',
                                        headers: [],
                                    }),
                                ],
                                folders: [],
                            }),
                        ],
                    }),
                ],
            }),
            domain.Project.createFrom({
                id: 'proj2',
                name: 'Staging',
                collections: [
                    domain.Collection.createFrom({
                        id: 'col3',
                        name: 'Health',
                        requests: [
                            domain.Request.createFrom({
                                id: 'r9',
                                name: 'Health Check',
                                method: 'GET',
                                url: '{{base_url}}/health',
                                body: '',
                                headers: [],
                            }),
                            domain.Request.createFrom({
                                id: 'r10',
                                name: 'Deploy',
                                method: 'POST',
                                url: '{{base_url}}/deploy',
                                body: '',
                                headers: [],
                            }),
                        ],
                        folders: [],
                    }),
                ],
            }),
        ],
    }),
];

const MOCK_RESPONSE: Response = domain.Response.createFrom({
    statusCode: 200,
    status: '200 OK',
    time: 142,
    size: 2847,
    body: JSON.stringify(
        {
            data: [
                {
                    id: 'usr_01',
                    name: 'Alice Johnson',
                    email: 'alice@example.com',
                    role: 'admin',
                    created_at: '2024-01-15T10:30:00Z',
                    status: 'active',
                },
                {
                    id: 'usr_02',
                    name: 'Bob Smith',
                    email: 'bob@example.com',
                    role: 'member',
                    created_at: '2024-01-16T14:20:00Z',
                    status: 'active',
                },
            ],
            meta: { total: 247, page: 1, limit: 20, has_next: true },
        },
        null,
        2
    ),
    headers: {
        'content-type': ['application/json; charset=utf-8'],
        'x-request-id': ['f47ac10b-58cc-4372-a567-0e02b2c3d479'],
        'cache-control': ['no-cache, no-store'],
        'x-ratelimit-limit': ['1000'],
        'x-ratelimit-remaining': ['999'],
        'access-control-allow-origin': ['*'],
    },
});

// ── Env helper ─────────────────────────────────────────────────────────────
function mapEnvs(
    envs: Environment[],
    id: string,
    fn: (_e: Environment) => Environment
): Environment[] {
    return envs.map(e => (e.id === id ? fn(e) : e));
}

// ── Store ──────────────────────────────────────────────────────────────────
export const useAppStore = create<AppState>((set, get) => ({
    organizations: [],
    dataLoading: false,
    dataError: null,
    settingsError: null,
    recentRequests: [],
    protocol: 'http',
    activeOrgId: null,
    activeProjectId: null,
    activeCollectionId: null,

    tabs: [],
    activeTabId: null,

    environments: MOCK_ENVS,
    activeEnvId: 'env1',
    envPanelOpen: false,
    chainCache: {},

    settings: DEFAULT_SETTINGS,
    settingsPanelOpen: false,

    // ── Data ────────────────────────────────────────────────────────────────
    loadOrganizations: async () => {
        set({ dataLoading: true, dataError: null });
        try {
            // Load settings first so they're ready before anything renders.
            if (isWails) {
                try {
                    const cfg = await SettingsService.Load();
                    if (cfg) {
                        const merged = { ...DEFAULT_SETTINGS, ...cfg };
                        // Ensure enums stay valid
                        if (!['sm', 'md', 'lg'].includes(merged.fontSize))
                            merged.fontSize = DEFAULT_SETTINGS.fontSize;
                        if (!['dark', 'light'].includes(merged.theme))
                            merged.theme = DEFAULT_SETTINGS.theme;
                        set({ settings: merged as typeof DEFAULT_SETTINGS });
                    }
                } catch (e) {
                    set({ settingsError: String(e) });
                }
            }
            const orgs = isWails ? await OrganizationService.LoadOrganizations() : MOCK_ORGS;
            const activeOrgId = get().activeOrgId ?? orgs[0]?.id ?? null;
            const activeProjectId = get().activeProjectId ?? orgs[0]?.projects?.[0]?.id ?? null;
            set({ organizations: orgs, dataLoading: false, activeOrgId, activeProjectId });
        } catch (err) {
            set({ dataError: String(err), dataLoading: false, organizations: MOCK_ORGS });
        }
    },

    setProtocol: protocol => set({ protocol }),
    setActiveOrg: id => {
        const org = get().organizations.find(o => o.id === id);
        set({
            activeOrgId: id,
            activeProjectId: org?.projects?.[0]?.id ?? null,
            activeCollectionId: null,
            activeTabId: null,
        });
    },
    setActiveProject: id =>
        set({ activeProjectId: id, activeCollectionId: null, activeTabId: null }),
    setActiveCollection: id =>
        set(
            id === null
                ? { activeCollectionId: null, activeTabId: null }
                : { activeCollectionId: id }
        ),

    // ── Protocol switching ────────────────────────────────────────────────────
    setRequestProtocol: protocol => {
        const defaultTab = protocol === 'http' ? 'params' : 'message';
        set(s => patchEditing(s, { protocol, activeTab: defaultTab }));
    },

    patchGraphQL: patch =>
        set(s => {
            const e = selectEditing(s);
            if (!e) return s;
            return patchEditing(s, { graphql: { ...e.graphql, ...patch } });
        }),

    patchGrpc: patch =>
        set(s => {
            const e = selectEditing(s);
            if (!e) return s;
            return patchEditing(s, { grpc: { ...e.grpc, ...patch } });
        }),

    patchKafka: patch =>
        set(s => {
            const e = selectEditing(s);
            if (!e) return s;
            return patchEditing(s, { kafka: { ...e.kafka, ...patch } });
        }),

    patchSqs: patch =>
        set(s => {
            const e = selectEditing(s);
            if (!e) return s;
            return patchEditing(s, { sqs: { ...e.sqs, ...patch } });
        }),

    patchWs: patch =>
        set(s => {
            const e = selectEditing(s);
            if (!e) return s;
            return patchEditing(s, { ws: { ...e.ws, ...patch } });
        }),

    setTests: tests => set(s => patchEditing(s, { tests })),

    // ── Tabs ─────────────────────────────────────────────────────────────────
    openTab: (path, req, protocol) => {
        const existing = get().tabs.find(t => t.path?.requestId === path.requestId);
        if (existing) {
            set({
                activeTabId: existing.id,
                activeCollectionId: existing.path?.collectionId ?? null,
            });
            return;
        }
        const editing = editingFromRequest(req);
        if (protocol) editing.protocol = protocol;
        const savedResponse = req.lastResponse ?? null;
        const tab = makeTab({ path, editing, response: savedResponse });
        set(s => ({
            tabs: [...s.tabs, tab],
            activeTabId: tab.id,
            activeCollectionId: path.collectionId,
        }));
    },

    closeTab: tabId => {
        const { tabs, activeTabId, activeOrgId, activeProjectId } = get();
        const idx = tabs.findIndex(t => t.id === tabId);
        const newTabs = tabs.filter(t => t.id !== tabId);
        const newActiveId =
            activeTabId !== tabId
                ? activeTabId
                : newTabs.length === 0
                  ? null
                  : (newTabs[Math.max(0, idx - 1)]?.id ?? null);
        const newActiveTab = newTabs.find(t => t.id === newActiveId) ?? null;
        set({
            tabs: newTabs,
            activeTabId: newActiveId,
            activeOrgId: newActiveTab?.path?.orgId ?? activeOrgId,
            activeProjectId: newActiveTab?.path?.projectId ?? activeProjectId,
            activeCollectionId: newActiveTab?.path?.collectionId ?? null,
        });
    },

    switchTab: tabId => {
        const tab = get().tabs.find(t => t.id === tabId) ?? null;
        set(s => ({
            activeTabId: tabId,
            activeOrgId: tab?.path?.orgId ?? s.activeOrgId,
            activeProjectId: tab?.path?.projectId ?? s.activeProjectId,
            activeCollectionId: tab?.path?.collectionId ?? null,
        }));
    },

    newBlankTab: () => {
        const tab = makeTab();
        set(s => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
    },

    duplicateTab: () => {
        const { tabs, activeTabId } = get();
        const src = tabs.find(t => t.id === activeTabId);
        if (!src) return;
        const clone = { ...src, id: crypto.randomUUID(), isDirty: src.isDirty };
        const idx = tabs.findIndex(t => t.id === activeTabId);
        const newTabs = [...tabs.slice(0, idx + 1), clone, ...tabs.slice(idx + 1)];
        set({ tabs: newTabs, activeTabId: clone.id });
    },

    // ── Editing ───────────────────────────────────────────────────────────────
    setMethod: method => set(s => patchEditing(s, { method })),
    setUrl: url => set(s => patchEditing(s, { url, params: parseParams(url) })),
    setBody: body => set(s => patchEditing(s, { body })),
    setBodyType: t => set(s => patchEditing(s, { bodyType: t })),
    setFormField: (idx, key, value) =>
        set(s => {
            const e = selectEditing(s);
            if (!e) return s;
            return patchEditing(s, {
                formFields: e.formFields.map((f, i) => (i === idx ? { ...f, key, value } : f)),
            });
        }),
    toggleFormField: idx =>
        set(s => {
            const e = selectEditing(s);
            if (!e) return s;
            return patchEditing(s, {
                formFields: e.formFields.map((f, i) =>
                    i === idx ? { ...f, enabled: !f.enabled } : f
                ),
            });
        }),
    addFormField: () =>
        set(s => {
            const e = selectEditing(s);
            if (!e) return s;
            return patchEditing(s, {
                formFields: [...e.formFields, { key: '', value: '', enabled: true }],
            });
        }),
    removeFormField: idx =>
        set(s => {
            const e = selectEditing(s);
            if (!e) return s;
            return patchEditing(s, { formFields: e.formFields.filter((_, i) => i !== idx) });
        }),
    setBinaryFile: (name, content) =>
        set(s => patchEditing(s, { binaryFileName: name, binaryContent: content })),
    setAuth: patch =>
        set(s => {
            const e = selectEditing(s);
            if (!e) return s;
            return patchEditing(s, { auth: { ...e.auth, ...patch } });
        }),
    setNotes: notes => set(s => patchEditing(s, { notes })),
    setActiveTab: tab =>
        set(s => {
            const active = selectActiveTab(s);
            if (!active?.editing) return s;
            return patchActiveTab(s, { editing: { ...active.editing, activeTab: tab } });
        }),

    setHeader: (idx, key, value) =>
        set(s => {
            const e = selectEditing(s);
            if (!e) return s;
            return patchEditing(s, {
                headers: e.headers.map((h, i) => (i === idx ? { ...h, key, value } : h)),
            });
        }),

    toggleHeader: idx =>
        set(s => {
            const e = selectEditing(s);
            if (!e) return s;
            return patchEditing(s, {
                headers: e.headers.map((h, i) => (i === idx ? { ...h, enabled: !h.enabled } : h)),
            });
        }),

    addHeader: () =>
        set(s => {
            const e = selectEditing(s);
            if (!e) return s;
            return patchEditing(s, {
                headers: [...e.headers, { key: '', value: '', enabled: true }],
            });
        }),

    removeHeader: idx =>
        set(s => {
            const e = selectEditing(s);
            if (!e) return s;
            return patchEditing(s, { headers: e.headers.filter((_, i) => i !== idx) });
        }),

    setParam: (idx, key, value) =>
        set(s => {
            const e = selectEditing(s);
            if (!e) return s;
            const params = e.params.map((p, i) => (i === idx ? { ...p, key, value } : p));
            return patchEditing(s, { params, url: buildUrl(e.url, params) });
        }),

    toggleParam: idx =>
        set(s => {
            const e = selectEditing(s);
            if (!e) return s;
            const params = e.params.map((p, i) => (i === idx ? { ...p, enabled: !p.enabled } : p));
            return patchEditing(s, { params, url: buildUrl(e.url, params) });
        }),

    addParam: () =>
        set(s => {
            const e = selectEditing(s);
            if (!e) return s;
            return patchEditing(s, {
                params: [...e.params, { key: '', value: '', enabled: true }],
            });
        }),

    removeParam: idx =>
        set(s => {
            const e = selectEditing(s);
            if (!e) return s;
            const params = e.params.filter((_, i) => i !== idx);
            return patchEditing(s, { params, url: buildUrl(e.url, params) });
        }),

    clearRecentRequests: () => set({ recentRequests: [] }),

    // ── Send / save ───────────────────────────────────────────────────────────
    sendRequest: async () => {
        const s = get();
        const tab = selectActiveTab(s);
        const editing = tab?.editing;
        if (!tab || !editing) return;

        // Record in history before sending
        const entry: RecentRequest = {
            id: crypto.randomUUID(),
            name: editing.name,
            method: editing.method ?? 'GET',
            url: editing.url ?? '',
            protocol: editing.protocol,
            path: tab.path ?? null,
            sentAt: Date.now(),
        };
        set(s2 => ({
            recentRequests: [
                entry,
                ...s2.recentRequests.filter(
                    r =>
                        r.url !== entry.url ||
                        r.method !== entry.method ||
                        r.protocol !== entry.protocol
                ),
            ].slice(0, MAX_RECENT),
        }));

        const activeEnv = s.environments.find(e => e.id === s.activeEnvId) ?? null;

        // Find collection variables for the active tab's collection.
        const colVars: EnvVariable[] | undefined = (() => {
            const p = tab.path;
            if (!p) return undefined;
            for (const org of s.organizations) {
                for (const proj of org.projects ?? []) {
                    const col = proj.collections?.find(c => c.id === p.collectionId);
                    if (col) return (col as any).variables as EnvVariable[] | undefined;
                }
            }
            return undefined;
        })();

        // Convenience wrapper that applies env, collection, and chain vars.
        const rv = (text: string) => resolveVars(text, activeEnv, colVars, s.chainCache);

        set(st =>
            patchActiveTab(st, { responseLoading: true, responseError: null, response: null })
        );

        try {
            const headersMap: Record<string, string> = {};
            editing.headers
                .filter(h => h.enabled && h.key)
                .forEach(h => {
                    headersMap[rv(h.key)] = rv(h.value);
                });
            // Auth header injection
            const auth = editing.auth;
            if (auth.type === 'bearer' && auth.token) {
                headersMap['Authorization'] = `Bearer ${rv(auth.token)}`;
            } else if (auth.type === 'basic' && auth.username) {
                headersMap['Authorization'] =
                    `Basic ${btoa(`${rv(auth.username)}:${rv(auth.password)}`)}`;
            } else if (auth.type === 'apikey' && auth.headerName) {
                headersMap[rv(auth.headerName)] = rv(auth.headerValue);
            } else if (auth.type === 'oauth2' && auth.oauth2AccessToken) {
                headersMap['Authorization'] = `Bearer ${auth.oauth2AccessToken}`;
            }
            let method = editing.method;
            let body = rv(editing.body);
            const url = rv(editing.url);

            // Binary body: pass base64 content with special marker header
            if (editing.bodyType === 'binary' && editing.binaryContent) {
                body = editing.binaryContent;
                headersMap['X-Simora-Binary'] = 'base64';
                // Set Content-Type from file extension if not already set
                if (!headersMap['Content-Type']) {
                    const ext = editing.binaryFileName.split('.').pop()?.toLowerCase() ?? '';
                    const mimeMap: Record<string, string> = {
                        png: 'image/png',
                        jpg: 'image/jpeg',
                        jpeg: 'image/jpeg',
                        gif: 'image/gif',
                        pdf: 'application/pdf',
                        zip: 'application/zip',
                        json: 'application/json',
                        xml: 'application/xml',
                        csv: 'text/csv',
                        txt: 'text/plain',
                        mp4: 'video/mp4',
                        mp3: 'audio/mpeg',
                    };
                    headersMap['Content-Type'] = mimeMap[ext] ?? 'application/octet-stream';
                }
            }

            if (editing.protocol === 'graphql') {
                method = 'POST';
                headersMap['Content-Type'] = 'application/json';
                let vars: unknown = undefined;
                try {
                    vars = JSON.parse(editing.graphql.variables || '{}');
                } catch {
                    /* ignore */
                }
                body = JSON.stringify({ query: editing.graphql.query, variables: vars });
            }

            const t0 = Date.now();

            // ── Kafka ──────────────────────────────────────────────────────────
            if (editing.protocol === 'kafka') {
                const k = editing.kafka;
                const auth = {
                    SaslMechanism: k.saslMechanism,
                    SaslUsername: k.saslUsername,
                    SaslPassword: k.saslPassword,
                    TLS: k.tls,
                };
                const schemaRegistry = {
                    URL: k.schemaRegistryUrl,
                    Subject: k.schemaRegistrySubject,
                    Username: k.schemaRegistryUsername,
                    Password: k.schemaRegistryPassword,
                };
                let bodyStr: string;
                if (k.mode === 'produce') {
                    bodyStr = isWails
                        ? await KafkaService.Produce({
                              Bootstrap: rv(k.bootstrap),
                              Topic: rv(k.topic),
                              Key: rv(k.key),
                              Message: rv(k.message),
                              Headers: Object.fromEntries(
                                  k.headers
                                      .filter(h => h.enabled && h.key)
                                      .map(h => [rv(h.key), rv(h.value)])
                              ),
                              Auth: auth,
                              MessageFormat: k.messageFormat,
                              ProtoSchema: k.protoSchema,
                              ProtoMessageType: k.protoMessageType,
                              SchemaRegistry: schemaRegistry,
                          } as any)
                        : JSON.stringify(
                              { status: 'produced', topic: k.topic, partition: 0, offset: 0 },
                              null,
                              2
                          );
                } else {
                    bodyStr = isWails
                        ? await KafkaService.Consume({
                              Bootstrap: rv(k.bootstrap),
                              Topic: rv(k.topic),
                              Group: k.group,
                              Offset: k.offset,
                              MaxMessages: k.maxMessages || 50,
                              Auth: auth,
                              SchemaRegistry: schemaRegistry,
                          } as any)
                        : JSON.stringify(
                              { status: 'consumed', topic: k.topic, count: 0, messages: [] },
                              null,
                              2
                          );
                }
                const elapsed = Date.now() - t0;
                const kafkaRes: domain.Response = {
                    statusCode: 200,
                    status: '200 OK',
                    time: elapsed,
                    size: bodyStr.length,
                    body: bodyStr,
                    headers: {},
                    isBinary: false,
                    contentType: '',
                };
                set(st =>
                    patchActiveTab(st, {
                        response: kafkaRes,
                        responseLoading: false,
                        testResults: [],
                    })
                );
                return;
            }

            // ── gRPC ───────────────────────────────────────────────────────────
            if (editing.protocol === 'grpc') {
                const g = editing.grpc;
                const metaMap = Object.fromEntries(
                    g.meta.filter(h => h.enabled && h.key).map(h => [rv(h.key), rv(h.value)])
                );
                let bodyStr: string;
                if (isWails) {
                    bodyStr = await GrpcService.Invoke({
                        Server: rv(g.server),
                        Service: g.service,
                        Method: g.method,
                        Message: rv(g.message),
                        Meta: metaMap,
                        TLS: g.tls,
                    } as any);
                } else {
                    bodyStr = JSON.stringify(
                        { message: 'gRPC mock response', server: g.server },
                        null,
                        2
                    );
                }
                const elapsed = Date.now() - t0;
                let grpcStatus = '200 OK';
                try {
                    const parsed = JSON.parse(bodyStr);
                    if (Array.isArray(parsed)) {
                        grpcStatus = `${parsed.length} message${parsed.length !== 1 ? 's' : ''}`;
                    }
                } catch {
                    /* not JSON */
                }
                const grpcRes: domain.Response = {
                    statusCode: 200,
                    status: grpcStatus,
                    time: elapsed,
                    size: bodyStr.length,
                    body: bodyStr,
                    headers: {},
                    isBinary: false,
                    contentType: '',
                };
                set(st =>
                    patchActiveTab(st, {
                        response: grpcRes,
                        responseLoading: false,
                        testResults: [],
                    })
                );
                return;
            }

            // ── SQS ────────────────────────────────────────────────────────────
            if (editing.protocol === 'sqs') {
                const sq = editing.sqs;
                const sqsAuth = {
                    AccessKeyID: rv(sq.accessKeyId),
                    SecretAccessKey: rv(sq.secretAccessKey),
                    SessionToken: rv(sq.sessionToken),
                };
                const attrs = sq.attributes
                    .filter(a => a.enabled && a.key)
                    .map(a => ({
                        Key: a.key,
                        Value: a.value,
                        Type: a.type,
                    }));
                let bodyStr: string;
                if (isWails) {
                    bodyStr = await SqsService.Send({
                        QueueURL: rv(sq.queueUrl),
                        Body: rv(sq.body),
                        Region: rv(sq.region),
                        DelaySeconds: sq.delaySeconds,
                        Attributes: attrs,
                        Auth: sqsAuth,
                        MessageGroupID: sq.messageGroupId,
                        MessageDeduplicationID: sq.messageDeduplicationId,
                    } as any);
                } else {
                    bodyStr = JSON.stringify(
                        {
                            status: 'sent',
                            messageId: 'mock-id-' + Date.now(),
                            queueUrl: sq.queueUrl,
                        },
                        null,
                        2
                    );
                }
                const elapsed = Date.now() - t0;
                const sqsRes: domain.Response = {
                    statusCode: 200,
                    status: '200 OK',
                    time: elapsed,
                    size: bodyStr.length,
                    body: bodyStr,
                    headers: {},
                    isBinary: false,
                    contentType: '',
                };
                set(st =>
                    patchActiveTab(st, {
                        response: sqsRes,
                        responseLoading: false,
                        testResults: [],
                    })
                );
                return;
            }

            // ── WebSocket ─────────────────────────────────────────────────────
            if (editing.protocol === 'websocket') {
                const w = editing.ws;
                let bodyStr: string;
                if (isWails) {
                    bodyStr = await WsService.Connect({
                        URL: rv(w.url),
                        Headers: Object.fromEntries(
                            w.headers.filter(h => h.enabled && h.key).map(h => [h.key, h.value])
                        ),
                        Message: w.message,
                        MaxMessages: w.maxMessages || 50,
                        IdleTimeout: w.idleTimeout || 5,
                        TLSInsecure: w.tlsInsecure,
                    } as any);
                } else {
                    bodyStr = JSON.stringify(
                        { status: 'connected', url: w.url, count: 0, messages: [] },
                        null,
                        2
                    );
                }
                const elapsed = Date.now() - t0;
                let wsStatus = '200 OK';
                try {
                    const parsed = JSON.parse(bodyStr);
                    if (typeof parsed?.count === 'number') {
                        const n = parsed.count as number;
                        wsStatus = `${n} message${n !== 1 ? 's' : ''}`;
                    }
                } catch {
                    /* not JSON */
                }
                const wsRes: domain.Response = {
                    statusCode: 200,
                    status: wsStatus,
                    time: elapsed,
                    size: bodyStr.length,
                    body: bodyStr,
                    headers: {},
                    isBinary: false,
                    contentType: '',
                };
                set(st =>
                    patchActiveTab(st, {
                        response: wsRes,
                        responseLoading: false,
                        testResults: [],
                    })
                );
                return;
            }

            // ── HTTP / GraphQL ──────────────────────────────────────────────────
            const res = isWails
                ? await RequestService.ExecuteRequest(method, url, body, headersMap)
                : MOCK_RESPONSE;

            // Store response in chain cache keyed by request name.
            const reqName = editing.name;
            if (reqName) {
                let chainValue: unknown = res.body;
                try {
                    chainValue = JSON.parse(res.body);
                } catch {
                    // keep as string
                }
                set(st => ({ chainCache: { ...st.chainCache, [reqName]: chainValue } }));
            }

            // Run tests (in isolated Web Worker with 3 s timeout)
            set(st =>
                patchActiveTab(st, { response: res, responseLoading: false, testResults: [] })
            );
            const testResults = await runTests(editing.tests, res);
            set(st => patchActiveTab(st, { testResults }));
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            set(st => patchActiveTab(st, { responseError: msg, responseLoading: false }));
        }
    },

    saveRequest: async () => {
        const s = get();
        const tab = selectActiveTab(s);
        if (!tab?.editing || !tab.path) return;
        const e = tab.editing;
        const path = tab.path;
        const reqData: Record<string, unknown> = {
            id: e.id,
            name: e.name,
            protocol: e.protocol,
            method: e.method,
            url: e.url,
            params: e.params,
            headers: e.headers,
            body: e.body,
            bodyType: e.bodyType,
            formFields: e.formFields,
            binaryFileName: e.binaryFileName,
            auth: e.auth,
            notes: e.notes,
            activeTab: e.activeTab,
            lastResponse: tab.response ?? undefined,
            grpc: e.grpc,
            kafka: e.kafka,
            sqs: e.sqs,
            ws: e.ws,
        };
        if (isWails) {
            await OrganizationService.UpdateRequest(
                path.orgId,
                path.projectId,
                path.collectionId,
                reqData as any
            );
        }
        // Sync updated data back into organizations so the sidebar reflects changes
        set(st => ({
            ...patchActiveTab(st, { isDirty: false }),
            organizations: st.organizations.map(org => {
                if (org.id !== path.orgId) return org;
                return {
                    ...org,
                    projects: org.projects?.map(proj => {
                        if (proj.id !== path.projectId) return proj;
                        return {
                            ...proj,
                            collections: proj.collections?.map(col => {
                                if (col.id !== path.collectionId) return col;
                                if (path.folderId) {
                                    return {
                                        ...col,
                                        folders: col.folders?.map(f =>
                                            f.id === path.folderId
                                                ? {
                                                      ...f,
                                                      requests: f.requests?.map(r =>
                                                          r.id === e.id ? { ...r, ...reqData } : r
                                                      ),
                                                  }
                                                : f
                                        ),
                                    };
                                }
                                return {
                                    ...col,
                                    requests: col.requests?.map(r =>
                                        r.id === e.id ? { ...r, ...reqData } : r
                                    ),
                                };
                            }),
                        };
                    }),
                };
            }) as Organization[],
        }));
    },

    // ── Create / rename / delete ──────────────────────────────────────────────
    // ── Org ──────────────────────────────────────────────────────────────────
    createOrganization: name => {
        const id = crypto.randomUUID();
        const newOrg = domain.Organisation.createFrom({ id, name, projects: [] });
        set(s => ({
            organizations: [...s.organizations, newOrg] as Organization[],
            activeOrgId: id,
            activeProjectId: null,
        }));
        if (isWails) OrganizationService.CreateOrganization(id, name).catch(console.error);
    },

    renameOrganization: (id, name) => {
        set(s => ({
            organizations: s.organizations.map(o =>
                o.id === id ? { ...o, name } : o
            ) as Organization[],
        }));
        if (isWails) OrganizationService.RenameOrganization(id, name).catch(console.error);
    },

    deleteOrganization: id => {
        set(s => {
            const newOrgs = s.organizations.filter(o => o.id !== id) as Organization[];
            const newTabs = s.tabs.filter(t => t.path?.orgId !== id);
            const newActiveTabId = newTabs.find(t => t.id === s.activeTabId)
                ? s.activeTabId
                : (newTabs[0]?.id ?? null);
            const newActiveTab = newTabs.find(t => t.id === newActiveTabId) ?? null;
            const fallbackOrg = newOrgs[0] ?? null;
            const activeOrgDeleted = s.activeOrgId === id;
            return {
                organizations: newOrgs,
                tabs: newTabs,
                activeTabId: newActiveTabId,
                activeOrgId: activeOrgDeleted
                    ? (newActiveTab?.path?.orgId ?? fallbackOrg?.id ?? null)
                    : s.activeOrgId,
                activeProjectId: activeOrgDeleted
                    ? (newActiveTab?.path?.projectId ?? fallbackOrg?.projects?.[0]?.id ?? null)
                    : s.activeProjectId,
                activeCollectionId: activeOrgDeleted
                    ? (newActiveTab?.path?.collectionId ?? null)
                    : s.activeCollectionId,
            };
        });
        if (isWails) OrganizationService.DeleteOrganization(id).catch(console.error);
    },

    // ── Project ───────────────────────────────────────────────────────────────
    createProject: (orgId, name) => {
        const id = crypto.randomUUID();
        const newProj = domain.Project.createFrom({ id, name, collections: [] });
        set(s => ({
            organizations: s.organizations.map(o =>
                o.id === orgId ? { ...o, projects: [...(o.projects ?? []), newProj] } : o
            ) as Organization[],
            activeProjectId: id,
            activeCollectionId: null,
        }));
        if (isWails) OrganizationService.CreateProject(orgId, id, name).catch(console.error);
        return id;
    },

    renameProject: (orgId, id, name) => {
        if (isWails) OrganizationService.RenameProject(orgId, id, name).catch(console.error);
        set(s => ({
            organizations: s.organizations.map(o =>
                o.id === orgId
                    ? { ...o, projects: o.projects?.map(p => (p.id === id ? { ...p, name } : p)) }
                    : o
            ) as Organization[],
        }));
    },

    deleteProject: (orgId, id) => {
        set(s => {
            const newOrgs = s.organizations.map(o =>
                o.id === orgId ? { ...o, projects: o.projects?.filter(p => p.id !== id) } : o
            ) as Organization[];
            const newTabs = s.tabs.filter(
                t => !(t.path?.orgId === orgId && t.path?.projectId === id)
            );
            const newActiveTabId = newTabs.find(t => t.id === s.activeTabId)
                ? s.activeTabId
                : (newTabs[0]?.id ?? null);
            const newActiveTab = newTabs.find(t => t.id === newActiveTabId) ?? null;
            const activeProjectDeleted = s.activeProjectId === id;
            return {
                organizations: newOrgs,
                tabs: newTabs,
                activeTabId: newActiveTabId,
                activeProjectId: activeProjectDeleted
                    ? (newActiveTab?.path?.projectId ??
                      newOrgs.find(o => o.id === orgId)?.projects?.[0]?.id ??
                      null)
                    : s.activeProjectId,
                activeCollectionId: activeProjectDeleted
                    ? (newActiveTab?.path?.collectionId ?? null)
                    : s.activeCollectionId,
            };
        });
        if (isWails) OrganizationService.DeleteProject(orgId, id).catch(console.error);
    },

    // ── Folder ────────────────────────────────────────────────────────────────
    createFolder: (orgId, projectId, collectionId, name) => {
        const id = crypto.randomUUID();
        const newFolder = domain.Folder.createFrom({ id, name, requests: [], folders: [] });
        set(s => ({
            organizations: s.organizations.map(org => {
                if (org.id !== orgId) return org;
                return {
                    ...org,
                    projects: org.projects?.map(proj => {
                        if (proj.id !== projectId) return proj;
                        return {
                            ...proj,
                            collections: proj.collections?.map(col => {
                                if (col.id !== collectionId) return col;
                                return { ...col, folders: [...(col.folders ?? []), newFolder] };
                            }),
                        };
                    }),
                };
            }) as Organization[],
        }));
        if (isWails)
            OrganizationService.CreateFolder(orgId, projectId, collectionId, '', id, name).catch(
                console.error
            );
    },

    createSubFolder: (orgId, projectId, collectionId, parentFolderId, name) => {
        const id = crypto.randomUUID();
        const newFolder = domain.Folder.createFrom({ id, name, requests: [], folders: [] });
        function insertInto(folders: any[]): any[] {
            return folders.map(f => {
                if (f.id === parentFolderId) {
                    return { ...f, folders: [...(f.folders ?? []), newFolder] };
                }
                if (f.folders?.length) {
                    return { ...f, folders: insertInto(f.folders) };
                }
                return f;
            });
        }
        set(s => ({
            organizations: s.organizations.map(org => {
                if (org.id !== orgId) return org;
                return {
                    ...org,
                    projects: org.projects?.map(proj => {
                        if (proj.id !== projectId) return proj;
                        return {
                            ...proj,
                            collections: proj.collections?.map(col => {
                                if (col.id !== collectionId) return col;
                                return { ...col, folders: insertInto(col.folders ?? []) };
                            }),
                        };
                    }),
                };
            }) as Organization[],
        }));
        if (isWails)
            OrganizationService.CreateFolder(
                orgId,
                projectId,
                collectionId,
                parentFolderId,
                id,
                name
            ).catch(console.error);
    },

    renameFolder: (orgId, projectId, collectionId, folderId, name) => {
        set(s => ({
            organizations: s.organizations.map(org => {
                if (org.id !== orgId) return org;
                return {
                    ...org,
                    projects: org.projects?.map(proj => {
                        if (proj.id !== projectId) return proj;
                        return {
                            ...proj,
                            collections: proj.collections?.map(col => {
                                if (col.id !== collectionId) return col;
                                return {
                                    ...col,
                                    folders: col.folders?.map(f =>
                                        f.id === folderId ? { ...f, name } : f
                                    ),
                                };
                            }),
                        };
                    }),
                };
            }) as Organization[],
        }));
        if (isWails)
            OrganizationService.RenameFolder(orgId, projectId, collectionId, folderId, name).catch(
                console.error
            );
    },

    deleteFolder: (orgId, projectId, collectionId, folderId) => {
        set(s => {
            const newTabs = s.tabs.filter(t => t.path?.folderId !== folderId);
            return {
                organizations: s.organizations.map(org => {
                    if (org.id !== orgId) return org;
                    return {
                        ...org,
                        projects: org.projects?.map(proj => {
                            if (proj.id !== projectId) return proj;
                            return {
                                ...proj,
                                collections: proj.collections?.map(col => {
                                    if (col.id !== collectionId) return col;
                                    return {
                                        ...col,
                                        folders: col.folders?.filter(f => f.id !== folderId),
                                    };
                                }),
                            };
                        }),
                    };
                }) as Organization[],
                tabs: newTabs,
                activeTabId: newTabs.find(t => t.id === s.activeTabId)
                    ? s.activeTabId
                    : (newTabs[0]?.id ?? null),
            };
        });
        if (isWails)
            OrganizationService.DeleteFolder(orgId, projectId, collectionId, folderId).catch(
                console.error
            );
    },

    createRequest: (path, name, protocol = 'http') => {
        const id = crypto.randomUUID();
        const newReq = domain.Request.createFrom({
            id,
            name,
            method: 'GET',
            url: '',
            body: '',
            headers: [],
        });
        set(s => ({
            organizations: s.organizations.map(org => {
                if (org.id !== path.orgId) return org;
                return {
                    ...org,
                    projects: org.projects?.map(proj => {
                        if (proj.id !== path.projectId) return proj;
                        return {
                            ...proj,
                            collections: proj.collections?.map(col => {
                                if (col.id !== path.collectionId) return col;
                                if (path.folderId) {
                                    return {
                                        ...col,
                                        folders: col.folders?.map(f =>
                                            f.id === path.folderId
                                                ? {
                                                      ...f,
                                                      requests: [...(f.requests ?? []), newReq],
                                                  }
                                                : f
                                        ),
                                    };
                                }
                                return { ...col, requests: [...(col.requests ?? []), newReq] };
                            }),
                        };
                    }),
                };
            }) as Organization[],
        }));
        if (isWails) {
            const reqData = { id, name, method: 'GET', url: '', protocol };
            OrganizationService.CreateRequest(
                path.orgId,
                path.projectId,
                path.collectionId,
                path.folderId ?? '',
                reqData as any
            ).catch(console.error);
        }
        get().openTab({ ...path, requestId: id }, newReq, protocol);
        return id;
    },

    renameRequest: (requestId, name) => {
        const path = findRequestPath(get().organizations, requestId);
        if (isWails && path)
            OrganizationService.RenameRequest(
                path.orgId,
                path.projectId,
                path.collectionId,
                requestId,
                name
            ).catch(console.error);
        set(s => ({
            organizations: s.organizations.map(org => ({
                ...org,
                projects: org.projects?.map(proj => ({
                    ...proj,
                    collections: proj.collections?.map(col => ({
                        ...col,
                        requests: col.requests?.map(req =>
                            req.id === requestId ? { ...req, name } : req
                        ),
                        folders: col.folders?.map(fld => ({
                            ...fld,
                            requests: fld.requests?.map(req =>
                                req.id === requestId ? { ...req, name } : req
                            ),
                        })),
                    })),
                })),
            })) as Organization[],
            tabs: s.tabs.map(t =>
                t.editing?.id === requestId ? { ...t, editing: { ...t.editing!, name } } : t
            ),
        }));
    },

    deleteRequest: requestId => {
        const path = findRequestPath(get().organizations, requestId);
        if (isWails && path)
            OrganizationService.DeleteRequest(
                path.orgId,
                path.projectId,
                path.collectionId,
                requestId
            ).catch(console.error);
        set(s => {
            const newTabs = s.tabs.filter(t => t.path?.requestId !== requestId);
            const wasActiveDeleted =
                s.tabs.find(t => t.id === s.activeTabId)?.path?.requestId === requestId;
            return {
                organizations: s.organizations.map(org => ({
                    ...org,
                    projects: org.projects?.map(proj => ({
                        ...proj,
                        collections: proj.collections?.map(col => ({
                            ...col,
                            requests: col.requests?.filter(req => req.id !== requestId),
                            folders: col.folders?.map(fld => ({
                                ...fld,
                                requests: fld.requests?.filter(req => req.id !== requestId),
                            })),
                        })),
                    })),
                })) as Organization[],
                tabs: newTabs,
                activeTabId: wasActiveDeleted ? (newTabs[0]?.id ?? null) : s.activeTabId,
            };
        });
    },

    duplicateRequest: requestId => {
        const path = findRequestPath(get().organizations, requestId);
        if (!path) return;
        const orgs = get().organizations;
        const org = orgs.find(o => o.id === path.orgId);
        const proj = org?.projects?.find(p => p.id === path.projectId);
        const col = proj?.collections?.find(c => c.id === path.collectionId);
        let src: Request | null | undefined = null;
        if (path.folderId) {
            src = col?.folders
                ?.find(f => f.id === path.folderId)
                ?.requests?.find(r => r.id === requestId);
        } else {
            src = col?.requests?.find(r => r.id === requestId);
        }
        if (!src) return;
        const newId = crypto.randomUUID();
        const newReq = domain.Request.createFrom({ ...src, id: newId, name: src.name + ' (copy)' });
        set(s => ({
            organizations: s.organizations.map(org => {
                if (org.id !== path.orgId) return org;
                return {
                    ...org,
                    projects: org.projects?.map(proj => {
                        if (proj.id !== path.projectId) return proj;
                        return {
                            ...proj,
                            collections: proj.collections?.map(col => {
                                if (col.id !== path.collectionId) return col;
                                if (path.folderId) {
                                    return {
                                        ...col,
                                        folders: col.folders?.map(f =>
                                            f.id === path.folderId
                                                ? {
                                                      ...f,
                                                      requests: [...(f.requests ?? []), newReq],
                                                  }
                                                : f
                                        ),
                                    };
                                }
                                return { ...col, requests: [...(col.requests ?? []), newReq] };
                            }),
                        };
                    }),
                };
            }) as Organization[],
        }));
        if (isWails) {
            const reqData = { ...src, id: newId, name: src.name + ' (copy)' };
            OrganizationService.CreateRequest(
                path.orgId,
                path.projectId,
                path.collectionId,
                path.folderId ?? '',
                reqData as any
            ).catch(console.error);
        }
        get().openTab({ ...path, requestId: newId }, newReq);
    },

    duplicateFolder: (orgId, projectId, collectionId, folderId) => {
        function deepCopyFolder(f: any): any {
            return {
                ...f,
                id: crypto.randomUUID(),
                name: f.name + ' (copy)',
                requests: (f.requests ?? []).map((r: any) => ({ ...r, id: crypto.randomUUID() })),
                folders: (f.folders ?? []).map((sub: any) => deepCopyFolder(sub)),
            };
        }
        let copy: any = null;
        set(s => ({
            organizations: s.organizations.map(org => {
                if (org.id !== orgId) return org;
                return {
                    ...org,
                    projects: org.projects?.map(proj => {
                        if (proj.id !== projectId) return proj;
                        return {
                            ...proj,
                            collections: proj.collections?.map(col => {
                                if (col.id !== collectionId) return col;
                                const src = col.folders?.find(f => f.id === folderId);
                                if (!src) return col;
                                copy = deepCopyFolder(src);
                                return { ...col, folders: [...(col.folders ?? []), copy] };
                            }),
                        };
                    }),
                };
            }) as Organization[],
        }));
        if (isWails && copy) {
            async function persistFolder(f: any, parentFolderId: string) {
                await OrganizationService.CreateFolder(
                    orgId,
                    projectId,
                    collectionId,
                    parentFolderId,
                    f.id,
                    f.name
                );
                for (const r of f.requests ?? []) {
                    await OrganizationService.CreateRequest(
                        orgId,
                        projectId,
                        collectionId,
                        f.id,
                        r as any
                    );
                }
                for (const sub of f.folders ?? []) {
                    await persistFolder(sub, f.id);
                }
            }
            persistFolder(copy, '').catch(console.error);
        }
    },

    moveRequest: (requestId, toCollectionId, toFolderId) => {
        let moved: Request | null = null;
        set(s => {
            // Pass 1: extract the request
            const orgs1 = s.organizations.map(org => ({
                ...org,
                projects: org.projects?.map(proj => ({
                    ...proj,
                    collections: proj.collections?.map(col => {
                        const fromRoot = col.requests?.find(r => r.id === requestId);
                        if (fromRoot) {
                            moved = fromRoot;
                            return {
                                ...col,
                                requests: col.requests!.filter(r => r.id !== requestId),
                            };
                        }
                        return {
                            ...col,
                            folders: col.folders?.map(f => {
                                const fromFolder = f.requests?.find(r => r.id === requestId);
                                if (fromFolder) {
                                    moved = fromFolder;
                                    return {
                                        ...f,
                                        requests: f.requests!.filter(r => r.id !== requestId),
                                    };
                                }
                                return f;
                            }),
                        };
                    }),
                })),
            })) as Organization[];

            if (!moved) return {};

            // Pass 2: insert into destination
            const req = moved;
            const orgs2 = orgs1.map(org => ({
                ...org,
                projects: org.projects?.map(proj => ({
                    ...proj,
                    collections: proj.collections?.map(col => {
                        if (col.id !== toCollectionId) return col;
                        if (toFolderId) {
                            return {
                                ...col,
                                folders: col.folders?.map(f =>
                                    f.id === toFolderId
                                        ? { ...f, requests: [...(f.requests ?? []), req] }
                                        : f
                                ),
                            };
                        }
                        return { ...col, requests: [...(col.requests ?? []), req] };
                    }),
                })),
            })) as Organization[];

            return { organizations: orgs2 };
        });
    },

    reorderRequest: (requestId, targetRequestId, position) => {
        set(s => {
            // Find which container (collection + optional folder) holds the target request.
            let targetCol = '';
            let targetFolder: string | null = null;

            outer: for (const org of s.organizations) {
                for (const proj of org.projects ?? []) {
                    for (const col of proj.collections ?? []) {
                        if (col.requests?.some(r => r.id === targetRequestId)) {
                            targetCol = col.id;
                            targetFolder = null;
                            break outer;
                        }

                        for (const f of col.folders ?? []) {
                            if (f.requests?.some(r => r.id === targetRequestId)) {
                                targetCol = col.id;
                                targetFolder = f.id;
                                break outer;
                            }
                        }
                    }
                }
            }

            if (!targetCol) return s;

            // Extract the moved request from its current location.
            let moved: Request | null = null;
            const orgs1 = s.organizations.map(org => ({
                ...org,
                projects: org.projects?.map(proj => ({
                    ...proj,
                    collections: proj.collections?.map(col => {
                        const fromRoot = col.requests?.find(r => r.id === requestId);

                        if (fromRoot) {
                            moved = fromRoot;

                            return {
                                ...col,
                                requests: col.requests!.filter(r => r.id !== requestId),
                            };
                        }

                        return {
                            ...col,
                            folders: col.folders?.map(f => {
                                const fromFolder = f.requests?.find(r => r.id === requestId);

                                if (fromFolder) {
                                    moved = fromFolder;

                                    return {
                                        ...f,
                                        requests: f.requests!.filter(r => r.id !== requestId),
                                    };
                                }

                                return f;
                            }),
                        };
                    }),
                })),
            })) as Organization[];

            if (!moved) return s;

            const req = moved;

            // Helper: insert req before/after targetRequestId in the array.
            const spliceIn = (arr: Request[]): Request[] => {
                const idx = arr.findIndex(r => r.id === targetRequestId);

                if (idx === -1) return [...arr, req];

                const insertAt = position === 'before' ? idx : idx + 1;

                return [...arr.slice(0, insertAt), req, ...arr.slice(insertAt)];
            };

            // Insert into the target container.
            const orgs2 = orgs1.map(org => ({
                ...org,
                projects: org.projects?.map(proj => ({
                    ...proj,
                    collections: proj.collections?.map(col => {
                        if (col.id !== targetCol) return col;

                        if (targetFolder) {
                            return {
                                ...col,
                                folders: col.folders?.map(f =>
                                    f.id === targetFolder
                                        ? { ...f, requests: spliceIn(f.requests ?? []) }
                                        : f
                                ),
                            };
                        }

                        return { ...col, requests: spliceIn(col.requests ?? []) };
                    }),
                })),
            })) as Organization[];

            return { organizations: orgs2 };
        });
    },

    reorderFolder: (folderId, targetFolderId, position) => {
        set(s => {
            // Find which collection holds the target folder.
            let targetCol = '';

            outer: for (const org of s.organizations) {
                for (const proj of org.projects ?? []) {
                    for (const col of proj.collections ?? []) {
                        if (col.folders?.some(f => f.id === targetFolderId)) {
                            targetCol = col.id;
                            break outer;
                        }
                    }
                }
            }

            if (!targetCol) return s;

            const orgs = s.organizations.map(org => ({
                ...org,
                projects: org.projects?.map(proj => ({
                    ...proj,
                    collections: proj.collections?.map(col => {
                        if (col.id !== targetCol) return col;

                        const folders = col.folders ?? [];
                        const movedFolder = folders.find(f => f.id === folderId);

                        if (!movedFolder) return col;

                        const rest = folders.filter(f => f.id !== folderId);
                        const targetIdx = rest.findIndex(f => f.id === targetFolderId);

                        if (targetIdx === -1) return col;

                        const insertAt = position === 'before' ? targetIdx : targetIdx + 1;
                        const reordered = [
                            ...rest.slice(0, insertAt),
                            movedFolder,
                            ...rest.slice(insertAt),
                        ];

                        return { ...col, folders: reordered };
                    }),
                })),
            })) as Organization[];

            return { organizations: orgs };
        });
    },

    createCollection: (orgId, projectId, name) => {
        const id = crypto.randomUUID();
        const newCol = domain.Collection.createFrom({ id, name, requests: [], folders: [] });
        set(s => ({
            organizations: s.organizations.map(org => {
                if (org.id !== orgId) return org;
                return {
                    ...org,
                    projects: org.projects?.map(proj => {
                        if (proj.id !== projectId) return proj;
                        return { ...proj, collections: [...(proj.collections ?? []), newCol] };
                    }),
                };
            }) as Organization[],
        }));
        if (isWails)
            OrganizationService.CreateCollection(orgId, projectId, id, name).catch(console.error);
        return id;
    },

    importCollection: (orgId, projectId, col) => {
        set(s => ({
            organizations: s.organizations.map(org => {
                if (org.id !== orgId) return org;
                return {
                    ...org,
                    projects: org.projects?.map(proj => {
                        if (proj.id !== projectId) return proj;
                        return { ...proj, collections: [...(proj.collections ?? []), col] };
                    }),
                };
            }) as Organization[],
        }));
        if (isWails) {
            // Persist the full collection: header + all folders + all requests
            async function persistCollection() {
                await OrganizationService.CreateCollection(orgId, projectId, col.id, col.name);

                async function persistFolder(folder: any, parentFolderId: string) {
                    await OrganizationService.CreateFolder(
                        orgId,
                        projectId,
                        col.id,
                        parentFolderId,
                        folder.id,
                        folder.name
                    );
                    for (const req of folder.requests ?? []) {
                        await OrganizationService.CreateRequest(
                            orgId,
                            projectId,
                            col.id,
                            folder.id,
                            req as any
                        );
                    }
                    for (const sub of folder.folders ?? []) {
                        await persistFolder(sub, folder.id);
                    }
                }

                for (const folder of col.folders ?? []) {
                    await persistFolder(folder, '');
                }
                for (const req of col.requests ?? []) {
                    await OrganizationService.CreateRequest(
                        orgId,
                        projectId,
                        col.id,
                        '',
                        req as any
                    );
                }
            }
            persistCollection().catch(console.error);
        }
    },

    renameCollection: (collectionId, name) => {
        const colPath = findCollectionPath(get().organizations, collectionId);
        if (isWails && colPath)
            OrganizationService.RenameCollection(
                colPath.orgId,
                colPath.projectId,
                collectionId,
                name
            ).catch(console.error);
        set(s => ({
            organizations: s.organizations.map(org => ({
                ...org,
                projects: org.projects?.map(proj => ({
                    ...proj,
                    collections: proj.collections?.map(col =>
                        col.id === collectionId ? { ...col, name } : col
                    ),
                })),
            })) as Organization[],
        }));
    },

    deleteCollection: collectionId => {
        const colPath = findCollectionPath(get().organizations, collectionId);
        if (isWails && colPath)
            OrganizationService.DeleteCollection(
                colPath.orgId,
                colPath.projectId,
                collectionId
            ).catch(console.error);
        set(s => {
            const affectedIds = new Set(
                s.tabs.filter(t => t.path?.collectionId === collectionId).map(t => t.id)
            );
            const newTabs = s.tabs.filter(t => !affectedIds.has(t.id));
            return {
                organizations: s.organizations.map(org => ({
                    ...org,
                    projects: org.projects?.map(proj => ({
                        ...proj,
                        collections: proj.collections?.filter(col => col.id !== collectionId),
                    })),
                })) as Organization[],
                tabs: newTabs,
                activeTabId: affectedIds.has(s.activeTabId ?? '')
                    ? (newTabs[0]?.id ?? null)
                    : s.activeTabId,
                activeCollectionId:
                    s.activeCollectionId === collectionId ? null : s.activeCollectionId,
            };
        });
    },

    setCollectionVariables: (collectionId, vars) => {
        const colPath = findCollectionPath(get().organizations, collectionId);

        set(s => ({
            organizations: s.organizations.map(org => ({
                ...org,
                projects: org.projects?.map(proj => ({
                    ...proj,
                    collections: proj.collections?.map(col =>
                        col.id === collectionId ? { ...col, variables: vars } : col
                    ),
                })),
            })) as Organization[],
        }));

        if (isWails && colPath) {
            OrganizationService.UpdateCollectionVariables(
                colPath.orgId,
                colPath.projectId,
                collectionId,
                vars as any
            ).catch(console.error);
        }
    },

    setChainValue: (name, value) =>
        set(st => ({ chainCache: { ...st.chainCache, [name]: value } })),

    // ── Environments ──────────────────────────────────────────────────────────
    setActiveEnv: id => set({ activeEnvId: id }),
    openEnvPanel: () => set({ envPanelOpen: true }),
    closeEnvPanel: () => set({ envPanelOpen: false }),

    createEnv: name => {
        const id = crypto.randomUUID();
        set(s => ({
            environments: [...s.environments, { id, name, color: 'var(--blue)', variables: [] }],
        }));
        return id;
    },

    renameEnv: (id, name) =>
        set(s => ({ environments: mapEnvs(s.environments, id, e => ({ ...e, name })) })),
    setEnvColor: (id, color) =>
        set(s => ({ environments: mapEnvs(s.environments, id, e => ({ ...e, color })) })),
    deleteEnv: id =>
        set(s => ({
            environments: s.environments.filter(e => e.id !== id),
            activeEnvId: s.activeEnvId === id ? null : s.activeEnvId,
        })),

    addEnvVar: envId =>
        set(s => ({
            environments: mapEnvs(s.environments, envId, e => ({
                ...e,
                variables: [...e.variables, { key: '', value: '', enabled: true }],
            })),
        })),

    setEnvVar: (envId, idx, key, value) =>
        set(s => ({
            environments: mapEnvs(s.environments, envId, e => ({
                ...e,
                variables: e.variables.map((v, i) => (i === idx ? { ...v, key, value } : v)),
            })),
        })),

    toggleEnvVar: (envId, idx) =>
        set(s => ({
            environments: mapEnvs(s.environments, envId, e => ({
                ...e,
                variables: e.variables.map((v, i) =>
                    i === idx ? { ...v, enabled: !v.enabled } : v
                ),
            })),
        })),

    removeEnvVar: (envId, idx) =>
        set(s => ({
            environments: mapEnvs(s.environments, envId, e => ({
                ...e,
                variables: e.variables.filter((_, i) => i !== idx),
            })),
        })),

    setActiveResponseTab: tab => set(s => patchActiveTab(s, { activeResponseTab: tab })),

    openSettingsPanel: () => set({ settingsPanelOpen: true }),
    closeSettingsPanel: () => set({ settingsPanelOpen: false }),
    updateSettings: patch => {
        const next = { ...get().settings, ...patch };
        set({ settings: next });
        if (isWails) {
            SettingsService.Save(next as any).catch(() => {
                /* non-fatal */
            });
        }
    },
}));
