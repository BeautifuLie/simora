// Wails v2 injects a `go` property on the window object for IPC calls.
// This declaration replaces `(window as any)['go']` casts across the codebase.
// eslint-disable-next-line no-unused-vars
declare interface Window {
    go?: Record<string, unknown>;
}

declare module '*.png' {
    const src: string;
    export default src;
}
