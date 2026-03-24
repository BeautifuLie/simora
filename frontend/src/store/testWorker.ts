// Web Worker for running test scripts in isolation with timeout protection.
// Runs in a separate thread so infinite loops don't freeze the UI.
export {};

interface WorkerResponse {
    status: number;
    body: string;
    headers: Record<string, string>;
    time: number;
}

interface TestResult {
    name: string;
    pass: boolean;
    error: string;
}

self.onmessage = (e: MessageEvent<{ code: string; response: WorkerResponse }>) => {
    const { code, response } = e.data;
    const results: TestResult[] = [];

    const pm = {
        test: (name: string, fn: () => void) => {
            try {
                fn();
                results.push({ name, pass: true, error: '' });
            } catch (err: unknown) {
                results.push({
                    name,
                    pass: false,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        },
        expect: (actual: unknown) => ({
            toBe: (v: unknown) => {
                if (actual !== v)
                    throw new Error(`Expected ${JSON.stringify(v)}, got ${JSON.stringify(actual)}`);
            },
            toEqual: (v: unknown) => {
                if (JSON.stringify(actual) !== JSON.stringify(v))
                    throw new Error(`Expected ${JSON.stringify(v)}, got ${JSON.stringify(actual)}`);
            },
            toBeGreaterThan: (v: number) => {
                if ((actual as number) <= v) throw new Error(`Expected > ${v}, got ${actual}`);
            },
            toBeLessThan: (v: number) => {
                if ((actual as number) >= v) throw new Error(`Expected < ${v}, got ${actual}`);
            },
            toContain: (v: string) => {
                if (!String(actual).includes(v)) throw new Error(`Expected to contain "${v}"`);
            },
            toBeTruthy: () => {
                if (!actual) throw new Error(`Expected truthy, got ${actual}`);
            },
        }),
        response: {
            status: response.status,
            body: response.body,
            json: () => {
                try {
                    return JSON.parse(response.body);
                } catch {
                    return null;
                }
            },
            headers: response.headers ?? {},
            time: response.time,
        },
    };

    try {
        new Function('pm', code)(pm);
    } catch (err: unknown) {
        results.push({
            name: 'Script error',
            pass: false,
            error: err instanceof Error ? err.message : String(err),
        });
    }

    self.postMessage(results);
};
