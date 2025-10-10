# Reusable Visualization Components

This directory contains modular, reusable components for creating audio-reactive visualizations with recording capabilities.

## Core Components

### 1. VisualizationEngine
The main visualization engine that handles rendering without any UI elements.

**Features:**
- Resolution-independent rendering
- Real-time audio analysis
- Beat detection
- Media transitions
- Effect layers
- Evolution system
- Modulation (LFO & Envelope Follower)

**Usage:**
```tsx
import { VisualizationEngine } from './components/core';

const config = {
  resolution: { width: 1280, height: 720 },
  framerate: 60,
  mediaElements: [...],
  audioSource: audioElement,
  // ... other config options
};

<VisualizationEngine
  ref={engineRef}
  config={config}
  onFrame={handleFrame}
  onReady={handleReady}
  autoStart={true}
/>
```

### 2. HeadlessRecorder
Recording component that captures canvas output without UI.

**Features:**
- Multiple resolution support (480p, 720p, 1080p, 4K)
- WebM/MP4 recording
- Audio synchronization
- Configurable quality and framerate
- Pause/resume capability

**Usage:**
```tsx
import { HeadlessRecorder } from './components/core';

const recordingConfig = {
  resolution: { width: 1280, height: 720 },
  framerate: 30,
  format: 'video/webm',
  includeAudio: true
};

<HeadlessRecorder
  ref={recorderRef}
  canvas={canvas}
  audioSource={audioSource}
  config={recordingConfig}
/>

// Control recording
await recorderRef.current.startRecording();
const blob = await recorderRef.current.stopRecording();
recorderRef.current.downloadRecording('my-video');
```

### 3. SimpleVisualizer (Example)
Complete example showing how to use the core components together.

**Features:**
- File upload UI
- Playback controls
- Recording controls
- Status display
- FPS counter

## Quick Start

### Basic 720p Visualizer

```tsx
import { VisualizationEngine, HeadlessRecorder, RESOLUTIONS } from './components/core';

function MyVisualizer({ mediaFiles, audioFile }) {
  const engineRef = useRef(null);
  const recorderRef = useRef(null);

  const config = {
    resolution: RESOLUTIONS['720p'],
    framerate: 60,
    mediaElements: [...],
    audioSource: audioElement,
    audioConfig: {
      fftSize: 2048,
      bassSensitivity: 0.7,
      // ...
    },
    effectsConfig: {
      layers: [...],
      parameters: {...}
    }
  };

  return (
    <>
      <VisualizationEngine ref={engineRef} config={config} />
      <HeadlessRecorder
        ref={recorderRef}
        canvas={engineRef.current?.getCanvas()}
        audioSource={audioElement}
        config={{ resolution: RESOLUTIONS['720p'], framerate: 30 }}
      />
    </>
  );
}
```

## Standalone Usage (Without React)

```javascript
import { createStandaloneRecorder } from './components/core/HeadlessRecorder';

const canvas = document.createElement('canvas');
canvas.width = 1280;
canvas.height = 720;

const recorder = createStandaloneRecorder(canvas, audioElement, {
  resolution: { width: 1280, height: 720 },
  framerate: 30,
  format: 'video/webm',
  includeAudio: true
});

// Start recording
await recorder.startRecording();

// Stop and download
const blob = await recorder.stopRecording();
recorder.downloadRecording('visualization-720p');
```

## Configuration Options

### VisualizationConfig

| Property | Type | Description |
|----------|------|-------------|
| resolution | Resolution | Canvas dimensions |
| framerate | number | Rendering framerate |
| mediaElements | MediaElement[] | Images/videos to visualize |
| audioSource | HTMLAudioElement \| MediaStream | Audio input |
| audioConfig | Object | Audio analysis settings |
| effectsConfig | Object | Visual effects configuration |
| transitionConfig | Object | Media transition settings |
| evolutionConfig | Object | Time-based evolution |
| modulationConfig | Object | LFO and envelope settings |

### RecordingConfig

| Property | Type | Description |
|----------|------|-------------|
| resolution | Resolution | Output video dimensions |
| framerate | 30 \| 60 | Recording framerate |
| format | string | Video MIME type |
| quality | number | Bitrate in Mbps |
| includeAudio | boolean | Include audio track |

## Resolutions

Pre-defined resolutions available:
- **480p**: 854 x 480
- **720p**: 1280 x 720
- **1080p**: 1920 x 1080
- **4K**: 3840 x 2160
- **Custom**: Any width/height

## Performance Tips

1. **Resolution**: Lower resolutions (720p) provide better performance
2. **Framerate**: Use 30 FPS for recording to reduce file size
3. **Effects**: Limit active effect layers for smoother playback
4. **Media**: Optimize media files before loading
5. **Memory**: Stop recording when not needed to free resources

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Limited MediaRecorder support (WebM only)

## Examples

See `/src/examples/` for complete working examples:
- `SimpleVisualizer.tsx` - Basic visualizer with controls
- `Demo720p.tsx` - 720p demo with file upload

## Future Enhancements

Planned components (currently pending):
- **CanvasRenderer**: Isolated rendering logic
- **AudioProcessor**: Standalone audio analysis
- **EffectPipeline**: Modular effect system
- **PresetManager**: Configuration management