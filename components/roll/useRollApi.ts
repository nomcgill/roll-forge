"use client";

import { useCallback, useEffect, useState } from "react";
import type { HistoryGroup } from "@/lib/roll/engine";
import type { Tally } from "@/components/roll/types";

export function useRollApi(characterId: string) {
  const [history, setHistory] = useState<HistoryGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/characters/${characterId}/rolls`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`GET /rolls failed: ${res.status}`);
      const data = await res.json();
      setHistory(data.history ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load history");
    }
  }, [characterId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const execute = useCallback(
    async (payload: {
      actionTallies: Record<string, Tally>;
      perActionModifierIds: string[];
      perTurnModifierIds: string[];
    }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/characters/${characterId}/rolls`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`POST /rolls failed: ${res.status}`);
        const group: HistoryGroup = await res.json();
        setHistory((h) => [group, ...h]);
        return group;
      } catch (e: any) {
        setError(e?.message ?? "Failed to execute roll");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [characterId]
  );

  return { history, loading, error, refresh, execute, setHistory };
}
