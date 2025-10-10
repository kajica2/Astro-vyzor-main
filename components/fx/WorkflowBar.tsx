import React, { useRef } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { v4 as uuidv4 } from 'uuid';
import type { EffectPreset } from '../../types';
import { exportPresetsToXml, parsePresetXml } from '../../utils/presetManager';

export const WorkflowBar: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { effectLayers, effectParameters, effectPresets } = state;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSaveAsNew = () => {
        const name = window.prompt("Enter a name for your new Style preset:");
        if (!name || name.trim() === '') return;

        const newPreset: EffectPreset = {
            id: `custom_${Date.now()}`,
            name: name.trim(),
            category: 'Custom',
            layers: JSON.parse(JSON.stringify(effectLayers)),
            parameters: JSON.parse(JSON.stringify(effectParameters)),
            tags: { // Default tags for new presets
                energy: 'medium',
                tempo: 'medium',
                character: 'experimental'
            }
        };

        dispatch({ type: 'ADD_EFFECT_PRESET', payload: newPreset });
        // After saving, load it to make it active
        dispatch({ type: 'LOAD_EFFECT_PRESET', payload: newPreset });
    };
    
    const handleExport = () => {
        const customPresets = effectPresets.filter(p => p.category === 'Custom');
        if (customPresets.length === 0) {
            alert("No custom presets to export.");
            return;
        }

        try {
            const xmlString = exportPresetsToXml(customPresets);
            const blob = new Blob([xmlString], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `astro-vysio-presets-${new Date().toISOString().slice(0,10)}.xml`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export presets:", error);
            alert("An error occurred while exporting presets.");
        }
    };
    
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const importedPresets = parsePresetXml(content);
                if (importedPresets.length === 0) {
                    alert("No valid presets found in the file.");
                    return;
                }
                
                const existingIds = new Set(state.effectPresets.map(p => p.id));
                const newPresets = importedPresets.filter(p => !existingIds.has(p.id));
                const skippedCount = importedPresets.length - newPresets.length;

                newPresets.forEach(preset => {
                    dispatch({ type: 'ADD_EFFECT_PRESET', payload: preset });
                });

                let alertMessage = `${newPresets.length} preset(s) imported successfully.`;
                if (skippedCount > 0) {
                    alertMessage += ` ${skippedCount} preset(s) were skipped due to conflicting IDs.`;
                }
                alert(alertMessage);

            } catch (error) {
                console.error("Failed to import presets:", error);
                alert(`Error importing presets: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } finally {
                // Reset file input
                if(fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="flex justify-between items-center bg-stone-800/50 p-2 rounded-lg mb-4">
             <h3 className="text-lg font-semibold text-stone-300 px-2">Workflow</h3>
            <div className="flex items-center gap-2">
                 <button onClick={handleSaveAsNew} className="px-3 py-1.5 text-sm font-semibold rounded-md bg-purple-600 hover:bg-purple-500 transition-colors">
                    Save Current Style As...
                </button>
                 <button onClick={handleImportClick} className="px-3 py-1.5 text-sm font-semibold rounded-md bg-stone-700 hover:bg-stone-600 transition-colors">
                    Import
                </button>
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xml,application/xml" className="hidden" />
                 <button onClick={handleExport} className="px-3 py-1.5 text-sm font-semibold rounded-md bg-stone-700 hover:bg-stone-600 transition-colors">
                    Export Custom
                </button>
            </div>
        </div>
    );
};
