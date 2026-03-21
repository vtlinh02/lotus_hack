export function Theory() {
  return (
    <div className="space-y-5 text-sm leading-relaxed" style={{ color: "#a3c9a8" }}>
      <section className="space-y-2">
        <p className="font-bold tracking-widest" style={{ color: "var(--green)" }}>
          // 01 — WHY GPUs EXIST
        </p>
        <p>
          A CPU is built for <strong style={{ color: "var(--green)" }}>latency</strong>: finish
          one task as fast as possible. Deep pipelines, large caches, branch predictors, out-of-order
          execution — all complexity in service of making a single thread fast.
        </p>
        <p>
          A GPU is built for <strong style={{ color: "var(--green)" }}>throughput</strong>: run
          thousands of simpler tasks simultaneously. Fewer transistors per core, but thousands of
          cores. Originally for pixels — every pixel on screen is independent, so do them all at once.
          That insight has never changed.
        </p>
      </section>

      <section className="space-y-2">
        <p className="font-bold tracking-widest" style={{ color: "var(--green)" }}>
          // 02 — THREAD = ONE LANE OF WORK
        </p>
        <p>
          A <strong style={{ color: "var(--green)" }}>thread</strong> is the smallest unit of
          computation on a GPU — like one worker executing one sequence of instructions on one piece
          of data. You launch millions of threads; the GPU schedules them onto hardware.
        </p>
        <p>
          Threads are grouped into <strong style={{ color: "var(--green)" }}>blocks</strong> (up to
          1024 threads each). Blocks are assigned to{" "}
          <strong style={{ color: "var(--green)" }}>Streaming Multiprocessors (SMs)</strong> — the
          actual physical compute units on the chip.
        </p>
      </section>

      <section className="space-y-2">
        <p className="font-bold tracking-widest" style={{ color: "var(--green)" }}>
          // 03 — THE WARP: 32 THREADS, ONE FATE
        </p>
        <p>
          Inside an SM, threads execute in groups of{" "}
          <strong style={{ color: "var(--green)" }}>exactly 32</strong> called a{" "}
          <strong style={{ color: "var(--green)" }}>warp</strong>. This number has not changed since
          NVIDIA CUDA was introduced in 2007. Not in Fermi, Kepler, Maxwell, Pascal, Volta, Ampere,
          or Hopper.
        </p>
        <p>
          All 32 threads in a warp execute the{" "}
          <strong style={{ color: "var(--green)" }}>same instruction</strong> at the same clock
          cycle. This is called{" "}
          <strong style={{ color: "var(--green)" }}>SIMT — Single Instruction, Multiple Threads</strong>.
          One instruction pointer, 32 data lanes. Like 32 soldiers marching in perfect lockstep.
        </p>
        <p>
          When all 32 do the same thing — 100% efficiency. When they diverge (different branches,
          different exit times) — wasted cycles. That is the subject of the next lesson.
        </p>
      </section>

      <section className="space-y-2">
        <p className="font-bold tracking-widest" style={{ color: "var(--green)" }}>
          // 04 — WHY THIS MATTERS FOREVER
        </p>
        <p>
          Every GPU optimization technique you will ever learn — warp divergence, memory coalescing,
          shared memory, occupancy — is a consequence of this one model. Master the warp, and the
          rest is derivable.
        </p>
        <p style={{ color: "var(--green-dim)" }}>
          Use the simulation below to feel it: watch all 32 lanes fire together, then inject
          divergence and watch efficiency collapse.
        </p>
      </section>
    </div>
  );
}
