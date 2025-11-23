
# Astro-Vysio: Generative Music Visualizer

Astro-Vysio is a web-based generative art application that creates unique, audio-reactive music videos. It empowers users to bring their own media (images, videos, and audio) to life through a powerful effects engine. A key feature is the optional "Astrological Engine," which uses real-time astronomical data to influence and shape the visuals, adding a cosmic and unpredictable dimension to your creations.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables (optional - for AI features)
# Create a .env file with your Gemini API key:
# GEMINI_API_KEY=your_gemini_api_key_here
# Get your API key from: https://aistudio.google.com/app/apikey

# Run development server
npm run dev

# Build for production
npm run build
```

Then open http://localhost:3000 in your browser.

## 🆕 New: Reusable Components Library

Version 1.0 now includes a complete library of reusable visualization components that can be embedded in any application:

- **VisualizationEngine** - Core rendering engine without UI
- **HeadlessRecorder** - Record at 480p, 720p, 1080p, or 4K
- **AudioProcessor** - Standalone audio analysis
- **EffectPipeline** - Modular effects system
- **CanvasRenderer** - Isolated canvas operations
- **PresetManager** - Save and load configurations

### Example Usage

```tsx
import { VisualizationEngine, HeadlessRecorder, RESOLUTIONS } from './src/components/core';

const config = {
  resolution: RESOLUTIONS['720p'],
  mediaElements: [...],
  audioSource: audioElement,
  // ... configuration
};

<VisualizationEngine config={config} />
<HeadlessRecorder canvas={canvas} config={recordingConfig} />
```

See the [720p Demo](http://localhost:5173) for a working example or check `/src/components/core/README.md` for detailed documentation.

## Core Concepts

*   **Audio-Reactive:** The heart of the application. Visuals dynamically pulse, change, and evolve in response to the bass, mids, and highs of your music.
*   **Generative & Layer-Based:** Astro-Vysio doesn't just play video clips; it uses them as a texture source for a multi-layered effects system. Effects are stacked and blended in real-time to produce visuals that are more than the sum of their parts.
*   **User-Driven Content:** You are the creative director. The application is a blank canvas until you provide the visual and auditory inspiration. Use your own photos, video loops, and audio tracks.
*   **Celestial Influence:** Toggle the Astrological Engine to let the current positions of planets and the phase of the moon subtly (or dramatically) alter colors, effect intensity, and generative patterns.

---

## Features Walkthrough

The application is organized into three main tabs for setting up your visualization, plus the final performance screen.

### 1. Media Tab

This is where you load all your creative assets.

*   **Media Upload:**
    *   **Visual Sources:** Upload multiple images and videos. You can also enable your **webcam** as a live visual source.
    *   **Audio Source:** Upload a single audio track (MP3, WAV, etc.) or use your **microphone** for live audio input.
*   **Visuals Queue:** Once uploaded, your visuals appear in a queue. You can **drag and drop** to reorder them, or click to remove individual items.
*   **Transitions:** Control how the application moves from one visual to the next. Select from a variety of transition types (e.g., Cross Dissolve, Push, Digital Glitch) and adjust the **Transition Speed** to control how fast they occur.
*   **Video Playback:** Fine-tune how your video clips are handled. Control the **playback speed**, play them in **reverse**, and adjust the **sizing** (Fit to Width/Height) to manage aspect ratios.

### 2. Engine Tab

The Engine tab is the "brain" of the visualizer, controlling the logic behind *how* the effects and data sources interact.

*   **Celestial Data Source:**
    *   Enable or disable the Astrological Engine.
    *   **Cosmic Influence:** A master slider that controls how strongly the celestial data affects the visuals.
    *   **Planetary Focus:** Isolate the influence of a single celestial body (like Mars for intensity or Venus for softness) or use data from the whole solar system.
    *   **Time Offset:** Shift the astronomical data forward or backward in time to explore different cosmic alignments.
*   **Effect Evolution:**
    *   This system controls how effects change over the duration of your audio track.
    *   **Evolution Curve:** Define the pacing of the evolution—make it build slowly and end intensely (Exponential), start strong and fade out (Logarithmic), or progress steadily (Linear).
    *   **Randomization:** Add a degree of organic unpredictability to the evolution.
*   **Audio Reactivity:**
    *   Fine-tune how the app "hears" your music.
    *   **Frequency Response:** Adjust the sensitivity to **Bass, Mids, and Treble** independently.
    *   **Dynamics:** Control the **Attack** (how fast visuals react) and **Release** (how fast they fade).
*   **Global Modulation:**
    *   **LFO (Low-Frequency Oscillator):** Creates a continuous, rhythmic modulation (e.g., a sine wave) that you can target to almost any parameter, like grid size or bloom intensity, to create pulsing, automated movement.
    *   **Envelope Follower:** Uses the volume of an audio frequency (e.g., the bass) to control a parameter, making visuals directly "dance" to the sound.
*   **Global Visual Modifiers:**
    *   **Engine Presets:** Save and load the entire configuration of the Engine tab.
    *   **Global Intensity:** A master "volume knob" for all visual effects.
    *   **Visual Complexity:** Influences the level of detail in generative effects like grids or particles.
    *   **Color Palette:** Override the default astrological colors with a curated selection of palettes (e.g., Vaporwave, Fire & Ice).

### 3. FX & Kontrols Tab

This is your creative palette for designing the visual style.

*   **Style Browser:**
    *   Browse a library of pre-made **Style Presets**. Clicking one instantly loads a full stack of effects and parameters.
    *   **Style Blending:** Select two presets (A and B) and use the slider to seamlessly blend between them, creating entirely new hybrid styles. When you find a blend you like, you can click "Solidify Blend" to save it as a new custom preset.
    *   **Audio-Adaptive Suggestions:** If you've uploaded an audio file, click the "Analyze Audio" button to have the app intelligently select two presets that best match your track's vibe, giving you a perfect starting point for blending.
*   **AI Remix Engine:**
    *   This powerful tool uses the Gemini API to go beyond simple blending.
    *   Click the "AI Remix" button to open a panel where you can enter creative keywords (e.g., "dreamy, retro, soft glitch").
    *   The AI will analyze your audio, two base presets, and your keywords to generate two completely new, fine-tuned style suggestions for you to preview and use.
*   **Layer Stack:**
    *   Visuals are built from layers of effects. Here you can **add, remove, and reorder** these layers.
    *   Each layer can be **muted** or **soloed**, giving you precise control over the final composition.
*   **Parameter Editor:**
    *   When you select a layer in the stack, its specific parameters appear here.
    *   Adjust sliders and dropdowns to change everything from the number of segments in a kaleidoscope to the block size of a pixelate effect.

### The Visualizer Screen

Once you click "Generate Visualization", you enter the full-screen performance view.

*   **Live Kontrols:** A minimalist panel allows you to adjust the most important parameters (Global Intensity, Cosmic Influence, Visual Complexity) in real-time without leaving the visualizer.
*   **Record / Export:** Open the export modal to configure resolution, format, and framerate, then record your performance to a video file on your computer.

---

## Getting Started: A Quick Workflow

1.  **Load Media:** In the **Media** tab, upload a few images/videos and an audio track.
2.  **Pick a Style:** Go to the **FX & Kontrols** tab. In the **Style Browser**, click on different presets to see what you like.
3.  **Blend & Remix:** Use the **Style Blending** slider to mix two presets. Try the **AI Remix** button with some keywords to get unique, tailored visuals.
4.  **Tweak the Engine:** Navigate to the **Engine** tab. Try adjusting the **Cosmic Influence** and **Bass Response** sliders.
5.  **Generate:** Click the **Generate Visualization** button.
6.  **Perform:** Use the **Live Kontrols** panel that appears on the visualizer screen to make real-time adjustments.
7.  **Record:** When you're ready, click **Record / Export** to save your creation.

---

## 🤝 Share & Collaborate

**We'd love to see what you create!** Share your visualizations, ideas, and feedback with the community.

### Share Your Creations
- Post your visualizations on social media and tag us
- **[Open a Showcase Issue](https://github.com/kajica2/Astro-vyzor-main/issues/new?template=showcase.md)** to share screenshots or videos of what you've made
- Contribute your custom presets and effects to help others

### Help Make It Better
This project is actively evolving, and your input is invaluable! Here's how you can contribute:

- **Report Bugs:** Found something that doesn't work? Open an issue with details
- **Suggest Features:** Have an idea for a new effect or control? We'd love to hear it!
- **Improve Documentation:** Help make the project more accessible to others
- **Code Contributions:** Pull requests are welcome! Check out open issues for areas where help is needed
- **Test & Feedback:** Try new features and share your experience

📖 **See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.**

### 🚀 Upcoming Features

We're constantly working to expand Astro-Vysio's capabilities. Here's what's on the roadmap:

#### Vector Graphics Support
- **SVG-based visualizations** for infinite scalability
- **Vector effects engine** for crisp, resolution-independent visuals
- **Path-based animations** that respond to audio frequencies
- **Export to SVG/PDF** for print-quality outputs

#### 3D Visualization Engine
- **Three.js integration** for immersive 3D visualizations
- **3D particle systems** that react to audio in real-time
- **Volumetric effects** and depth-based layering
- **Camera controls** for dynamic 3D perspectives
- **3D model import** to use your own 3D assets
- **WebXR support** for virtual and augmented reality experiences

#### Additional Enhancements
- Real-time collaboration features
- Cloud-based preset sharing
- Advanced AI-powered style generation
- Multi-track audio support
- Performance optimizations for smoother playback

**Want to help build these features?** Check out our [Issues](https://github.com/kajica2/Astro-vyzor-main/issues) page or reach out to discuss how you can contribute!

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with passion for the intersection of music, art, and technology. Special thanks to all contributors and the open-source community.
