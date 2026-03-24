import { describe, it, expect } from 'vitest';
import { deriveCustomPreset, DARK_PRESETS, LIGHT_PRESETS } from './bgPresets';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16),
    };
}

function isValidHex(value: string): boolean {
    return /^#[0-9a-f]{6}$/i.test(value);
}

function brightness(hex: string): number {
    const { r, g, b } = hexToRgb(hex);
    return r + g + b;
}

describe('DARK_PRESETS', () => {
    it('has exactly 5 entries', () => {
        expect(DARK_PRESETS).toHaveLength(5);
    });

    it('each entry has valid hex bg0..bg4', () => {
        for (const preset of DARK_PRESETS) {
            expect(isValidHex(preset.bg0)).toBe(true);
            expect(isValidHex(preset.bg1)).toBe(true);
            expect(isValidHex(preset.bg2)).toBe(true);
            expect(isValidHex(preset.bg3)).toBe(true);
            expect(isValidHex(preset.bg4)).toBe(true);
        }
    });

    it('each entry has an id and label', () => {
        for (const preset of DARK_PRESETS) {
            expect(typeof preset.id).toBe('string');
            expect(preset.id.length).toBeGreaterThan(0);
            expect(typeof preset.label).toBe('string');
            expect(preset.label.length).toBeGreaterThan(0);
        }
    });
});

describe('LIGHT_PRESETS', () => {
    it('has exactly 5 entries', () => {
        expect(LIGHT_PRESETS).toHaveLength(5);
    });

    it('each entry has valid hex bg0..bg4', () => {
        for (const preset of LIGHT_PRESETS) {
            expect(isValidHex(preset.bg0)).toBe(true);
            expect(isValidHex(preset.bg1)).toBe(true);
            expect(isValidHex(preset.bg2)).toBe(true);
            expect(isValidHex(preset.bg3)).toBe(true);
            expect(isValidHex(preset.bg4)).toBe(true);
        }
    });

    it('each entry has an id and label', () => {
        for (const preset of LIGHT_PRESETS) {
            expect(typeof preset.id).toBe('string');
            expect(preset.id.length).toBeGreaterThan(0);
            expect(typeof preset.label).toBe('string');
            expect(preset.label.length).toBeGreaterThan(0);
        }
    });
});

describe('deriveCustomPreset — id field', () => {
    it('always returns id of custom', () => {
        const result = deriveCustomPreset('#101116', true);
        expect(result.id).toBe('custom');
    });

    it('returns id custom in light mode too', () => {
        const result = deriveCustomPreset('#e8eaf5', false);
        expect(result.id).toBe('custom');
    });
});

describe('deriveCustomPreset — dark mode progression', () => {
    it('bg1 is lighter than bg0 in dark mode', () => {
        const result = deriveCustomPreset('#101116', true);
        expect(brightness(result.bg1)).toBeGreaterThan(brightness(result.bg0));
    });

    it('bg2 is lighter than bg1 in dark mode', () => {
        const result = deriveCustomPreset('#101116', true);
        expect(brightness(result.bg2)).toBeGreaterThan(brightness(result.bg1));
    });

    it('bg3 is lighter than bg2 in dark mode', () => {
        const result = deriveCustomPreset('#101116', true);
        expect(brightness(result.bg3)).toBeGreaterThan(brightness(result.bg2));
    });

    it('bg4 is lighter than bg3 in dark mode', () => {
        const result = deriveCustomPreset('#101116', true);
        expect(brightness(result.bg4)).toBeGreaterThan(brightness(result.bg3));
    });

    it('bg0 equals the base color in dark mode', () => {
        const result = deriveCustomPreset('#101116', true);
        expect(result.bg0).toBe('#101116');
    });
});

describe('deriveCustomPreset — light mode', () => {
    it('bg1 is lighter than bg0 in light mode', () => {
        const result = deriveCustomPreset('#e8eaf5', false);
        expect(brightness(result.bg1)).toBeGreaterThanOrEqual(brightness(result.bg0));
    });

    it('bg2 is white in light mode', () => {
        const result = deriveCustomPreset('#e8eaf5', false);
        expect(result.bg2).toBe('#ffffff');
    });

    it('bg0 equals the base color in light mode', () => {
        const result = deriveCustomPreset('#e8eaf5', false);
        expect(result.bg0).toBe('#e8eaf5');
    });

    it('all hex values are valid in light mode', () => {
        const result = deriveCustomPreset('#e8eaf5', false);
        expect(isValidHex(result.bg0)).toBe(true);
        expect(isValidHex(result.bg1)).toBe(true);
        expect(isValidHex(result.bg2)).toBe(true);
        expect(isValidHex(result.bg3)).toBe(true);
        expect(isValidHex(result.bg4)).toBe(true);
    });
});

describe('deriveCustomPreset — RGB clamping', () => {
    it('white input in dark mode does not produce values above 255', () => {
        const result = deriveCustomPreset('#ffffff', true);
        for (const key of ['bg0', 'bg1', 'bg2', 'bg3', 'bg4'] as const) {
            const { r, g, b } = hexToRgb(result[key]);
            expect(r).toBeLessThanOrEqual(255);
            expect(g).toBeLessThanOrEqual(255);
            expect(b).toBeLessThanOrEqual(255);
        }
    });

    it('white input in light mode does not produce values above 255', () => {
        const result = deriveCustomPreset('#ffffff', false);
        for (const key of ['bg0', 'bg1', 'bg2', 'bg3', 'bg4'] as const) {
            const { r, g, b } = hexToRgb(result[key]);
            expect(r).toBeLessThanOrEqual(255);
            expect(g).toBeLessThanOrEqual(255);
            expect(b).toBeLessThanOrEqual(255);
        }
    });

    it('black input in dark mode produces lighter shades', () => {
        const result = deriveCustomPreset('#000000', true);
        expect(brightness(result.bg1)).toBeGreaterThan(brightness(result.bg0));
        expect(brightness(result.bg2)).toBeGreaterThan(brightness(result.bg1));
    });

    it('all channels are non-negative for any input', () => {
        const result = deriveCustomPreset('#000000', false);
        for (const key of ['bg0', 'bg1', 'bg2', 'bg3', 'bg4'] as const) {
            const { r, g, b } = hexToRgb(result[key]);
            expect(r).toBeGreaterThanOrEqual(0);
            expect(g).toBeGreaterThanOrEqual(0);
            expect(b).toBeGreaterThanOrEqual(0);
        }
    });
});
