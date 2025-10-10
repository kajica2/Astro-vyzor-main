import React from 'react';
// FIX: Corrected import path for useAppState.
import { useAppState } from '../context/AppStateContext';
// FIX: Corrected import path for types.
import type { PlanetaryFocus, CosmicBlendMode } from '../types';

const ControlWrapper: React.FC<{ children: React.ReactNode, title?: string, description?: string }> = ({ children, title, description }) => (
    <div>
        {children}
        {description && <p className="text-sm text-stone-500 mt-2" title={title}>{description}</p>}
    </div>
);

export const CosmicControls: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { 
        isCosmicInfluenceEnabled, cosmicInfluence, solarSubtraction, 
        planetaryFocus, timeOffset, cosmicBlendMode 
    } = state;

    const onToggle = (enabled: boolean) => dispatch({ type: 'SET_COSMIC_INFLUENCE_ENABLED', payload: enabled });
    const onInfluenceChange = (value: number) => dispatch({ type: 'SET_COSMIC_INFLUENCE', payload: value });
    const onDampeningChange = (value: number) => dispatch({ type: 'SET_SOLAR_SUBTRACTION', payload: value });
    const onFocusChange = (value: PlanetaryFocus) => dispatch({ type: 'SET_PLANETARY_FOCUS', payload: value });
    const onTimeOffsetChange = (value: number) => dispatch({ type: 'SET_TIME_OFFSET', payload: value });
    const onBlendModeChange = (value: CosmicBlendMode) => dispatch({ type: 'SET_COSMIC_BLEND_MODE', payload: value });
    
    const planetaryOptions: {value: PlanetaryFocus, label: string}[] = [
        { value: 'all', label: 'All Bodies' },
        { value: 'sun', label: 'Sun' },
        { value: 'moon', label: 'Moon' },
        { value: 'mercury', label: 'Mercury' },
        { value: 'venus', label: 'Venus' },
        { value: 'mars', label: 'Mars' },
        { value: 'jupiter', label: 'Jupiter' },
        { value: 'saturn', label: 'Saturn' },
    ];

    const blendModeOptions: {value: CosmicBlendMode, label: string}[] = [
        { value: 'multiply', label: 'Multiply' },
        { value: 'screen', label: 'Screen' },
        { value: 'overlay', label: 'Overlay' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <label htmlFor="cosmic-toggle" className="text-lg font-medium text-stone-200">Enable Celestial Data Source</label>
                <button
                    onClick={() => onToggle(!isCosmicInfluenceEnabled)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-stone-900 focus:ring-purple-500 ${isCosmicInfluenceEnabled ? 'bg-purple-600' : 'bg-stone-700'}`}
                >
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${isCosmicInfluenceEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
            
            <div className={`space-y-6 transition-opacity duration-500 ${isCosmicInfluenceEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <ControlWrapper description="Controls how strongly celestial data (e.g., planetary positions, moon phase) affects visual parameters like color, movement, and effect intensity.">
                    <label htmlFor="influence-slider" className="block text-lg font-medium text-stone-200 mb-2">
                        Cosmic Influence: <span className="font-bold text-purple-400">{(cosmicInfluence * 100).toFixed(0)}%</span>
                    </label>
                    <input
                        id="influence-slider"
                        type="range" min="0" max="1" step="0.01" value={cosmicInfluence}
                        onChange={(e) => onInfluenceChange(parseFloat(e.target.value))}
                        disabled={!isCosmicInfluenceEnabled}
                        className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                </ControlWrapper>

                <ControlWrapper description="Reduces the overall cosmic influence, acting as a fine-tuning control to temper the effects.">
                    <label htmlFor="dampening-slider" className="block text-lg font-medium text-stone-200 mb-2">
                        Dampening Factor: <span className="font-bold text-yellow-400">{(solarSubtraction * 100).toFixed(0)}%</span>
                    </label>
                    <input
                        id="dampening-slider"
                        type="range" min="0" max="1" step="0.01" value={solarSubtraction}
                        onChange={(e) => onDampeningChange(parseFloat(e.target.value))}
                        disabled={!isCosmicInfluenceEnabled}
                        className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                    />
                </ControlWrapper>
                
                <ControlWrapper description="Isolate the influence of a specific celestial body or use all combined data.">
                     <label htmlFor="planetary-focus-select" className="block text-lg font-medium text-stone-200 mb-2">Planetary Focus</label>
                     <select id="planetary-focus-select" value={planetaryFocus} onChange={e => onFocusChange(e.target.value as PlanetaryFocus)} disabled={!isCosmicInfluenceEnabled}
                        className="w-full bg-stone-800 border border-stone-700 text-stone-200 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition">
                         {planetaryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                     </select>
                </ControlWrapper>

                <ControlWrapper description="Shift the astrological data in time to explore different cosmic configurations.">
                     <label htmlFor="time-offset-slider" className="block text-lg font-medium text-stone-200 mb-2">
                        Time Offset: <span className="font-bold text-cyan-400">{timeOffset.toFixed(1)} hours</span>
                     </label>
                     <input id="time-offset-slider" type="range" min="-24" max="24" step="0.5" value={timeOffset}
                        onChange={e => onTimeOffsetChange(parseFloat(e.target.value))} disabled={!isCosmicInfluenceEnabled}
                        className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                     />
                </ControlWrapper>
                
                 <ControlWrapper description="Determines the mathematical method for combining cosmic data with visual properties. (Visual effect is experimental).">
                     <label htmlFor="blend-mode-select" className="block text-lg font-medium text-stone-200 mb-2">Blend Mode</label>
                     <select id="blend-mode-select" value={cosmicBlendMode} onChange={e => onBlendModeChange(e.target.value as CosmicBlendMode)} disabled={!isCosmicInfluenceEnabled}
                        className="w-full bg-stone-800 border border-stone-700 text-stone-200 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition">
                         {blendModeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                     </select>
                </ControlWrapper>
            </div>
        </div>
    );
};