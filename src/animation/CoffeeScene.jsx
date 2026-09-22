import { useEffect, useRef } from "react";

// Preserve the intro and flood when returning from a note.
let lastElapsed = 0;
let lastFloodTime = 0;
export default function CoffeeScene({
  replay,
  drain,
  paused,
  visible,
  layoutKey,
  onPhase,
  onStatus,
}) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const replaySeen = useRef(replay);
  const drainSeen = useRef(drain);
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
          initialFloodTime: lastFloodTime,
          onFloodTime: (value) => {
            lastFloodTime = value;
          },
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
    if (replay !== replaySeen.current) {
      replaySeen.current = replay;
      lastElapsed = 0;
      lastFloodTime = 0;
      engineRef.current?.restart();
    }
  }, [replay]);
  useEffect(() => {
    if (drain !== drainSeen.current) {
      drainSeen.current = drain;
      engineRef.current?.drain();
    }
  }, [drain]);
  return (
    <canvas className="coffee-canvas" ref={canvasRef} aria-hidden="true" />
  );
}
