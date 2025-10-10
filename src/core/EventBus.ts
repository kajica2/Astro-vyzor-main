/**
 * EventBus - Central event system for loose coupling between modules
 * Supports typed events, priority handling, async operations, and middleware
 */

export type EventHandler<T = any> = (data: T) => void | Promise<void>;
export type EventMiddleware<T = any> = (data: T, next: () => void) => void | Promise<void>;

export interface EventOptions {
    priority?: number;
    once?: boolean;
    async?: boolean;
}

interface HandlerEntry {
    handler: EventHandler;
    priority: number;
    once: boolean;
    async: boolean;
    id: string;
}

// Event type definitions for type safety
export interface EventMap {
    // Core events
    'runtime:init': void;
    'runtime:ready': void;
    'runtime:shutdown': void;
    'runtime:error': Error;

    // Plugin events
    'plugin:register': { id: string; plugin: any };
    'plugin:loaded': { id: string };
    'plugin:unloaded': { id: string };
    'plugin:error': { id: string; error: Error };

    // Media events
    'media:loaded': { id: string; element: HTMLImageElement | HTMLVideoElement };
    'media:error': { id: string; error: Error };
    'media:progress': { id: string; progress: number };

    // Audio events
    'audio:ready': { context: AudioContext };
    'audio:beat': { type: 'bass' | 'mids' | 'highs'; strength: number };
    'audio:analysis': { bass: number; mids: number; highs: number; overall: number };
    'audio:error': Error;

    // Render events
    'render:frame': { time: number; deltaTime: number; fps: number };
    'render:start': void;
    'render:stop': void;

    // Effect events
    'effect:applied': { id: string; params: any };
    'effect:removed': { id: string };
    'effect:error': { id: string; error: Error };

    // Recording events
    'recording:start': { format: string; resolution: string };
    'recording:stop': { blob: Blob };
    'recording:progress': { duration: number };
    'recording:error': Error;

    // State events
    'state:change': { path: string; value: any; previousValue: any };
    'state:restore': { state: any };
    'state:save': { state: any };

    // Performance events
    'performance:warning': { metric: string; value: number; threshold: number };
    'performance:report': { fps: number; memory: number; cpu: number };
}

export class EventBus {
    private handlers: Map<keyof EventMap, HandlerEntry[]> = new Map();
    private middleware: EventMiddleware[] = [];
    private eventHistory: Array<{ event: keyof EventMap; data: any; timestamp: number }> = [];
    private recording: boolean = false;
    private replayMode: boolean = false;
    private handlerIdCounter: number = 0;

    constructor() {
        this.setupErrorHandling();
    }

    /**
     * Subscribe to an event with optional priority
     */
    on<K extends keyof EventMap>(
        event: K,
        handler: EventHandler<EventMap[K]>,
        options: EventOptions = {}
    ): string {
        const entry: HandlerEntry = {
            handler,
            priority: options.priority || 0,
            once: options.once || false,
            async: options.async || false,
            id: `handler_${++this.handlerIdCounter}`
        };

        if (!this.handlers.has(event)) {
            this.handlers.set(event, []);
        }

        const handlers = this.handlers.get(event)!;
        handlers.push(entry);

        // Sort by priority (higher priority first)
        handlers.sort((a, b) => b.priority - a.priority);

        return entry.id;
    }

    /**
     * Subscribe to an event that fires only once
     */
    once<K extends keyof EventMap>(
        event: K,
        handler: EventHandler<EventMap[K]>,
        options: EventOptions = {}
    ): string {
        return this.on(event, handler, { ...options, once: true });
    }

    /**
     * Unsubscribe from an event
     */
    off<K extends keyof EventMap>(event: K, handlerId: string): void {
        const handlers = this.handlers.get(event);
        if (handlers) {
            const index = handlers.findIndex(h => h.id === handlerId);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Emit an event to all subscribers
     */
    async emit<K extends keyof EventMap>(event: K, data: EventMap[K]): Promise<void> {
        // Record event if recording
        if (this.recording && !this.replayMode) {
            this.eventHistory.push({
                event,
                data: JSON.parse(JSON.stringify(data)),
                timestamp: Date.now()
            });
        }

        // Process middleware
        await this.processMiddleware(data);

        const handlers = this.handlers.get(event);
        if (!handlers || handlers.length === 0) return;

        // Create a copy to handle one-time handlers
        const handlersCopy = [...handlers];

        for (const entry of handlersCopy) {
            try {
                if (entry.async) {
                    await entry.handler(data);
                } else {
                    entry.handler(data);
                }

                if (entry.once) {
                    this.off(event, entry.id);
                }
            } catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
                this.emit('runtime:error', error as Error);
            }
        }
    }

    /**
     * Add middleware to process all events
     */
    use(middleware: EventMiddleware): void {
        this.middleware.push(middleware);
    }

    /**
     * Process middleware chain
     */
    private async processMiddleware(data: any): Promise<void> {
        let index = 0;

        const next = async () => {
            if (index < this.middleware.length) {
                const currentMiddleware = this.middleware[index++];
                await currentMiddleware(data, next);
            }
        };

        await next();
    }

    /**
     * Clear all event handlers
     */
    clear(event?: keyof EventMap): void {
        if (event) {
            this.handlers.delete(event);
        } else {
            this.handlers.clear();
        }
    }

    /**
     * Start recording events
     */
    startRecording(): void {
        this.recording = true;
        this.eventHistory = [];
    }

    /**
     * Stop recording events
     */
    stopRecording(): Array<{ event: keyof EventMap; data: any; timestamp: number }> {
        this.recording = false;
        return this.eventHistory;
    }

    /**
     * Replay recorded events
     */
    async replay(
        events: Array<{ event: keyof EventMap; data: any; timestamp: number }>,
        speed: number = 1
    ): Promise<void> {
        this.replayMode = true;

        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            const nextEvent = events[i + 1];

            await this.emit(event.event, event.data);

            if (nextEvent) {
                const delay = (nextEvent.timestamp - event.timestamp) / speed;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        this.replayMode = false;
    }

    /**
     * Get event statistics
     */
    getStats(): {
        totalHandlers: number;
        eventTypes: number;
        historySize: number;
        events: Array<{ event: string; handlerCount: number }>;
    } {
        const events = Array.from(this.handlers.entries()).map(([event, handlers]) => ({
            event: event as string,
            handlerCount: handlers.length
        }));

        return {
            totalHandlers: events.reduce((sum, e) => sum + e.handlerCount, 0),
            eventTypes: this.handlers.size,
            historySize: this.eventHistory.length,
            events
        };
    }

    /**
     * Setup global error handling
     */
    private setupErrorHandling(): void {
        if (typeof window !== 'undefined') {
            window.addEventListener('unhandledrejection', (event) => {
                this.emit('runtime:error', new Error(event.reason));
            });

            window.addEventListener('error', (event) => {
                this.emit('runtime:error', event.error);
            });
        }
    }

    /**
     * Wait for an event to occur
     */
    waitFor<K extends keyof EventMap>(
        event: K,
        timeout?: number
    ): Promise<EventMap[K]> {
        return new Promise((resolve, reject) => {
            const timeoutId = timeout
                ? setTimeout(() => {
                    this.off(event, handlerId);
                    reject(new Error(`Timeout waiting for event: ${event}`));
                }, timeout)
                : null;

            const handlerId = this.once(event, (data) => {
                if (timeoutId) clearTimeout(timeoutId);
                resolve(data);
            });
        });
    }

    /**
     * Create a filtered event stream
     */
    filter<K extends keyof EventMap>(
        event: K,
        predicate: (data: EventMap[K]) => boolean
    ): {
        on: (handler: EventHandler<EventMap[K]>) => string;
        off: (handlerId: string) => void;
    } {
        const filteredHandlers: Map<string, string> = new Map();

        return {
            on: (handler: EventHandler<EventMap[K]>) => {
                const wrappedHandler = (data: EventMap[K]) => {
                    if (predicate(data)) {
                        handler(data);
                    }
                };

                const handlerId = this.on(event, wrappedHandler);
                const filteredId = `filtered_${handlerId}`;
                filteredHandlers.set(filteredId, handlerId);
                return filteredId;
            },
            off: (filteredId: string) => {
                const handlerId = filteredHandlers.get(filteredId);
                if (handlerId) {
                    this.off(event, handlerId);
                    filteredHandlers.delete(filteredId);
                }
            }
        };
    }

    /**
     * Debug mode - log all events
     */
    enableDebug(): void {
        this.use((data, next) => {
            console.log('[EventBus]', data);
            next();
        });
    }
}

// Singleton instance
export const globalEventBus = new EventBus();

// Export convenience functions
export const on = globalEventBus.on.bind(globalEventBus);
export const once = globalEventBus.once.bind(globalEventBus);
export const off = globalEventBus.off.bind(globalEventBus);
export const emit = globalEventBus.emit.bind(globalEventBus);
export const waitFor = globalEventBus.waitFor.bind(globalEventBus);