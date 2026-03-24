import React from 'react';

interface EBState {
    error: Error | null;
}

export class ErrorBoundary extends React.Component<
    React.PropsWithChildren<{ label?: string }>,
    EBState
> {
    constructor(props: React.PropsWithChildren<{ label?: string }>) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error: Error): EBState {
        return { error };
    }

    render() {
        if (this.state.error) {
            return (
                <div
                    className="flex flex-col items-center justify-center h-full gap-3 p-6"
                    style={{ background: 'var(--bg-1)', color: 'var(--text-1)' }}
                >
                    <div
                        className="rounded-[var(--r-md)] p-4"
                        style={{
                            background: 'var(--red-dim)',
                            border: '1px solid var(--red)',
                            maxWidth: 420,
                            width: '100%',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 'var(--text-md)',
                                fontWeight: 600,
                                color: 'var(--red)',
                                marginBottom: 6,
                            }}
                        >
                            {this.props.label ?? 'Component'} crashed
                        </div>
                        <div
                            style={{
                                fontSize: 'var(--text-sm)',
                                color: 'var(--text-1)',
                                fontFamily: 'monospace',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                            }}
                        >
                            {this.state.error.message}
                        </div>
                    </div>
                    <button
                        className="rounded-[var(--r-sm)] cursor-pointer hover:brightness-110 transition-all"
                        style={{
                            padding: '6px 14px',
                            background: 'var(--bg-3)',
                            border: '1px solid var(--border-2)',
                            fontSize: 'var(--text-base)',
                            color: 'var(--text-1)',
                        }}
                        onClick={() => this.setState({ error: null })}
                    >
                        Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
