// A splash that stays up for at least `minMs`, longer while `ready` is
// false, then plays a short exit before it is removed.
//
// The exit timer lives in its OWN effect, keyed only on the stage. Folding
// it into the effect that starts the exit meant starting the exit re-ran
// that effect, whose cleanup cancelled the timer — leaving an invisible
// splash covering the page forever.

import { useEffect, useState } from "react";

export type SplashStage = "showing" | "exiting" | "gone";

export function useMinimumSplash(ready: boolean, minMs: number, exitMs: number): SplashStage {
  const [minDone, setMinDone] = useState(false);
  const [stage, setStage] = useState<SplashStage>("showing");

  useEffect(() => {
    const t = setTimeout(() => { setMinDone(true); }, minMs);
    return () => { clearTimeout(t); };
  }, [minMs]);

  useEffect(() => {
    if (stage === "showing" && minDone && ready) setStage("exiting");
  }, [stage, minDone, ready]);

  useEffect(() => {
    if (stage !== "exiting") return;
    const t = setTimeout(() => { setStage("gone"); }, exitMs);
    return () => { clearTimeout(t); };
  }, [stage, exitMs]);

  return stage;
}
