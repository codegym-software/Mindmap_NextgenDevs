// src/hooks/useSync.ts
import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { useLocalMindmap } from "./useLocalMindmap";
// import { mindmapsApi } from "../services/mindmapsApi"; // TODO: nối BE

export function useSync() {
  const { isAuthenticated } = useAuth();
  const { load } = useLocalMindmap();

  useEffect(() => {
    load();
    // if (isAuthenticated()) mindmapsApi.syncGuest(...);
  }, [isAuthenticated, load]);
}
