import React from 'react';
// FIX: Corrected import path for useAppState.
import { useAppState } from '../context/AppStateContext';
// FIX: Corrected import path for EvolutionCurveShape type.
import type { EvolutionCurveShape } from '../types';

const CurveButton: React.FC<{ shape: EvolutionCurveShape, activeShape: EvolutionCurveShape, onClick: (shape: EvolutionCurveShape) => void, children: React.ReactNode, title: string }> = 
({ shape, activeShape, onClick, children, title }) => (
    <button title={title} onClick={() => onClick(shape)}
        className={`flex-1 p-2 rounded-lg transition-colors border-2 ${activeShape === shape ? 'bg-pink-500/30 border-pink-500' : 'bg-stone-700/50 border-transparent hover:border-pink-500/50'}`}>
        {children}
    </button>
);

const LinearIcon = () => <svg viewBox="0 0 24 24" className="w-8 h-8 mx-auto" stroke="currentColor" strokeWidth="2" fill="none"><path d="M4 20 L20 4" /></svg>;
const ExponentialIcon = () => <svg viewBox="0 0 24 24" className="w-8 h-8 mx-auto" stroke="currentColor" strokeWidth="2" fill="none"><path d="M4 20 Q 12 20 20 4" /></svg>;
const LogarithmicIcon = () => <svg viewBox="0 0 24 24" className="w-8 h-8 mx-auto" stroke="currentColor" strokeWidth="2" fill="none"><path d="M4 20 Q 12 4 20 4" /></svg>;
const BellIcon = () => <svg viewBox="0 0 24 24" className="w-8 h-8 mx-auto" stroke="currentColor" strokeWidth="2" fill="none"><path d="M4 12 Q 12 4 20 12" /></svg>;


export const EvolutionControls: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { isEvolutionEnabled, evolutionCurveShape, evolutionLoopDuration, evolutionRandomization } = state;

    const onToggle = (enabled: boolean) => dispatch({ type: 'SET_EVOLUTION_ENABLED', payload: enabled });
    const onCurveShapeChange = (shape: EvolutionCurveShape) => dispatch({ type: 'SET_EVOLUTION_CURVE_SHAPE', payload: shape });
    const onLoopDurationChange = (value: number) => dispatch({ type: 'SET_EVOLUTION_LOOP_DURATION', payload: value });
    const onRandomizationChange = (value: number) => dispatch({ type: 'SET_EVOLUTION_RANDOMIZATION', payload: value });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <label htmlFor="evolution-toggle" className="text-lg font-medium text-stone-200">Enable Effect Evolution</label>
                <button
                    onClick={() => onToggle(!isEvolutionEnabled)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-stone-900 focus:ring-pink-500 ${isEvolutionEnabled ? 'bg-pink-600' : 'bg-stone-700'}`}
                >
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${isEvolutionEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
            
            <div className={`space-y-6 transition-opacity duration-500 ${isEvolutionEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div>
                    <label className="block text-lg font-medium text-stone-200 mb-2">Evolution Curve</label>
                    <div className="flex gap-2 text-pink-300">
                        <CurveButton shape="linear" activeShape={evolutionCurveShape} onClick={onCurveShapeChange} title="Linear: Steady progression."><LinearIcon /></CurveButton>
                        <CurveButton shape="exponential" activeShape={evolutionCurveShape} onClick={onCurveShapeChange} title="Exponential: Slow start, intense end."><ExponentialIcon /></CurveButton>
                        <CurveButton shape="logarithmic" activeShape={evolutionCurveShape} onClick={onCurveShapeChange} title="Logarithmic: Intense start, mellow end."><LogarithmicIcon /></CurveButton>
                        <CurveButton shape="bell" activeShape={evolutionCurveShape} onClick={onCurveShapeChange} title="Bell: Peaks in the middle."><BellIcon /></CurveButton>
                    </div>
                    <p className="text-sm text-stone-500 mt-2">Controls the pacing of effects' intensity over the track's duration.</p>
                </div>

                <div>
                    <label htmlFor="loop-duration-slider" className="block text-lg font-medium text-stone-200 mb-2">
                        Loop Duration: <span className="font-bold text-pink-400">{evolutionLoopDuration === 0 ? 'Full Track' : `${evolutionLoopDuration}s`}</span>
                    </label>
                    <input
                        id="loop-duration-slider"
                        type="range" min="0" max="120" step="5" value={evolutionLoopDuration}
                        onChange={(e) => onLoopDurationChange(parseInt(e.target.value, 10))}
                        disabled={!isEvolutionEnabled}
                        className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                    />
                    <p className="text-sm text-stone-500 mt-2">Set a custom loop time for the evolution cycle. 0 uses the full audio duration.</p>
                </div>
                
                <div>
                    <label htmlFor="randomization-slider" className="block text-lg font-medium text-stone-200 mb-2">
                        Randomization: <span className="font-bold text-pink-400">{(evolutionRandomization * 100).toFixed(0)}%</span>
                    </label>
                    <input
                        id="randomization-slider"
                        type="range" min="0" max="1" step="0.01" value={evolutionRandomization}
                        onChange={(e) => onRandomizationChange(parseFloat(e.target.value))}
                        disabled={!isEvolutionEnabled}
                        className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                    />
                    <p className="text-sm text-stone-500 mt-2">Adds organic, random variations to the evolution curve.</p>
                </div>
            </div>
        </div>
    );
};