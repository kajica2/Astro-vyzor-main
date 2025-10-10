import React from 'react';
import { useAppState } from '../../context/AppStateContext';
import { MODULATABLE_PARAMS } from '../../types';
import type { ModulatableParam, LFO_Shape } from '../../types';

const ControlSlider: React.FC<{ label: string, value: number, onChange: (v: number) => void, min?: number, max?: number, step?: number }> = 
({ label, value, onChange, min = 0, max = 1, step = 0.01 }) => (
    <div>
        <label className="text-sm text-stone-400 flex justify-between">
            <span>{label}</span>
            <span className="font-mono text-stone-300">{Number(value).toFixed(2)}</span>
        </label>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))}
               className="w-full h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-teal-500" />
    </div>
);

export const GlobalModulation: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { lfo, envelopeFollower } = state;

    return (
        <div className="bg-stone-900/50 p-6 rounded-2xl border border-stone-800 shadow-lg min-h-[300px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* LFO Section */}
                <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-stone-200">LFO 1</h4>
                    <div>
                        <label className="text-sm text-stone-400 block mb-1">Target</label>
                        <select 
                            value={lfo.target} 
                            onChange={e => dispatch({type: 'UPDATE_LFO', payload: {target: e.target.value as ModulatableParam}})}
                            className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded-md p-1.5 text-sm focus:ring-1 focus:ring-teal-500">
                            <option value="none">None</option>
                            {MODULATABLE_PARAMS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm text-stone-400 block mb-1">Shape</label>
                        <select 
                            value={lfo.shape} 
                            onChange={e => dispatch({type: 'UPDATE_LFO', payload: {shape: e.target.value as LFO_Shape}})}
                            className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded-md p-1.5 text-sm focus:ring-1 focus:ring-teal-500">
                            <option value="sine">Sine</option>
                            <option value="square">Square</option>
                            <option value="sawtooth">Sawtooth</option>
                            <option value="triangle">Triangle</option>
                        </select>
                    </div>
                    <ControlSlider label="Rate (Hz)" value={lfo.rate} onChange={v => dispatch({type: 'UPDATE_LFO', payload: {rate: v}})} min={0.01} max={10} step={0.01} />
                    <ControlSlider label="Amount" value={lfo.amount} onChange={v => dispatch({type: 'UPDATE_LFO', payload: {amount: v}})} />
                </div>

                {/* Envelope Follower Section */}
                <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-stone-200">Envelope Follower</h4>
                    <div>
                        <label className="text-sm text-stone-400 block mb-1">Target</label>
                        <select 
                            value={envelopeFollower.target} 
                            onChange={e => dispatch({type: 'UPDATE_ENVELOPE_FOLLOWER', payload: {target: e.target.value as ModulatableParam}})}
                            className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded-md p-1.5 text-sm focus:ring-1 focus:ring-teal-500">
                           <option value="none">None</option>
                            {MODULATABLE_PARAMS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm text-stone-400 block mb-1">Audio Source</label>
                        <select 
                            value={envelopeFollower.source} 
                            onChange={e => dispatch({type: 'UPDATE_ENVELOPE_FOLLOWER', payload: {source: e.target.value as 'bass' | 'mids' | 'highs' | 'overall'}})}
                            className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded-md p-1.5 text-sm focus:ring-1 focus:ring-teal-500">
                            <option value="overall">Overall</option>
                            <option value="bass">Bass</option>
                            <option value="mids">Mids</option>
                            <option value="highs">Highs</option>
                        </select>
                    </div>
                     <ControlSlider label="Amount" value={envelopeFollower.amount} onChange={v => dispatch({type: 'UPDATE_ENVELOPE_FOLLOWER', payload: {amount: v}})} />
                </div>
            </div>
        </div>
    );
};
