export interface BgPreset {
    id: string;
    label: string;
    bg0: string;
    bg1: string;
    bg2: string;
    bg3: string;
    bg4: string;
}

export const DARK_PRESETS: BgPreset[] = [
    {
        id: 'midnight',
        label: 'Midnight',
        bg0: '#101116',
        bg1: '#191b24',
        bg2: '#212432',
        bg3: '#2b2e3d',
        bg4: '#363a4e',
    },
    {
        id: 'charcoal',
        label: 'Charcoal',
        bg0: '#111111',
        bg1: '#1a1a1a',
        bg2: '#242424',
        bg3: '#2e2e2e',
        bg4: '#383838',
    },
    {
        id: 'forest',
        label: 'Forest',
        bg0: '#0f1510',
        bg1: '#181e19',
        bg2: '#202820',
        bg3: '#2a342b',
        bg4: '#354038',
    },
    {
        id: 'wine',
        label: 'Wine',
        bg0: '#130f15',
        bg1: '#1e1820',
        bg2: '#28202c',
        bg3: '#332838',
        bg4: '#3e3044',
    },
    {
        id: 'ocean',
        label: 'Ocean',
        bg0: '#0c1520',
        bg1: '#162030',
        bg2: '#1e2b3e',
        bg3: '#26364c',
        bg4: '#30425c',
    },
];

export const LIGHT_PRESETS: BgPreset[] = [
    {
        id: 'lavender',
        label: 'Lavender',
        bg0: '#e8eaf5',
        bg1: '#f2f3fb',
        bg2: '#ffffff',
        bg3: '#e0e3f2',
        bg4: '#d4d8ec',
    },
    {
        id: 'snow',
        label: 'Snow',
        bg0: '#f0f0f0',
        bg1: '#f8f8f8',
        bg2: '#ffffff',
        bg3: '#ebebeb',
        bg4: '#e0e0e0',
    },
    {
        id: 'cream',
        label: 'Cream',
        bg0: '#f0ede6',
        bg1: '#faf8f3',
        bg2: '#ffffff',
        bg3: '#e8e4da',
        bg4: '#ddd8cc',
    },
    {
        id: 'mint',
        label: 'Mint',
        bg0: '#e5f0ea',
        bg1: '#f0f9f3',
        bg2: '#ffffff',
        bg3: '#d8ecdf',
        bg4: '#cae4d3',
    },
    {
        id: 'rose',
        label: 'Rose',
        bg0: '#f0e8ed',
        bg1: '#faf2f7',
        bg2: '#ffffff',
        bg3: '#e8d8e3',
        bg4: '#e0ccd8',
    },
];

function adj(hex: string, amount: number): string {
    const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + amount));
    const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + amount));
    const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + amount));
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

export function deriveCustomPreset(base: string, isDark: boolean): BgPreset {
    if (isDark) {
        return {
            id: 'custom',
            label: 'Custom',
            bg0: base,
            bg1: adj(base, 14),
            bg2: adj(base, 25),
            bg3: adj(base, 36),
            bg4: adj(base, 48),
        };
    }
    return {
        id: 'custom',
        label: 'Custom',
        bg0: base,
        bg1: adj(base, 8),
        bg2: '#ffffff',
        bg3: adj(base, -8),
        bg4: adj(base, -18),
    };
}

export function applyBgPreset(preset: BgPreset): void {
    const root = document.documentElement;
    root.style.setProperty('--bg-0', preset.bg0);
    root.style.setProperty('--bg-1', preset.bg1);
    root.style.setProperty('--bg-2', preset.bg2);
    root.style.setProperty('--bg-3', preset.bg3);
    root.style.setProperty('--bg-4', preset.bg4);
}
