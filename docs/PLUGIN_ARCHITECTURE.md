# Astro-Vysio Plugin Architecture Documentation

## Overview

The Astro-Vysio visualization platform has been completely modularized with a powerful plugin-based architecture. This enables maximum extensibility, code reusability, and clean separation of concerns.

## Core Architecture

### System Modules

The system is built on 9 core modules that work together:

```
┌─────────────────────────────────────────────────────────────┐
│                         Plugin SDK                           │
├─────────────┬──────────────┬──────────────┬────────────────┤
│   Event     │   Plugin     │  Dependency  │     State      │
│    Bus      │   Manager    │  Container   │     Store      │
├─────────────┼──────────────┼──────────────┼────────────────┤
│   Media     │    Audio     │    Effect    │    Render      │
│   Loader    │    Engine    │   Registry   │   Pipeline     │
└─────────────┴──────────────┴──────────────┴────────────────┘
```

## Core Modules

### 1. EventBus (`src/core/EventBus.ts`)
Central event system for loose coupling between modules.

**Features:**
- Typed events with TypeScript
- Priority handling
- Async operations
- Middleware support
- Event recording and replay

**Usage:**
```typescript
import { globalEventBus } from './core';

// Subscribe to events
globalEventBus.on('audio:beat', (data) => {
    console.log('Beat detected:', data);
});

// Emit events
globalEventBus.emit('effect:applied', { id: 'bloom' });
```

### 2. PluginManager (`src/core/PluginManager.ts`)
Manages plugin lifecycle, dependencies, and registration.

**Features:**
- Dependency resolution
- Topological sorting
- State management
- Health checks

**Plugin States:**
- `REGISTERED` - Plugin registered but not initialized
- `INITIALIZING` - Plugin is initializing
- `INITIALIZED` - Plugin initialized successfully
- `STARTING` - Plugin is starting
- `STARTED` - Plugin is running
- `STOPPING` - Plugin is stopping
- `STOPPED` - Plugin stopped
- `ERROR` - Plugin encountered an error
- `DESTROYED` - Plugin has been destroyed

### 3. DependencyContainer (`src/core/DependencyContainer.ts`)
IoC container for dependency injection and service management.

**Features:**
- Constructor injection
- Factory functions
- Singleton/transient lifetimes
- Service tagging
- Hierarchical containers

**Usage:**
```typescript
import { globalContainer } from './core';

// Register services
globalContainer.registerSingleton('MyService', MyService);
globalContainer.registerFactory('Logger', (container) => new Logger());

// Resolve services
const service = globalContainer.resolve<MyService>('MyService');
```

### 4. MediaLoader (`src/core/MediaLoader.ts`)
Modular media loading system with pluggable strategies.

**Built-in Strategies:**
- `ImageStrategy` - JPEG, PNG, GIF, WebP, SVG
- `VideoStrategy` - MP4, WebM, OGG
- `AudioStrategy` - MP3, WAV, OGG, M4A

**Features:**
- Retry logic
- Progress tracking
- Caching
- Batch loading

### 5. AudioEngine (`src/core/AudioEngine.ts`)
Modular audio processing with pluggable analysis strategies.

**Built-in Strategies:**
- `StandardAnalysisStrategy` - Basic frequency analysis
- `AdvancedAnalysisStrategy` - Spectral features
- `SimpleBeatDetectionStrategy` - Beat detection

**Features:**
- Real-time FFT analysis
- Beat detection
- Audio effects chain
- Volume control

### 6. EffectRegistry (`src/core/EffectRegistry.ts`)
Centralized effect management system.

**Effect Types:**
- `Canvas2DEffect` - 2D canvas effects
- `ShaderEffect` - WebGL shader effects
- `BaseEffect` - Abstract base class

**Features:**
- Effect layering
- Blend modes
- Trigger sources
- Parameter management

### 7. RenderPipeline (`src/core/RenderPipeline.ts`)
Modular rendering pipeline with multiple strategies.

**Strategies:**
- `Canvas2DStrategy` - 2D canvas rendering
- `WebGLStrategy` - WebGL 1.0 rendering
- `WebGL2Strategy` - WebGL 2.0 rendering

**Features:**
- Auto-selection of best strategy
- Render passes
- FPS tracking
- Performance monitoring

### 8. StateStore (`src/core/StateStore.ts`)
Centralized state management with reactive updates.

**Features:**
- Nested paths
- Subscriptions
- Persistence (localStorage/IndexedDB)
- Time travel (undo/redo)
- Middleware

**Usage:**
```typescript
import { globalStateStore } from './core';

// Set state
globalStateStore.set('app.theme', 'dark');

// Subscribe to changes
globalStateStore.subscribe('app.theme', (value, previousValue) => {
    console.log('Theme changed:', value);
});

// Undo/redo
globalStateStore.undo();
globalStateStore.redo();
```

### 9. PluginSDK (`src/core/PluginSDK.ts`)
Unified API for plugin development.

**Features:**
- Plugin context injection
- Logger per plugin
- Storage per plugin
- Inter-plugin communication

## Creating Plugins

### Basic Plugin Structure

```typescript
import { Plugin, PluginMetadata } from '../core';

export class MyPlugin implements Plugin {
    metadata: PluginMetadata = {
        id: 'my-plugin',
        name: 'My Plugin',
        version: '1.0.0',
        description: 'A sample plugin',
        dependencies: ['audio-engine'], // Optional
        provides: ['my-capability']     // Optional
    };

    async onInit(): Promise<void> {
        // Initialize plugin
    }

    async onStart(): Promise<void> {
        // Start plugin
    }

    async onStop(): Promise<void> {
        // Stop plugin
    }

    async onDestroy(): Promise<void> {
        // Cleanup
    }
}
```

### Using Base Classes

#### Effect Plugin
```typescript
import { EffectPlugin, Canvas2DEffect } from '../core';

class MyEffect extends Canvas2DEffect {
    metadata = {
        id: 'my-effect',
        name: 'My Effect',
        category: 'Custom',
        parameters: []
    };

    render(context: EffectContext): void {
        // Render effect
    }
}

class MyEffectPlugin extends EffectPlugin {
    metadata = {
        id: 'my-effect-plugin',
        name: 'My Effect Plugin',
        version: '1.0.0'
    };

    createEffect(): MyEffect {
        return new MyEffect();
    }
}
```

#### Audio Analysis Plugin
```typescript
import { AudioAnalysisPlugin, AnalysisStrategy } from '../core';

class MyAnalysisStrategy implements AnalysisStrategy {
    name = 'my-analysis';

    analyze(analyser: AnalyserNode, config: AudioConfig): AudioAnalysisData {
        // Perform analysis
    }

    reset(): void {
        // Reset state
    }
}

class MyAudioPlugin extends AudioAnalysisPlugin {
    createStrategy(): AnalysisStrategy {
        return new MyAnalysisStrategy();
    }
}
```

### Using Plugin Builder

```typescript
import { getGlobalSDK } from '../core';

const sdk = getGlobalSDK();
const plugin = sdk.builder()
    .id('simple-plugin')
    .name('Simple Plugin')
    .version('1.0.0')
    .description('A simple plugin')
    .dependencies(['event-bus'])
    .onInit(async () => {
        console.log('Plugin initialized');
    })
    .onStart(async () => {
        console.log('Plugin started');
    })
    .build();

// Register plugin
await sdk.registerPlugin(plugin);
```

## Plugin Communication

### Using Events

```typescript
// In plugin A
this.context.eventBus.emit('my-plugin:action', { data: 'value' });

// In plugin B
this.context.eventBus.on('my-plugin:action', (data) => {
    console.log('Received:', data);
});
```

### Using Plugin API

```typescript
// In plugin A - expose API
getAPI() {
    return {
        doSomething: (param: string) => {
            console.log('Doing something with:', param);
        }
    };
}

// In plugin B - call API
await this.context.api.call('plugin-a', 'doSomething', 'hello');
```

### Using State Store

```typescript
// In plugin A
this.context.stateStore.set('plugins.myPlugin.config', { enabled: true });

// In plugin B
this.context.stateStore.subscribe('plugins.myPlugin.config', (config) => {
    console.log('Plugin A config changed:', config);
});
```

## System Initialization

```typescript
import { CoreSystem } from './core';

// Create core system
const system = new CoreSystem({
    enableDebug: true,
    persistence: 'localStorage',
    plugins: ['kaleidoscope', 'spectrum-analyzer']
});

// Initialize
await system.initialize();

// Set render target
await system.renderPipeline.setTarget(canvas, 1280, 720);

// Connect audio
await system.audioEngine.connectSource(audioElement);

// Start rendering
system.renderPipeline.start();
system.audioEngine.start();

// Shutdown
await system.shutdown();
```

## Best Practices

### 1. Plugin Design
- Keep plugins focused on a single responsibility
- Use dependency injection for loose coupling
- Implement proper cleanup in `onDestroy()`
- Handle errors gracefully

### 2. Performance
- Use request animation frame for animations
- Implement level-of-detail for complex effects
- Cache expensive computations
- Clean up resources when not in use

### 3. State Management
- Use paths for organized state structure
- Subscribe only to needed paths
- Clean up subscriptions on destroy
- Use middleware for validation

### 4. Event Handling
- Use typed events when possible
- Clean up event listeners
- Don't emit events in tight loops
- Use event priorities for ordering

### 5. Resource Management
- Unload media when not needed
- Use object pools for frequent allocations
- Monitor memory usage
- Implement health checks

## Example: Complete Plugin

See `src/plugins/example-kaleidoscope.ts` for a complete example plugin that demonstrates:
- Effect creation
- Parameter management
- Audio reactivity
- Event handling
- API exposure
- Configuration

## Migration Guide

### From Old Architecture to Plugin-Based

1. **Effects**: Convert effect functions to `Effect` classes
2. **Audio Processing**: Create `AnalysisStrategy` implementations
3. **Media Loading**: Create `MediaStrategy` implementations
4. **State**: Move global state to `StateStore`
5. **Events**: Replace custom events with `EventBus`
6. **Services**: Register services in `DependencyContainer`

## Debugging

### Enable Debug Mode
```typescript
const system = new CoreSystem({ enableDebug: true });
```

### Monitor Events
```typescript
globalEventBus.enableDebug(); // Logs all events
```

### Check Plugin Status
```typescript
const states = pluginManager.getAllStates();
console.log('Plugin states:', states);
```

### Performance Monitoring
```typescript
const stats = system.getStats();
console.log('System statistics:', stats);
```

## API Reference

For detailed API documentation, see the TypeScript definitions in each module file.

## Support

For questions or issues:
1. Check the example plugin
2. Review the core module documentation
3. Enable debug mode for detailed logging
4. Create an issue on GitHub