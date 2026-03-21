import { useState, useCallback } from "react";

const STORAGE_KEY = "xray-progress";

function loadDoneSet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function useLessonProgress() {
  const [done, setDone] = useState(loadDoneSet);

  const markDone = useCallback((id) => {
    setDone((prev) => {
      const next = new Set([...prev, id]);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isDone = useCallback((id) => done.has(id), [done]);

  return { done, markDone, isDone };
}
