import React, { useState } from 'react';
import { useAppState } from '../context/AppStateContext';

const ControlSlider: React.FC<{ label: string, value: number, onChange: (v: number) => void, min?: number, max?: number, step?: number, colorClass?: string }> = 
({ label, value, onChange, min = 0, max = 1, step = 0.01, colorClass = 'accent-purple-500' }) => (
    <div>
        <label className="text-xs text-stone-300 flex justify-between">
            <span>{label}</span>
            <span className="font-mono">{(value * 100).toFixed(0)}%</span>
        </label>
        <input
            type="range" min={min} max={max} step={step} value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className={`w-full h-1.5 bg-stone-700/50 rounded-lg appearance-none cursor-pointer ${colorClass}`}
        />
    </div>
);

export const PerformancePanel: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { globalIntensity, cosmicInfluence, visualComplexity } = state;
    const [isOpen, setIsOpen] = useState(true);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="absolute bottom-4 right-4 bg-black/60 text-white px-4 py-2 rounded-lg backdrop-blur-sm hover:bg-white/20 transition-colors z-20"
            >
                Show Controls
            </button>
        );
    }

    return (
        <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md text-white p-4 rounded-xl z-20 w-64 border border-stone-700/50">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold">Live Kontrols</h3>
                <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-white">&times;</button>
            </div>
            <div className="space-y-3">
                <ControlSlider 
                    label="Global Intensity"
                    value={globalIntensity}
                    onChange={v => dispatch({type: 'SET_GLOBAL_INTENSITY', payload: v})}
                    min={0} max={2}
                    colorClass="accent-red-500"
                />
                <ControlSlider 
                    label="Cosmic Influence"
                    value={cosmicInfluence}
                    onChange={v => dispatch({type: 'SET_COSMIC_INFLUENCE', payload: v})}
                    colorClass="accent-purple-500"
                />
                <ControlSlider 
                    label="Visual Complexity"
                    value={visualComplexity}
                    onChange={v => dispatch({type: 'SET_VISUAL_COMPLEXITY', payload: v})}
                    colorClass="accent-cyan-500"
                />
            </div>
        </div>
    );
};
