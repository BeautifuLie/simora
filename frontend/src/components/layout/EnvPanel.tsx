import React from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, type Environment } from '@/store/app';
import { VarInput } from '@/components/ui/VarInput';

// ── Env color palette ─────────────────────────────────────────────────────

const ENV_COLORS = [
    { label: 'Green', value: 'var(--green)' },
    { label: 'Blue', value: 'var(--blue)' },
    { label: 'Yellow', value: 'var(--yellow)' },
    { label: 'Purple', value: 'var(--purple)' },
    { label: 'Red', value: 'var(--red)' },
    { label: 'Orange', value: 'var(--orange)' },
];

// ── Variable row ──────────────────────────────────────────────────────────

function VarRow({ envId, idx }: { envId: string; idx: number }) {
    const { environments, setEnvVar, toggleEnvVar, removeEnvVar } = useAppStore();
    const env = environments.find(e => e.id === envId);
    const v = env?.variables[idx];
    if (!v) return null;
    const varSuggestions = (env?.variables ?? []).filter(vv => vv.enabled && vv.key);

    return (
        <div
            className={cn(
                'group grid items-center transition-colors duration-100 hover:bg-[var(--bg-3)]',
                !v.enabled && 'opacity-40'
            )}
            style={{
                gridTemplateColumns: '28px 1fr 1fr 28px',
                borderBottom: '1px solid var(--border-0)',
                minHeight: 32,
            }}
        >
            {/* Checkbox */}
            <button
                className="flex items-center justify-center cursor-pointer"
                style={{ paddingLeft: 8 }}
                onClick={() => toggleEnvVar(envId, idx)}
            >
                <div
                    className={cn(
                        'rounded-sm border transition-all duration-150',
                        v.enabled
                            ? 'bg-[var(--accent)] border-[var(--accent)]'
                            : 'border-[var(--border-1)] bg-transparent'
                    )}
                    style={{ width: 12, height: 12 }}
                >
                    {v.enabled && (
                        <svg
                            viewBox="0 0 10 10"
                            className="w-full h-full"
                            fill="none"
                            style={{ padding: '1.5px' }}
                        >
                            <path
                                d="M1.5 5l2.5 2.5 4.5-4"
                                stroke="#0d1117"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    )}
                </div>
            </button>

            <input
                value={v.key}
                onChange={e => setEnvVar(envId, idx, e.target.value, v.value)}
                placeholder="variable_name"
                className="w-full bg-transparent outline-none"
                style={{
                    padding: '6px 8px 6px 0',
                    fontSize: 'var(--text-base)',
                    fontFamily: "'JetBrains Mono Variable', monospace",
                    color: 'var(--text-0)',
                }}
                spellCheck={false}
            />
            <VarInput
                value={v.value}
                onChange={val => setEnvVar(envId, idx, v.key, val)}
                placeholder="value"
                envVars={varSuggestions}
                style={{
                    padding: '6px 8px 6px 0',
                    fontSize: 'var(--text-base)',
                    fontFamily: "'JetBrains Mono Variable', monospace",
                    color: 'var(--text-1)',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 0,
                    height: 'auto',
                    minHeight: 32,
                }}
            />

            <button
                className="flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-100 hover:text-[var(--red)]"
                style={{ color: 'var(--text-2)', paddingRight: 8 }}
                onClick={() => removeEnvVar(envId, idx)}
            >
                <X style={{ width: 12, height: 12 }} />
            </button>
        </div>
    );
}

// ── Variables table for one env ───────────────────────────────────────────

function VarsTable({ env }: { env: Environment }) {
    const { addEnvVar } = useAppStore();

    return (
        <div className="flex flex-col h-full">
            {/* Column headers */}
            <div
                className="grid shrink-0"
                style={{
                    gridTemplateColumns: '28px 1fr 1fr 28px',
                    borderBottom: '1px solid var(--border-0)',
                    padding: '6px 0',
                }}
            >
                <span />
                <span
                    style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: 'var(--text-2)',
                    }}
                >
                    Variable
                </span>
                <span
                    style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: 'var(--text-2)',
                    }}
                >
                    Value
                </span>
                <span />
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto">
                {env.variables.map((_, idx) => (
                    <VarRow key={idx} envId={env.id} idx={idx} />
                ))}
                {env.variables.length === 0 && (
                    <div
                        className="flex flex-col items-center justify-center gap-2 py-10"
                        style={{ color: 'var(--text-2)' }}
                    >
                        <span style={{ fontSize: 'var(--text-base)' }}>No variables yet</span>
                        <span style={{ fontSize: 'var(--text-sm)', opacity: 0.6 }}>
                            Add variables to use as{' '}
                            <span style={{ fontFamily: 'monospace', color: 'var(--yellow)' }}>
                                {'{{variable}}'}
                            </span>{' '}
                            in requests
                        </span>
                    </div>
                )}
            </div>

            {/* Add row */}
            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-0)' }}>
                <button
                    className="flex items-center gap-1.5 cursor-pointer transition-colors duration-150 hover:text-[var(--accent)]"
                    style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}
                    onClick={() => addEnvVar(env.id)}
                >
                    <Plus style={{ width: 12, height: 12 }} />
                    Add variable
                </button>
            </div>
        </div>
    );
}

// ── Env list item ─────────────────────────────────────────────────────────

function EnvListItem({
    env,
    isSelected,
    isActive,
    onSelect,
    onSetActive,
    onDelete,
}: {
    env: Environment;
    isSelected: boolean;
    isActive: boolean;
    onSelect: () => void;
    onSetActive: () => void;
    onDelete: () => void;
}) {
    const { renameEnv } = useAppStore();
    const [renaming, setRenaming] = React.useState(false);
    const [nameVal, setNameVal] = React.useState(env.name);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (renaming) inputRef.current?.select();
    }, [renaming]);

    const commitRename = () => {
        const t = nameVal.trim();
        if (t && t !== env.name) renameEnv(env.id, t);
        else setNameVal(env.name);
        setRenaming(false);
    };

    return (
        <div
            className={cn(
                'group relative flex items-center gap-2 rounded cursor-pointer transition-all duration-100 select-none',
                isSelected
                    ? 'bg-[var(--bg-3)] text-[var(--text-0)]'
                    : 'text-[var(--text-1)] hover:bg-[var(--bg-2)] hover:text-[var(--text-0)]'
            )}
            style={{ padding: '6px 8px', marginBottom: 2 }}
            onClick={onSelect}
        >
            {/* Color dot */}
            <div
                className="shrink-0 rounded-full"
                style={{ width: 8, height: 8, background: env.color, flexShrink: 0 }}
            />

            {/* Name / rename input */}
            {renaming ? (
                <input
                    ref={inputRef}
                    value={nameVal}
                    onChange={e => setNameVal(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') {
                            setNameVal(env.name);
                            setRenaming(false);
                        }
                    }}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 bg-transparent outline-none border-b border-[var(--accent)] min-w-0"
                    style={{ fontSize: 'var(--text-base)', color: 'var(--text-0)' }}
                    spellCheck={false}
                />
            ) : (
                <span
                    className="flex-1 truncate text-left"
                    style={{ fontSize: 'var(--text-base)' }}
                    onDoubleClick={e => {
                        e.stopPropagation();
                        setRenaming(true);
                    }}
                >
                    {env.name}
                </span>
            )}

            {/* "Active" checkmark */}
            {isActive && (
                <Check style={{ width: 12, height: 12, color: 'var(--accent)', flexShrink: 0 }} />
            )}

            {/* Actions on hover */}
            {!renaming && !isActive && (
                <button
                    className="opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-all duration-100 hover:text-[var(--red)] cursor-pointer shrink-0"
                    style={{ width: 16, height: 16, color: 'var(--text-2)' }}
                    onClick={e => {
                        e.stopPropagation();
                        onDelete();
                    }}
                >
                    <Trash2 style={{ width: 11, height: 11 }} />
                </button>
            )}

            {/* "Use as active" on hover when not active */}
            {!renaming && isSelected && !isActive && (
                <button
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 rounded transition-all duration-100 cursor-pointer shrink-0 hover:text-[var(--accent)]"
                    style={{
                        fontSize: 10,
                        color: 'var(--text-2)',
                        padding: '1px 5px',
                        border: '1px solid var(--border-1)',
                        borderRadius: 3,
                    }}
                    onClick={e => {
                        e.stopPropagation();
                        onSetActive();
                    }}
                >
                    Use
                </button>
            )}
        </div>
    );
}

// ── EnvPanel modal ────────────────────────────────────────────────────────

export function EnvPanel() {
    const {
        envPanelOpen,
        closeEnvPanel,
        environments,
        activeEnvId,
        setActiveEnv,
        createEnv,
        deleteEnv,
        setEnvColor,
    } = useAppStore();

    const [selectedId, setSelectedId] = React.useState<string | null>(null);

    // Auto-select first env when panel opens
    React.useEffect(() => {
        if (envPanelOpen) {
            setSelectedId(prev => prev ?? environments[0]?.id ?? null);
        }
    }, [envPanelOpen, environments]);

    // Close on Escape
    React.useEffect(() => {
        if (!envPanelOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeEnvPanel();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [envPanelOpen, closeEnvPanel]);

    const selectedEnv = environments.find(e => e.id === selectedId) ?? environments[0] ?? null;

    const handleCreate = () => {
        const name = `Environment ${environments.length + 1}`;
        const newId = createEnv(name);
        setSelectedId(newId);
    };

    if (!envPanelOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[500] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
            onClick={closeEnvPanel}
        >
            <div
                className="flex flex-col rounded-[var(--r-lg)] shadow-2xl animate-context-in overflow-hidden"
                style={{
                    width: 660,
                    height: 440,
                    background: 'var(--bg-1)',
                    border: '1px solid var(--border-2)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between shrink-0 px-4"
                    style={{ height: 44, borderBottom: '1px solid var(--border-0)' }}
                >
                    <div>
                        <span
                            style={{
                                fontSize: 'var(--text-md)',
                                fontWeight: 600,
                                color: 'var(--text-0)',
                            }}
                        >
                            Environments
                        </span>
                        <div style={{ fontSize: 10.5, color: 'var(--text-2)', marginTop: 1 }}>
                            Shared across all workspaces
                        </div>
                    </div>
                    <button
                        className="flex items-center justify-center rounded cursor-pointer transition-colors duration-150 hover:bg-[var(--bg-3)]"
                        style={{ width: 24, height: 24, color: 'var(--text-2)' }}
                        onClick={closeEnvPanel}
                    >
                        <X style={{ width: 14, height: 14 }} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left: env list */}
                    <div
                        className="flex flex-col shrink-0 overflow-hidden"
                        style={{ width: 180, borderRight: '1px solid var(--border-0)' }}
                    >
                        <div className="flex-1 overflow-y-auto p-2">
                            {environments.map(env => (
                                <EnvListItem
                                    key={env.id}
                                    env={env}
                                    isSelected={env.id === selectedId}
                                    isActive={env.id === activeEnvId}
                                    onSelect={() => setSelectedId(env.id)}
                                    onSetActive={() => setActiveEnv(env.id)}
                                    onDelete={() => {
                                        deleteEnv(env.id);
                                        if (selectedId === env.id)
                                            setSelectedId(
                                                environments.find(e => e.id !== env.id)?.id ?? null
                                            );
                                    }}
                                />
                            ))}
                        </div>

                        <div style={{ padding: '8px', borderTop: '1px solid var(--border-0)' }}>
                            <button
                                className="flex items-center gap-1.5 w-full cursor-pointer transition-colors duration-150 hover:text-[var(--accent)] rounded"
                                style={{
                                    fontSize: 'var(--text-sm)',
                                    color: 'var(--text-2)',
                                    padding: '4px 6px',
                                }}
                                onClick={handleCreate}
                            >
                                <Plus style={{ width: 12, height: 12 }} />
                                New environment
                            </button>
                        </div>
                    </div>

                    {/* Right: variables */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        {selectedEnv ? (
                            <>
                                {/* Env header with color picker */}
                                <div
                                    className="flex items-center gap-3 shrink-0 px-4"
                                    style={{
                                        height: 40,
                                        borderBottom: '1px solid var(--border-0)',
                                    }}
                                >
                                    <div className="flex items-center gap-1.5">
                                        {ENV_COLORS.map(({ value }) => (
                                            <button
                                                key={value}
                                                className="rounded-full cursor-pointer transition-all duration-150 hover:scale-110"
                                                style={{
                                                    width: 10,
                                                    height: 10,
                                                    background: value,
                                                    outline:
                                                        selectedEnv.color === value
                                                            ? `2px solid ${value}`
                                                            : 'none',
                                                    outlineOffset: 1.5,
                                                }}
                                                onClick={() => setEnvColor(selectedEnv.id, value)}
                                                title="Set color"
                                            />
                                        ))}
                                    </div>

                                    {selectedEnv.id === activeEnvId ? (
                                        <span
                                            className="ml-auto rounded flex items-center gap-1"
                                            style={{
                                                fontSize: 'var(--text-sm)',
                                                color: 'var(--green)',
                                                background: 'var(--green-dim)',
                                                padding: '2px 8px',
                                            }}
                                        >
                                            <Check style={{ width: 10, height: 10 }} />
                                            Active
                                        </span>
                                    ) : (
                                        <button
                                            className="ml-auto rounded cursor-pointer transition-all duration-150 hover:bg-[var(--accent-dim)] hover:text-[var(--accent)]"
                                            style={{
                                                fontSize: 'var(--text-sm)',
                                                color: 'var(--text-2)',
                                                padding: '2px 8px',
                                                border: '1px solid var(--border-1)',
                                                borderRadius: 'var(--r-sm)',
                                            }}
                                            onClick={() => setActiveEnv(selectedEnv.id)}
                                        >
                                            Set active
                                        </button>
                                    )}
                                </div>

                                <VarsTable env={selectedEnv} />
                            </>
                        ) : (
                            <div
                                className="flex items-center justify-center h-full"
                                style={{ color: 'var(--text-2)', fontSize: 'var(--text-sm)' }}
                            >
                                Select an environment
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
