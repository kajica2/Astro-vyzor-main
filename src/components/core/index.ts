// Core reusable visualization components
export { VisualizationEngine } from './VisualizationEngine';
export type { VisualizationEngineHandle } from './VisualizationEngine';

export { HeadlessRecorder, createStandaloneRecorder } from './HeadlessRecorder';
export type { HeadlessRecorderHandle } from './HeadlessRecorder';

export { CanvasRenderer, StandaloneCanvasRenderer } from './CanvasRenderer';
export type { CanvasRendererHandle } from './CanvasRenderer';

export { AudioProcessor, StandaloneAudioProcessor } from './AudioProcessor';
export type { AudioProcessorHandle } from './AudioProcessor';

export { EffectPipeline, StandaloneEffectPipeline, createCustomEffect, CUSTOM_EFFECTS } from './EffectPipeline';
export type { EffectPipelineHandle } from './EffectPipeline';

export { PresetManager, StandalonePresetManager } from './PresetManager';
export type { PresetManagerHandle, Preset } from './PresetManager';

// Re-export types for convenience
export type {
    Resolution,
    VisualizationConfig,
    RecordingConfig,
    AudioAnalysisData,
    RenderFrame,
    VisualizationCallback,
    VisualizationEngineProps,
    RecorderProps,
    CanvasRendererProps,
    AudioProcessorProps,
    EffectFunction,
    EffectDefinition
} from '../../types/visualization';

export { RESOLUTIONS } from '../../types/visualization';