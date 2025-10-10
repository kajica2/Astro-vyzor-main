import React from 'react';
// FIX: Corrected import path for useAppState.
import { useAppState } from '../context/AppStateContext';

export const InverseCosmicControls: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { isInverseInfluenceEnabled, isCosmicInfluenceEnabled } = state;

    const onToggle = (enabled: boolean) => dispatch({ type: 'SET_INVERSE_INFLUENCE_ENABLED', payload: enabled });

    return (
        <div className={`mt-6 transition-opacity duration-500 ${!isCosmicInfluenceEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between">
                <label htmlFor="inverse-cosmic-toggle" className="text-lg font-medium text-stone-200">Enable Inverse Influence</label>
                <button
                    onClick={() => onToggle(!isInverseInfluenceEnabled)}
                    disabled={!isCosmicInfluenceEnabled}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-stone-900 focus:ring-blue-500 ${isInverseInfluenceEnabled ? 'bg-blue-600' : 'bg-stone-700'}`}
                >
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${isInverseInfluenceEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
             <p className="text-sm text-stone-500 mt-2">Inverts the cosmic influence slider. High values will mean less effect.</p>
        </div>
    );
};