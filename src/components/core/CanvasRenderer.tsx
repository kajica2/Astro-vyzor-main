import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { CanvasRendererProps } from '../../types/visualization';

export interface CanvasRendererHandle {
    getCanvas: () => HTMLCanvasElement | null;
    getContext: () => CanvasRenderingContext2D | null;
    getOffscreenCanvas: () => OffscreenCanvas | null;
    clear: () => void;
    resize: (width: number, height: number) => void;
    captureImage: (format?: string, quality?: number) => string | null;
    captureImageData: () => ImageData | null;
    drawImage: (image: CanvasImageSource, x?: number, y?: number, width?: number, height?: number) => void;
}

export const CanvasRenderer = forwardRef<CanvasRendererHandle, CanvasRendererProps>(
    ({ width, height, offscreen = false, preserveDrawingBuffer = false }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const offscreenCanvasRef = useRef<OffscreenCanvas | null>(null);
        const contextRef = useRef<CanvasRenderingContext2D | null>(null);
        const offscreenContextRef = useRef<OffscreenCanvasRenderingContext2D | null>(null);

        useEffect(() => {
            if (offscreen && typeof OffscreenCanvas !== 'undefined') {
                // Create offscreen canvas
                const offCanvas = new OffscreenCanvas(width, height);
                const offCtx = offCanvas.getContext('2d');

                if (offCtx) {
                    offscreenCanvasRef.current = offCanvas;
                    offscreenContextRef.current = offCtx;
                }
            }

            // Setup regular canvas
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d', {
                    alpha: true,
                    desynchronized: true,
                    ...(preserveDrawingBuffer && { willReadFrequently: true })
                });

                if (ctx) {
                    contextRef.current = ctx;

                    // Set default properties
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                }
            }
        }, [offscreen, width, height, preserveDrawingBuffer]);

        const getCanvas = useCallback(() => canvasRef.current, []);

        const getContext = useCallback(() => {
            if (offscreen && offscreenContextRef.current) {
                return offscreenContextRef.current as any as CanvasRenderingContext2D;
            }
            return contextRef.current;
        }, [offscreen]);

        const getOffscreenCanvas = useCallback(() => offscreenCanvasRef.current, []);

        const clear = useCallback(() => {
            const ctx = offscreen ? offscreenContextRef.current : contextRef.current;
            const targetCanvas = offscreen ? offscreenCanvasRef.current : canvasRef.current;

            if (ctx && targetCanvas) {
                ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
            }
        }, [offscreen]);

        const resize = useCallback((newWidth: number, newHeight: number) => {
            if (canvasRef.current) {
                canvasRef.current.width = newWidth;
                canvasRef.current.height = newHeight;
            }

            if (offscreenCanvasRef.current) {
                offscreenCanvasRef.current.width = newWidth;
                offscreenCanvasRef.current.height = newHeight;
            }
        }, []);

        const captureImage = useCallback((format: string = 'image/png', quality: number = 1.0): string | null => {
            if (!canvasRef.current) return null;

            try {
                return canvasRef.current.toDataURL(format, quality);
            } catch (error) {
                console.error('Failed to capture image:', error);
                return null;
            }
        }, []);

        const captureImageData = useCallback((): ImageData | null => {
            const ctx = offscreen ? offscreenContextRef.current : contextRef.current;
            const targetCanvas = offscreen ? offscreenCanvasRef.current : canvasRef.current;

            if (!ctx || !targetCanvas) return null;

            try {
                return ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
            } catch (error) {
                console.error('Failed to capture image data:', error);
                return null;
            }
        }, [offscreen]);

        const drawImage = useCallback((
            image: CanvasImageSource,
            x: number = 0,
            y: number = 0,
            width?: number,
            height?: number
        ) => {
            const ctx = offscreen ? offscreenContextRef.current : contextRef.current;
            const targetCanvas = offscreen ? offscreenCanvasRef.current : canvasRef.current;

            if (!ctx || !targetCanvas) return;

            const drawWidth = width ?? targetCanvas.width;
            const drawHeight = height ?? targetCanvas.height;

            ctx.drawImage(image, x, y, drawWidth, drawHeight);
        }, [offscreen]);

        useImperativeHandle(ref, () => ({
            getCanvas,
            getContext,
            getOffscreenCanvas,
            clear,
            resize,
            captureImage,
            captureImageData,
            drawImage
        }), [
            getCanvas,
            getContext,
            getOffscreenCanvas,
            clear,
            resize,
            captureImage,
            captureImageData,
            drawImage
        ]);

        if (offscreen && !canvasRef.current) {
            // For pure offscreen rendering, return null (no DOM element)
            return null;
        }

        return (
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    imageRendering: 'auto'
                }}
            />
        );
    }
);

CanvasRenderer.displayName = 'CanvasRenderer';

// Standalone canvas utilities
export class StandaloneCanvasRenderer {
    private canvas: HTMLCanvasElement | OffscreenCanvas;
    private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

    constructor(width: number, height: number, offscreen: boolean = false) {
        if (offscreen && typeof OffscreenCanvas !== 'undefined') {
            this.canvas = new OffscreenCanvas(width, height);
            this.ctx = this.canvas.getContext('2d')!;
        } else {
            this.canvas = document.createElement('canvas');
            this.canvas.width = width;
            this.canvas.height = height;
            this.ctx = this.canvas.getContext('2d')!;
        }

        // Set default properties
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    getCanvas(): HTMLCanvasElement | OffscreenCanvas {
        return this.canvas;
    }

    getContext(): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
        return this.ctx;
    }

    clear(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    resize(width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    drawImage(
        image: CanvasImageSource,
        x: number = 0,
        y: number = 0,
        width?: number,
        height?: number
    ): void {
        const drawWidth = width ?? this.canvas.width;
        const drawHeight = height ?? this.canvas.height;
        this.ctx.drawImage(image, x, y, drawWidth, drawHeight);
    }

    captureImageData(): ImageData {
        return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }

    captureBlob(callback: (blob: Blob | null) => void, type: string = 'image/png', quality?: number): void {
        if (this.canvas instanceof HTMLCanvasElement) {
            this.canvas.toBlob(callback, type, quality);
        } else if (this.canvas instanceof OffscreenCanvas) {
            this.canvas.convertToBlob({ type, quality }).then(callback);
        }
    }

    destroy(): void {
        this.clear();
        // Release references
        (this as any).canvas = null;
        (this as any).ctx = null;
    }
}