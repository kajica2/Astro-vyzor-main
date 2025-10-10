import { SIGN_PALETTES } from '../constants';
// FIX: Corrected import path for AstroData type.
import type { AstroData } from '../types';

const getZodiacSign = (date: Date): string => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
    return 'Pisces';
};

const getMoonPhase = (date: Date): { phase: string; illumination: number, phaseValue: number } => {
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    const day = date.getDate();

    let c = 0, e = 0, jd = 0, b = 0;

    if (month < 3) {
        year--;
        month += 12;
    }

    c = 365.25 * year;
    e = 30.6 * month;
    jd = c + e + day - 694039.09;
    jd /= 29.5305882;
    const phaseValue = jd % 1; // 0 (new) -> 0.5 (full) -> 1 (new)
    b = parseInt(jd.toString(), 10);
    jd -= b;
    b = Math.round(jd * 8);
    if (b >= 8) b = 0;

    const illumination = jd < 0.5 ? 2 * jd : 2 * (1 - jd);

    switch (b) {
        case 0: return { phase: 'New Moon', illumination, phaseValue };
        case 1: return { phase: 'Waxing Crescent', illumination, phaseValue };
        case 2: return { phase: 'First Quarter', illumination, phaseValue };
        case 3: return { phase: 'Waxing Gibbous', illumination, phaseValue };
        case 4: return { phase: 'Full Moon', illumination, phaseValue };
        case 5: return { phase: 'Waning Gibbous', illumination, phaseValue };
        case 6: return { phase: 'Last Quarter', illumination, phaseValue };
        case 7: return { phase: 'Waning Crescent', illumination, phaseValue };
        default: return { phase: 'New Moon', illumination, phaseValue };
    }
};

export const getAstrologicalData = (
    baseDate: Date,
    focus: string = 'all'
): AstroData => {
    const date = baseDate;
    const dayOfYear = (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;
    const sign = getZodiacSign(date);

    const fullData: AstroData = {
        sun: {
            sign: sign,
            palette: SIGN_PALETTES[sign as keyof typeof SIGN_PALETTES],
            continuous: (Math.sin(dayOfYear / (365 / (2 * Math.PI)))) * 0.5 + 0.5,
        },
        moon: getMoonPhase(date),
        mercury: {
            retrograde: Math.sin(dayOfYear / 20) > 0.8, // Simulates 3-4 retrogrades a year
            continuous: (Math.sin(dayOfYear / 10) + 1) / 2,
        },
        venus: {
            softness: (Math.sin(dayOfYear / 40) + 1) / 2, // Smooth, slow cycle
            continuous: (Math.sin(dayOfYear / 40) + 1) / 2,
        },
        mars: {
            intensity: (Math.cos(dayOfYear / 15) + 1) / 2, // More aggressive, faster cycle
        },
        jupiter: {
            expansion: (Math.sin(dayOfYear / 60) + 1) / 2, // Very slow expansion/contraction
            slowCycle: (Math.sin(dayOfYear / 60) + 1) / 2,
        },
        saturn: {
            structure: (Math.cos(dayOfYear / 50) + 1) / 2, // Slow, structural cycle
            continuous: (Math.cos(dayOfYear / 50) + 1) / 2,
        },
    };

    if (focus === 'all') {
        return fullData;
    }
    
    // Create a neutral state for all planets
    const neutralPlanet = {
        sun: { ...fullData.sun, continuous: 0.5 },
        moon: { ...fullData.moon, illumination: 0.5, phaseValue: 0.5 },
        mercury: { retrograde: false, continuous: 0.5 },
        venus: { softness: 0.5, continuous: 0.5 },
        mars: { intensity: 0.5 },
        jupiter: { expansion: 0.5, slowCycle: 0.5 },
        saturn: { structure: 0.5, continuous: 0.5 },
    };
    
    // Start with the full data, then overwrite all planets with neutral values
    const focusedData = { ...fullData, ...neutralPlanet };
    
    // Restore the data for the focused planet
    if (fullData.hasOwnProperty(focus)) {
        (focusedData as any)[focus] = (fullData as any)[focus];
    }
    
    return focusedData;
};