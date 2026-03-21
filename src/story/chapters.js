export const CHAPTERS = [
  {
    id: "ch1-slow-shader",
    number: 1,
    title: "THE SLOW SHADER",
    narrative: [
      "> [08:14:03] PERF_ALERT: pixel_shader.glsl",
      "> frame_time: 18.3ms  |  target: <4ms",
      "> warp_utilization: 25%",
      "> assigned_to: YOU",
      "> hint: research [ warp utilization ] and [ SIMT lockstep ]",
      "> good luck.",
    ],
    context:
      "A warp of 32 GPU threads is rendering 32 adjacent pixels. 24 threads finished early and are now idle. The warp cannot advance until all 32 are done, so those 24 slots burn cycles doing nothing.",
    simulation: { initialMasked: 24, readonly: false },
    target: { utilization: 80, label: ">= 80% warp utilization" },
    termHints: ["warp utilization", "SIMT lockstep"],
    winMessage: [
      "> TARGET HIT.",
      "> warp_utilization: 81%",
      "> frame_time: 4.5ms",
      "> ticket closed.",
    ],
    isWrongPathChapter: false,
    wrongPath: null,
  },
  {
    id: "ch2-more-threads",
    number: 2,
    title: "MORE THREADS?",
    narrative: [
      "> [08:22:11] colleague_dm: 'just launch 2x more threads bro'",
      "> you doubled the thread count.",
      "> frame_time: 9.1ms  |  still not <4ms",
      "> warp_utilization: still 25%",
      "> hint: research [ thread occupancy ] and [ warp efficiency ]",
      "> something is wrong with this advice.",
    ],
    context:
      "The user doubled the GPU thread count. Each warp is still 25% utilized. They now have twice as many warps, each burning 75% of their cycles on idle lanes. Scaling a broken warp just scales the waste.",
    simulation: { initialMasked: 24, readonly: true },
    target: null,
    termHints: ["thread occupancy", "warp efficiency"],
    winMessage: [],
    isWrongPathChapter: true,
    wrongPath: {
      narrative: [
        "> analysis complete.",
        "> 2x threads × 25% utilization = 2x wasted cycles",
        "> throughput gain: 0%",
        "> your colleague was wrong.",
      ],
      lesson:
        "Scaling broken code scales the waste. Fix per-warp efficiency first. Only then scale.",
    },
  },
  {
    id: "ch3-branch",
    number: 3,
    title: "THE BRANCH",
    narrative: [
      "> [09:45:00] new_kernel: shadow_ray_cast.cu",
      "> profiler output:",
      ">   lane 00-15 → hits geometry  → 80 iterations",
      ">   lane 16-31 → hits sky       → 3 iterations",
      "> warp_utilization: 51%",
      "> hint: research [ branch divergence ] and [ thread coherence ]",
      "> the warp is splitting. figure out why.",
    ],
    context:
      "Half the warp's lanes take one code path (hit geometry, slow), the other half take another (hit sky, fast). The GPU must serialize both paths — fast lanes sit idle while slow ones finish. This is branch divergence.",
    simulation: { initialMasked: 16, readonly: false },
    target: { utilization: 90, label: ">= 90% warp utilization" },
    termHints: ["branch divergence", "thread coherence"],
    winMessage: [
      "> lanes unified.",
      "> warp_utilization: 94%",
      "> but wait — does this always work?",
    ],
    isWrongPathChapter: false,
    wrongPath: {
      narrative: [
        "> new scenario: 31 lanes hit sky (3 iters), 1 lane hits geometry (80 iters)",
        "> you eliminated the branch. all 32 lanes now run geometry code.",
        "> frame_time: 22ms. WORSE.",
        "> utilization: 100% — but you made everyone do more work.",
      ],
      lesson:
        "Branch divergence only hurts when the split is large. If 31/32 lanes take the fast path, the wasted slot costs almost nothing. Eliminating that branch forces all lanes to run the heavy path. Profile first. Never optimize blindly.",
    },
  },
];

export function getChapterById(id) {
  return CHAPTERS.find((c) => c.id === id) ?? null;
}

export function getNextChapter(currentId) {
  const i = CHAPTERS.findIndex((c) => c.id === currentId);
  if (i < 0 || i >= CHAPTERS.length - 1) return null;
  return CHAPTERS[i + 1];
}
