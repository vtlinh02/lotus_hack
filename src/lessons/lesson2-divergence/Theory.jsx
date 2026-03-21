export function Theory() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>
        On GPUs like NVIDIA CUDA, threads are grouped into <strong>warps</strong> (often 32
        threads). Those threads execute in <strong>SIMT</strong> style: they share the same
        instruction stream each cycle.
      </p>
      <p>
        The Mandelbrot set is a classic stress test: neighboring pixels can need wildly different
        iteration counts before they &quot;escape&quot;. In one warp, some lanes finish in a few
        iterations while others run for hundreds.
      </p>
      <p>
        Our simulator keeps a single outer loop for all lanes (like a warp) and marks lanes
        inactive when they escape — but the warp keeps stepping until <em>every</em> lane is done.
        That is why you see green slots turn dark while the timeline keeps going: finished lanes
        are masked out, but the warp still pays for those cycles.
      </p>
      <p>
        <strong>Utilization</strong> in the readout is roughly: (sum of active lane-slots) /
        (32 × number of steps). When it drops, you are seeing the cost of{" "}
        <strong>warp divergence</strong>.
      </p>
      <p className="text-slate-500">
        Try clicking near the set boundary vs deep inside the black region and compare
        utilization and the trace shape.
      </p>
    </div>
  );
}
