import React, { createContext, useContext, useReducer, Dispatch } from 'react';
import type {
    MediaElement, AstroData, PlanetaryFocus, CosmicBlendMode, TransitionType,
    EvolutionCurveShape, EffectLayer, EffectParameters, EffectPreset, EnginePreset, EnginePresetConfig,
    LFO, EnvelopeFollower
} from '../types';
import { EFFECT_PRESETS, DEFAULT_EFFECT_PARAMETERS } from '../constants';

type AppState = {
    // Media & Core State
    isPlaying: boolean;
    isReady: boolean;
    isRecording: boolean;
    activeTab: 'media' | 'engine' | 'fx';
    visuals: (File | 'webcam')[];
    audioFile: File | null;
    mediaElements: MediaElement[];
    audioUrl: string | null;
    webcamStream: MediaStream | null;
    micStream: MediaStream | null;

    // Cosmic Engine
    isCosmicInfluenceEnabled: boolean;
    cosmicInfluence: number;
    solarSubtraction: number;
    planetaryFocus: PlanetaryFocus;
    timeOffset: number;
    cosmicBlendMode: CosmicBlendMode;
    isInverseInfluenceEnabled: boolean; // From InverseCosmicControls
    astroData: AstroData | null;

    // Evolution Engine
    isEvolutionEnabled: boolean;
    evolutionCurveShape: EvolutionCurveShape;
    evolutionLoopDuration: number;
    evolutionRandomization: number;

    // Audio Reactivity
    bassSensitivity: number;
    midSensitivity: number;
    trebleSensitivity: number;
    audioAttack: number;
    audioRelease: number;
    audioThreshold: number;
    audioPeakLimiter: number;

    // Transitions
    transitionType: TransitionType;
    transitionTemperature: number;
    transitionFrequency: number;

    // Video Playback
    isVideoFxEnabled: boolean;
    videoPlaybackSpeed: number;
    isVideoReversed: boolean;
    isFitToWidth: boolean;
    isFitToHeight: boolean;
    
    // Global Visuals
    globalIntensity: number;
    visualComplexity: number;
    colorPalette: string;

    // FX & Layers
    effectLayers: EffectLayer[];
    effectParameters: EffectParameters;
    effectPresets: EffectPreset[];
    activeEffectPresetId: string;
    selectedLayerId: string | null;

    // Style Blending
    styleBlendValue: number;
    stylePresetAId: string;
    stylePresetBId: string;

    // Engine Presets
    enginePresets: EnginePreset[];
    activeEnginePresetId: string;

    // Global Modulators
    lfo: LFO;
    envelopeFollower: EnvelopeFollower;
};

const defaultEnginePreset: EnginePreset = {
    id: 'default',
    name: 'Default Engine',
    config: {
        isCosmicInfluenceEnabled: true, cosmicInfluence: 0.5, solarSubtraction: 0.1, planetaryFocus: 'all', timeOffset: 0, cosmicBlendMode: 'multiply',
        isEvolutionEnabled: true, evolutionCurveShape: 'linear', evolutionLoopDuration: 0, evolutionRandomization: 0.1,
        bassSensitivity: 0.5, midSensitivity: 0.5, trebleSensitivity: 0.5, audioAttack: 0.7, audioRelease: 0.7, audioThreshold: 0.05, audioPeakLimiter: 0.95,
        transitionFrequency: 0.1, globalIntensity: 1.0, visualComplexity: 0.5, colorPalette: 'astrological',
    }
};

const initialEffectPreset = EFFECT_PRESETS.find(p => p.id === 'essential_clean') || EFFECT_PRESETS[0];

const initialState: AppState = {
    // Media
    isPlaying: false,
    isReady: false,
    isRecording: false,
    activeTab: 'media',
    visuals: [],
    audioFile: null,
    mediaElements: [],
    audioUrl: null,
    webcamStream: null,
    micStream: null,

    // Engine
    ...defaultEnginePreset.config,
    isInverseInfluenceEnabled: false,
    astroData: null,

    // Video
    isVideoFxEnabled: false,
    videoPlaybackSpeed: 1.0,
    isVideoReversed: false,
    isFitToWidth: false,
    isFitToHeight: false,

    // Transitions
    transitionType: 'cross-dissolve',
    transitionTemperature: 0.5,
    
    // FX
    effectLayers: initialEffectPreset.layers,
    effectParameters: initialEffectPreset.parameters,
    effectPresets: EFFECT_PRESETS,
    activeEffectPresetId: initialEffectPreset.id,
    selectedLayerId: null,

    // Blending
    styleBlendValue: 0,
    stylePresetAId: initialEffectPreset.id,
    stylePresetBId: EFFECT_PRESETS.find(p => p.id === 'essential_dynamic')?.id || EFFECT_PRESETS[1]?.id || initialEffectPreset.id,

    // Engine Presets
    enginePresets: [defaultEnginePreset],
    activeEnginePresetId: 'default',

    // Global Modulators
    lfo: { id: 'lfo1', shape: 'sine', rate: 0.5, amount: 0.4, target: 'globalIntensity' },
    envelopeFollower: { id: 'env1', source: 'overall', amount: 0.5, target: 'none' },
};

type Action =
    | { type: 'SET_IS_PLAYING'; payload: boolean }
    | { type: 'SET_IS_READY'; payload: boolean }
    | { type: 'SET_IS_RECORDING'; payload: boolean }
    | { type: 'SET_ACTIVE_TAB'; payload: 'media' | 'engine' | 'fx' }
    | { type: 'SET_VISUALS'; payload: (File | 'webcam')[] }
    | { type: 'SET_AUDIO_FILE'; payload: File | null }
    | { type: 'SET_MEDIA_ELEMENTS'; payload: MediaElement[] }
    | { type: 'SET_AUDIO_URL'; payload: string | null }
    | { type: 'SET_WEBCAM_STREAM'; payload: MediaStream | null }
    | { type: 'SET_MIC_STREAM'; payload: MediaStream | null }
    | { type: 'SET_COSMIC_INFLUENCE_ENABLED'; payload: boolean }
    | { type: 'SET_COSMIC_INFLUENCE'; payload: number }
    | { type: 'SET_SOLAR_SUBTRACTION'; payload: number }
    | { type: 'SET_PLANETARY_FOCUS'; payload: PlanetaryFocus }
    | { type: 'SET_TIME_OFFSET'; payload: number }
    | { type: 'SET_COSMIC_BLEND_MODE'; payload: CosmicBlendMode }
    | { type: 'SET_INVERSE_INFLUENCE_ENABLED'; payload: boolean }
    | { type: 'SET_ASTRO_DATA'; payload: AstroData | null }
    | { type: 'SET_EVOLUTION_ENABLED'; payload: boolean }
    | { type: 'SET_EVOLUTION_CURVE_SHAPE'; payload: EvolutionCurveShape }
    | { type: 'SET_EVOLUTION_LOOP_DURATION'; payload: number }
    | { type: 'SET_EVOLUTION_RANDOMIZATION'; payload: number }
    | { type: 'SET_BASS_SENSITIVITY'; payload: number }
    | { type: 'SET_MID_SENSITIVITY'; payload: number }
    | { type: 'SET_TREBLE_SENSITIVITY'; payload: number }
    | { type: 'SET_AUDIO_ATTACK'; payload: number }
    | { type: 'SET_AUDIO_RELEASE'; payload: number }
    | { type: 'SET_AUDIO_THRESHOLD'; payload: number }
    | { type: 'SET_AUDIO_PEAK_LIMITER'; payload: number }
    | { type: 'SET_TRANSITION_TYPE'; payload: TransitionType }
    | { type: 'SET_TRANSITION_TEMPERATURE'; payload: number }
    | { type: 'SET_TRANSITION_FREQUENCY'; payload: number }
    | { type: 'SET_VIDEO_FX_ENABLED'; payload: boolean }
    | { type: 'SET_VIDEO_PLAYBACK_SPEED'; payload: number }
    | { type: 'SET_VIDEO_REVERSED'; payload: boolean }
    | { type: 'SET_FIT_TO_WIDTH'; payload: boolean }
    | { type: 'SET_FIT_TO_HEIGHT'; payload: boolean }
    | { type: 'SET_GLOBAL_INTENSITY'; payload: number }
    | { type: 'SET_VISUAL_COMPLEXITY'; payload: number }
    | { type: 'SET_COLOR_PALETTE'; payload: string }
    | { type: 'SET_EFFECT_LAYERS'; payload: EffectLayer[] }
    | { type: 'ADD_EFFECT_LAYER'; payload: EffectLayer }
    | { type: 'REMOVE_EFFECT_LAYER'; payload: string }
    | { type: 'UPDATE_EFFECT_LAYER'; payload: { id: string, changes: Partial<EffectLayer> } }
    | { type: 'REORDER_EFFECT_LAYERS', payload: { dragIndex: number; hoverIndex: number; } }
    | { type: 'SET_SELECTED_LAYER_ID'; payload: string | null }
    | { type: 'SET_EFFECT_PARAMETERS'; payload: EffectParameters }
    | { type: 'UPDATE_EFFECT_PARAMETER'; payload: { effect: keyof EffectParameters; param: string; value: any; } }
    | { type: 'LOAD_EFFECT_PRESET'; payload: EffectPreset }
    | { type: 'SET_ACTIVE_EFFECT_PRESET_ID', payload: string }
    | { type: 'ADD_EFFECT_PRESET'; payload: EffectPreset }
    | { type: 'SET_STYLE_BLEND'; payload: Partial<{ value: number; presetAId: string; presetBId: string; }> }
    | { type: 'ADD_ENGINE_PRESET', payload: EnginePreset }
    | { type: 'LOAD_ENGINE_PRESET', payload: EnginePresetConfig }
    | { type: 'SET_ENGINE_PRESETS', payload: EnginePreset[] }
    | { type: 'SET_ACTIVE_ENGINE_PRESET_ID', payload: string }
    | { type: 'UPDATE_LFO'; payload: Partial<LFO> }
    | { type: 'UPDATE_ENVELOPE_FOLLOWER'; payload: Partial<EnvelopeFollower> };

const appReducer = (state: AppState, action: Action): AppState => {
    let customPreset = false;
    switch (action.type) {
        case 'SET_IS_PLAYING': return { ...state, isPlaying: action.payload };
        case 'SET_IS_READY': return { ...state, isReady: action.payload };
        case 'SET_IS_RECORDING': return { ...state, isRecording: action.payload };
        case 'SET_ACTIVE_TAB': return { ...state, activeTab: action.payload };
        case 'SET_VISUALS': return { ...state, visuals: action.payload };
        case 'SET_AUDIO_FILE': return { ...state, audioFile: action.payload };
        case 'SET_MEDIA_ELEMENTS': return { ...state, mediaElements: action.payload };
        case 'SET_AUDIO_URL': return { ...state, audioUrl: action.payload };
        case 'SET_WEBCAM_STREAM': return { ...state, webcamStream: action.payload };
        case 'SET_MIC_STREAM': return { ...state, micStream: action.payload };
        case 'SET_COSMIC_INFLUENCE_ENABLED': customPreset=true; return { ...state, isCosmicInfluenceEnabled: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_COSMIC_INFLUENCE': customPreset=true; return { ...state, cosmicInfluence: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_SOLAR_SUBTRACTION': customPreset=true; return { ...state, solarSubtraction: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_PLANETARY_FOCUS': customPreset=true; return { ...state, planetaryFocus: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_TIME_OFFSET': customPreset=true; return { ...state, timeOffset: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_COSMIC_BLEND_MODE': customPreset=true; return { ...state, cosmicBlendMode: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_INVERSE_INFLUENCE_ENABLED': customPreset=true; return { ...state, isInverseInfluenceEnabled: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_ASTRO_DATA': return { ...state, astroData: action.payload };
        case 'SET_EVOLUTION_ENABLED': customPreset=true; return { ...state, isEvolutionEnabled: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_EVOLUTION_CURVE_SHAPE': customPreset=true; return { ...state, evolutionCurveShape: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_EVOLUTION_LOOP_DURATION': customPreset=true; return { ...state, evolutionLoopDuration: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_EVOLUTION_RANDOMIZATION': customPreset=true; return { ...state, evolutionRandomization: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_BASS_SENSITIVITY': customPreset=true; return { ...state, bassSensitivity: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_MID_SENSITIVITY': customPreset=true; return { ...state, midSensitivity: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_TREBLE_SENSITIVITY': customPreset=true; return { ...state, trebleSensitivity: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_AUDIO_ATTACK': customPreset=true; return { ...state, audioAttack: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_AUDIO_RELEASE': customPreset=true; return { ...state, audioRelease: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_AUDIO_THRESHOLD': customPreset=true; return { ...state, audioThreshold: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_AUDIO_PEAK_LIMITER': customPreset=true; return { ...state, audioPeakLimiter: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_TRANSITION_TYPE': return { ...state, transitionType: action.payload };
        case 'SET_TRANSITION_TEMPERATURE': return { ...state, transitionTemperature: action.payload };
        case 'SET_TRANSITION_FREQUENCY': customPreset=true; return { ...state, transitionFrequency: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_VIDEO_FX_ENABLED': return { ...state, isVideoFxEnabled: action.payload };
        case 'SET_VIDEO_PLAYBACK_SPEED': return { ...state, videoPlaybackSpeed: action.payload };
        case 'SET_VIDEO_REVERSED': return { ...state, isVideoReversed: action.payload };
        case 'SET_FIT_TO_WIDTH': return { ...state, isFitToWidth: action.payload };
        case 'SET_FIT_TO_HEIGHT': return { ...state, isFitToHeight: action.payload };
        case 'SET_GLOBAL_INTENSITY': customPreset=true; return { ...state, globalIntensity: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_VISUAL_COMPLEXITY': customPreset=true; return { ...state, visualComplexity: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_COLOR_PALETTE': customPreset=true; return { ...state, colorPalette: action.payload, activeEnginePresetId: customPreset ? 'custom' : state.activeEnginePresetId };
        case 'SET_EFFECT_LAYERS': return { ...state, effectLayers: action.payload, activeEffectPresetId: 'custom' };
        case 'ADD_EFFECT_LAYER': return { ...state, effectLayers: [...state.effectLayers, action.payload], activeEffectPresetId: 'custom' };
        case 'REMOVE_EFFECT_LAYER': return { ...state, effectLayers: state.effectLayers.filter(l => l.id !== action.payload), activeEffectPresetId: 'custom' };
        case 'UPDATE_EFFECT_LAYER':
            return {
                ...state,
                effectLayers: state.effectLayers.map(l => l.id === action.payload.id ? { ...l, ...action.payload.changes } : l),
                activeEffectPresetId: 'custom'
            };
        case 'REORDER_EFFECT_LAYERS': {
            const { dragIndex, hoverIndex } = action.payload;
            const newLayers = [...state.effectLayers];
            const [draggedItem] = newLayers.splice(dragIndex, 1);
            newLayers.splice(hoverIndex, 0, draggedItem);
            return { ...state, effectLayers: newLayers, activeEffectPresetId: 'custom' };
        }
        case 'SET_SELECTED_LAYER_ID': return { ...state, selectedLayerId: action.payload };
        case 'SET_EFFECT_PARAMETERS': return { ...state, effectParameters: action.payload, activeEffectPresetId: 'custom' };
        case 'UPDATE_EFFECT_PARAMETER': {
            const { effect, param, value } = action.payload;
            return {
                ...state,
                effectParameters: {
                    ...state.effectParameters,
                    [effect]: { ...state.effectParameters[effect], [param]: value }
                },
                activeEffectPresetId: 'custom'
            };
        }
        case 'LOAD_EFFECT_PRESET':
            return { ...state, effectLayers: action.payload.layers, effectParameters: action.payload.parameters, activeEffectPresetId: action.payload.id };
        case 'SET_ACTIVE_EFFECT_PRESET_ID':
            return { ...state, activeEffectPresetId: action.payload };
        case 'ADD_EFFECT_PRESET':
            return { ...state, effectPresets: [...state.effectPresets, action.payload] };
        case 'SET_STYLE_BLEND': {
            return { ...state, ...action.payload };
        }
        case 'ADD_ENGINE_PRESET': return { ...state, enginePresets: [...state.enginePresets, action.payload] };
        case 'LOAD_ENGINE_PRESET': return { ...state, ...action.payload };
        case 'SET_ENGINE_PRESETS': return { ...state, enginePresets: action.payload };
        case 'SET_ACTIVE_ENGINE_PRESET_ID': return { ...state, activeEnginePresetId: action.payload };
        case 'UPDATE_LFO': return { ...state, lfo: { ...state.lfo, ...action.payload } };
        case 'UPDATE_ENVELOPE_FOLLOWER': return { ...state, envelopeFollower: { ...state.envelopeFollower, ...action.payload } };
        default: return state;
    }
};

type AppContextType = {
    state: AppState;
    dispatch: Dispatch<Action>;
};

const AppStateContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    return (
        <AppStateContext.Provider value={{ state, dispatch }}>
            {children}
        </AppStateContext.Provider>
    );
};

export const useAppState = (): AppContextType => {
    const context = useContext(AppStateContext);
    if (!context) {
        throw new Error('useAppState must be used within an AppProvider');
    }
    return context;
};
