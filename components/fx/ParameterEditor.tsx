import React from 'react';
// FIX: Corrected import path for useAppState.
import { useAppState } from '../../context/AppStateContext';
// FIX: Corrected import path for types.
import type { EffectLayer, EffectParameters } from '../../types';

interface SliderProps { effect: keyof EffectParameters; param: string; label: string; min: number; max: number; step: number; }
const ParameterSlider: React.FC<SliderProps> = ({ effect, param, label, min, max, step }) => {
    const { state, dispatch } = useAppState();
    const value = (state.effectParameters[effect] as any)[param] ?? 0;
    const onChange = (v: number) => dispatch({ type: 'UPDATE_EFFECT_PARAMETER', payload: { effect, param, value: v } });
    return (
        <div>
            <label className="text-sm text-stone-400 flex justify-between">
                <span>{label}</span>
                <span className="font-mono text-stone-300">{Number(value).toFixed(2)}</span>
            </label>
            <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))}
                   className="w-full h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
        </div>
    );
};

interface SelectProps { effect: keyof EffectParameters; param: string; label: string; options: {value: string; label: string}[]; }
const ParameterSelect: React.FC<SelectProps> = ({ effect, param, label, options }) => {
    const { state, dispatch } = useAppState();
    const value = (state.effectParameters[effect] as any)[param] ?? '';
    const onChange = (v: string) => dispatch({ type: 'UPDATE_EFFECT_PARAMETER', payload: { effect, param, value: v } });
    return (
        <div>
            <label className="text-sm text-stone-400 block mb-1">{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded-md p-1.5 text-sm focus:ring-1 focus:ring-purple-500">
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );
};

const renderControls = (type: EffectLayer['effectType']) => {
    switch (type) {
        case 'grid': return (<>
            <h4 className="text-sm font-semibold text-stone-300 mb-1">Appearance</h4>
            <ParameterSlider effect="grid" param="size" label="Grid Size" min={10} max={300} step={1} />
            <ParameterSlider effect="grid" param="lineWidth" label="Line Width" min={0.1} max={10} step={0.1} />
        </>);
        case 'glitch_slice': return (<>
            <h4 className="text-sm font-semibold text-stone-300 mb-1">Behavior</h4>
            <ParameterSelect effect="glitch_slice" param="type" label="Type" options={[{value: 'slice', label: 'Slice'}, {value: 'tear', label: 'Tear'}, {value: 'channel_shift', label: 'Channel Shift'}]} />
            <ParameterSelect effect="glitch_slice" param="direction" label="Direction" options={[{value: 'horizontal', label: 'Horizontal'}, {value: 'vertical', label: 'Vertical'}]} />
            <h4 className="text-sm font-semibold text-stone-300 mt-3 mb-1">Strength</h4>
            <ParameterSlider effect="glitch_slice" param="intensity" label="Probability" min={0} max={1} step={0.05} />
            <ParameterSlider effect="glitch_slice" param="amount" label="Max Offset" min={1} max={100} step={1} />
        </>);
        case 'pixelate': return <ParameterSlider effect="pixelate" param="blockSize" label="Block Size" min={2} max={100} step={1} />;
        case 'rgb_shift': return (<>
            <h4 className="text-sm font-semibold text-stone-300 mb-1">Behavior</h4>
            <ParameterSelect effect="rgb_shift" param="frequency" label="Trigger Frequency" options={[{ value: 'bass', label: 'Bass' }, { value: 'mids', label: 'Mids' }, { value: 'highs', label: 'Highs' }]} />
            <h4 className="text-sm font-semibold text-stone-300 mt-3 mb-1">Strength</h4>
            <ParameterSlider effect="rgb_shift" param="intensity" label="Min Trigger Strength" min={0} max={1} step={0.05} />
            <ParameterSlider effect="rgb_shift" param="amount" label="Shift Amount" min={1} max={100} step={1} />
        </>);
        case 'kaleidoscope': return (<>
            <h4 className="text-sm font-semibold text-stone-300 mb-1">Appearance</h4>
            <ParameterSlider effect="kaleidoscope" param="segments" label="Segments" min={2} max={24} step={1} />
            <ParameterSlider effect="kaleidoscope" param="rotationSpeed" label="Rotation Speed" min={0} max={1} step={0.01} />
        </>);
        case 'bloom': return (<>
            <h4 className="text-sm font-semibold text-stone-300 mb-1">Strength</h4>
            <ParameterSlider effect="bloom" param="intensity" label="Intensity" min={0} max={2} step={0.05} />
            <ParameterSlider effect="bloom" param="blurSize" label="Blur Size" min={1} max={100} step={1} />
        </>);
        case 'color_grading': return (<>
            <h4 className="text-sm font-semibold text-stone-300 mb-1">Adjustments</h4>
            <ParameterSlider effect="color_grading" param="hue" label="Hue" min={0} max={360} step={1} />
            <ParameterSlider effect="color_grading" param="saturation" label="Saturation" min={0} max={200} step={1} />
            <ParameterSlider effect="color_grading" param="contrast" label="Contrast" min={0} max={200} step={1} />
        </>);
        case 'liquid_dream': return (<>
            <h4 className="text-sm font-semibold text-stone-300 mb-1">Appearance</h4>
            <ParameterSlider effect="liquid_dream" param="intensity" label="Distortion" min={0} max={50} step={1} />
            <ParameterSlider effect="liquid_dream" param="speed" label="Speed" min={0} max={2} step={0.05} />
            <ParameterSlider effect="liquid_dream" param="grain" label="Grain" min={0} max={0.5} step={0.01} />
        </>);
        case 'invert':
        case 'strobe':
        case 'none':
            return <p className="text-sm text-stone-500 text-center">No parameters to edit for this effect.</p>;
        default:
            return <p className="text-sm text-stone-500 text-center">Select an effect to see its parameters.</p>;
    }
};

interface ParameterEditorProps {
    selectedLayer: EffectLayer | null;
}

export const ParameterEditor: React.FC<ParameterEditorProps> = ({ selectedLayer }) => {
    const { state } = useAppState();
    const { styleBlendValue } = state;
    const isBlending = styleBlendValue > 0.01 && styleBlendValue < 0.99;

    return (
        <div className="bg-stone-900/50 p-6 rounded-2xl border border-stone-800 shadow-lg min-h-[300px] relative">
            {isBlending && (
                <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center rounded-2xl z-10 text-center p-4">
                    <p className="text-stone-300 font-semibold">Editing is disabled while blending styles. <br/><span className="font-normal text-sm text-stone-400">Commit the blend or set slider to 0% / 100%.</span></p>
                </div>
            )}
            <div className={`transition-opacity ${isBlending ? 'opacity-20 pointer-events-none' : ''}`}>
                {selectedLayer ? (
                    <div className="space-y-4">
                        {renderControls(selectedLayer.effectType)}
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-stone-500">Select a layer to edit its parameters.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
