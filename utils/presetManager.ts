import type { EffectPreset, EffectLayer, EffectParameters, BlendMode, EffectType, TriggerSource } from '../types';
import { DEFAULT_EFFECT_PARAMETERS } from '../constants';

const getTagValue = (element: Element, tagName: string): string => {
    const node = element.querySelector(tagName);
    return node?.textContent || '';
};

const getParamValue = (paramElement: Element, valueType: 'string' | 'number'): string | number => {
    const value = paramElement.getAttribute('value') || '';
    return valueType === 'number' ? parseFloat(value) : value;
};

export const parsePresetXml = (xmlString: string): EffectPreset[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");
    
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
        throw new Error("Failed to parse XML file. Please check its format.");
    }

    const presetElements = Array.from(xmlDoc.getElementsByTagName('preset'));
    if (presetElements.length === 0) {
        const collectionPresets = Array.from(xmlDoc.getElementsByTagName('presetRef'));
        if(collectionPresets.length > 0) throw new Error("Preset Collection files with external references are not supported. Please import a file containing full preset definitions.");
        throw new Error("No <preset> tags found in the XML file.");
    }

    return presetElements.map(presetEl => {
        const metadata = presetEl.querySelector('metadata');
        const layersEl = presetEl.querySelector('layers');

        const layers: EffectLayer[] = layersEl ? Array.from(layersEl.querySelectorAll('layer')).map(layerEl => {
            const effectEl = layerEl.querySelector('effect');
            return {
                id: layerEl.getAttribute('id') || `layer_${Date.now()}`,
                name: getTagValue(layerEl, 'name'),
                effectType: effectEl?.getAttribute('type') as EffectType || 'none',
                // The XML schema has source inside a trigger tag
                triggerSource: layerEl.querySelector('source')?.getAttribute('type') as TriggerSource || 'none',
                blendMode: getTagValue(layerEl, 'blendMode') as BlendMode || 'normal',
                opacity: parseFloat(getTagValue(layerEl, 'opacity') || '1'),
                isSolo: false, // XML does not specify this, default to false
                isMuted: !(layerEl.getAttribute('enabled') === 'true'),
            };
        }) : [];

        const parameters: EffectParameters = JSON.parse(JSON.stringify(DEFAULT_EFFECT_PARAMETERS));
        const paramElements = Array.from(presetEl.querySelectorAll('param[name]'));
        paramElements.forEach(paramEl => {
            const name = paramEl.getAttribute('name');
            const parentEffect = paramEl.closest('effect');
            if (!name || !parentEffect) return;

            const effectType = parentEffect.getAttribute('type') as keyof EffectParameters;
            if (effectType in parameters) {
                const paramKey = name as keyof typeof parameters[typeof effectType];
                if ((parameters[effectType] as any)[paramKey] !== undefined) {
                    const value = getParamValue(paramEl, typeof (parameters[effectType] as any)[paramKey] === 'number' ? 'number' : 'string');
                    (parameters[effectType] as any)[paramKey] = value;
                }
            }
        });
        
        return {
            id: metadata ? getTagValue(metadata, 'id') : `imported_${Date.now()}`,
            name: metadata ? getTagValue(metadata, 'name') : 'Imported Preset',
            category: 'Custom', // All imported presets are categorized as Custom
            layers,
            parameters,
            tags: { // Default tags for imported presets
                energy: 'medium',
                tempo: 'medium',
                character: 'experimental',
            }
        };
    });
};

function convertPresetToXmlString(preset: EffectPreset): string {
    const escapeXml = (unsafe: string) => unsafe.replace(/[<>&'"]/g, c => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });

    const layersXml = preset.layers.map((layer, index) => {
        const effectParams = preset.parameters[layer.effectType as keyof EffectParameters];
        const paramsXml = effectParams ? Object.entries(effectParams)
            .map(([key, value]) => `            <param name="${escapeXml(key)}" value="${escapeXml(String(value))}"/>`)
            .join('\n') : '';
        
        return `
    <layer id="${escapeXml(layer.id)}" enabled="${!layer.isMuted}" order="${index + 1}">
      <name>${escapeXml(layer.name)}</name>
      <effect type="${escapeXml(layer.effectType)}">
        <parameters>
${paramsXml}
        </parameters>
      </effect>
      <trigger>
        <source type="${escapeXml(layer.triggerSource)}"/>
      </trigger>
      <blendMode>${escapeXml(layer.blendMode)}</blendMode>
      <opacity>${layer.opacity}</opacity>
    </layer>`;
    }).join('');

    return `
  <preset version="2.0">
    <metadata>
      <name>${escapeXml(preset.name)}</name>
      <id>${escapeXml(preset.id)}</id>
      <category>${escapeXml(preset.category)}</category>
      <author>User</author>
      <created>${new Date().toISOString()}</created>
      <description>User-exported preset from Astro-Vysio.</description>
    </metadata>
    <layers>
${layersXml}
    </layers>
  </preset>`;
}

export const exportPresetsToXml = (presets: EffectPreset[]): string => {
    const presetsXml = presets.map(p => convertPresetToXmlString(p)).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<presetCollection version="2.0" xmlns="http://effectsengine.com/schema/preset">
  <metadata>
    <name>Astro-Vysio Export</name>
    <author>User</author>
    <created>${new Date().toISOString()}</created>
  </metadata>
  <!-- This file contains fully defined presets for easy import/export. -->
${presetsXml}
</presetCollection>`;
};
