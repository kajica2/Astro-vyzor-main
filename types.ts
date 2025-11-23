// FIX: Populating the empty types file with all necessary type definitions.

export type MediaElement = HTMLImageElement | HTMLVideoElement;

export type PlanetaryFocus = 'all' | 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';
export type CosmicBlendMode = 'multiply' | 'screen' | 'overlay';
export type EvolutionCurveShape = 'linear' | 'exponential' | 'logarithmic' | 'bell';

export type AstroData = {
    sun: { sign: string; palette: [string, string]; continuous: number };
    moon: { phase: string; illumination: number; phaseValue: number };
    mercury: { retrograde: boolean; continuous: number };
    venus: { softness: number; continuous: number };
    mars: { intensity: number };
    jupiter: { expansion: number; slowCycle: number };
    saturn: { structure: number; continuous: number };
};

export type TransitionType = 
    | 'random' | 'cross-dissolve' | 'push' | 'slide' | 'wipe-directional' 
    | 'zoom-transition' | 'ken_burns' | 'iris-wipe' | 'radial-wipe' | 'star-wipe'
    | 'starfield-warp' | 'digital-glitch';

export type TransitionDefinition = {
    id: TransitionType;
    name: string;
    category: string;
};

export type EffectTriggerPayload = {
    bass: number;
    mids: number;
    highs: number;
    overall: number;
    isBassBeat: boolean;
    isMidsBeat: boolean;
    isTrebleBeat: boolean;
    evolution: number;
};

export type EffectType = 
    | 'none' | 'strobe' | 'grid' | 'glitch_slice' | 'pixelate' | 'invert'
    | 'rgb_shift' | 'kaleidoscope' | 'bloom' | 'color_grading' | 'liquid_dream';
    
export type TriggerSource =
    | 'none'
    | 'evolution'
    | 'audio_bass_beat'
    | 'audio_mids_beat'
    | 'audio_treble_beat'
    | 'audio_overall_envelope'
    | 'cosmic_mars_beat'
    | 'cosmic_sun_continuous'
    | 'cosmic_moon_phase'
    | 'cosmic_mercury_continuous'
    | 'cosmic_venus_continuous'
    | 'cosmic_jupiter_slow'
    | 'cosmic_saturn_continuous';

export type BlendMode = 'normal' | 'add' | 'multiply' | 'screen' | 'overlay';

export type EffectLayer = {
    id: string;
    name: string;
    effectType: EffectType;
    triggerSource: TriggerSource;
    blendMode: BlendMode;
    opacity: number;
    isSolo: boolean;
    isMuted: boolean;
};

export type EffectParameters = {
    grid: { size: number; lineWidth: number; };
    glitch_slice: { intensity: number; amount: number; type: 'slice' | 'tear' | 'channel_shift'; direction: 'horizontal' | 'vertical'; };
    pixelate: { blockSize: number; };
    rgb_shift: { intensity: number; amount: number; frequency: 'bass' | 'mids' | 'highs'; };
    kaleidoscope: { segments: number; rotationSpeed: number; };
    bloom: { intensity: number; blurSize: number; };
    color_grading: { hue: number; saturation: number; contrast: number; };
    liquid_dream: { intensity: number; speed: number; grain: number; };
};

export type EffectPresetTags = {
    energy: 'low' | 'medium' | 'high';
    tempo: 'slow' | 'medium' | 'fast';
    character: 'rhythmic' | 'atmospheric' | 'glitchy' | 'melodic' | 'experimental';
};

export type EffectPreset = {
    id: string;
    name: string;
    category: string;
    layers: EffectLayer[];
    parameters: EffectParameters;
    tags: EffectPresetTags;
};

export type EnginePresetConfig = {
    isCosmicInfluenceEnabled: boolean;
    cosmicInfluence: number;
    solarSubtraction: number;
    planetaryFocus: PlanetaryFocus;
    timeOffset: number;
    cosmicBlendMode: CosmicBlendMode;
    isEvolutionEnabled: boolean;
    evolutionCurveShape: EvolutionCurveShape;
    evolutionLoopDuration: number;
    evolutionRandomization: number;
    bassSensitivity: number;
    midSensitivity: number;
    trebleSensitivity: number;
    audioAttack: number;
    audioRelease: number;
    audioThreshold: number;
    audioPeakLimiter: number;
    transitionFrequency: number;
    globalIntensity: number;
    visualComplexity: number;
    colorPalette: string;
};

export type EnginePreset = {
    id: string;
    name: string;
    config: EnginePresetConfig;
};


export type ExportSettings = {
    resolution: 'auto' | '1080p' | '720p' | '480p';
    format: string;
    framerate: 30 | 60;
    convertToMP4?: boolean;
};

// --- MODULATION TYPES --- //
export type LFO_Shape = 'sine' | 'square' | 'sawtooth' | 'triangle';

export const MODULATABLE_PARAMS = [
    'globalIntensity', 'visualComplexity', 'cosmicInfluence', 'solarSubtraction', 'transitionTemperature',
    'effectParameters.grid.size', 'effectParameters.grid.lineWidth',
    'effectParameters.bloom.intensity', 'effectParameters.bloom.blurSize',
    'effectParameters.kaleidoscope.segments', 'effectParameters.kaleidoscope.rotationSpeed',
    'effectParameters.rgb_shift.amount',
    'effectParameters.liquid_dream.intensity', 'effectParameters.liquid_dream.speed',
] as const;

export type ModulatableParam = typeof MODULATABLE_PARAMS[number] | 'none';

export type LFO = {
    id: string;
    shape: LFO_Shape;
    rate: number; // Hz
    amount: number; // 0-1
    target: ModulatableParam;
};

export type EnvelopeFollower = {
    id: string;
    source: 'bass' | 'mids' | 'highs' | 'overall';
    amount: number; // 0-1
    target: ModulatableParam;
};

// --- AI & AUDIO ANALYSIS --- //
export type AudioProfile = {
    energy: 'low' | 'medium' | 'high';
    tempo: 'slow' | 'medium' | 'fast';
    character: 'rhythmic' | 'atmospheric' | 'glitchy' | 'melodic' | 'experimental';
};
