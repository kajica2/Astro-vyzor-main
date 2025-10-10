import React from 'react';
// FIX: Corrected import path for useAppState.
import { useAppState } from '../context/AppStateContext';
import { StyleBrowser } from './fx/StyleBrowser';
import { LayerStack } from './fx/LayerStack';
import { ParameterEditor } from './fx/ParameterEditor';
// FIX: Corrected import path for WorkflowBar.
import { WorkflowBar } from './fx/WorkflowBar';

export const FxKontrols: React.FC = () => {
    const { state } = useAppState();
    const { effectLayers, selectedLayerId } = state;

    const selectedLayer = effectLayers.find(layer => layer.id === selectedLayerId) || null;

    return (
        <div className="px-6 space-y-4">
            <WorkflowBar />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <section id="style-browser">
                        <h2 className="text-2xl font-semibold mb-4 text-stone-100">Style Browser</h2>
                        <StyleBrowser />
                    </section>
                     <section id="layer-stack">
                        <h2 className="text-2xl font-semibold mb-4 text-stone-100">Effect Layers</h2>
                        <LayerStack />
                    </section>
                </div>
                <div className="space-y-6">
                     <section id="parameter-editor">
                        <h2 className="text-2xl font-semibold mb-4 text-stone-100">Parameter Editor</h2>
                        <ParameterEditor selectedLayer={selectedLayer} />
                    </section>
                </div>
            </div>
        </div>
    );
};