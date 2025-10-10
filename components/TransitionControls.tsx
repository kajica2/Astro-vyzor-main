import React from 'react';
// FIX: Corrected import path for types.
import type { TransitionType, TransitionDefinition } from '../types';
import { TRANSITION_DEFINITIONS } from '../constants';
// FIX: Corrected import path for useAppState.
import { useAppState } from '../context/AppStateContext';

export const TransitionControls: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { transitionTemperature, transitionType } = state;

    const onTemperatureChange = (value: number) => dispatch({ type: 'SET_TRANSITION_TEMPERATURE', payload: value });
    const onTypeChange = (type: TransitionType) => dispatch({ type: 'SET_TRANSITION_TYPE', payload: type });
    
    const getTempDescription = (t: number): string => {
        if (t < 0.2) return "Very Slow";
        if (t < 0.4) return "Slow";
        if (t < 0.6) return "Moderate";
        if (t < 0.8) return "Fast";
        return "Very Fast";
    };

    const groupedTransitions = TRANSITION_DEFINITIONS.reduce((acc, t) => {
        if (!acc[t.category]) {
            acc[t.category] = [];
        }
        acc[t.category].push(t);
        return acc;
    }, {} as Record<string, TransitionDefinition[]>);


    return (
        <div className="space-y-6">
            <div>
                <label htmlFor="transition-type-select" className="block text-lg font-medium text-stone-200 mb-2">
                    Transition Type
                </label>
                <select
                    id="transition-type-select"
                    value={transitionType}
                    onChange={(e) => onTypeChange(e.target.value as TransitionType)}
                    className="w-full bg-stone-800 border border-stone-700 text-stone-200 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                >
                    {Object.entries(groupedTransitions).map(([category, transitions]) => (
                        <optgroup key={category} label={category}>
                            {transitions.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="temperature-slider" className="block text-lg font-medium text-stone-200 mb-2">
                    Transition Speed: <span className="font-bold text-orange-400">{getTempDescription(transitionTemperature)}</span>
                </label>
                <input
                    id="temperature-slider"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={transitionTemperature}
                    onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                 <p className="text-sm text-stone-500 mt-2">Controls the duration of transitions between visuals. Higher values are faster.</p>
            </div>
        </div>
    );
};