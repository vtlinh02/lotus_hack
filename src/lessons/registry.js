import { lesson0Meta } from "./lesson0-simt/meta.js";
import { lesson2Meta } from "./lesson2-divergence/meta.js";
import { lesson3Meta } from "./lesson3-coalescing/meta.js";
import { lesson4Meta } from "./lesson4-shared-memory/meta.js";

/**
 * Single source of truth for lessons. To add a lesson:
 * 1. Create a folder under src/lessons/ with meta.js, Theory.jsx, Simulation.jsx, index.jsx
 * 2. Append (or prepend) an entry here with component: () => import('./your-lesson/index.jsx')
 */
export const LESSONS = [
  {
    ...lesson0Meta,
    component: () => import("./lesson0-simt/index.jsx"),
  },
  {
    ...lesson2Meta,
    number: 2,
    component: () => import("./lesson2-divergence/index.jsx"),
  },
  {
    ...lesson3Meta,
    number: 3,
    component: () => import("./lesson3-coalescing/index.jsx"),
  },
  {
    ...lesson4Meta,
    component: () => import("./lesson4-shared-memory/index.jsx"),
  },
];

export function getLessonById(id) {
  return LESSONS.find((l) => l.id === id) ?? null;
}

export function getNextLesson(currentId) {
  const i = LESSONS.findIndex((l) => l.id === currentId);
  if (i < 0 || i >= LESSONS.length - 1) return null;
  return LESSONS[i + 1];
}
