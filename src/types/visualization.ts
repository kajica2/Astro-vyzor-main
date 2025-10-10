import type {
    MediaElement,
    TransitionType,
    EffectLayer,
    EffectParameters,
    AstroData,
    LFO,
    EnvelopeFollower,
    EvolutionCurveShape,
    PlanetaryFocus,
    CosmicBlendMode
} from '../../types';

export interface Resolution {
    width: number;
    height: number;
    name?: string;
}

export const RESOLUTIONS = {
    '480p': { width: 854, height: 480, name: '480p' },
    '720p': { width: 1280, height: 720, name: '720p' },
    '1080p': { width: 1920, height: 1080, name: '1080p' },
    '4k': { width: 3840, height: 2160, name: '4K' },
    'custom': { width: 0, height: 0, name: 'Custom' }
} as const;

export interface VisualizationConfig {
    // Canvas Settings
    resolution: Resolution;
    framerate: number;
    backgroundColor?: string;

    // Media Sources
    mediaElements: MediaElement[];
    audioSource: HTMLAudioElement | MediaStream | null;

    // Audio Analysis
    audioConfig: {
        fftSize: number;
        bassSensitivity: number;
        midSensitivity: number;
        trebleSensitivity: number;
        audioAttack: number;
        audioRelease: number;
        audioThreshold: number;
        audioPeakLimiter: number;
        smoothing: number;
    };

    // Visual Effects
    effectsConfig: {
        layers: EffectLayer[];
        parameters: EffectParameters;
        globalIntensity: number;
        visualComplexity: number;
    };

    // Transitions
    transitionConfig: {
        type: TransitionType;
        temperature: number;
        frequency: number;
        duration: number;
    };

    // Evolution
    evolutionConfig: {
        enabled: boolean;
        curveShape: EvolutionCurveShape;
        loopDuration: number;
        randomization: number;
    };

    // Cosmic Influence (optional)
    cosmicConfig?: {
        enabled: boolean;
        influence: number;
        solarSubtraction: number;
        planetaryFocus: PlanetaryFocus;
        timeOffset: number;
        blendMode: CosmicBlendMode;
        astroData?: AstroData | null;
    };

    // Modulation
    modulationConfig: {
        lfo: LFO;
        envelopeFollower: EnvelopeFollower;
    };

    // Video Playback
    videoConfig: {
        enabled: boolean;
        playbackSpeed: number;
        reversed: boolean;
        fitToWidth: boolean;
        fitToHeight: boolean;
    };

    // Color
    colorConfig: {
        palette: string;
        customColors?: string[];
    };
}

export interface RecordingConfig {
    resolution: Resolution;
    framerate: 30 | 60;
    format: string;
    quality?: number;
    includeAudio: boolean;
}

export interface AudioAnalysisData {
    bass: number;
    mids: number;
    highs: number;
    overall: number;
    isBassBeat: boolean;
    isMidsBeat: boolean;
    isTrebleBeat: boolean;
    frequencyData: Uint8Array;
    waveformData: Uint8Array;
}

export interface RenderFrame {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    audioData: AudioAnalysisData;
    evolution: number;
    time: number;
    deltaTime: number;
}

export type VisualizationCallback = (frame: RenderFrame) => void;

export interface VisualizationEngineProps {
    config: VisualizationConfig;
    onFrame?: VisualizationCallback;
    onReady?: () => void;
    onError?: (error: Error) => void;
    autoStart?: boolean;
}

export interface RecorderProps {
    canvas: HTMLCanvasElement;
    audioSource: HTMLAudioElement | MediaStream | null;
    config: RecordingConfig;
    onStart?: () => void;
    onStop?: (blob: Blob) => void;
    onError?: (error: Error) => void;
}

export interface CanvasRendererProps {
    width: number;
    height: number;
    offscreen?: boolean;
    preserveDrawingBuffer?: boolean;
}

export interface AudioProcessorProps {
    source: HTMLAudioElement | MediaStream;
    fftSize?: number;
    smoothingTimeConstant?: number;
    onAnalysis?: (data: AudioAnalysisData) => void;
}

export type EffectFunction = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    params: any,
    audioData: AudioAnalysisData,
    time: number
) => void;

export interface EffectDefinition {
    id: string;
    name: string;
    apply: EffectFunction;
    defaultParams?: any;
}