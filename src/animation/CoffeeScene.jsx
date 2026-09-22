import { useEffect, useRef } from "react";

// Keep the lifetime independent from list filtering: the pot only plays once.
let lastElapsed = 0;
export default function CoffeeScene({
  replay,
  paused,
  visible,
  layoutKey,
  onPhase,
  onStatus,
}) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const stateRef = useRef({ paused, visible });
  stateRef.current = { paused, visible };
  useEffect(() => {
    let disposed = false;
    let engine;
    import("./engine.js")
      .then(({ createCoffeeScene }) => {
        if (disposed) return;
        engine = createCoffeeScene(canvasRef.current, {
          initialTime: lastElapsed,
          getState: () => stateRef.current,
          onPhase,
          onStatus,
          onTime: (t) => {
            lastElapsed = t;
          },
        });
        engineRef.current = engine;
      })
      .catch((error) => {
        console.error("Coffee scene could not start:", error);
        if (!disposed) onStatus("unavailable");
      });
    return () => {
      disposed = true;
      engine?.dispose();
      engineRef.current = null;
    };
  }, [onPhase, onStatus]);
  useEffect(() => {
    engineRef.current?.measure();
  }, [layoutKey]);
  useEffect(() => {
    if (replay > 0) {
      lastElapsed = 0;
      engineRef.current?.restart();
    }
  }, [replay]);
  return (
    <canvas className="coffee-canvas" ref={canvasRef} aria-hidden="true" />
  );
}
