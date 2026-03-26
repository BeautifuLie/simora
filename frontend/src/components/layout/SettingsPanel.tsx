import React from 'react';
import { createPortal } from 'react-dom';
import { X, Monitor, Sliders, Sparkles, Trash2, Settings, FolderOpen } from 'lucide-react';
import { cn, shortcut } from '@/lib/utils';
import { useAppStore, type AppSettings } from '@/store/app';
import { ClearCookies, GetCookies, DeleteCookie } from '../../../wailsjs/go/service/RequestService';
import type { service } from '../../../wailsjs/go/models';
import { GetVersion, GetConfigDir, OpenConfigDir } from '../../../wailsjs/go/main/App';
import logo from '@/assets/logo.png';
import {
    DARK_PRESETS,
    LIGHT_PRESETS,
    deriveCustomPreset,
    applyBgPreset,
    type BgPreset,
} from '@/lib/bgPresets';

const isWails =
    typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).__wails__;

// ── Section card ────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-0">
            <div
                style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-2)',
                    marginBottom: 6,
                    paddingLeft: 2,
                }}
            >
                {title}
            </div>
            <div
                className="flex flex-col divide-y divide-[var(--border-0)]"
                style={{
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border-1)',
                    borderRadius: 'var(--r-md)',
                }}
            >
                {children}
            </div>
        </div>
    );
}

// ── Setting row ────────────────────────────────────────────────────────────

function SettingRow({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div
            className="flex items-center justify-between gap-6"
            style={{ padding: '10px 14px', minHeight: 44 }}
        >
            <div className="flex flex-col min-w-0 gap-0.5">
                <span style={{ fontSize: 13, color: 'var(--text-0)', fontWeight: 450 }}>
                    {label}
                </span>
                {hint && (
                    <span style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.4 }}>
                        {hint}
                    </span>
                )}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

// ── Toggle ─────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (_v: boolean) => void }) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            className="relative cursor-pointer transition-colors duration-150 shrink-0"
            style={{
                width: 32,
                height: 18,
                borderRadius: 9,
                background: checked ? 'var(--accent)' : 'var(--bg-3)',
                border: '1px solid ' + (checked ? 'var(--accent)' : 'var(--border-2)'),
            }}
            onClick={() => onChange(!checked)}
        >
            <div
                className="absolute top-0 transition-transform duration-150"
                style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: '#fff',
                    margin: 1,
                    transform: checked ? 'translateX(14px)' : 'translateX(0)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
            />
        </button>
    );
}

// ── Number input ───────────────────────────────────────────────────────────

function NumberInput({
    value,
    min,
    max,
    step = 1,
    onChange,
}: {
    value: number;
    min?: number;
    max?: number;
    step?: number;
    onChange: (_v: number) => void;
}) {
    return (
        <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={e => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) onChange(v);
            }}
            className="bg-transparent outline-none text-right"
            style={{
                width: 84,
                height: 28,
                padding: '0 8px',
                background: 'var(--bg-1)',
                border: '1px solid var(--border-1)',
                borderRadius: 'var(--r-sm)',
                fontSize: 12.5,
                fontFamily: 'monospace',
                color: 'var(--text-0)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-1)')}
        />
    );
}

// ── Select ─────────────────────────────────────────────────────────────────

function Select<T extends string>({
    value,
    options,
    onChange,
}: {
    value: T;
    options: { id: T; label: string }[];
    onChange: (_v: T) => void;
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={e => onChange(e.target.value as T)}
                className="cursor-pointer appearance-none"
                style={{
                    height: 28,
                    padding: '0 26px 0 10px',
                    background: 'var(--bg-1)',
                    border: '1px solid var(--border-1)',
                    borderRadius: 'var(--r-sm)',
                    fontSize: 12.5,
                    color: 'var(--text-0)',
                    outline: 'none',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-1)')}
            >
                {options.map(o => (
                    <option key={o.id} value={o.id}>
                        {o.label}
                    </option>
                ))}
            </select>
            <svg
                viewBox="0 0 10 6"
                style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 8,
                    height: 8,
                    pointerEvents: 'none',
                    color: 'var(--text-2)',
                }}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M1 1l4 4 4-4" />
            </svg>
        </div>
    );
}

// ── Nav item ───────────────────────────────────────────────────────────────

type SettingsSection = 'appearance' | 'request' | 'about';

const NAV_ITEMS: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
    { id: 'appearance', label: 'Appearance', icon: Monitor },
    { id: 'request', label: 'Request', icon: Sliders },
    { id: 'about', label: 'About', icon: Sparkles },
];

// ── BgPresetPicker ──────────────────────────────────────────────────────────

function BgPresetPicker({
    settings,
    update,
}: {
    settings: AppSettings;
    update: (_p: Partial<AppSettings>) => void;
}) {
    const isDark = (settings.theme ?? 'dark') !== 'light';
    const presets = isDark ? DARK_PRESETS : LIGHT_PRESETS;
    const defaultId = isDark ? 'midnight' : 'lavender';
    const activeId = settings.bgPreset || defaultId;

    const customBase = isDark
        ? settings.customBgDark || '#101116'
        : settings.customBgLight || '#e8eaf5';
    const customPreset: BgPreset = deriveCustomPreset(customBase, isDark);
    const allPresets = [...presets, customPreset];

    function handleSelect(preset: BgPreset) {
        update({ bgPreset: preset.id });
        applyBgPreset(preset);
    }

    function handleCustomColor(hex: string) {
        const derived = deriveCustomPreset(hex, isDark);
        if (isDark) {
            update({ bgPreset: 'custom', customBgDark: hex });
        } else {
            update({ bgPreset: 'custom', customBgLight: hex });
        }
        applyBgPreset(derived);
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
                {allPresets.map(p => {
                    const isActive = activeId === p.id;
                    const base = p.id === 'custom' ? customBase : p.bg0;
                    const light = p.id === 'custom' ? customPreset.bg2 : p.bg2;
                    return (
                        <div key={p.id} className="flex flex-col items-center gap-1">
                            <button
                                title={p.label}
                                className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
                                style={{
                                    width: 48,
                                    height: 36,
                                    borderRadius: 'var(--r-sm)',
                                    background: `linear-gradient(135deg, ${base} 55%, ${light} 55%)`,
                                    border: isActive
                                        ? '2px solid var(--accent)'
                                        : '2px solid var(--border-1)',
                                    outline: isActive ? '1px solid var(--accent)' : 'none',
                                    outlineOffset: 1,
                                }}
                                onClick={() => handleSelect(p)}
                            />
                            <span style={{ fontSize: 10, color: 'var(--text-2)' }}>{p.label}</span>
                        </div>
                    );
                })}
            </div>

            {activeId === 'custom' && (
                <div className="flex items-center gap-2">
                    <span style={{ fontSize: 12, color: 'var(--text-1)' }}>Base color</span>
                    <input
                        type="color"
                        value={customBase}
                        onChange={e => handleCustomColor(e.target.value)}
                        style={{
                            width: 32,
                            height: 28,
                            padding: 2,
                            borderRadius: 'var(--r-sm)',
                            border: '1px solid var(--border-1)',
                            background: 'var(--bg-1)',
                            cursor: 'pointer',
                        }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'monospace' }}>
                        {customBase}
                    </span>
                </div>
            )}
        </div>
    );
}

// ── Appearance ─────────────────────────────────────────────────────────────

function AppearanceSection({
    settings,
    update,
}: {
    settings: AppSettings;
    update: (_p: Partial<AppSettings>) => void;
}) {
    return (
        <div className="flex flex-col gap-5">
            <SectionCard title="Interface">
                <SettingRow label="Theme" hint="Switch between dark and light mode">
                    <Select<AppSettings['theme']>
                        value={settings.theme ?? 'dark'}
                        options={[
                            { id: 'dark', label: 'Dark' },
                            { id: 'light', label: 'Light' },
                        ]}
                        onChange={v => update({ theme: v })}
                    />
                </SettingRow>
                <SettingRow label="Font size" hint="Controls the base font size across the app">
                    <Select<AppSettings['fontSize']>
                        value={settings.fontSize}
                        options={[
                            { id: 'sm', label: 'Small' },
                            { id: 'md', label: 'Medium' },
                            { id: 'lg', label: 'Large' },
                        ]}
                        onChange={v => update({ fontSize: v })}
                    />
                </SettingRow>
            </SectionCard>

            <SectionCard title="Background">
                <div style={{ padding: '12px 14px' }}>
                    <BgPresetPicker settings={settings} update={update} />
                </div>
            </SectionCard>

            <SectionCard title="Accent color">
                <SettingRow label="Color" hint="Used for buttons, highlights and active selections">
                    <div className="flex items-center gap-2">
                        {[
                            { color: '#7c9cf0', label: 'Blue' },
                            { color: '#4ade80', label: 'Green' },
                            { color: '#c084fc', label: 'Purple' },
                            { color: '#fb923c', label: 'Orange' },
                            { color: '#f87171', label: 'Red' },
                            { color: '#fbbf24', label: 'Yellow' },
                            { color: '#60a5fa', label: 'Sky' },
                        ].map(({ color, label }) => {
                            const active = (settings.accentColor ?? '#7c9cf0') === color;
                            return (
                                <button
                                    key={color}
                                    title={label}
                                    className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
                                    style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: '50%',
                                        background: color,
                                        flexShrink: 0,
                                        outline: active ? `2px solid ${color}` : 'none',
                                        outlineOffset: 2,
                                        boxShadow: active ? `0 0 0 1px var(--bg-2)` : 'none',
                                    }}
                                    onClick={() => update({ accentColor: color })}
                                />
                            );
                        })}
                    </div>
                </SettingRow>
            </SectionCard>
        </div>
    );
}

// ── Clear cookies button ───────────────────────────────────────────────────

function CookieManager() {
    const [cookies, setCookies] = React.useState<service.CookieEntry[]>([]);
    const [loading, setLoading] = React.useState(false);

    const load = React.useCallback(async () => {
        if (!isWails) return;
        setLoading(true);
        try {
            setCookies((await GetCookies()) ?? []);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        load();
    }, [load]);

    const handleDelete = async (domain: string, name: string) => {
        if (isWails) await DeleteCookie(domain, name);
        setCookies(cs => cs.filter(c => !(c.domain === domain && c.name === name)));
    };

    const handleClearAll = async () => {
        if (isWails) await ClearCookies();
        setCookies([]);
    };

    if (loading) {
        return (
            <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-2)' }}>
                Loading…
            </div>
        );
    }

    if (cookies.length === 0) {
        return (
            <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-2)' }}>
                No cookies stored in this session.
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <div
                className="flex flex-col divide-y"
                style={{ borderTop: '1px solid var(--border-0)' }}
            >
                {cookies.map(c => (
                    <div
                        key={`${c.domain}|${c.name}`}
                        className="flex items-center gap-2"
                        style={{ padding: '6px 14px' }}
                    >
                        <div className="flex flex-col flex-1 min-w-0">
                            <span
                                className="truncate"
                                style={{ fontSize: 12, color: 'var(--text-0)', fontWeight: 500 }}
                            >
                                {c.name}
                            </span>
                            <span
                                className="truncate"
                                style={{ fontSize: 11, color: 'var(--text-2)' }}
                            >
                                {c.domain}
                                {c.path !== '/' ? c.path : ''}
                            </span>
                        </div>
                        <span
                            className="truncate"
                            style={{
                                fontSize: 11,
                                color: 'var(--text-1)',
                                maxWidth: 120,
                                fontFamily: 'monospace',
                            }}
                            title={c.value}
                        >
                            {c.value}
                        </span>
                        {c.secure && (
                            <span
                                style={{
                                    fontSize: 10,
                                    color: '#4ade80',
                                    background: 'color-mix(in srgb, #4ade80 12%, transparent)',
                                    border: '1px solid color-mix(in srgb, #4ade80 30%, transparent)',
                                    borderRadius: 4,
                                    padding: '0 5px',
                                    flexShrink: 0,
                                }}
                            >
                                secure
                            </span>
                        )}
                        <button
                            title="Delete cookie"
                            className="cursor-pointer transition-colors hover:text-[var(--red)] shrink-0"
                            style={{ color: 'var(--text-2)' }}
                            onClick={() => handleDelete(c.domain, c.name)}
                        >
                            <Trash2 style={{ width: 11, height: 11 }} />
                        </button>
                    </div>
                ))}
            </div>
            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border-0)' }}>
                <button
                    className="flex items-center gap-1.5 cursor-pointer rounded-[var(--r-sm)] transition-all duration-150"
                    style={{
                        height: 28,
                        padding: '0 10px',
                        background: 'var(--bg-1)',
                        border: '1px solid var(--border-1)',
                        color: 'var(--text-1)',
                        fontSize: 12,
                    }}
                    onClick={handleClearAll}
                >
                    <Trash2 style={{ width: 11, height: 11 }} /> Clear all
                </button>
            </div>
        </div>
    );
}

// ── Request ────────────────────────────────────────────────────────────────

function RequestSection({
    settings,
    update,
}: {
    settings: AppSettings;
    update: (_p: Partial<AppSettings>) => void;
}) {
    return (
        <div className="flex flex-col gap-5">
            <SectionCard title="Behaviour">
                <SettingRow
                    label="Send on Enter"
                    hint="Press Enter in the URL bar to send the request"
                >
                    <Toggle
                        checked={settings.sendOnEnter}
                        onChange={v => update({ sendOnEnter: v })}
                    />
                </SettingRow>
            </SectionCard>

            <SectionCard title="Network">
                <SettingRow
                    label="Request timeout"
                    hint="Time limit per request — set to 0 for no timeout"
                >
                    <div className="flex items-center gap-2">
                        <NumberInput
                            value={settings.timeout}
                            min={0}
                            max={300000}
                            step={1000}
                            onChange={v => update({ timeout: v })}
                        />
                        <span style={{ fontSize: 11, color: 'var(--text-2)' }}>ms</span>
                    </div>
                </SettingRow>
                <SettingRow label="Follow redirects" hint="Automatically follow HTTP redirects">
                    <Toggle
                        checked={settings.followRedirects}
                        onChange={v => update({ followRedirects: v })}
                    />
                </SettingRow>
                <SettingRow label="Max redirects">
                    <NumberInput
                        value={settings.maxRedirects}
                        min={0}
                        max={30}
                        onChange={v => update({ maxRedirects: v })}
                    />
                </SettingRow>
            </SectionCard>

            <SectionCard title="Security">
                <SettingRow
                    label="Validate SSL certificates"
                    hint="Disable to allow self-signed certs in development"
                >
                    <Toggle
                        checked={settings.validateSsl}
                        onChange={v => update({ validateSsl: v })}
                    />
                </SettingRow>
            </SectionCard>

            <SectionCard title="Cookie jar">
                <CookieManager />
            </SectionCard>

            <SectionCard title="Diagnostics">
                <SettingRow
                    label="Crash reporter"
                    hint="Log uncaught errors to a local file — no data is sent externally"
                >
                    <Toggle
                        checked={settings.crashReporterEnabled}
                        onChange={v => update({ crashReporterEnabled: v })}
                    />
                </SettingRow>
            </SectionCard>
        </div>
    );
}

// ── About ──────────────────────────────────────────────────────────────────

function AboutSection() {
    const [version, setVersion] = React.useState('...');
    const [configDir, setConfigDir] = React.useState('');
    const settingsError = useAppStore(s => s.settingsError);
    const { settings, updateSettings } = useAppStore();

    React.useEffect(() => {
        GetVersion()
            .then(v => setVersion(v))
            .catch(() => setVersion('dev'));
        if (isWails) {
            GetConfigDir()
                .then(d => setConfigDir(d))
                .catch(() => {});
        }
    }, []);

    return (
        <div className="flex flex-col gap-5">
            {settingsError && (
                <div
                    className="rounded-[var(--r-md)] p-3"
                    style={{
                        background:
                            'var(--yellow-dim, color-mix(in srgb, #f59e0b 12%, transparent))',
                        border: '1px solid color-mix(in srgb, #f59e0b 40%, transparent)',
                        fontSize: 12,
                        color: 'var(--text-1)',
                    }}
                >
                    <span style={{ fontWeight: 600, color: '#f59e0b' }}>
                        Settings failed to load.{' '}
                    </span>
                    Defaults are in use. Error: {settingsError}
                </div>
            )}
            {/* Hero */}
            <div className="flex flex-col items-center gap-3 py-6">
                <img src={logo} alt="Simora" style={{ width: 60, height: 60, borderRadius: 14 }} />
                <div className="flex flex-col items-center gap-1.5">
                    <span
                        style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: 'var(--text-0)',
                            letterSpacing: '-0.03em',
                        }}
                    >
                        Simora
                    </span>
                    <span
                        className="rounded-full"
                        style={{
                            fontSize: 11,
                            color: 'var(--accent)',
                            background: 'var(--accent-dim)',
                            padding: '2px 10px',
                            border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
                        }}
                    >
                        {version}
                    </span>
                </div>
            </div>

            <SectionCard title="Updates">
                <SettingRow
                    label="Check for updates on startup"
                    hint="Automatically check GitHub releases when the app starts"
                >
                    <Toggle
                        checked={settings.autoUpdate ?? true}
                        onChange={v => updateSettings({ autoUpdate: v })}
                    />
                </SettingRow>
            </SectionCard>

            {configDir && (
                <SectionCard title="Data">
                    <SettingRow label="Config directory" hint={configDir}>
                        <button
                            className="flex items-center gap-1.5 cursor-pointer rounded-[var(--r-sm)] transition-all duration-150 hover:bg-[var(--bg-3)]"
                            style={{
                                height: 28,
                                padding: '0 10px',
                                background: 'var(--bg-2)',
                                border: '1px solid var(--border-1)',
                                color: 'var(--text-1)',
                                fontSize: 12,
                            }}
                            onClick={() => isWails && OpenConfigDir().catch(console.error)}
                        >
                            <FolderOpen style={{ width: 12, height: 12 }} />
                            Open
                        </button>
                    </SettingRow>
                </SectionCard>
            )}

            <SectionCard title="Stack">
                {[
                    { label: 'Runtime', value: 'Wails v2' },
                    { label: 'Backend', value: 'Go 1.26' },
                    { label: 'Frontend', value: 'React 18 + Vite' },
                    { label: 'UI', value: 'Tailwind CSS v4' },
                    { label: 'State', value: 'Zustand' },
                ].map(({ label, value }) => (
                    <div
                        key={label}
                        className="flex items-center justify-between"
                        style={{ padding: '9px 14px' }}
                    >
                        <span style={{ fontSize: 12.5, color: 'var(--text-1)' }}>{label}</span>
                        <span
                            style={{
                                fontSize: 11.5,
                                fontFamily: 'monospace',
                                color: 'var(--text-0)',
                                background: 'var(--bg-3)',
                                border: '1px solid var(--border-1)',
                                borderRadius: 4,
                                padding: '2px 8px',
                            }}
                        >
                            {value}
                        </span>
                    </div>
                ))}
            </SectionCard>
        </div>
    );
}

// ── SettingsPanel ──────────────────────────────────────────────────────────

export function SettingsPanel() {
    const { settingsPanelOpen, closeSettingsPanel, settings, updateSettings } = useAppStore();
    const [section, setSection] = React.useState<SettingsSection>('appearance');

    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === ',') {
                e.preventDefault();
                useAppStore.getState().openSettingsPanel();
            }
            if (e.key === 'Escape' && settingsPanelOpen) closeSettingsPanel();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [settingsPanelOpen, closeSettingsPanel]);

    if (!settingsPanelOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[500] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
            onClick={closeSettingsPanel}
        >
            <div
                className="flex flex-col rounded-[var(--r-lg)] shadow-2xl animate-context-in overflow-hidden"
                style={{
                    width: 640,
                    height: 500,
                    background: 'var(--bg-1)',
                    border: '1px solid var(--border-2)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between shrink-0"
                    style={{
                        height: 52,
                        borderBottom: '1px solid var(--border-1)',
                        background: 'var(--bg-0)',
                        padding: '0 20px 0 28px',
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="flex items-center justify-center rounded-[var(--r-sm)] shrink-0"
                            style={{
                                width: 28,
                                height: 28,
                                background: 'var(--accent-dim)',
                                border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
                            }}
                        >
                            <Settings style={{ width: 14, height: 14, color: 'var(--accent)' }} />
                        </div>
                        <div className="flex flex-col gap-0">
                            <span
                                style={{
                                    fontSize: 13.5,
                                    fontWeight: 600,
                                    color: 'var(--text-0)',
                                    letterSpacing: '-0.01em',
                                    lineHeight: 1.2,
                                }}
                            >
                                Settings
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.2 }}>
                                {NAV_ITEMS.find(n => n.id === section)?.label}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span
                            style={{
                                fontSize: 10,
                                color: 'var(--text-2)',
                                fontFamily: 'monospace',
                                background: 'var(--bg-2)',
                                border: '1px solid var(--border-1)',
                                borderRadius: 3,
                                padding: '1px 5px',
                            }}
                        >
                            {shortcut(',')}
                        </span>
                        <button
                            className="flex items-center justify-center rounded cursor-pointer transition-colors hover:bg-[var(--bg-3)]"
                            style={{ width: 26, height: 26, color: 'var(--text-2)' }}
                            onClick={closeSettingsPanel}
                        >
                            <X style={{ width: 14, height: 14 }} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left nav */}
                    <div
                        className="flex flex-col shrink-0 gap-0.5"
                        style={{
                            width: 172,
                            borderRight: '1px solid var(--border-1)',
                            padding: '12px 8px',
                        }}
                    >
                        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                            const active = section === id;
                            return (
                                <button
                                    key={id}
                                    className={cn(
                                        'flex items-center gap-2.5 w-full rounded-[var(--r-sm)] cursor-pointer transition-all duration-100 text-left select-none',
                                        !active &&
                                            'text-[var(--text-2)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]'
                                    )}
                                    style={{
                                        padding: '8px 12px',
                                        fontSize: 13,
                                        color: active ? 'var(--text-0)' : undefined,
                                        fontWeight: active ? 500 : undefined,
                                        background: active ? 'var(--accent-dim)' : undefined,
                                        border: active
                                            ? '1px solid color-mix(in srgb, var(--accent) 25%, transparent)'
                                            : '1px solid transparent',
                                    }}
                                    onClick={() => setSection(id)}
                                >
                                    <Icon
                                        style={{
                                            width: 14,
                                            height: 14,
                                            flexShrink: 0,
                                            color: active ? 'var(--accent)' : 'currentColor',
                                        }}
                                    />
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto" style={{ padding: '20px 24px' }}>
                        {section === 'appearance' && (
                            <AppearanceSection settings={settings} update={updateSettings} />
                        )}
                        {section === 'request' && (
                            <RequestSection settings={settings} update={updateSettings} />
                        )}
                        {section === 'about' && <AboutSection />}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
