"use client";
import { useRef, useCallback } from "react";

type Options = { onLongPress: () => void; delay?: number };

export function useLongPress({ onLongPress, delay = 400 }: Options) {
  const timer = useRef<number | null>(null);

  const onPointerDown = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      onLongPress();
      timer.current && window.clearTimeout(timer.current);
      timer.current = null;
    }, delay);
  }, [onLongPress, delay]);

  const clear = useCallback(() => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  return {
    onPointerDown,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
  };
}
