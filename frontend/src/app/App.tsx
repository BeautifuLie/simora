import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DARK_PRESETS, LIGHT_PRESETS, deriveCustomPreset, applyBgPreset } from '@/lib/bgPresets';
import { Sidebar } from '@/components/layout/Sidebar';
import { TabBar } from '@/components/layout/TabBar';
import { EnvPanel } from '@/components/layout/EnvPanel';
import { SettingsPanel } from '@/components/layout/SettingsPanel';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { CollectionsHome } from '@/components/layout/CollectionsHome';
import { WelcomeScreen } from '@/components/layout/WelcomeScreen';
import { RequestPanel } from '@/components/request/RequestPanel';
import { ResponsePanel } from '@/components/response/ResponsePanel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useAppStore, selectActivePath, selectEditing, selectActiveTab } from '@/store/app';
import { KeyboardShortcutsModal } from '@/components/layout/KeyboardShortcutsModal';
import {
    GetVersion,
    CheckForUpdate,
    GetCrashReport,
    ClearCrashReports,
    ReportCrash,
} from '../../wailsjs/go/main/App';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// ── Environment switcher ──────────────────────────────────────────────────

function EnvSwitcher() {
    const { environments, activeEnvId, setActiveEnv, openEnvPanel } = useAppStore();
    const [open, setOpen] = React.useState(false);
    const activeEnv = environments.find(e => e.id === activeEnvId);

    return (
        <div className="relative">
            <button
                className={cn(
                    'flex items-center gap-1.5 rounded cursor-pointer transition-all duration-150 select-none hover:bg-[var(--bg-2)]',
                    open && 'bg-[var(--bg-2)]'
                )}
                style={{ padding: '2px 6px', height: 18 }}
                onClick={() => setOpen(!open)}
            >
                {activeEnv ? (
                    <>
                        <div
                            className="rounded-full shrink-0"
                            style={{ width: 6, height: 6, background: activeEnv.color }}
                        />
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-1)' }}>
                            {activeEnv.name}
                        </span>
                    </>
                ) : (
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}>
                        No environment
                    </span>
                )}
                <ChevronDown
                    className={cn('transition-transform duration-150', open && 'rotate-180')}
                    style={{ width: 10, height: 10, color: 'var(--text-2)' }}
                />
            </button>

            {open &&
                createPortal(
                    <>
                        <div className="fixed inset-0 z-[199]" onClick={() => setOpen(false)} />
                        <div
                            className="fixed z-[200] rounded-[var(--r-md)] shadow-2xl overflow-hidden animate-context-in"
                            style={{
                                bottom: 32,
                                left: 8,
                                background: 'var(--bg-2)',
                                border: '1px solid var(--border-2)',
                                minWidth: 160,
                            }}
                        >
                            <div style={{ padding: 4 }}>
                                {environments.map(env => (
                                    <button
                                        key={env.id}
                                        className="flex items-center gap-2 w-full rounded cursor-pointer transition-colors duration-100 hover:bg-[var(--bg-3)]"
                                        style={{
                                            padding: '6px 8px',
                                            fontSize: 'var(--text-base)',
                                            color: 'var(--text-1)',
                                        }}
                                        onClick={() => {
                                            setActiveEnv(env.id);
                                            setOpen(false);
                                        }}
                                    >
                                        <div
                                            className="rounded-full shrink-0"
                                            style={{ width: 7, height: 7, background: env.color }}
                                        />
                                        <span className="flex-1 text-left truncate">
                                            {env.name}
                                        </span>
                                        {env.id === activeEnvId && (
                                            <Check
                                                style={{
                                                    width: 11,
                                                    height: 11,
                                                    color: 'var(--accent)',
                                                }}
                                            />
                                        )}
                                    </button>
                                ))}
                                <button
                                    className="flex items-center gap-2 w-full rounded cursor-pointer transition-colors duration-100 hover:bg-[var(--bg-3)]"
                                    style={{
                                        padding: '8px 8px 6px',
                                        fontSize: 'var(--text-base)',
                                        color: 'var(--text-2)',
                                        borderTop: '1px solid var(--border-0)',
                                        marginTop: 2,
                                    }}
                                    onClick={() => {
                                        setOpen(false);
                                        openEnvPanel();
                                    }}
                                >
                                    Manage environments…
                                </button>
                            </div>
                        </div>
                    </>,
                    document.body
                )}
        </div>
    );
}

// ── Status bar ────────────────────────────────────────────────────────────

function StatusBar() {
    const { openEnvPanel, organizations } = useAppStore();
    const protocol = useAppStore(s => selectEditing(s)?.protocol ?? s.protocol);
    const activePath = useAppStore(selectActivePath);
    const editing = useAppStore(selectEditing);
    const autoUpdate = useAppStore(s => s.settings.autoUpdate ?? true);
    const [version, setVersion] = React.useState('');
    const [updateInfo, setUpdateInfo] = React.useState<{
        latestVersion: string;
        releaseURL: string;
    } | null>(null);

    React.useEffect(() => {
        GetVersion()
            .then((v: string) => setVersion(v))
            .catch(() => {});
        // Delay update check slightly so it doesn't compete with startup I/O.
        if (autoUpdate) {
            const timer = setTimeout(() => {
                CheckForUpdate()
                    .then(info => {
                        if (info?.available) {
                            setUpdateInfo({
                                latestVersion: info.latestVersion,
                                releaseURL: info.releaseURL,
                            });
                        }
                    })
                    .catch(() => {});
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [autoUpdate]);

    const org = activePath ? organizations.find(o => o.id === activePath.orgId) : null;
    const project = org?.projects?.find(p => p.id === activePath?.projectId);

    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
                e.preventDefault();
                openEnvPanel();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [openEnvPanel]);

    return (
        <div
            className="flex items-center gap-3 px-3 shrink-0"
            style={{
                height: 'var(--statusbar-height)',
                background: 'var(--bg-0)',
                borderTop: '1px solid var(--border-0)',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-2)',
            }}
        >
            {editing && (
                <span
                    style={{
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        fontWeight: 600,
                        color: 'var(--accent)',
                        opacity: 0.8,
                    }}
                >
                    {protocol}
                </span>
            )}
            {project && (
                <>
                    <span style={{ color: 'var(--border-1)' }}>·</span>
                    <span>{project.name}</span>
                </>
            )}
            {editing && (
                <>
                    <span style={{ color: 'var(--border-1)' }}>·</span>
                    <span className="truncate" style={{ maxWidth: 200 }}>
                        {editing.name}
                    </span>
                </>
            )}
            <div className="ml-auto flex items-center gap-3">
                <EnvSwitcher />
                <span style={{ color: 'var(--border-1)' }}>·</span>
                <span style={{ color: 'var(--text-2)' }}>
                    {version ? `Simora ${version}` : 'Simora'}
                </span>
                {updateInfo && (
                    <>
                        <span style={{ color: 'var(--border-1)' }}>·</span>
                        <a
                            href={updateInfo.releaseURL}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                color: '#22c55e',
                                fontSize: 'var(--text-sm)',
                                fontWeight: 600,
                                textDecoration: 'none',
                            }}
                            title={`${updateInfo.latestVersion} is available — click to open release page`}
                        >
                            ↑ {updateInfo.latestVersion}
                        </a>
                    </>
                )}
            </div>
        </div>
    );
}

// ── App ───────────────────────────────────────────────────────────────────

export default function App() {
    const hasActiveTab = useAppStore(s => s.activeTabId !== null);
    const hasOrgs = useAppStore(s => s.organizations.length > 0);
    const editing = useAppStore(selectEditing);
    const wsState = useAppStore(s => selectActiveTab(s)?.wsState ?? 'idle');
    const isWsActive =
        editing?.protocol === 'websocket' &&
        (wsState === 'connected' || wsState === 'connecting' || wsState === 'disconnected');
    const settings = useAppStore(s => s.settings);
    const sendRequest = useAppStore(s => s.sendRequest);
    const saveRequest = useAppStore(s => s.saveRequest);
    const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
    const [crashReport, setCrashReport] = React.useState<string | null>(null);

    // Apply theme, font-size and accent to document root
    React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', settings.theme ?? 'dark');
        document.documentElement.setAttribute('data-fontsize', settings.fontSize ?? 'md');
    }, [settings.theme, settings.fontSize]);

    React.useEffect(() => {
        const root = document.documentElement;
        if (settings.accentColor) {
            root.style.setProperty('--accent', settings.accentColor);
            // derive hover (+10% lighter) and dim (12% opacity) from the chosen color
            root.style.setProperty('--accent-hover', settings.accentColor);
            root.style.setProperty(
                '--accent-dim',
                `color-mix(in srgb, ${settings.accentColor} 12%, transparent)`
            );
            root.style.setProperty('--border-focus', settings.accentColor);
        } else {
            root.style.removeProperty('--accent');
            root.style.removeProperty('--accent-hover');
            root.style.removeProperty('--accent-dim');
            root.style.removeProperty('--border-focus');
        }
    }, [settings.accentColor]);

    React.useEffect(() => {
        const isDark = (settings.theme ?? 'dark') !== 'light';
        const presets = isDark ? DARK_PRESETS : LIGHT_PRESETS;
        const defaultPreset = isDark ? 'midnight' : 'lavender';
        const presetId = settings.bgPreset || defaultPreset;

        let preset = presets.find(p => p.id === presetId);
        if (!preset && presetId === 'custom') {
            const base = isDark
                ? settings.customBgDark || '#101116'
                : settings.customBgLight || '#e8eaf5';
            preset = deriveCustomPreset(base, isDark);
        }
        applyBgPreset(preset ?? presets[0]);
    }, [settings.bgPreset, settings.theme, settings.customBgDark, settings.customBgLight]);

    // Crash reporter: register window.onerror and check for previous crashes
    React.useEffect(() => {
        if (!settings.crashReporterEnabled) return;

        // Check for crash reports from previous sessions.
        GetCrashReport()
            .then(report => {
                if (report) setCrashReport(report);
            })
            .catch(() => {});

        // Capture future uncaught errors.
        const onError = (e: ErrorEvent) => {
            const msg = `${e.message}\n  at ${e.filename}:${e.lineno}:${e.colno}\n${e.error?.stack ?? ''}`;
            ReportCrash(msg).catch(() => {});
        };

        const onUnhandled = (e: PromiseRejectionEvent) => {
            const msg = `Unhandled promise rejection: ${String(e.reason)}\n${e.reason?.stack ?? ''}`;
            ReportCrash(msg).catch(() => {});
        };

        window.addEventListener('error', onError);
        window.addEventListener('unhandledrejection', onUnhandled);
        return () => {
            window.removeEventListener('error', onError);
            window.removeEventListener('unhandledrejection', onUnhandled);
        };
    }, [settings.crashReporterEnabled]);

    // Global keyboard shortcuts
    React.useEffect(() => {
        const h = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey;
            // ⌘? — keyboard shortcuts modal
            if (mod && e.shiftKey && e.key === '/') {
                e.preventDefault();
                setShortcutsOpen(v => !v);
            }
            if (mod && e.key === '?') {
                e.preventDefault();
                setShortcutsOpen(v => !v);
            }
            // ⌘↵ — send request
            if (mod && e.key === 'Enter') {
                e.preventDefault();
                sendRequest();
            }
            // ⌘S — save request
            if (mod && e.key === 's') {
                e.preventDefault();
                saveRequest();
            }
        };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [sendRequest, saveRequest]);

    return (
        <div
            className="flex flex-col h-screen w-screen overflow-hidden"
            style={{ background: 'var(--bg-0)' }}
        >
            <div className="flex flex-1 overflow-hidden">
                <ErrorBoundary label="Sidebar">
                    <Sidebar />
                </ErrorBoundary>

                <div className="flex flex-col flex-1 overflow-hidden">
                    <TabBar />

                    {hasActiveTab ? (
                        isWsActive ? (
                            <div className="flex-1 overflow-hidden">
                                <ErrorBoundary label="Request panel">
                                    <RequestPanel />
                                </ErrorBoundary>
                            </div>
                        ) : (
                            <ResizablePanelGroup
                                direction="horizontal"
                                className="flex-1"
                                autoSaveId="main-split"
                            >
                                <ResizablePanel defaultSize={45} minSize={28} maxSize={72}>
                                    <ErrorBoundary label="Request panel">
                                        <RequestPanel />
                                    </ErrorBoundary>
                                </ResizablePanel>
                                <ResizableHandle />
                                <ResizablePanel defaultSize={55} minSize={28} maxSize={72}>
                                    <ErrorBoundary label="Response panel">
                                        <ResponsePanel />
                                    </ErrorBoundary>
                                </ResizablePanel>
                            </ResizablePanelGroup>
                        )
                    ) : hasOrgs ? (
                        <CollectionsHome />
                    ) : (
                        <WelcomeScreen />
                    )}
                </div>
            </div>

            <StatusBar />
            {crashReport && (
                <div
                    className="flex items-center gap-3 shrink-0 px-3"
                    style={{
                        height: 32,
                        background: '#7c3aed22',
                        borderTop: '1px solid #7c3aed55',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-1)',
                    }}
                >
                    <span style={{ color: '#c084fc' }}>
                        ⚠ A crash was detected in the last session.
                    </span>
                    <button
                        style={{
                            color: '#c084fc',
                            fontSize: 'var(--text-sm)',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                        }}
                        onClick={() => {
                            const blob = new Blob([crashReport], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'simora-crash.log';
                            a.click();
                            URL.revokeObjectURL(url);
                        }}
                    >
                        Download report
                    </button>
                    <button
                        style={{
                            color: 'var(--text-2)',
                            fontSize: 'var(--text-sm)',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                        }}
                        onClick={() => {
                            ClearCrashReports().catch(() => {});
                            setCrashReport(null);
                        }}
                    >
                        Dismiss
                    </button>
                </div>
            )}
            <EnvPanel />
            <SettingsPanel />
            <CommandPalette />
            <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        </div>
    );
}
