// Global loading service — React context-based.
//
// Features:
//   - Ref-counted: multiple concurrent show() calls don't cause flicker
//   - 200ms appear delay: fast operations never show the loader at all
//   - 400ms minimum display: once visible, never flashes briefly and disappears
//   - Smooth 240ms exit animation via LagdaLoader isExiting prop
//
// Usage:
//   1. Wrap your app with <LagdaLoadingProvider>
//   2. Call useLagdaLoading() to get { show, hide, isActive }
//   3. show("Verifying document…")  →  hide()

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LagdaLoader } from "../components/brand/LagdaLoader";

interface LagdaLoadingContextValue {
  show: (message?: string) => void;
  hide: () => void;
  /** True while the loader is mounted (includes the 240ms exit animation). */
  isActive: boolean;
}

const LagdaLoadingContext = createContext<LagdaLoadingContextValue>({
  show: () => {},
  hide: () => {},
  isActive: false,
});

const APPEAR_DELAY_MS = 200;
const MIN_DISPLAY_MS  = 400;
const EXIT_ANIM_MS    = 240;

export function LagdaLoadingProvider({ children }: { children: ReactNode }) {
  const [mounted,   setMounted]   = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [message,   setMessage]   = useState<string | undefined>();

  // Refs for values used in async callbacks (avoid stale closures).
  const countRef      = useRef(0);
  const mountedRef    = useRef(false);
  const shownAtRef    = useRef(0);
  const appearTimer   = useRef<ReturnType<typeof setTimeout>>();
  const hideTimer     = useRef<ReturnType<typeof setTimeout>>();
  const unmountTimer  = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback((msg?: string) => {
    countRef.current += 1;
    if (msg) setMessage(msg);

    // Cancel any in-progress hide sequence.
    clearTimeout(hideTimer.current);
    clearTimeout(unmountTimer.current);
    if (mountedRef.current) setIsExiting(false);

    if (countRef.current === 1 && !mountedRef.current) {
      clearTimeout(appearTimer.current);
      appearTimer.current = setTimeout(() => {
        if (countRef.current > 0) {
          mountedRef.current = true;
          shownAtRef.current = Date.now();
          setMounted(true);
        }
      }, APPEAR_DELAY_MS);
    }
  }, []);

  const hide = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    if (countRef.current > 0) return;

    // Cancel pending appear timer — loader never becomes visible if still waiting.
    clearTimeout(appearTimer.current);

    if (!mountedRef.current) return;

    // Ensure minimum display duration then start exit.
    const elapsed   = Date.now() - shownAtRef.current;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

    hideTimer.current = setTimeout(() => {
      setIsExiting(true);
      unmountTimer.current = setTimeout(() => {
        setMounted(false);
        setIsExiting(false);
        setMessage(undefined);
        mountedRef.current = false;
      }, EXIT_ANIM_MS);
    }, remaining);
  }, []);

  useEffect(() => () => {
    clearTimeout(appearTimer.current);
    clearTimeout(hideTimer.current);
    clearTimeout(unmountTimer.current);
  }, []);

  return (
    <LagdaLoadingContext.Provider value={{ show, hide, isActive: mounted }}>
      {children}
      {mounted && (
        <LagdaLoader
          mode="fullscreen"
          theme="dark"
          message={message}
          showWordmark
          isExiting={isExiting}
        />
      )}
    </LagdaLoadingContext.Provider>
  );
}

export function useLagdaLoading() {
  return useContext(LagdaLoadingContext);
}
