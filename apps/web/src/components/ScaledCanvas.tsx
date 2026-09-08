import { useEffect, useRef, type ReactNode } from 'react';

export type ScaledCanvasProps = {
  width?: number;
  height?: number;
  children: ReactNode;
};

/**
 * Renders children into a fixed design canvas and scales it with a single CSS
 * transform to letterbox-fit the viewport.
 *
 * This is what lets the classroom arena be authored once, in absolute pixels
 * against the 1920x1080 reference, and still land pixel-proportionally on any
 * projector or TV. The scale is written to a style property on a ref rather than
 * held in React state, so resizing never triggers a rerender of the arena tree.
 */
export function ScaledCanvas({ width = 1920, height = 1080, children }: ScaledCanvasProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!frame || !canvas) return;

    const fit = (): void => {
      const { clientWidth, clientHeight } = frame;
      if (clientWidth === 0 || clientHeight === 0) return;
      const scale = Math.min(clientWidth / width, clientHeight / height);
      canvas.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    window.addEventListener('orientationchange', fit);

    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', fit);
    };
  }, [width, height]);

  return (
    <div ref={frameRef} className="relative h-full w-full overflow-hidden bg-ink">
      <div
        ref={canvasRef}
        className="absolute left-1/2 top-1/2 origin-center"
        style={{ width, height, transform: 'translate(-50%, -50%) scale(1)' }}
      >
        {children}
      </div>
    </div>
  );
}
