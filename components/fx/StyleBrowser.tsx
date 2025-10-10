import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import type { EffectPreset, EffectParameters, EffectLayer } from '../../types';
import { interpolateEffectLayers, interpolateEffectParameters } from '../../utils/interpolation';
import { analyzeAudio, findBestMatches } from '../../utils/audioAnalyzer';
import { tunePresetsWithAI } from '../../services/aiService';
import { PresetPreview } from '../EffectPreview';

// --- NEW COMPONENT: AI Remix Panel --- //
interface AiRemixPanelProps {
    onClose: () => void;
}
type TunedPresetBody = { layers: EffectLayer[], parameters: EffectParameters };
const AiRemixPanel: React.FC<AiRemixPanelProps> = ({ onClose }) => {
    const { state, dispatch } = useAppState();
    const { audioFile, effectPresets } = state;
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [creativeDirection, setCreativeDirection] = useState('');
    const [suggestions, setSuggestions] = useState<{ a: TunedPresetBody | null, b: TunedPresetBody | null }>({ a: null, b: null });
    const [originalPresets, setOriginalPresets] = useState<{a: EffectPreset | null, b: EffectPreset | null}>({a: null, b: null});


    const handleGenerate = async () => {
        if (!audioFile) {
            setError("An audio file is required for AI Remix.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setSuggestions({ a: null, b: null });

        try {
            const profile = await analyzeAudio(audioFile);
            
            const presetA = originalPresets.a || findBestMatches(profile, effectPresets)[0];
            const presetB = originalPresets.b || findBestMatches(profile, effectPresets)[1];

            if (!presetA || !presetB) throw new Error("Could not find two suitable presets to remix.");
            setOriginalPresets({a: presetA, b: presetB});

            const { tunedPresetBodyA, tunedPresetBodyB } = await tunePresetsWithAI(profile, presetA, presetB, creativeDirection);
            
            setSuggestions({ a: tunedPresetBodyA, b: tunedPresetBodyB });

        } catch (err: any) {
            console.error("AI Remix failed:", err);
            setError(err.message || "Failed to generate remixes. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAccept = (suggestion: TunedPresetBody, originalPreset: EffectPreset) => {
        const newPreset: EffectPreset = {
            ...originalPreset,
            id: `ai_remix_${Date.now()}`,
            name: `AI Remix: ${originalPreset.name}`,
            category: 'Custom',
            layers: suggestion.layers,
            parameters: suggestion.parameters,
            tags: originalPreset.tags, // Preserve original tags
        };
        
        dispatch({ type: 'ADD_EFFECT_PRESET', payload: newPreset });
        dispatch({ type: 'LOAD_EFFECT_PRESET', payload: { ...newPreset }});
        onClose();
    }


    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-stone-900 border border-stone-700 rounded-xl shadow-2xl p-6 w-full max-w-2xl text-stone-200" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">AI Remix Engine</h2>
                <p className="text-sm text-stone-400 text-center mb-6">Guide the AI with creative keywords to remix two styles based on your audio.</p>
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="creative-direction" className="block text-sm font-medium text-stone-400 mb-1">Creative Direction (Optional)</label>
                        <input
                            id="creative-direction"
                            type="text"
                            value={creativeDirection}
                            onChange={(e) => setCreativeDirection(e.target.value)}
                            placeholder="e.g., energetic, glitchy, retro, soft, atmospheric..."
                            className="w-full bg-stone-800 border-stone-700 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>
                </div>

                <div className="mt-6">
                    {isLoading ? (
                         <div className="text-center p-8">
                             <svg className="animate-spin h-8 w-8 text-purple-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="mt-4 text-stone-400">AI is remixing... this can take a moment.</p>
                        </div>
                    ) : error ? (
                        <div className="text-center p-4 bg-red-900/50 rounded-lg">
                            <p className="text-red-400 font-semibold">An Error Occurred</p>
                            <p className="text-red-500 text-sm mt-1">{error}</p>
                        </div>
                    ) : (suggestions.a && suggestions.b && originalPresets.a && originalPresets.b) ? (
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-semibold text-lg text-center mb-2">Suggestion A</h3>
                                <PresetPreview layers={suggestions.a.layers} parameters={suggestions.a.parameters} />
                                <button onClick={() => handleAccept(suggestions.a!, originalPresets.a!)} className="w-full mt-3 py-2 text-sm font-semibold rounded-lg bg-green-700 hover:bg-green-600 transition-colors">
                                    Accept A
                                </button>
                            </div>
                             <div>
                                <h3 className="font-semibold text-lg text-center mb-2">Suggestion B</h3>
                                <PresetPreview layers={suggestions.b.layers} parameters={suggestions.b.parameters} />
                                <button onClick={() => handleAccept(suggestions.b!, originalPresets.b!)} className="w-full mt-3 py-2 text-sm font-semibold rounded-lg bg-green-700 hover:bg-green-600 transition-colors">
                                    Accept B
                                </button>
                            </div>
                        </div>
                    ) : (
                         <div className="text-center p-8 text-stone-500">
                           <p>Enter a creative direction and click Generate.</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-4 mt-8">
                    <button onClick={onClose} className="flex-1 py-2 px-4 text-sm font-semibold rounded-lg bg-stone-700 hover:bg-stone-600 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleGenerate} disabled={isLoading} className="flex-1 py-2 px-4 text-sm font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-stone-700 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors">
                        {suggestions.a ? 'Regenerate' : 'Generate'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const StarIcon: React.FC<{ isFavorite: boolean }> = ({ isFavorite }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5}>
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

const SuggestIcon: React.FC = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

const AiTuneIcon: React.FC<{ isTuning: boolean }> = ({ isTuning }) => {
    if (isTuning) {
        return (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        );
    }
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v1.168l.683.393a1 1 0 01.53 1.41l-.001.002-.684.394V10l.684.394.001.002a1 1 0 01-.53 1.41l-.683.393V15a1 1 0 01-2 0v-1.832l-.683-.393a1 1 0 01-.53-1.41l.001-.002.684-.394V8l-.684-.394-.001-.002a1 1 0 01.53-1.41l.683.393V4a1 1 0 011-1zM9 0a1 1 0 011 1v.065l.073.042 1.8 1.04a1 1 0 01.527 1.409l-1.8 3.118.002.001.002.001v4.65l1.796 1.037.002.001.002.001a1 1 0 01-.527 1.41l-1.8 1.039-.073.042V19a1 1 0 01-2 0v-.065l-.073-.042-1.8-1.04a1 1 0 01-.527-1.409l1.8-3.118-.002-.001-.002-.001v-4.65L3.304 7.63l-.002-.001-.002-.001a1 1 0 01.527-1.41l1.8-1.039.073-.042V1a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
    )
};


const AnalyzeIcon: React.FC<{isAnalyzing: boolean}> = ({ isAnalyzing }) => {
    if (isAnalyzing) {
        return (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        );
    }
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 6l12-3" />
        </svg>
    )
};


const PresetButton: React.FC<{ preset: EffectPreset, isActive: boolean, isFavorite: boolean, onSelect: () => void, onToggleFavorite: () => void }> = 
({ preset, isActive, isFavorite, onSelect, onToggleFavorite }) => (
    <div className={`w-full flex items-center justify-between p-2 rounded-md group ${isActive ? 'bg-purple-600/50' : 'hover:bg-stone-700/50'}`}>
        <button onClick={onSelect} className="flex-grow text-left truncate transition-colors">
            {preset.name}
        </button>
        <button 
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }} 
            title="Toggle Favorite"
            className={`p-1 rounded-full transition-colors ${isFavorite ? 'text-yellow-400' : 'text-stone-500 group-hover:text-stone-300'}`}
        >
            <StarIcon isFavorite={isFavorite} />
        </button>
    </div>
);

export const StyleBrowser: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { effectPresets, styleBlendValue, stylePresetAId, stylePresetBId, activeEffectPresetId, audioFile, micStream, effectLayers, effectParameters } = state;
    const [activeCategory, setActiveCategory] = useState<string>('Essential');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [recents, setRecents] = useState<string[]>([]);
    const [suggestionFlash, setSuggestionFlash] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAiRemixPanelOpen, setIsAiRemixPanelOpen] = useState(false);

    const isBlending = styleBlendValue > 0.01 && styleBlendValue < 0.99;
    
    // Load favorites and recents from localStorage on mount
    useEffect(() => {
        try {
            const savedFavorites = localStorage.getItem('astro-vysio-favorites');
            const savedRecents = localStorage.getItem('astro-vysio-recents');
            if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
            if (savedRecents) setRecents(JSON.parse(savedRecents));
        } catch (e) { console.error("Failed to load favorites/recents", e); }
    }, []);

    // Save favorites and recents to localStorage when they change
    useEffect(() => { localStorage.setItem('astro-vysio-favorites', JSON.stringify(favorites)); }, [favorites]);
    useEffect(() => { localStorage.setItem('astro-vysio-recents', JSON.stringify(recents)); }, [recents]);

    const handleToggleFavorite = (presetId: string) => {
        setFavorites(prev => 
            prev.includes(presetId) ? prev.filter(id => id !== presetId) : [...prev, presetId]
        );
    };

    const groupedPresets = effectPresets.reduce((acc, p) => {
        const category = p.category || 'Custom';
        if (!acc[category]) acc[category] = [];
        acc[category].push(p);
        return acc;
    }, {} as Record<string, EffectPreset[]>);

    const onSelectPreset = (preset: EffectPreset) => {
        // This action will now ONLY load the preset data, not modify blend state.
        dispatch({ type: 'LOAD_EFFECT_PRESET', payload: preset });
        // This action explicitly sets the blend state.
        dispatch({ type: 'SET_STYLE_BLEND', payload: { value: 0, presetAId: preset.id } });
        
        // Update recents
        setRecents(prev => [preset.id, ...prev.filter(id => id !== preset.id)].slice(0, 5));
    };
    
    const handleAutoSuggest = () => {
        if (effectPresets.length < 2) return;
        let indexA = Math.floor(Math.random() * effectPresets.length);
        let indexB = Math.floor(Math.random() * effectPresets.length);
        while (indexA === indexB) { // Ensure they are different
            indexB = Math.floor(Math.random() * effectPresets.length);
        }
        dispatch({ type: 'SET_STYLE_BLEND', payload: { 
            value: styleBlendValue, 
            presetAId: effectPresets[indexA].id, 
            presetBId: effectPresets[indexB].id 
        }});
        setSuggestionFlash(true);
        setTimeout(() => setSuggestionFlash(false), 500);
    };

    const handleAudioSuggest = async () => {
        if (!audioFile) {
            alert("Please upload an audio file first to use audio-based suggestions.");
            return;
        }
        setIsAnalyzing(true);
        try {
            const profile = await analyzeAudio(audioFile);
            const [suggestionA, suggestionB] = findBestMatches(profile, effectPresets);
            if (suggestionA && suggestionB) {
                dispatch({ type: 'SET_STYLE_BLEND', payload: { 
                    value: 0, 
                    presetAId: suggestionA.id, 
                    presetBId: suggestionB.id 
                }});
                setSuggestionFlash(true);
                setTimeout(() => setSuggestionFlash(false), 500);
            } else if (suggestionA) {
                onSelectPreset(suggestionA);
            }
        } catch (error) {
            console.error("Audio analysis failed:", error);
            alert("Audio analysis failed. The file might be unsupported.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    useEffect(() => {
        const presetA = effectPresets.find(p => p.id === stylePresetAId);
        const presetB = effectPresets.find(p => p.id === stylePresetBId);

        if (!presetA || !presetB) return;

        if (styleBlendValue > 0 && styleBlendValue < 1) {
            const blendedLayers = interpolateEffectLayers(presetA.layers, presetB.layers, styleBlendValue);
            const blendedParams = interpolateEffectParameters(presetA.parameters, presetB.parameters, presetA.layers, presetB.layers, styleBlendValue);
            dispatch({ type: 'SET_EFFECT_LAYERS', payload: blendedLayers });
            dispatch({ type: 'SET_EFFECT_PARAMETERS', payload: blendedParams });
            dispatch({ type: 'SET_ACTIVE_EFFECT_PRESET_ID', payload: 'custom' });
        } else if (styleBlendValue === 0 && activeEffectPresetId !== presetA.id) {
            dispatch({ type: 'LOAD_EFFECT_PRESET', payload: presetA });
        } else if (styleBlendValue === 1 && activeEffectPresetId !== presetB.id) {
            dispatch({ type: 'LOAD_EFFECT_PRESET', payload: presetB });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [styleBlendValue, stylePresetAId, stylePresetBId, effectPresets, dispatch]);

    const handleBlendChange = (value: number) => {
        dispatch({ type: 'SET_STYLE_BLEND', payload: { value } });
    }

    const handleCommitBlend = () => {
        const presetA = effectPresets.find(p => p.id === stylePresetAId);
        const presetB = effectPresets.find(p => p.id === stylePresetBId);
        const name = `Blend: ${presetA?.name.slice(0, 8)} & ${presetB?.name.slice(0,8)}`;

        const newPreset: EffectPreset = {
            id: `custom_blend_${Date.now()}`,
            name: name,
            category: 'Custom',
            layers: JSON.parse(JSON.stringify(effectLayers)),
            parameters: JSON.parse(JSON.stringify(effectParameters)),
            tags: { energy: 'medium', tempo: 'medium', character: 'experimental' }
        };
        dispatch({ type: 'ADD_EFFECT_PRESET', payload: newPreset });
        dispatch({ type: 'LOAD_EFFECT_PRESET', payload: newPreset });
    };
    
    const categories = ['Recent', 'Favorites', ...Object.keys(groupedPresets)];
    if (categories.includes('Essential')) {
        categories.splice(categories.indexOf('Essential'), 1);
        categories.splice(2, 0, 'Essential'); // Place after Recent/Favorites
    }
     if (categories.includes('Custom') && categories.length > 1) {
        categories.splice(categories.indexOf('Custom'), 1);
        categories.push('Custom');
    }

    const getPresetsForCategory = (category: string): EffectPreset[] => {
        if (category === 'Favorites') {
            return favorites.map(id => effectPresets.find(p => p.id === id)).filter(Boolean) as EffectPreset[];
        }
        if (category === 'Recent') {
            return recents.map(id => effectPresets.find(p => p.id === id)).filter(Boolean) as EffectPreset[];
        }
        return groupedPresets[category] || [];
    };

    const isActionDisabled = isAnalyzing || !!micStream;

    return (
        <>
            {isAiRemixPanelOpen && <AiRemixPanel onClose={() => setIsAiRemixPanelOpen(false)} />}
            <div className="bg-stone-900/50 p-4 rounded-2xl border border-stone-800 space-y-4">
                <div>
                     <div className="flex items-center justify-between mb-2">
                        <h4 className="text-lg font-semibold text-stone-300">Style Blending: <span className="font-mono text-green-400">{(styleBlendValue * 100).toFixed(0)}%</span></h4>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsAiRemixPanelOpen(true)}
                                disabled={!!micStream || !audioFile}
                                title={micStream ? "AI features disabled for mic input" : !audioFile ? "Upload audio to enable AI Remix" : "Remix Styles with AI"}
                                className="p-1 rounded-full text-stone-400 hover:bg-stone-700 hover:text-purple-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <AiTuneIcon isTuning={false} />
                            </button>
                            <button onClick={handleAudioSuggest} disabled={isActionDisabled} title={micStream ? "Audio analysis disabled for mic input" : "Analyze Audio & Suggest Styles"} className="p-1 rounded-full text-stone-400 hover:bg-stone-700 hover:text-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <AnalyzeIcon isAnalyzing={isAnalyzing} />
                            </button>
                            <button onClick={handleAutoSuggest} title="Auto-Suggest Styles (Random)" className="p-1 rounded-full text-stone-400 hover:bg-stone-700 hover:text-purple-400 transition-colors">
                                <SuggestIcon />
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <select 
                            value={stylePresetAId} 
                            onChange={e => dispatch({ type: 'SET_STYLE_BLEND', payload: { value: styleBlendValue, presetAId: e.target.value }})} 
                            className={`w-full bg-stone-800 border-stone-700 rounded p-2 transition-all duration-300 border ${suggestionFlash ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-stone-700'} ${styleBlendValue >= 0.99 ? 'opacity-50' : ''}`}>
                            {effectPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <select 
                            value={stylePresetBId} 
                            onChange={e => dispatch({ type: 'SET_STYLE_BLEND', payload: { value: styleBlendValue, presetBId: e.target.value }})} 
                            className={`w-full bg-stone-800 border-stone-700 rounded p-2 transition-all duration-300 border ${suggestionFlash ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-stone-700'} ${styleBlendValue <= 0.01 ? 'opacity-50' : ''}`}>
                            {effectPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="mt-2 space-y-1">
                        <input 
                            type="range" 
                            min="0" max="1" 
                            step="0.01" 
                            value={styleBlendValue} 
                            onChange={e => handleBlendChange(parseFloat(e.target.value))} 
                            className={`w-full h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer transition-colors ${isBlending ? 'accent-green-500' : 'accent-stone-600'}`}
                        />
                         <p className="text-xs text-stone-500 h-4 text-center">
                            {isBlending ? "Move slider to 0% or 100% to exit blend mode." : "Slide to blend between the two styles above."}
                        </p>
                        {isBlending && (
                            <div className="text-right pt-1">
                                <button
                                    onClick={handleCommitBlend}
                                    className="text-xs bg-green-700 hover:bg-green-600 text-white font-semibold py-1.5 px-3 rounded-md transition-all shadow-md hover:shadow-lg"
                                >
                                    Solidify Blend as New Style
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                <div>
                    <h4 className="text-lg font-semibold text-stone-300 mb-2">Presets</h4>
                    <div className="flex border-b border-stone-700 text-sm overflow-x-auto">
                        {categories.map(category => (
                            <button key={category} onClick={() => setActiveCategory(category)} className={`px-3 py-1 border-b-2 whitespace-nowrap ${activeCategory === category ? 'border-purple-500 text-white' : 'border-transparent text-stone-400 hover:text-white'}`}>
                                {category.split(': ')[0]}
                            </button>
                        ))}
                    </div>
                    <div className="mt-2 h-40 overflow-y-auto pr-2 text-sm">
                        {getPresetsForCategory(activeCategory).length > 0 ? (
                            getPresetsForCategory(activeCategory).map(preset => (
                                <PresetButton 
                                    key={preset.id} 
                                    preset={preset} 
                                    isActive={activeEffectPresetId === preset.id && !isBlending} 
                                    isFavorite={favorites.includes(preset.id)}
                                    onSelect={() => onSelectPreset(preset)}
                                    onToggleFavorite={() => handleToggleFavorite(preset.id)}
                                />
                            ))
                        ) : (
                            <p className="text-stone-500 text-center text-xs pt-4">
                                {activeCategory === 'Favorites' ? "Click the star icon on a preset to add it here." : 
                                 activeCategory === 'Recent' ? "Select presets to see them here." : "No presets in this category."}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
