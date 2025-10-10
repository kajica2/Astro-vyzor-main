// FIX: Corrected import path for types.
import type { EffectPreset, TransitionDefinition, EffectParameters, TriggerSource, BlendMode, AstroData } from './types';

export const SIGN_PALETTES: { [key: string]: [string, string] } = {
    Aries: ['#FF4500', '#FFD700'], Taurus: ['#2E8B57', '#DAA520'], Gemini: ['#FFD700', '#ADD8E6'],
    Cancer: ['#C0C0C0', '#6495ED'], Leo: ['#FFD700', '#FF4500'], Virgo: ['#556B2F', '#F5DEB3'],
    Libra: ['#FFC0CB', '#87CEEB'], Scorpio: ['#8B0000', '#483D8B'], Sagittarius: ['#4B0082', '#FF8C00'],
    Capricorn: ['#696969', '#A9A9A9'], Aquarius: ['#00BFFF', '#8A2BE2'], Pisces: ['#4682B4', '#9370DB'],
};

export const COLOR_PALETTES: { [key: string]: [string, string] } = {
    Vaporwave: ['#ff71ce', '#01cdfe'], FireAndIce: ['#f53803', '#03e7f5'],
    Forest: ['#0b4e0b', '#8fbc8f'], Royal: ['#472f91', '#f9c80e'], Monochrome: ['#111111', '#eeeeee'],
};

export const MOCK_ASTRO_DATA: AstroData = {
    sun: { sign: 'Leo', palette: ['#FFD700', '#FF4500'], continuous: 0.7 },
    moon: { phase: 'Full Moon', illumination: 1.0, phaseValue: 0.5 },
    mercury: { retrograde: false, continuous: 0.3 },
    venus: { softness: 0.8, continuous: 0.8 },
    mars: { intensity: 0.9 },
    jupiter: { expansion: 0.6, slowCycle: 0.6 },
    saturn: { structure: 0.4, continuous: 0.4 },
};

export const BEAT_COOLDOWN = 200; // ms
export const FFT_SIZE = 512;

export const TRANSITION_DEFINITIONS: TransitionDefinition[] = [
    { id: 'random', name: 'Random', category: 'Core' },
    { id: 'cross-dissolve', name: 'Cross Dissolve', category: 'Core' },
    
    { id: 'push', name: 'Push', category: 'Movement' },
    { id: 'slide', name: 'Slide', category: 'Movement' },
    { id: 'wipe-directional', name: 'Directional Wipe', category: 'Movement' },
    
    { id: 'zoom-transition', name: 'Zoom', category: 'Zoom & Pan' },
    { id: 'ken_burns', name: 'Ken Burns', category: 'Zoom & Pan' },

    { id: 'iris-wipe', name: 'Iris Wipe', category: 'Masked & Wipes' },
    { id: 'radial-wipe', name: 'Radial Wipe', category: 'Masked & Wipes' },
    { id: 'star-wipe', name: 'Star Wipe', category: 'Masked & Wipes' },
    
    { id: 'starfield-warp', name: 'Starfield Warp', category: 'Themed' },
    { id: 'digital-glitch', name: 'Digital Glitch', category: 'Themed' },
];

export const TRIGGER_SOURCES: { id: TriggerSource, name: string, group: string }[] = [
    { id: 'none', name: 'None', group: 'General' },
    { id: 'evolution', name: 'Evolution', group: 'General' },
    { id: 'audio_bass_beat', name: 'Bass Beat', group: 'Audio' },
    { id: 'audio_mids_beat', name: 'Mids Beat', group: 'Audio' },
    { id: 'audio_treble_beat', name: 'Treble Beat', group: 'Audio' },
    { id: 'audio_overall_envelope', name: 'Overall Envelope', group: 'Audio' },
    { id: 'cosmic_mars_beat', name: 'Mars Beat', group: 'Cosmic' },
    { id: 'cosmic_sun_continuous', name: 'Sun (Continuous)', group: 'Cosmic' },
    { id: 'cosmic_moon_phase', name: 'Moon (Phase)', group: 'Cosmic' },
    { id: 'cosmic_mercury_continuous', name: 'Mercury (Continuous)', group: 'Cosmic' },
    { id: 'cosmic_venus_continuous', name: 'Venus (Continuous)', group: 'Cosmic' },
    { id: 'cosmic_jupiter_slow', name: 'Jupiter (Slow Cycle)', group: 'Cosmic' },
    { id: 'cosmic_saturn_continuous', name: 'Saturn (Continuous)', group: 'Cosmic' },
];

export const BLEND_MODES: { id: BlendMode, name: string }[] = [
    { id: 'normal', name: 'Normal' }, { id: 'add', name: 'Add' }, { id: 'multiply', name: 'Multiply' },
    { id: 'screen', name: 'Screen' }, { id: 'overlay', name: 'Overlay' },
];

export const DEFAULT_EFFECT_PARAMETERS: EffectParameters = {
    grid: { size: 75, lineWidth: 1 },
    glitch_slice: { intensity: 0.5, amount: 15, type: 'slice', direction: 'horizontal' },
    pixelate: { blockSize: 20 },
    rgb_shift: { intensity: 0.7, amount: 15, frequency: 'bass' },
    kaleidoscope: { segments: 6, rotationSpeed: 0.1 },
    bloom: { intensity: 0.8, blurSize: 20 },
    color_grading: { hue: 0, saturation: 100, contrast: 100 },
    liquid_dream: { intensity: 15, speed: 0.5, grain: 0.1 },
};

export const EFFECT_PRESETS: EffectPreset[] = [
    // --- Essential Starter Pack ---
    {
        id: 'essential_clean', name: 'Clean & Rhythmic', category: 'Essential',
        layers: [
            { id: 'l1', name: 'Beat Pulse', effectType: 'bloom', triggerSource: 'audio_bass_beat', blendMode: 'add', opacity: 0.5, isSolo: false, isMuted: false },
            { id: 'l2', name: 'Fine Grid', effectType: 'grid', triggerSource: 'evolution', blendMode: 'overlay', opacity: 0.15, isSolo: false, isMuted: false },
        ],
        parameters: { ...DEFAULT_EFFECT_PARAMETERS, bloom: { intensity: 0.5, blurSize: 30 }, grid: { size: 100, lineWidth: 0.5 } },
        tags: { energy: 'low', tempo: 'medium', character: 'rhythmic' }
    },
    {
        id: 'essential_dynamic', name: 'Dynamic Energy', category: 'Essential',
        layers: [
            { id: 'l1', name: 'Strobe', effectType: 'strobe', triggerSource: 'audio_bass_beat', blendMode: 'add', opacity: 0.7, isSolo: false, isMuted: false },
            { id: 'l2', name: 'RGB Shift', effectType: 'rgb_shift', triggerSource: 'audio_treble_beat', blendMode: 'screen', opacity: 1, isSolo: false, isMuted: false },
        ],
        parameters: { ...DEFAULT_EFFECT_PARAMETERS, rgb_shift: { ...DEFAULT_EFFECT_PARAMETERS.rgb_shift, intensity: 0.8, amount: 25 } },
        tags: { energy: 'high', tempo: 'fast', character: 'rhythmic' }
    },
    {
        id: 'essential_atmospheric', name: 'Atmospheric Dream', category: 'Essential',
        layers: [
            { id: 'l1', name: 'Liquid Dream', effectType: 'liquid_dream', triggerSource: 'evolution', blendMode: 'overlay', opacity: 0.4, isSolo: false, isMuted: false },
            { id: 'l2', name: 'Gentle Bloom', effectType: 'bloom', triggerSource: 'audio_overall_envelope', blendMode: 'add', opacity: 0.6, isSolo: false, isMuted: false },
        ],
        parameters: { ...DEFAULT_EFFECT_PARAMETERS, liquid_dream: { ...DEFAULT_EFFECT_PARAMETERS.liquid_dream, intensity: 20, speed: 0.3 }, bloom: { ...DEFAULT_EFFECT_PARAMETERS.bloom, intensity: 1, blurSize: 50 } },
        tags: { energy: 'low', tempo: 'slow', character: 'atmospheric' }
    },

    // --- Intensity Based ---
    {
        id: 'intensity_subtle_glow', name: 'Gentle Glow', category: 'Intensity: Subtle',
        layers: [ { id: 'l1', name: 'Soft Bloom', effectType: 'bloom', triggerSource: 'audio_overall_envelope', blendMode: 'add', opacity: 0.6, isSolo: false, isMuted: false } ],
        parameters: { ...DEFAULT_EFFECT_PARAMETERS, bloom: { intensity: 0.6, blurSize: 80 } },
        tags: { energy: 'low', tempo: 'slow', character: 'atmospheric' }
    },
    {
        id: 'intensity_moderate_kaleido', name: 'Kaleido Pulse', category: 'Intensity: Moderate',
        layers: [
            { id: 'l1', name: 'Kaleido', effectType: 'kaleidoscope', triggerSource: 'evolution', blendMode: 'normal', opacity: 1.0, isSolo: false, isMuted: false },
            { id: 'l2', name: 'Beat Invert', effectType: 'invert', triggerSource: 'audio_bass_beat', blendMode: 'normal', opacity: 0.8, isSolo: false, isMuted: false },
        ],
        parameters: { ...DEFAULT_EFFECT_PARAMETERS, kaleidoscope: { segments: 8, rotationSpeed: 0.2 } },
        tags: { energy: 'medium', tempo: 'medium', character: 'experimental' }
    },
    {
        id: 'intense_glitch_overload', name: 'Glitch Overload', category: 'Intensity: Intense',
        layers: [
            { id: 'l1', name: 'Slice', effectType: 'glitch_slice', triggerSource: 'audio_treble_beat', blendMode: 'normal', opacity: 1, isSolo: false, isMuted: false },
            { id: 'l2', name: 'Pixelate', effectType: 'pixelate', triggerSource: 'audio_bass_beat', blendMode: 'normal', opacity: 1, isSolo: false, isMuted: false },
            { id: 'l3', name: 'Invert Flash', effectType: 'invert', triggerSource: 'audio_mids_beat', blendMode: 'normal', opacity: 1, isSolo: false, isMuted: false },
        ],
        parameters: { ...DEFAULT_EFFECT_PARAMETERS, glitch_slice: { ...DEFAULT_EFFECT_PARAMETERS.glitch_slice, intensity: 1, amount: 40 }, pixelate: { blockSize: 30 } },
        tags: { energy: 'high', tempo: 'fast', character: 'glitchy' }
    },

    // --- Genre Themed ---
    {
        id: 'genre_retro_vaporwave', name: 'Vaporwave Sunset', category: 'Genre: Retro',
        layers: [
            { id: 'l1', name: 'Sunset Grid', effectType: 'grid', triggerSource: 'evolution', blendMode: 'overlay', opacity: 0.3, isSolo: false, isMuted: false },
            { id: 'l2', name: 'VHS Bloom', effectType: 'bloom', triggerSource: 'audio_overall_envelope', blendMode: 'add', opacity: 0.7, isSolo: false, isMuted: false },
            { id: 'l3', name: 'Analog Shift', effectType: 'rgb_shift', triggerSource: 'cosmic_mercury_continuous', blendMode: 'normal', opacity: 1, isSolo: false, isMuted: false }
        ],
        parameters: { ...DEFAULT_EFFECT_PARAMETERS, grid: { ...DEFAULT_EFFECT_PARAMETERS.grid, size: 40 }, bloom: { ...DEFAULT_EFFECT_PARAMETERS.bloom, intensity: 1.2, blurSize: 15 }, color_grading: { hue: 300, saturation: 150, contrast: 120 } },
        tags: { energy: 'medium', tempo: 'medium', character: 'melodic' }
    },
    {
        id: 'genre_retro_8bit', name: '8-Bit Adventure', category: 'Genre: Retro',
        layers: [ { id: 'l1', name: 'Pixelation', effectType: 'pixelate', triggerSource: 'audio_bass_beat', blendMode: 'normal', opacity: 1.0, isSolo: false, isMuted: false } ],
        parameters: { ...DEFAULT_EFFECT_PARAMETERS, pixelate: { blockSize: 40 } },
        tags: { energy: 'medium', tempo: 'fast', character: 'glitchy' }
    },
    {
        id: 'genre_cinematic_noir', name: 'Cinematic Noir', category: 'Genre: Cinematic',
        layers: [
            { id: 'l1', name: 'Film Grain', effectType: 'liquid_dream', triggerSource: 'evolution', blendMode: 'overlay', opacity: 0.2, isSolo: false, isMuted: false },
            { id: 'l2', name: 'High Contrast', effectType: 'color_grading', triggerSource: 'evolution', blendMode: 'normal', opacity: 1, isSolo: false, isMuted: false },
        ],
        parameters: { ...DEFAULT_EFFECT_PARAMETERS, liquid_dream: {...DEFAULT_EFFECT_PARAMETERS.liquid_dream, grain: 0.4, speed: 0.1, intensity: 5}, color_grading: {hue: 0, saturation: 0, contrast: 180}},
        tags: { energy: 'low', tempo: 'slow', character: 'atmospheric' }
    },
    {
        id: 'genre_cinematic_ghost', name: 'Ghost in the Machine', category: 'Genre: Cinematic',
        layers: [
            { id: 'l1', name: 'Ectoplasm', effectType: 'liquid_dream', triggerSource: 'cosmic_moon_phase', blendMode: 'overlay', opacity: 0.4, isSolo: false, isMuted: false },
            { id: 'l2', name: 'Ghostly Glow', effectType: 'bloom', triggerSource: 'audio_overall_envelope', blendMode: 'add', opacity: 0.6, isSolo: false, isMuted: false },
            { id: 'l3', name: 'Desaturate', effectType: 'color_grading', triggerSource: 'evolution', blendMode: 'normal', opacity: 1.0, isSolo: false, isMuted: false }
        ],
        parameters: { ...DEFAULT_EFFECT_PARAMETERS, liquid_dream: { intensity: 10, speed: 0.8, grain: 0.2 }, bloom: { intensity: 1.2, blurSize: 70 }, color_grading: { hue: 180, saturation: 20, contrast: 130 } },
        tags: { energy: 'low', tempo: 'slow', character: 'atmospheric' }
    },
    {
        id: 'genre_electronic_techno', name: 'Techno Hypnosis', category: 'Genre: Electronic',
        layers: [
            { id: 'l1', name: 'Hard Strobe', effectType: 'strobe', triggerSource: 'audio_bass_beat', blendMode: 'add', opacity: 0.8, isSolo: false, isMuted: false },
            { id: 'l2', name: 'Syncopated Grid', effectType: 'grid', triggerSource: 'audio_mids_beat', blendMode: 'overlay', opacity: 0.4, isSolo: false, isMuted: false },
            { id: 'l3', name: 'High Freq Shift', effectType: 'rgb_shift', triggerSource: 'audio_treble_beat', blendMode: 'add', opacity: 1.0, isSolo: false, isMuted: false }
        ],
        parameters: { ...DEFAULT_EFFECT_PARAMETERS, grid: { size: 50, lineWidth: 2 }, rgb_shift: { intensity: 0.6, amount: 30, frequency: 'highs' } },
        tags: { energy: 'high', tempo: 'fast', character: 'rhythmic' }
    },
    {
        id: 'genre_electronic_neon', name: 'Neon Drive', category: 'Genre: Electronic',
        layers: [
            { id: 'l1', name: 'Neon Glow', effectType: 'bloom', triggerSource: 'audio_overall_envelope', blendMode: 'add', opacity: 0.9, isSolo: false, isMuted: false },
            { id: 'l2', name: 'Dark Contrast', effectType: 'color_grading', triggerSource: 'evolution', blendMode: 'normal', opacity: 1.0, isSolo: false, isMuted: false },
        ],
        parameters: { ...DEFAULT_EFFECT_PARAMETERS, bloom: { intensity: 1.5, blurSize: 40 }, color_grading: { hue: 280, saturation: 180, contrast: 170 }},
        tags: { energy: 'medium', tempo: 'medium', character: 'melodic' }
    },

    // --- Cosmic Themed ---
    {
        id: 'cosmic_solar_flare', name: 'Solar Flare', category: 'Cosmic',
        layers: [
            { id: 'l1', name: 'Flare', effectType: 'bloom', triggerSource: 'audio_bass_beat', blendMode: 'add', opacity: 1.0, isSolo: false, isMuted: false },
            { id: 'l2', name: 'Corona', effectType: 'color_grading', triggerSource: 'cosmic_sun_continuous', blendMode: 'normal', opacity: 1.0, isSolo: false, isMuted: false },
        ],
        parameters: { ...DEFAULT_EFFECT_PARAMETERS, bloom: { intensity: 2.0, blurSize: 30 }, color_grading: { hue: 45, saturation: 200, contrast: 150 } },
        tags: { energy: 'high', tempo: 'slow', character: 'atmospheric' }
    },
    {
        id: 'cosmic_mercury_retrograde', name: 'Mercury Retrograde', category: 'Cosmic',
        layers: [
            { id: 'l1', name: 'Signal Tear', effectType: 'glitch_slice', triggerSource: 'cosmic_mercury_continuous', blendMode: 'normal', opacity: 1.0, isSolo: false, isMuted: false },
            { id: 'l2', name: 'Channel Shift', effectType: 'rgb_shift', triggerSource: 'evolution', blendMode: 'screen', opacity: 0.8, isSolo: false, isMuted: false }
        ],
        parameters: { ...DEFAULT_EFFECT_PARAMETERS, glitch_slice: { intensity: 0.7, amount: 30, type: 'tear', direction: 'horizontal' }, rgb_shift: { intensity: 0.4, amount: 15, frequency: 'mids' } },
        tags: { energy: 'medium', tempo: 'fast', character: 'glitchy' }
    },
    {
        id: 'cosmic_saturn_rings', name: 'Saturn Rings', category: 'Cosmic',
        layers: [
            { id: 'l1', name: 'Structural Grid', effectType: 'grid', triggerSource: 'cosmic_saturn_continuous', blendMode: 'overlay', opacity: 0.5, isSolo: false, isMuted: false },
            { id: 'l2', name: 'Slow Rotation', effectType: 'kaleidoscope', triggerSource: 'evolution', blendMode: 'normal', opacity: 1.0, isSolo: false, isMuted: false }
        ],
        parameters: { ...DEFAULT_EFFECT_PARAMETERS, grid: { size: 150, lineWidth: 0.3 }, kaleidoscope: { segments: 16, rotationSpeed: 0.05 } },
        tags: { energy: 'low', tempo: 'slow', character: 'melodic' }
    }
];
