


import React from 'react';
// FIX: Corrected import path for useAppState.
import { useAppState } from '../context/AppStateContext';

const ControlSlider: React.FC<{ label: string, description: string, value: number, onChange: (v: number) => void, colorClass?: string }> = 
({ label, description, value, onChange, colorClass = 'accent-green-500' }) => (
    <div>
        <label className="block text-lg font-medium text-stone-200 mb-2">
            {label}: <span className="font-bold text-green-400">{(value * 100).toFixed(0)}%</span>
        </label>
        <input
            type="range" min="0" max="1" step="0.01" value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className={`w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer ${colorClass}`}
        />
        <p className="text-sm text-stone-500 mt-2">{description}</p>
    </div>
);

export const AudioControls: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { 
        bassSensitivity, midSensitivity, trebleSensitivity,
        audioAttack, audioRelease, audioThreshold, audioPeakLimiter,
        transitionFrequency
    } = state;

    return (
        <div className="space-y-8">
            <div>
                <h4 className="text-xl font-semibold text-stone-300 mb-4 border-b border-stone-700 pb-2">Frequency Response</h4>
                <div className="space-y-4">
                    <ControlSlider label="Bass Response" description="Controls beat detection sensitivity for low frequencies (e.g., kick drums). Higher values make effects trigger more easily." value={bassSensitivity} onChange={v => dispatch({type: 'SET_BASS_SENSITIVITY', payload: v})} />
                    <ControlSlider label="Mid Response" description="Controls beat detection sensitivity for mid-range frequencies (e.g., vocals). Higher values make effects trigger more easily." value={midSensitivity} onChange={v => dispatch({type: 'SET_MID_SENSITIVITY', payload: v})} />
                    <ControlSlider label="Treble Response" description="Controls beat detection sensitivity for high frequencies (e.g., hi-hats). Higher values make effects trigger more easily." value={trebleSensitivity} onChange={v => dispatch({type: 'SET_TREBLE_SENSITIVITY', payload: v})} />
                </div>
            </div>
             <div>
                <h4 className="text-xl font-semibold text-stone-300 mb-4 border-b border-stone-700 pb-2">Dynamics</h4>
                <div className="space-y-4">
                    <ControlSlider label="Attack" description="How quickly visual effects react to a new sound. Higher is faster." value={audioAttack} onChange={v => dispatch({type: 'SET_AUDIO_ATTACK', payload: v})} />
                    <ControlSlider label="Release" description="How quickly visual effects fade after a sound ends. Higher is faster." value={audioRelease} onChange={v => dispatch({type: 'SET_AUDIO_RELEASE', payload: v})} />
                    <ControlSlider label="Threshold Gate" description="The minimum audio level required to trigger any visual response." value={audioThreshold} onChange={v => dispatch({type: 'SET_AUDIO_THRESHOLD', payload: v})} />
                    <ControlSlider label="Peak Limiter" description="Caps the maximum audio input to prevent overwhelming visuals during loud sections." value={audioPeakLimiter} onChange={v => dispatch({type: 'SET_AUDIO_PEAK_LIMITER', payload: v})} />
                </div>
            </div>
            <div>
                <h4 className="text-xl font-semibold text-stone-300 mb-4 border-b border-stone-700 pb-2">Pacing</h4>
                <div className="space-y-4">
                    <ControlSlider 
                        label="Transition Frequency" 
                        description="Controls how often a detected beat will trigger a visual transition. 0 is never, 1 is always." 
                        value={transitionFrequency} 
                        onChange={v => dispatch({type: 'SET_TRANSITION_FREQUENCY', payload: v})}
                        colorClass="accent-orange-500"
                    />
                </div>
            </div>
        </div>
    );
};