import React, { useState } from 'react';
import { SimpleVisualizer } from './SimpleVisualizer';

export const Demo720p: React.FC = () => {
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [showVisualizer, setShowVisualizer] = useState(false);

    const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setMediaFiles(files);
    };

    const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setAudioFile(file);
    };

    const handleStartVisualization = () => {
        if (mediaFiles.length > 0 && audioFile) {
            setShowVisualizer(true);
        }
    };

    const handleBack = () => {
        setShowVisualizer(false);
    };

    if (showVisualizer) {
        return (
            <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
                <button
                    onClick={handleBack}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        left: '20px',
                        zIndex: 1000,
                        padding: '10px 20px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    ← Back
                </button>
                <SimpleVisualizer
                    mediaFiles={mediaFiles}
                    audioFile={audioFile}
                    resolution="720p"
                    autoStart={false}
                    showControls={true}
                />
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '40px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                maxWidth: '600px',
                width: '90%'
            }}>
                <h1 style={{
                    fontSize: '32px',
                    marginBottom: '10px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textAlign: 'center'
                }}>
                    720p Visualizer Demo
                </h1>
                <p style={{
                    color: '#666',
                    marginBottom: '30px',
                    textAlign: 'center'
                }}>
                    Upload media and audio files to create a 720p visualization with recording
                </p>

                <div style={{ marginBottom: '25px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '10px',
                        color: '#333',
                        fontWeight: '500'
                    }}>
                        Visual Media (Images/Videos)
                    </label>
                    <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={handleMediaChange}
                        style={{
                            display: 'block',
                            width: '100%',
                            padding: '10px',
                            border: '2px dashed #ddd',
                            borderRadius: '10px',
                            background: '#fafafa',
                            cursor: 'pointer'
                        }}
                    />
                    {mediaFiles.length > 0 && (
                        <p style={{ color: '#667eea', marginTop: '10px', fontSize: '14px' }}>
                            ✓ {mediaFiles.length} file(s) selected
                        </p>
                    )}
                </div>

                <div style={{ marginBottom: '25px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '10px',
                        color: '#333',
                        fontWeight: '500'
                    }}>
                        Audio File
                    </label>
                    <input
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioChange}
                        style={{
                            display: 'block',
                            width: '100%',
                            padding: '10px',
                            border: '2px dashed #ddd',
                            borderRadius: '10px',
                            background: '#fafafa',
                            cursor: 'pointer'
                        }}
                    />
                    {audioFile && (
                        <p style={{ color: '#667eea', marginTop: '10px', fontSize: '14px' }}>
                            ✓ {audioFile.name}
                        </p>
                    )}
                </div>

                <button
                    onClick={handleStartVisualization}
                    disabled={mediaFiles.length === 0 || !audioFile}
                    style={{
                        width: '100%',
                        padding: '15px',
                        background: mediaFiles.length > 0 && audioFile
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: mediaFiles.length > 0 && audioFile ? 'pointer' : 'not-allowed',
                        transition: 'transform 0.2s',
                        transform: 'scale(1)'
                    }}
                    onMouseEnter={(e) => {
                        if (mediaFiles.length > 0 && audioFile) {
                            e.currentTarget.style.transform = 'scale(1.02)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    Start 720p Visualization
                </button>

                <div style={{
                    marginTop: '30px',
                    padding: '20px',
                    background: '#f8f9fa',
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: '#666'
                }}>
                    <h3 style={{ marginBottom: '10px', color: '#333' }}>Features:</h3>
                    <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
                        <li>720p resolution (1280x720)</li>
                        <li>Real-time audio reactive visualization</li>
                        <li>WebM video recording with audio</li>
                        <li>Automatic beat detection</li>
                        <li>Smooth transitions between media</li>
                        <li>Bloom and RGB shift effects</li>
                        <li>60 FPS rendering</li>
                        <li>30 FPS recording</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};