// ── Shared types for the Simora store ──────────────────────────────────────
// All domain types, protocol configs, and editor state interfaces live here.
// The store itself is in app.ts; components should import types from here.

import { domain } from '../../wailsjs/go/models';

// ── Re-export backend types ────────────────────────────────────────────────
export type Organization = domain.Organisation;
export type Project = domain.Project;
export type Collection = domain.Collection;
export type Folder = domain.Folder;
export type Request = domain.Request;
export type RequestHeader = domain.RequestHeader;
export type Response = domain.Response;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

// ── Auth config ────────────────────────────────────────────────────────────
export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey' | 'oauth2';

export interface AuthConfig {
    type: AuthType;
    token: string; // bearer
    username: string; // basic
    password: string; // basic
    headerName: string; // apikey
    headerValue: string; // apikey
    // OAuth 2.0
    oauth2GrantType: string;
    oauth2ClientId: string;
    oauth2ClientSecret: string;
    oauth2TokenUrl: string;
    oauth2Scope: string;
    oauth2AccessToken: string;
}

export type Protocol = 'http' | 'graphql' | 'grpc' | 'kafka' | 'sqs';

// ── Protocol-specific configs ──────────────────────────────────────────────

export interface GraphQLConfig {
    query: string;
    variables: string; // JSON string
}

export interface GrpcConfig {
    server: string;
    service: string;
    method: string;
    message: string;
    meta: RequestHeader[];
    tls: boolean;
}

export type KafkaSaslMechanism = 'none' | 'plain' | 'scram-sha-256' | 'scram-sha-512';
export type KafkaMessageFormat = 'json' | 'proto';

export interface KafkaConfig {
    bootstrap: string;
    topic: string;
    key: string;
    message: string;
    headers: RequestHeader[];
    mode: 'produce' | 'consume';
    group: string;
    offset: 'earliest' | 'latest';
    // Auth
    saslMechanism: KafkaSaslMechanism;
    saslUsername: string;
    saslPassword: string;
    tls: boolean;
    // Message format
    messageFormat: KafkaMessageFormat;
    protoSchema: string; // inline .proto content
    protoMessageType: string; // e.g. "mypackage.MyMessage"
}

export interface SqsConfig {
    queueUrl: string;
    body: string;
    region: string;
    delaySeconds: number;
    attributes: {
        key: string;
        value: string;
        type: 'String' | 'Number' | 'Binary';
        enabled: boolean;
    }[];
    // AWS credentials
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
    // FIFO-only fields
    messageGroupId: string;
    messageDeduplicationId: string;
}

// ── Environment ────────────────────────────────────────────────────────────
export interface EnvVariable {
    key: string;
    value: string;
    enabled: boolean;
}

export interface Environment {
    id: string;
    name: string;
    variables: EnvVariable[];
    color: string;
}

// ── Variable resolution ────────────────────────────────────────────────────

// CollectionVariable has the same shape as EnvVariable and is scoped to one collection.
export type CollectionVariable = EnvVariable;

export function resolveVars(
    text: string,
    env: Environment | null,
    collectionVars?: CollectionVariable[]
): string {
    if (!text.includes('{{')) return text;
    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const trimmed = key.trim();
        // Environment variables take precedence over collection variables.
        if (env) {
            const envVar = env.variables.find(v => v.key === trimmed && v.enabled);
            if (envVar) return envVar.value;
        }
        if (collectionVars) {
            const colVar = collectionVars.find(v => v.key === trimmed && v.enabled);
            if (colVar) return colVar.value;
        }
        return match;
    });
}

export function hasVars(text: string): boolean {
    return /\{\{[^}]+\}\}/.test(text);
}

// ── Query param ────────────────────────────────────────────────────────────
export interface QueryParam {
    key: string;
    value: string;
    enabled: boolean;
}

// ── Request editing state ──────────────────────────────────────────────────
export type BodyType = 'none' | 'json' | 'form' | 'formdata' | 'text' | 'binary';

export interface FormField {
    key: string;
    value: string;
    enabled: boolean;
}

export interface EditingRequest {
    id: string;
    name: string;
    protocol: Protocol;
    // HTTP
    method: HttpMethod;
    url: string;
    params: QueryParam[];
    headers: RequestHeader[];
    body: string;
    bodyType: BodyType;
    formFields: FormField[];
    binaryFileName: string;
    binaryContent: string; // base64-encoded file content
    auth: AuthConfig;
    notes: string;
    activeTab: string;
    // Protocol configs
    graphql: GraphQLConfig;
    grpc: GrpcConfig;
    kafka: KafkaConfig;
    sqs: SqsConfig;
    // Tests
    tests: string; // JS snippet
    testResults: TestResult[];
}

export interface TestResult {
    name: string;
    pass: boolean;
    error: string;
}

// ── Navigation path ────────────────────────────────────────────────────────
export interface ActivePath {
    orgId: string;
    projectId: string;
    collectionId: string;
    requestId: string;
    folderId?: string; // optional — request lives inside a folder
}

// ── Tab ────────────────────────────────────────────────────────────────────
export interface Tab {
    id: string;
    path: ActivePath | null;
    editing: EditingRequest | null;
    isDirty: boolean;
    response: Response | null;
    responseLoading: boolean;
    responseError: string | null;
    activeResponseTab: 'body' | 'headers' | 'cookies' | 'timeline' | 'tests' | 'transform';
    testResults: TestResult[];
}

// ── Settings ───────────────────────────────────────────────────────────────
export interface AppSettings {
    timeout: number; // ms, 0 = no timeout
    followRedirects: boolean;
    validateSsl: boolean;
    maxRedirects: number;
    sendOnEnter: boolean;
    fontSize: 'sm' | 'md' | 'lg';
    theme: 'dark' | 'light' | string;
    accentColor: string;
    bgPreset: string; // preset id or 'custom', default: 'midnight' for dark / 'lavender' for light
    customBgDark: string; // custom dark bg-0 hex
    customBgLight: string; // custom light bg-0 hex
}
