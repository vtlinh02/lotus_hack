import { useState, useEffect } from "react";

/**
 * Absolute URL to Emscripten glue in /public/wasm (same origin as .wasm).
 * Built at runtime so Vite/Rollup does not try to bundle public assets.
 */
function wasmGlueUrl() {
  const base = import.meta.env.BASE_URL || "/";
  const root =
    typeof window !== "undefined"
      ? window.location.origin + (base.endsWith("/") ? base : `${base}/`)
      : base;
  return new URL("wasm/warp_sim.js", root).href;
}

/** One shared Emscripten module for all lessons (avoids reload on navigation). */
let wasmModulePromise = null;

function getWasmModulePromise() {
  if (!wasmModulePromise) {
    const url = wasmGlueUrl();
    wasmModulePromise = import(/* @vite-ignore */ url).then((m) => m.default());
  }
  return wasmModulePromise;
}

/**
 * Loads the Emscripten modularized build from /public/wasm/warp_sim.js.
 * Returns null until ready; components should show a loading state.
 */
export function useWasm() {
  const [module, setModule] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getWasmModulePromise()
      .then((instance) => {
        if (!cancelled) setModule(instance);
      })
      .catch((e) => {
        if (!cancelled) setError(e);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { module, error };
}
