import React, { useRef } from 'react';
// FIX: Corrected import path for useAppState.
import { useAppState } from '../../context/AppStateContext';
// FIX: Corrected import path for types.
import { EffectLayer, TriggerSource, BlendMode, EffectType } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { TRIGGER_SOURCES, BLEND_MODES } from '../../constants';

const EFFECT_TYPES: {id: EffectType, name: string}[] = [
    { id: 'none', name: 'None' }, { id: 'strobe', name: 'Strobe' },
    { id: 'grid', name: 'Grid' }, { id: 'kaleidoscope', name: 'Kaleidoscope' }, { id: 'bloom', name: 'Bloom' },
    { id: 'color_grading', name: 'Color Grading' }, { id: 'glitch_slice', name: 'Glitch' }, { id: 'pixelate', name: 'Pixelate' },
    { id: 'invert', name: 'Invert' }, { id: 'rgb_shift', name: 'RGB Shift' }, { id: 'liquid_dream', name: 'Liquid Dream' },
];

const TriggerSelector: React.FC<{ value: TriggerSource, onChange: (v: TriggerSource) => void }> = ({ value, onChange }) => {
    const groupedTriggers = TRIGGER_SOURCES.reduce((acc, t) => {
        if (!acc[t.group]) acc[t.group] = [];
        acc[t.group].push(t);
        return acc;
    }, {} as Record<string, typeof TRIGGER_SOURCES>);

    return (
        <select value={value} onChange={e => onChange(e.target.value as TriggerSource)} className="bg-stone-900/80 border border-stone-600 rounded text-xs p-1 w-full truncate">
            {Object.entries(groupedTriggers).map(([group, triggers]) => (
                <optgroup label={group} key={group}>
                    {triggers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </optgroup>
            ))}
        </select>
    );
};

const Layer: React.FC<{ layer: EffectLayer, isSelected: boolean }> = ({ layer, isSelected }) => {
    const { dispatch } = useAppState();
    const update = (changes: Partial<EffectLayer>) => dispatch({ type: 'UPDATE_EFFECT_LAYER', payload: { id: layer.id, changes } });

    return (
        <div className={`p-3 rounded-lg border-2 ${isSelected ? 'bg-stone-700/50 border-purple-500' : 'bg-stone-800/50 border-transparent hover:border-stone-700/60'}`}>
            <div className="flex items-center gap-3">
                <div className="flex-grow space-y-2">
                    <div className="flex items-center gap-2">
                         <button onClick={() => dispatch({ type: 'SET_SELECTED_LAYER_ID', payload: layer.id })} className="flex-grow">
                            <select value={layer.effectType} onChange={e => update({ effectType: e.target.value as EffectType })} className="bg-stone-900/80 border border-stone-600 rounded font-semibold p-1 w-full text-left text-sm">
                                {EFFECT_TYPES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                        </button>
                        <button onClick={() => update({ isMuted: !layer.isMuted })} title="Mute Layer" className={`p-1 rounded text-xs w-6 h-6 flex items-center justify-center ${layer.isMuted ? 'bg-red-500/50 text-white' : 'bg-stone-700/50 text-stone-400 hover:bg-stone-600'}`}>M</button>
                        <button onClick={() => update({ isSolo: !layer.isSolo })} title="Solo Layer" className={`p-1 rounded text-xs w-6 h-6 flex items-center justify-center ${layer.isSolo ? 'bg-yellow-500/50 text-white' : 'bg-stone-700/50 text-stone-400 hover:bg-stone-600'}`}>S</button>
                        <button onClick={() => dispatch({ type: 'REMOVE_EFFECT_LAYER', payload: layer.id })} title="Remove Layer" className="p-1 rounded text-xs w-6 h-6 flex items-center justify-center bg-stone-700/50 text-stone-400 hover:bg-red-500/50 hover:text-white transition-colors">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                           </svg>
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <TriggerSelector value={layer.triggerSource} onChange={v => update({ triggerSource: v })} />
                        <select value={layer.blendMode} onChange={e => update({ blendMode: e.target.value as BlendMode })} className="bg-stone-900/80 border border-stone-600 rounded p-1 w-full">
                            {BLEND_MODES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-stone-400">Opacity</span>
                <input type="range" min="0" max="1" step="0.01" value={layer.opacity} onChange={e => update({ opacity: parseFloat(e.target.value) })} className="w-full h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-stone-500" />
            </div>
        </div>
    );
};

export const LayerStack: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { effectLayers, selectedLayerId, styleBlendValue } = state;
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const isBlending = styleBlendValue > 0.01 && styleBlendValue < 0.99;

    const addLayer = () => {
        const newLayer: EffectLayer = {
            id: uuidv4(), name: `Layer ${effectLayers.length + 1}`, effectType: 'none', triggerSource: 'none', blendMode: 'normal',
            opacity: 1, isSolo: false, isMuted: false,
        };
        dispatch({ type: 'ADD_EFFECT_LAYER', payload: newLayer });
    };

    const handleDragSort = () => {
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            dispatch({ type: 'REORDER_EFFECT_LAYERS', payload: { dragIndex: dragItem.current, hoverIndex: dragOverItem.current } });
        }
        dragItem.current = null; dragOverItem.current = null;
    };

    return (
        <div className="bg-stone-900/50 p-4 rounded-2xl border border-stone-800 space-y-3 relative">
             {isBlending && (
                <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center rounded-2xl z-10 text-center p-4">
                    <p className="text-stone-300 font-semibold">Editing is disabled while blending styles. <br/><span className="font-normal text-sm text-stone-400">Commit the blend or set slider to 0% / 100%.</span></p>
                </div>
            )}
            <div className={`space-y-3 transition-opacity ${isBlending ? 'opacity-20 pointer-events-none' : ''}`}>
                <div className="space-y-2 h-80 overflow-y-auto pr-2">
                    {effectLayers.map((layer, index) => (
                        <div key={layer.id}
                             draggable
                             onDragStart={() => dragItem.current = index}
                             onDragEnter={() => dragOverItem.current = index}
                             onDragEnd={handleDragSort}
                             onDragOver={(e) => e.preventDefault()}
                             className="cursor-move"
                             onClick={() => dispatch({ type: 'SET_SELECTED_LAYER_ID', payload: layer.id })}
                        >
                            <Layer layer={layer} isSelected={layer.id === selectedLayerId} />
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <button onClick={addLayer} disabled={effectLayers.length >= 5} className="w-full py-2 text-sm font-semibold rounded-lg bg-stone-700 hover:bg-stone-600 disabled:bg-stone-800 disabled:text-stone-500 transition-colors">
                        + Add Layer
                    </button>
                </div>
            </div>
        </div>
    );
};
