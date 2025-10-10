

import React, { useState, useEffect } from 'react';
import { getAstrologicalData } from '../services/astrologicalService';
// FIX: Corrected import path for AstroData type.
import type { AstroData } from '../types';

const AstroDataItem: React.FC<{ label: string; value: string | number | boolean; colorClass: string }> = ({ label, value, colorClass }) => {
    const displayValue = typeof value === 'boolean' ? (value ? 'Active' : 'Inactive') : 
                         typeof value === 'number' ? `${(value * 100).toFixed(0)}%` : value;

    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-stone-400">{label}</span>
            <span className={`font-bold ${colorClass}`}>{displayValue}</span>
        </div>
    );
};


export const AstrologicalDisplay: React.FC = () => {
    const [astroData, setAstroData] = useState<AstroData | null>(null);

    useEffect(() => {
        const data = getAstrologicalData(new Date());
        setAstroData(data);
    }, []);

    if (!astroData) {
        return <div className="mt-6 text-center text-stone-500">Loading celestial data...</div>;
    }

    return (
        <div className="mt-6 p-4 bg-stone-950/50 rounded-lg">
            <h4 className="text-md font-semibold text-center text-stone-300 mb-4">Current Cosmic State</h4>
            <div className="space-y-2">
                <AstroDataItem label="Sun's Zodiac" value={astroData.sun.sign} colorClass="text-yellow-400" />
                <AstroDataItem label="Moon Phase" value={astroData.moon.phase} colorClass="text-blue-300" />
                <AstroDataItem label="Luminosity" value={astroData.moon.illumination} colorClass="text-blue-300" />
                <hr className="border-stone-700" />
                <AstroDataItem label="Mercury (Glitch)" value={astroData.mercury.retrograde} colorClass="text-green-400" />
                <AstroDataItem label="Venus (Softness)" value={astroData.venus.softness} colorClass="text-pink-400" />
                <AstroDataItem label="Mars (Intensity)" value={astroData.mars.intensity} colorClass="text-red-400" />
                <AstroDataItem label="Jupiter (Expansion)" value={astroData.jupiter.expansion} colorClass="text-orange-400" />
                <AstroDataItem label="Saturn (Structure)" value={astroData.saturn.structure} colorClass="text-indigo-400" />
            </div>
        </div>
    );
};