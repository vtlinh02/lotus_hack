import { useState, useCallback } from "react";
import { getChapterById } from "../story/chapters.js";

const STORAGE_KEY = "xray-story";

const DEFAULT_CHAPTER_ID = "ch1-slow-loop";

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    const storedId = data.currentChapterId ?? DEFAULT_CHAPTER_ID;
    const currentChapterId = getChapterById(storedId) ? storedId : DEFAULT_CHAPTER_ID;
    return {
      currentChapterId,
      completedIds: Array.isArray(data.completedIds) ? data.completedIds : [],
      wrongPathSeenIds: Array.isArray(data.wrongPathSeenIds) ? data.wrongPathSeenIds : [],
    };
  } catch {
    return {
      currentChapterId: DEFAULT_CHAPTER_ID,
      completedIds: [],
      wrongPathSeenIds: [],
    };
  }
}

function saveToStorage(state) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      currentChapterId: state.currentChapterId,
      completedIds: state.completedIds,
      wrongPathSeenIds: state.wrongPathSeenIds,
    })
  );
}

export function useStoryProgress() {
  const [state, setState] = useState(loadFromStorage);

  const markComplete = useCallback((id) => {
    setState((prev) => {
      const next = {
        ...prev,
        completedIds: prev.completedIds.includes(id) ? prev.completedIds : [...prev.completedIds, id],
      };
      saveToStorage(next);
      return next;
    });
  }, []);

  const markWrongPathSeen = useCallback((id) => {
    setState((prev) => {
      const next = {
        ...prev,
        wrongPathSeenIds: prev.wrongPathSeenIds.includes(id)
          ? prev.wrongPathSeenIds
          : [...prev.wrongPathSeenIds, id],
      };
      saveToStorage(next);
      return next;
    });
  }, []);

  const setCurrentChapter = useCallback((id) => {
    setState((prev) => {
      const next = { ...prev, currentChapterId: id };
      saveToStorage(next);
      return next;
    });
  }, []);

  const isComplete = useCallback(
    (id) => state.completedIds.includes(id),
    [state.completedIds]
  );

  return {
    ...state,
    markComplete,
    markWrongPathSeen,
    setCurrentChapter,
    isComplete,
  };
}
