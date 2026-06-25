import React, { useEffect, useState } from 'react';
import App from '../App';
import { Demo720p } from './examples/Demo720p';
import { AppProvider } from '../context/AppStateContext';

const MainApp: React.FC = () => {
    const [view, setView] = useState<'home' | 'original' | 'demo'>('home');

    // Enter key on the home screen launches the Original App (the primary experience).
    // Saves first-time users from having to click to discover what's actually behind the door.
    useEffect(() => {
        if (view !== 'home') return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Enter') setView('original');
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [view]);

    if (view === 'original') {
        return (
            <AppProvider>
                <App />
            </AppProvider>
        );
    }

    if (view === 'demo') {
        return <Demo720p />;
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <div style={{
                textAlign: 'center',
                color: 'white'
            }}>
                <h1 style={{
                    fontSize: '48px',
                    marginBottom: '20px',
                    textShadow: '0 2px 10px rgba(0,0,0,0.3)'
                }}>
                    Astro-Vysio
                </h1>
                <p style={{
                    fontSize: '20px',
                    marginBottom: '40px',
                    opacity: 0.9
                }}>
                    Audio-Reactive Visualizations
                </p>

                <div style={{
                    display: 'flex',
                    gap: '20px',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={() => setView('original')}
                        autoFocus
                        style={{
                            padding: '20px 40px',
                            fontSize: '18px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            border: '2px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            backdropFilter: 'blur(10px)',
                            minWidth: '200px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <div>
                            <strong>Launch App</strong>
                            <div style={{ fontSize: '14px', marginTop: '5px', opacity: 0.8 }}>
                                Full visualizer with controls — press Enter
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => setView('demo')}
                        style={{
                            padding: '20px 40px',
                            fontSize: '18px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            border: '2px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            backdropFilter: 'blur(10px)',
                            minWidth: '200px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <div>
                            <strong>720p Demo</strong>
                            <div style={{ fontSize: '14px', marginTop: '5px', opacity: 0.8 }}>
                                Reusable components demo
                            </div>
                        </div>
                    </button>
                </div>

                <div style={{
                    marginTop: '60px',
                    padding: '30px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '15px',
                    maxWidth: '600px',
                    margin: '60px auto 0'
                }}>
                    <h2 style={{ marginBottom: '20px' }}>Features</h2>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '15px',
                        textAlign: 'left'
                    }}>
                        <div>✨ Audio-reactive effects</div>
                        <div>🎵 Beat detection</div>
                        <div>🎬 Video recording</div>
                        <div>📐 Multiple resolutions</div>
                        <div>🎨 Custom effects</div>
                        <div>💾 Preset management</div>
                        <div>🔄 Smooth transitions</div>
                        <div>⚡ 60 FPS rendering</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MainApp;