export const CHAPTERS = [
  {
    id: "ch1-slow-loop",
    number: 1,
    title: "THE SLOW LOOP",
    narrative: [
      "> [STARTUP] loading image renderer...",
      "> processing 1024 pixels sequentially",
      "> estimated time: 1.024 seconds",
      "> user experience: frozen screen",
      "> hint: research [ parallelism ] and [ concurrent execution ]",
      "> can we do better?",
    ],
    codeSnippet: {
      filename: "render.cpp",
      lines: [
        { code: "// render 1024 pixels, one at a time" },
        { code: "for (int i = 0; i < 1024; i++) {" },
        {
          code: "    pixels[i] = computeColor(i);  // ~1ms each",
          highlight: true,
          annotation: "← sequential bottleneck",
        },
        { code: "}" },
        {
          code: "// total: 1024ms. user sees a frozen screen.",
          highlight: true,
          annotation: "← unacceptable for real-time",
        },
      ],
    },
    context:
      "A naive C++ loop processes one pixel per iteration. Total time is the sum of all work. The student needs to see that splitting work across workers reduces wall-clock time.",
    simulation: { type: "sequential-vs-parallel" },
    target: { timeMs: 200, label: "< 200ms estimated frame time" },
    termHints: ["parallelism", "concurrent execution"],
    optimize: {
      prompt: "how can we reduce the 1024ms render time?",
      parallelWorkers: 8,
      choices: [
        {
          label: "Use a faster CPU",
          correct: false,
          feedback: [
            "> still sequential. same 1024 iterations.",
            "> hint: the bottleneck is doing work one-by-one.",
          ],
        },
        {
          label: "Split the work across multiple workers so pixels compute simultaneously",
          correct: true,
          feedback: [
            "> correct mental model.",
            "> parallel workers → wall-clock time drops (idealized).",
            "> try the simulation — workers now > 1.",
          ],
        },
        {
          label: "Reduce the image to 512 pixels",
          correct: false,
          feedback: [
            "> halved the quality.",
            "> user wants full resolution.",
            "> hint: more throughput, not less work.",
          ],
        },
      ],
    },
    winMessage: [
      "> TARGET HIT.",
      "> processing time: 128ms",
      "> user sees smooth frames.",
      "> lesson complete.",
    ],
    isWrongPathChapter: false,
    wrongPath: null,
  },
  {
    id: "ch2-first-threads",
    number: 2,
    title: "FIRST THREADS",
    narrative: [
      "> [PROGRESS] you learned about parallelism",
      "> time to split the work across threads",
      "> hint: research [ thread ] and [ join (barrier) ]",
      "> your first std::thread call awaits",
    ],
    codeSnippet: {
      filename: "render.cpp",
      lines: [
        { code: "#include <thread>" },
        { code: "" },
        { code: "void renderChunk(int* pixels, int start, int end) {" },
        { code: "    for (int i = start; i < end; i++)" },
        { code: "        pixels[i] = computeColor(i);" },
        { code: "}" },
        { code: "" },
        { code: "int main() {" },
        { code: "    int pixels[1024];" },
        {
          code: "    std::thread t1(renderChunk, pixels, 0, 512);",
          highlight: true,
          annotation: "← thread 1: pixels 0-511",
        },
        {
          code: "    std::thread t2(renderChunk, pixels, 512, 1024);",
          highlight: true,
          annotation: "← thread 2: pixels 512-1023",
        },
        {
          code: "    t1.join();",
          highlight: true,
          annotation: "← wait for t1 to finish",
        },
        {
          code: "    t2.join();",
          highlight: true,
          annotation: "← wait for t2 to finish",
        },
        { code: "}" },
        { code: "// 2 threads → ~512ms. what if we had more threads?" },
      ],
    },
    context:
      "std::thread launches concurrent execution paths. join() waits for completion. More independent chunks can run in parallel if the hardware has capacity.",
    simulation: { type: "thread-count" },
    target: { speedup: 8, label: ">= 8x speedup (ideal model)" },
    termHints: ["thread", "join (barrier)"],
    optimize: {
      prompt: "we have 2 threads. how do we get faster?",
      unlockMaxThreads: 32,
      choices: [
        {
          label: "Launch many threads (e.g. one chunk per core or more) so more work runs at once",
          correct: true,
          feedback: [
            "> right idea.",
            "> independent pixels → more threads → higher throughput (until hardware limits).",
            "> thread slider unlocked — push toward 8+.",
          ],
        },
        {
          label: "Launch exactly 2 more threads to make 4 total",
          correct: false,
          feedback: [
            "> helps, but still far from 8x.",
            "> hint: with independent pixels, scale thread count toward parallelism.",
          ],
        },
        {
          label: "Make each thread run computeColor faster",
          correct: false,
          feedback: [
            "> you can't wish the algorithm faster.",
            "> hint: gain comes from doing more at once.",
          ],
        },
      ],
    },
    winMessage: [
      "> TARGET HIT.",
      "> 8+ threads → ~8x speedup in this model.",
      "> lesson complete.",
    ],
    isWrongPathChapter: false,
    wrongPath: null,
  },
  {
    id: "ch3-the-collision",
    number: 3,
    title: "THE COLLISION",
    narrative: [
      "> [DEBUG] counting bright pixels across threads",
      "> expected: 317 bright pixels",
      "> run 1: 289. run 2: 301. run 3: 294.",
      "> the result changes every time.",
      "> hint: research [ race condition ] and [ mutex ]",
      "> something is wrong",
    ],
    codeSnippet: {
      filename: "count_bright.cpp",
      lines: [
        { code: "int totalBright = 0;  // shared across all threads" },
        { code: "" },
        { code: "void countBright(int* pixels, int start, int end) {" },
        { code: "    for (int i = start; i < end; i++) {" },
        { code: "        if (pixels[i] > 200)" },
        {
          code: "            totalBright++;    // two threads RMW at once",
          highlight: true,
          annotation: "← RACE: interleaved access",
        },
        { code: "    }" },
        { code: "}" },
        { code: "// expected: 317. actual: varies." },
      ],
    },
    context:
      "Concurrent read-modify-write on shared memory without synchronization causes lost updates and non-deterministic results.",
    simulation: { type: "race-condition" },
    target: null,
    termHints: ["race condition", "mutex"],
    optimize: {
      prompt: "what fixes the non-deterministic count?",
      choices: [
        {
          label: "Run threads one at a time to avoid the conflict",
          correct: false,
          feedback: [
            "> sequential again. no real parallelism.",
            "> hint: keep threads, protect shared data.",
          ],
        },
        {
          label: "Protect the shared variable with a mutex so only one thread increments at a time",
          correct: true,
          feedback: [
            "> correct.",
            "> shared state + concurrent writes = race.",
            "> mutex serializes the critical section.",
          ],
        },
        {
          label: "Give each thread its own counter and sum at the end",
          correct: false,
          feedback: [
            "> also valid in practice.",
            "> this lesson highlights mutex as the classic fix — pick B next time.",
          ],
        },
      ],
    },
    winMessage: [],
    isWrongPathChapter: true,
    wrongPath: {
      narrative: [
        "> mutex applied.",
        "> count stable: 317.",
        "> lesson: parallelism introduces synchronization problems.",
      ],
      lesson:
        "Shared mutable state with concurrent writes causes race conditions. Use mutexes, atomics, or partition data so threads do not collide.",
    },
  },
  {
    id: "ch4-1024-cores",
    number: 4,
    title: "1024 CORES",
    narrative: [
      "> [ARCHITECTURE] your CPU: 8 cores",
      "> each core is fast. each runs different code.",
      "> 1024 threads? the OS time-slices. overhead.",
      ">",
      "> the GPU: 1024+ simpler cores. same instruction, many lanes.",
      "> hint: research [ SIMT ] and [ throughput vs latency ]",
    ],
    codeSnippet: {
      filename: "architecture.txt",
      lines: [
        { code: "// CPU: few fast cores, independent programs" },
        { code: "// good for 8 threads; 1024 threads → scheduling cost" },
        { code: "" },
        { code: "// GPU: many simple cores" },
        { code: "// each weaker than a CPU core — but massively parallel" },
        {
          code: "// SAME instruction broadcast to many threads at once",
          highlight: true,
          annotation: "← SIMT",
        },
        { code: "// one op × N threads = N data elements" },
        { code: "" },
        { code: "// analogy: CPU = few head chefs / GPU = huge prep line" },
      ],
    },
    context:
      "GPUs optimize for throughput on uniform parallel work. CPUs optimize for latency and diverse control flow. They complement each other.",
    simulation: { type: "cpu-vs-gpu" },
    target: { architectureDemo: true, label: "Run GPU demo (throughput)" },
    termHints: ["SIMT", "throughput vs latency"],
    optimize: {
      prompt: "why is the GPU faster for uniform pixel-style work?",
      choices: [
        {
          label: "Each GPU core is more powerful than a CPU core",
          correct: false,
          feedback: [
            "> false. GPU cores are simpler and weaker.",
            "> hint: strength in numbers.",
          ],
        },
        {
          label: "The GPU has thousands of cores doing the same operation on different data",
          correct: true,
          feedback: [
            "> yes — throughput via width.",
            "> SIMT: one instruction, many threads.",
          ],
        },
        {
          label: "The GPU replaces the CPU completely",
          correct: false,
          feedback: [
            "> no. CPU still runs OS, I/O, irregular code.",
            "> hint: GPU for parallel kernels.",
          ],
        },
      ],
    },
    winMessage: [
      "> TARGET HIT.",
      "> GPU = throughput machine.",
      "> next: the warp.",
    ],
    isWrongPathChapter: false,
    wrongPath: null,
  },
  {
    id: "ch5-the-warp",
    number: 5,
    title: "THE WARP",
    narrative: [
      "> [08:14:03] PERF_ALERT: pixel_shader",
      "> frame_time: 18.3ms  |  target: <4ms",
      "> warp_utilization: 25%",
      "> hint: research [ warp ] and [ lockstep execution ]",
      "> 24 of 32 lanes idle. why?",
    ],
    codeSnippet: {
      filename: "shade_pseudo.cpp",
      lines: [
        { code: "// a warp = 32 GPU threads in lockstep" },
        { code: "void shade(int lane) {" },
        { code: "    vec4 color = texture(albedo, uv[lane]);" },
        {
          code: "    if (isSkyPixel(lane)) {",
          highlight: true,
          annotation: "← 24 of 32 lanes exit here",
        },
        {
          code: "        return;",
          highlight: true,
          annotation: "← lanes go IDLE",
        },
        { code: "    }" },
        {
          code: "    color *= computeLighting(lane);",
          annotation: "← only 8 lanes reach this",
        },
        { code: "    output[lane] = color;" },
        { code: "}" },
      ],
    },
    context:
      "A warp of 32 GPU threads advances together. Early-exiting lanes sit idle while others finish — poor utilization.",
    simulation: { type: "warp", initialMasked: 24, readonly: false },
    target: { utilization: 80, label: ">= 80% warp utilization" },
    termHints: ["warp", "lockstep execution"],
    optimize: {
      prompt: "which of these fixes the warp utilization problem?",
      fixedMasked: 4,
      choices: [
        {
          label: "Remove the isSkyPixel check — run computeLighting() on all 32 lanes",
          correct: false,
          feedback: [
            "> all lanes busy — but sky does extra work.",
            "> frame_time worse.",
            "> hint: idle vs wasted work.",
          ],
        },
        {
          label: "Sort or group pixels so similar work fills each warp",
          correct: true,
          feedback: [
            "> coherent warps.",
            "> utilization jumps in the sim.",
          ],
        },
        {
          label: "Only increase thread block size to 128",
          correct: false,
          feedback: [
            "> same per-warp divergence.",
            "> hint: fix the lane pattern first.",
          ],
        },
      ],
    },
    winMessage: [
      "> TARGET HIT.",
      "> warp_utilization: 87%",
      "> frame_time: 4.5ms",
      "> ticket closed.",
    ],
    isWrongPathChapter: false,
    wrongPath: null,
  },
  {
    id: "ch6-the-branch",
    number: 6,
    title: "THE BRANCH",
    narrative: [
      "> [09:45:00] new_kernel: shadow_ray_cast.cu",
      "> profiler: lane 00-15 → geometry (80 iters), lane 16-31 → sky (3 iters)",
      "> warp_utilization: 51%",
      "> hint: research [ branch divergence ] and [ thread coherence ]",
      "> the warp is splitting",
    ],
    codeSnippet: {
      filename: "shadow_ray_cast.cu",
      lines: [
        { code: "__global__ void castShadow(Ray* rays, Hit* hits) {" },
        { code: "    int lane = threadIdx.x;" },
        {
          code: "    if (hitsGeometry(rays[lane])) {",
          highlight: true,
          annotation: "← warp splits here",
        },
        {
          code: "        hits[lane] = traceGeometry(rays[lane]);",
          highlight: true,
          annotation: "← fast lanes idle here",
        },
        { code: "    } else {", highlight: true },
        {
          code: "        hits[lane] = traceSky(rays[lane]);",
          highlight: true,
          annotation: "← slow lanes idle here",
        },
        { code: "    }" },
        { code: "}" },
      ],
    },
    context:
      "Branch divergence serializes paths inside a warp. Coherent rays reduce wasted lanes.",
    simulation: { type: "warp", initialMasked: 16, readonly: false },
    target: { utilization: 90, label: ">= 90% warp utilization" },
    termHints: ["branch divergence", "thread coherence"],
    optimize: {
      prompt: "which change best improves warp utilization?",
      fixedMasked: 2,
      choices: [
        {
          label: "Remove the branch — always run traceGeometry on all lanes",
          correct: false,
          feedback: [
            "> 100% utilization possible — but wrong work for sky rays.",
            "> frame_time can explode.",
            "> hint: profile before removing branches.",
          ],
        },
        {
          label: "Group or sort rays so lanes in a warp take the same path",
          correct: true,
          feedback: [
            "> coherent warps.",
            "> utilization target in reach.",
          ],
        },
        {
          label: "Double thread count only",
          correct: false,
          feedback: [
            "> same split inside each warp.",
            "> ch2 lesson: more threads ≠ fix divergence.",
          ],
        },
      ],
    },
    winMessage: [
      "> lanes unified.",
      "> warp_utilization: 94%",
      "> but wait — does this always work?",
    ],
    isWrongPathChapter: false,
    wrongPath: {
      narrative: [
        "> scenario: 31 lanes sky (fast), 1 lane geometry (slow)",
        "> you removed the branch — all lanes run geometry.",
        "> frame_time: worse. utilization: 100% — wrong work.",
      ],
      lesson:
        "Divergence hurts most when the split is large. If almost all lanes take the fast path, removing the branch can force expensive work everywhere. Profile first.",
    },
  },
  {
    id: "ch7-the-fix",
    number: 7,
    title: "THE FIX",
    narrative: [
      "> [FINAL] you understand divergence",
      "> sort rays so geometry and sky cluster in separate warps",
      "> target: >= 95% warp utilization",
    ],
    codeSnippet: {
      filename: "coherent_dispatch.cu",
      lines: [
        { code: "// sort rays by hit type before dispatch" },
        { code: "sortRaysByHitType(rays, hits_preview);" },
        {
          code: "castShadow<<<blocks, threads>>>(rays, hits);",
          highlight: true,
          annotation: "← coherent warps",
        },
        { code: "// geometry warps vs sky warps — minimal idle lanes" },
      ],
    },
    context:
      "Reordering work for coherence trades sort cost for higher SIMD efficiency — classic GPU optimization pattern.",
    simulation: { type: "warp", initialMasked: 8, readonly: false },
    target: { utilization: 95, label: ">= 95% warp utilization" },
    termHints: ["coherent warps", "memory coalescing"],
    optimize: {
      prompt: "you sorted rays. what trade-off did you accept?",
      fixedMasked: 1,
      choices: [
        {
          label: "Added sort / reordering cost up front",
          correct: true,
          feedback: [
            "> yes — often amortized over many frames.",
            "> coherence buys utilization.",
          ],
        },
        {
          label: "Changed the core shading algorithm",
          correct: false,
          feedback: [
            "> same math — different order of execution.",
          ],
        },
        {
          label: "Doubled VRAM requirements",
          correct: false,
          feedback: [
            "> sort buffers are modest vs frame buffers.",
          ],
        },
      ],
    },
    winMessage: [
      "> TARGET HIT.",
      "> warp_utilization: 96%",
      "> curriculum complete. GPU fundamentals unlocked.",
    ],
    isWrongPathChapter: false,
    wrongPath: null,
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
