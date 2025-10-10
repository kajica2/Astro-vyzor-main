import React from 'react';
// FIX: Corrected import path for useAppState.
import { useAppState } from '../context/AppStateContext';
import { COLOR_PALETTES } from '../constants';
// FIX: Corrected import path for EnginePreset type.
import type { EnginePreset } from '../types';

export const VisualOutputControls: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { 
        globalIntensity, visualComplexity, colorPalette, 
        enginePresets, activeEnginePresetId 
    } = state;

    const getComplexityDescription = (c: number): string => {
        if (c < 0.2) return "Minimal";
        if (c < 0.4) return "Simple";
        if (c < 0.6) return "Detailed";
        if (c < 0.8) return "Complex";
        return "Chaotic";
    };

    const handleSavePreset = () => {
        const name = window.prompt("Enter a name for your new Engine preset:");
        if (!name || name.trim() === '') return;

        const {
            isCosmicInfluenceEnabled, cosmicInfluence, solarSubtraction, planetaryFocus, timeOffset, cosmicBlendMode,
            isEvolutionEnabled, evolutionCurveShape, evolutionLoopDuration, evolutionRandomization,
            bassSensitivity, midSensitivity, trebleSensitivity, audioAttack, audioRelease, audioThreshold, audioPeakLimiter,
            transitionFrequency, globalIntensity, visualComplexity, colorPalette
        } = state;

        const newPreset: EnginePreset = {
            id: `engine_${Date.now()}`,
            name: name.trim(),
            config: {
                isCosmicInfluenceEnabled, cosmicInfluence, solarSubtraction, planetaryFocus, timeOffset, cosmicBlendMode,
                isEvolutionEnabled, evolutionCurveShape, evolutionLoopDuration, evolutionRandomization,
                bassSensitivity, midSensitivity, trebleSensitivity, audioAttack, audioRelease, audioThreshold, audioPeakLimiter,
                transitionFrequency, globalIntensity, visualComplexity, colorPalette
            }
        };

        dispatch({ type: 'ADD_ENGINE_PRESET', payload: newPreset });
        dispatch({ type: 'SET_ACTIVE_ENGINE_PRESET_ID', payload: newPreset.id });
    };

    const handleLoadPreset = (presetId: string) => {
        const preset = enginePresets.find(p => p.id === presetId);
        if (preset) {
            dispatch({ type: 'LOAD_ENGINE_PRESET', payload: preset.config });
            dispatch({ type: 'SET_ACTIVE_ENGINE_PRESET_ID', payload: preset.id });
        }
    };

    const handleDeletePreset = () => {
        const isCustom = activeEnginePresetId.startsWith('engine_');
        if (activeEnginePresetId === 'default' || !isCustom) {
            alert("Cannot delete default or non-custom presets.");
            return;
        }

        if (window.confirm("Are you sure you want to delete this preset?")) {
            const newPresets = state.enginePresets.filter(p => p.id !== activeEnginePresetId);
            dispatch({ type: 'SET_ENGINE_PRESETS', payload: newPresets });
            
            const defaultPreset = newPresets.find(p => p.id === 'default') || (newPresets.length > 0 ? newPresets[0] : null);
            if (defaultPreset) {
                handleLoadPreset(defaultPreset.id);
            }
        }
    };


    return (
        <div className="space-y-6">
            <div>
                 <label htmlFor="engine-preset-selector" className="block text-lg font-medium text-stone-200 mb-2">
                    Engine Presets
                </label>
                <div className="flex gap-2">
                    <select
                        id="engine-preset-selector"
                        value={activeEnginePresetId}
                        onChange={(e) => handleLoadPreset(e.target.value)}
                        className="flex-grow w-full bg-stone-800 border border-stone-700 text-stone-200 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                    >
                        {activeEnginePresetId === 'custom' && <option value="custom">Custom (Unsaved)</option>}
                        {enginePresets.map(preset => (
                            <option key={preset.id} value={preset.id}>
                                {preset.name}
                            </option>
                        ))}
                    </select>
                    <button onClick={handleSavePreset} className="px-4 py-2 text-sm font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors">
                        Save As New...
                    </button>
                    <button 
                        onClick={handleDeletePreset} 
                        disabled={!activeEnginePresetId.startsWith('engine_')}
                        title="Delete selected custom preset"
                        className="p-3 text-sm font-semibold rounded-lg bg-red-800/70 hover:bg-red-700 disabled:bg-stone-800 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
                <p className="text-sm text-stone-500 mt-2">Save or load the entire configuration of the Engine tab.</p>
            </div>


            <div>
                <label htmlFor="intensity-slider" className="block text-lg font-medium text-stone-200 mb-2">
                    Global Intensity Multiplier: <span className="font-bold text-red-400">{(globalIntensity * 100).toFixed(0)}%</span>
                </label>
                <input
                    id="intensity-slider"
                    type="range" min="0" max="2" step="0.01" value={globalIntensity}
                    onChange={(e) => dispatch({type: 'SET_GLOBAL_INTENSITY', payload: parseFloat(e.target.value)})}
                    className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
                <p className="text-sm text-stone-500 mt-2">A master control that scales the strength of all visual effects.</p>
            </div>
            
            <div>
                <label htmlFor="complexity-slider" className="block text-lg font-medium text-stone-200 mb-2">
                    Visual Complexity: <span className="font-bold text-red-400">{getComplexityDescription(visualComplexity)}</span>
                </label>
                <input
                    id="complexity-slider"
                    type="range" min="0" max="1" step="0.01" value={visualComplexity}
                    onChange={(e) => dispatch({type: 'SET_VISUAL_COMPLEXITY', payload: parseFloat(e.target.value)})}
                    className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
                <p className="text-sm text-stone-500 mt-2">Influences the level of detail in generated patterns, like particle counts and grid density.</p>
            </div>
            
            <div>
                 <label htmlFor="palette-selector" className="block text-lg font-medium text-stone-200 mb-2">
                    Color Palette
                </label>
                <select
                    id="palette-selector"
                    value={colorPalette}
                    onChange={(e) => dispatch({type: 'SET_COLOR_PALETTE', payload: e.target.value})}
                    className="w-full bg-stone-800 border border-stone-700 text-stone-200 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                >
                    <option value="astrological">Astrological (Default)</option>
                    {Object.keys(COLOR_PALETTES).map(paletteName => (
                         <option key={paletteName} value={paletteName}>{paletteName}</option>
                    ))}
                </select>
                 <p className="text-sm text-stone-500 mt-2">Overrides the default color scheme derived from celestial data.</p>
            </div>
        </div>
    );
};