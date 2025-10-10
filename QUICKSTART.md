# Astro-Vysio Quick Start Guide

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Open in Browser
Navigate to `http://localhost:5173` (or the port shown in terminal)

## 📱 Application Structure

The app has three main sections:

### Home Page
- Choose between the original app or the 720p demo
- View feature list and capabilities

### Original App
- Full-featured visualizer with complete UI
- Multiple tabs for media, engine, and effects
- Cosmic influence controls
- Advanced effect layering
- Real-time parameter adjustment

### 720p Demo
- Demonstrates reusable components
- Simple file upload interface
- 720p recording capability
- Minimal controls for testing

## 🎬 How to Use the 720p Demo

1. **Upload Media Files**
   - Click on "Visual Media" input
   - Select one or more images or videos
   - Supported formats: JPG, PNG, MP4, WebM

2. **Upload Audio File**
   - Click on "Audio File" input
   - Select an audio file
   - Supported formats: MP3, WAV, OGG

3. **Start Visualization**
   - Click "Start 720p Visualization"
   - The visualizer will open in fullscreen

4. **Controls**
   - **Start**: Begin playback
   - **Stop**: Stop and reset
   - **Start Recording**: Begin 720p video capture
   - **Stop Recording**: Save the recorded video

## 🛠️ Using Reusable Components

### Basic Setup
```tsx
import {
  VisualizationEngine,
  HeadlessRecorder,
  RESOLUTIONS
} from './src/components/core';

// Create configuration
const config = {
  resolution: RESOLUTIONS['720p'],
  framerate: 60,
  mediaElements: [...],
  audioSource: audioElement,
  // ... other settings
};

// Use components
<VisualizationEngine config={config} />
<HeadlessRecorder canvas={canvas} config={recordingConfig} />
```

### Standalone Usage (No React)
```javascript
import { createStandaloneRecorder } from './src/components/core/HeadlessRecorder';

const recorder = createStandaloneRecorder(canvas, audio, {
  resolution: { width: 1280, height: 720 },
  framerate: 30,
  includeAudio: true
});

await recorder.startRecording();
// ... perform visualization ...
const blob = await recorder.stopRecording();
recorder.downloadRecording('my-video');
```

## 📦 Component Library

### Core Components
- **VisualizationEngine**: Main rendering engine
- **HeadlessRecorder**: Recording without UI
- **CanvasRenderer**: Isolated canvas operations
- **AudioProcessor**: Audio analysis module
- **EffectPipeline**: Modular effects system
- **PresetManager**: Configuration management

### Resolutions Supported
- 480p (854 x 480)
- 720p (1280 x 720)
- 1080p (1920 x 1080)
- 4K (3840 x 2160)
- Custom dimensions

## 🎨 Features

- ✨ Real-time audio reactive visualization
- 🎵 Advanced beat detection (bass, mids, treble)
- 🎬 Video recording at multiple resolutions
- 🔄 Smooth media transitions
- 🎨 Modular effect system
- 💾 Preset management
- ⚡ 60 FPS rendering
- 🎛️ LFO and envelope modulation

## 🐛 Troubleshooting

### Build Issues
```bash
npm run build
```

### Clear Cache
```bash
rm -rf node_modules dist
npm install
```

### Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Limited MediaRecorder support

## 📝 Development

### File Structure
```
/src
  /components
    /core         # Reusable components
  /examples       # Demo implementations
  /types         # TypeScript definitions
  /utils         # Utility functions
```

### Building for Production
```bash
npm run build
npm run preview
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test with `npm run build`
4. Submit a pull request

## 📄 License

MIT License - Feel free to use in your projects!

---

**Ready to create amazing visualizations!** 🎉