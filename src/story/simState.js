const TOTAL_LANES = 32;

/** Default sim state when entering a chapter */
export function getInitialSimState(chapter) {
  const sim = chapter.simulation ?? {};
  const type = sim.type ?? "warp";

  if (type === "warp") {
    const im = sim.initialMasked ?? 0;
    return {
      kind: "warp",
      maskedCount: im,
      activeLanes: TOTAL_LANES - im,
      utilization: ((TOTAL_LANES - im) / TOTAL_LANES) * 100,
    };
  }

  if (type === "sequential-vs-parallel") {
    return {
      kind: "sequential-vs-parallel",
      processingTimeMs: 1024,
      parallelWorkers: 1,
    };
  }

  if (type === "thread-count") {
    return {
      kind: "thread-count",
      threadCount: 2,
      speedup: 1,
      processingTimeMs: 1024,
    };
  }

  if (type === "race-condition") {
    return {
      kind: "race-condition",
      lastRunResult: null,
    };
  }

  if (type === "cpu-vs-gpu") {
    return {
      kind: "cpu-vs-gpu",
      architectureDemo: false,
    };
  }

  return {
    kind: "warp",
    maskedCount: 0,
    activeLanes: TOTAL_LANES,
    utilization: 100,
  };
}

export function meetsTarget(target, simState) {
  if (!target) return false;
  if (target.utilization != null && simState.utilization != null) {
    return simState.utilization >= target.utilization;
  }
  if (target.timeMs != null && simState.processingTimeMs != null) {
    return simState.processingTimeMs <= target.timeMs;
  }
  if (target.speedup != null && simState.speedup != null) {
    return simState.speedup >= target.speedup;
  }
  if (target.architectureDemo && simState.architectureDemo) {
    return true;
  }
  return false;
}

export function formatTargetCurrent(target, simState) {
  if (!target) return "";
  if (target.utilization != null && simState.utilization != null) {
    return `current: ${simState.utilization.toFixed(0)}%`;
  }
  if (target.timeMs != null && simState.processingTimeMs != null) {
    return `current: ${Math.round(simState.processingTimeMs)}ms`;
  }
  if (target.speedup != null && simState.speedup != null) {
    return `current: ${simState.speedup.toFixed(1)}x speedup`;
  }
  if (target.architectureDemo) {
    return simState.architectureDemo ? "current: demonstrated" : "current: run GPU demo";
  }
  return "";
}
