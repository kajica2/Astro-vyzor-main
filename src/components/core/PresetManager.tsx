import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { VisualizationConfig } from '../../types/visualization';
import { RESOLUTIONS } from '../../types/visualization';
import { FFT_SIZE } from '../../../constants';

export interface Preset {
    id: string;
    name: string;
    description?: string;
    config: VisualizationConfig;
    thumbnail?: string;
    tags?: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface PresetManagerHandle {
    savePreset: (name: string, config: VisualizationConfig, description?: string) => Preset;
    loadPreset: (presetId: string) => VisualizationConfig | null;
    deletePreset: (presetId: string) => boolean;
    updatePreset: (presetId: string, updates: Partial<Preset>) => boolean;
    getPresets: () => Preset[];
    exportPreset: (presetId: string) => string | null;
    importPreset: (jsonString: string) => Preset | null;
    getDefaultPresets: () => Preset[];
}

interface PresetManagerProps {
    onPresetChange?: (preset: Preset) => void;
    storageKey?: string;
}

export const PresetManager = forwardRef<PresetManagerHandle, PresetManagerProps>(
    ({ onPresetChange, storageKey = 'visualization-presets' }, ref) => {
        const [presets, setPresets] = useState<Preset[]>(() => {
            // Load presets from localStorage on init
            try {
                const stored = localStorage.getItem(storageKey);
                if (stored) {
                    return JSON.parse(stored);
                }
            } catch (error) {
                console.error('Failed to load presets from storage:', error);
            }
            return getDefaultPresets();
        });

        // Save presets to localStorage whenever they change
        const saveToStorage = useCallback((updatedPresets: Preset[]) => {
            try {
                localStorage.setItem(storageKey, JSON.stringify(updatedPresets));
            } catch (error) {
                console.error('Failed to save presets to storage:', error);
            }
        }, [storageKey]);

        const savePreset = useCallback((
            name: string,
            config: VisualizationConfig,
            description?: string
        ): Preset => {
            const preset: Preset = {
                id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name,
                description,
                config,
                tags: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const updatedPresets = [...presets, preset];
            setPresets(updatedPresets);
            saveToStorage(updatedPresets);

            if (onPresetChange) {
                onPresetChange(preset);
            }

            return preset;
        }, [presets, saveToStorage, onPresetChange]);

        const loadPreset = useCallback((presetId: string): VisualizationConfig | null => {
            const preset = presets.find(p => p.id === presetId);
            if (preset) {
                if (onPresetChange) {
                    onPresetChange(preset);
                }
                return preset.config;
            }
            return null;
        }, [presets, onPresetChange]);

        const deletePreset = useCallback((presetId: string): boolean => {
            const index = presets.findIndex(p => p.id === presetId);
            if (index !== -1) {
                const updatedPresets = presets.filter(p => p.id !== presetId);
                setPresets(updatedPresets);
                saveToStorage(updatedPresets);
                return true;
            }
            return false;
        }, [presets, saveToStorage]);

        const updatePreset = useCallback((presetId: string, updates: Partial<Preset>): boolean => {
            const index = presets.findIndex(p => p.id === presetId);
            if (index !== -1) {
                const updatedPreset = {
                    ...presets[index],
                    ...updates,
                    updatedAt: new Date()
                };
                const updatedPresets = [...presets];
                updatedPresets[index] = updatedPreset;
                setPresets(updatedPresets);
                saveToStorage(updatedPresets);

                if (onPresetChange) {
                    onPresetChange(updatedPreset);
                }
                return true;
            }
            return false;
        }, [presets, saveToStorage, onPresetChange]);

        const getPresets = useCallback((): Preset[] => {
            return presets;
        }, [presets]);

        const exportPreset = useCallback((presetId: string): string | null => {
            const preset = presets.find(p => p.id === presetId);
            if (preset) {
                return JSON.stringify(preset, null, 2);
            }
            return null;
        }, [presets]);

        const importPreset = useCallback((jsonString: string): Preset | null => {
            try {
                const imported = JSON.parse(jsonString);

                // Validate the imported preset structure
                if (!imported.name || !imported.config) {
                    throw new Error('Invalid preset format');
                }

                // Generate new ID to avoid conflicts
                const preset: Preset = {
                    ...imported,
                    id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    createdAt: new Date(imported.createdAt || Date.now()),
                    updatedAt: new Date()
                };

                const updatedPresets = [...presets, preset];
                setPresets(updatedPresets);
                saveToStorage(updatedPresets);

                if (onPresetChange) {
                    onPresetChange(preset);
                }

                return preset;
            } catch (error) {
                console.error('Failed to import preset:', error);
                return null;
            }
        }, [presets, saveToStorage, onPresetChange]);

        const getDefaultPresets = useCallback(() => {
            return defaultPresets;
        }, []);

        useImperativeHandle(ref, () => ({
            savePreset,
            loadPreset,
            deletePreset,
            updatePreset,
            getPresets,
            exportPreset,
            importPreset,
            getDefaultPresets
        }), [
            savePreset,
            loadPreset,
            deletePreset,
            updatePreset,
            getPresets,
            exportPreset,
            importPreset,
            getDefaultPresets
        ]);

        return null; // Headless component
    }
);

PresetManager.displayName = 'PresetManager';

// Default presets
function getDefaultPresets(): Preset[] {
    const baseConfig: VisualizationConfig = {
        resolution: RESOLUTIONS['720p'],
        framerate: 60,
        backgroundColor: '#000000',
        mediaElements: [],
        audioSource: null,
        audioConfig: {
            fftSize: FFT_SIZE,
            bassSensitivity: 0.7,
            midSensitivity: 0.6,
            trebleSensitivity: 0.5,
            audioAttack: 0.8,
            audioRelease: 0.7,
            audioThreshold: 0.05,
            audioPeakLimiter: 0.95,
            smoothing: 0.8
        },
        effectsConfig: {
            layers: [],
            parameters: {
                grid: { size: 50, lineWidth: 2 },
                glitch_slice: { intensity: 0.5, amount: 5, type: 'slice', direction: 'horizontal' },
                pixelate: { blockSize: 10 },
                rgb_shift: { intensity: 0.7, amount: 20, frequency: 'mids' },
                kaleidoscope: { segments: 6, rotationSpeed: 0.5 },
                bloom: { intensity: 1.2, blurSize: 30 },
                color_grading: { hue: 0, saturation: 1, contrast: 1 },
                liquid_dream: { intensity: 10, speed: 1, grain: 0.1 }
            },
            globalIntensity: 1.0,
            visualComplexity: 0.5
        },
        transitionConfig: {
            type: 'cross-dissolve',
            temperature: 0.5,
            frequency: 0.15,
            duration: 1000
        },
        evolutionConfig: {
            enabled: true,
            curveShape: 'linear',
            loopDuration: 0,
            randomization: 0.1
        },
        modulationConfig: {
            lfo: {
                id: 'lfo1',
                shape: 'sine',
                rate: 0.5,
                amount: 0.3,
                target: 'globalIntensity'
            },
            envelopeFollower: {
                id: 'env1',
                source: 'bass',
                amount: 0.4,
                target: 'visualComplexity'
            }
        },
        videoConfig: {
            enabled: true,
            playbackSpeed: 1.0,
            reversed: false,
            fitToWidth: false,
            fitToHeight: false
        },
        colorConfig: {
            palette: 'default',
            customColors: []
        }
    };

    return [
        {
            id: 'preset-minimal',
            name: 'Minimal',
            description: 'Clean, minimal visualization with subtle effects',
            config: {
                ...baseConfig,
                effectsConfig: {
                    ...baseConfig.effectsConfig,
                    layers: [
                        {
                            id: 'bloom-minimal',
                            name: 'Soft Bloom',
                            effectType: 'bloom',
                            triggerSource: 'audio_bass_beat',
                            blendMode: 'screen',
                            opacity: 0.3,
                            isSolo: false,
                            isMuted: false
                        }
                    ],
                    visualComplexity: 0.2
                }
            },
            tags: ['minimal', 'clean', 'subtle'],
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: 'preset-energetic',
            name: 'Energetic',
            description: 'High energy visualization with reactive effects',
            config: {
                ...baseConfig,
                effectsConfig: {
                    ...baseConfig.effectsConfig,
                    layers: [
                        {
                            id: 'bloom-energy',
                            name: 'Power Bloom',
                            effectType: 'bloom',
                            triggerSource: 'audio_bass_beat',
                            blendMode: 'screen',
                            opacity: 0.8,
                            isSolo: false,
                            isMuted: false
                        },
                        {
                            id: 'rgb-energy',
                            name: 'RGB Pulse',
                            effectType: 'rgb_shift',
                            triggerSource: 'audio_mids_beat',
                            blendMode: 'normal',
                            opacity: 0.6,
                            isSolo: false,
                            isMuted: false
                        },
                        {
                            id: 'glitch-energy',
                            name: 'Glitch',
                            effectType: 'glitch_slice',
                            triggerSource: 'audio_treble_beat',
                            blendMode: 'normal',
                            opacity: 0.4,
                            isSolo: false,
                            isMuted: false
                        }
                    ],
                    visualComplexity: 0.8
                },
                audioConfig: {
                    ...baseConfig.audioConfig,
                    bassSensitivity: 0.9,
                    midSensitivity: 0.8,
                    trebleSensitivity: 0.7
                }
            },
            tags: ['energetic', 'intense', 'reactive'],
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: 'preset-psychedelic',
            name: 'Psychedelic',
            description: 'Trippy visualization with kaleidoscope and color effects',
            config: {
                ...baseConfig,
                effectsConfig: {
                    ...baseConfig.effectsConfig,
                    layers: [
                        {
                            id: 'kaleidoscope-psyche',
                            name: 'Kaleidoscope',
                            effectType: 'kaleidoscope',
                            triggerSource: 'evolution',
                            blendMode: 'normal',
                            opacity: 0.7,
                            isSolo: false,
                            isMuted: false
                        },
                        {
                            id: 'liquid-psyche',
                            name: 'Liquid Dream',
                            effectType: 'liquid_dream',
                            triggerSource: 'audio_overall_envelope',
                            blendMode: 'overlay',
                            opacity: 0.5,
                            isSolo: false,
                            isMuted: false
                        }
                    ],
                    parameters: {
                        ...baseConfig.effectsConfig.parameters,
                        kaleidoscope: { segments: 12, rotationSpeed: 1.0 },
                        liquid_dream: { intensity: 20, speed: 2, grain: 0.2 }
                    },
                    visualComplexity: 0.9
                },
                evolutionConfig: {
                    ...baseConfig.evolutionConfig,
                    enabled: true,
                    curveShape: 'bell',
                    randomization: 0.3
                }
            },
            tags: ['psychedelic', 'trippy', 'colorful'],
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];
}

// Standalone preset manager class
export class StandalonePresetManager {
    private presets: Map<string, Preset> = new Map();
    private storageKey: string;

    constructor(storageKey: string = 'visualization-presets') {
        this.storageKey = storageKey;
        this.loadFromStorage();
    }

    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const presetArray = JSON.parse(stored);
                presetArray.forEach((preset: Preset) => {
                    this.presets.set(preset.id, preset);
                });
            } else {
                // Load default presets
                getDefaultPresets().forEach(preset => {
                    this.presets.set(preset.id, preset);
                });
            }
        } catch (error) {
            console.error('Failed to load presets:', error);
        }
    }

    private saveToStorage(): void {
        try {
            const presetArray = Array.from(this.presets.values());
            localStorage.setItem(this.storageKey, JSON.stringify(presetArray));
        } catch (error) {
            console.error('Failed to save presets:', error);
        }
    }

    savePreset(name: string, config: VisualizationConfig, description?: string): Preset {
        const preset: Preset = {
            id: `preset-${Date.now()}`,
            name,
            description,
            config,
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.presets.set(preset.id, preset);
        this.saveToStorage();
        return preset;
    }

    loadPreset(presetId: string): VisualizationConfig | null {
        const preset = this.presets.get(presetId);
        return preset ? preset.config : null;
    }

    deletePreset(presetId: string): boolean {
        const deleted = this.presets.delete(presetId);
        if (deleted) {
            this.saveToStorage();
        }
        return deleted;
    }

    getPresets(): Preset[] {
        return Array.from(this.presets.values());
    }

    exportPreset(presetId: string): string | null {
        const preset = this.presets.get(presetId);
        return preset ? JSON.stringify(preset, null, 2) : null;
    }

    importPreset(jsonString: string): Preset | null {
        try {
            const preset = JSON.parse(jsonString);
            preset.id = `preset-${Date.now()}`;
            preset.updatedAt = new Date();

            this.presets.set(preset.id, preset);
            this.saveToStorage();
            return preset;
        } catch (error) {
            console.error('Failed to import preset:', error);
            return null;
        }
    }
}