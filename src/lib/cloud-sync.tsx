import { useEffect, useRef, useState } from "react";
import type { LoopState } from "./loop-types";
import { loadLoopStateFromCloud, saveLoopStateToCloud, useAuth } from "./auth";
import { getLoopState, setLoopState, useLoop } from "./loop-store";

export function CloudSync() {
  const auth = useAuth();
  const state = useLoop();
  const [hydratedUid, setHydratedUid] = useState<string | null>(null);
  const lastSaved = useRef("");
  const syncing = useRef(false);

  useEffect(() => {
    const uid = auth?.uid ?? null;
    if (!uid || hydratedUid === uid || syncing.current) return;
    syncing.current = true;
    void (async () => {
      try {
        const cloud = await loadLoopStateFromCloud();
        if (cloud && typeof cloud === "object") {
          const parsed = cloud as LoopState;
          setLoopState(() => parsed);
          lastSaved.current = JSON.stringify(parsed);
        } else {
          const local = getLoopState();
          await saveLoopStateToCloud(local);
          lastSaved.current = JSON.stringify(local);
        }
        setHydratedUid(uid);
      } catch (error) {
        console.error("BuildMyLogic cloud restore failed", error);
      } finally {
        syncing.current = false;
      }
    })();
  }, [auth, hydratedUid]);

  useEffect(() => {
    if (!auth || hydratedUid !== auth.uid || syncing.current) return;
    const serialized = JSON.stringify(state);
    if (serialized === lastSaved.current) return;
    const timer = window.setTimeout(() => {
      void saveLoopStateToCloud(state).then((saved) => {
        if (saved) lastSaved.current = serialized;
      }).catch((error) => console.error("BuildMyLogic cloud save failed", error));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [auth, hydratedUid, state]);

  useEffect(() => {
    if (!auth) {
      setHydratedUid(null);
      lastSaved.current = "";
    }
  }, [auth]);

  return null;
}

