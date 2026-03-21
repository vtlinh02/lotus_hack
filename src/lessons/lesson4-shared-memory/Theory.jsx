export function Theory() {
  return (
    <div className="space-y-5 text-sm leading-relaxed" style={{ color: "#a3c9a8" }}>
      <section className="space-y-2">
        <p className="font-bold tracking-widest" style={{ color: "var(--green)" }}>
          // 01 — WHAT IS SHARED MEMORY
        </p>
        <p>
          Beyond global memory (DRAM) and registers, the GPU has on-chip{" "}
          <strong style={{ color: "var(--green)" }}>shared memory</strong>: fast SRAM
          shared by all threads in a block. It is roughly 100x faster than global memory
          and typically 16–48 KB per streaming multiprocessor.
        </p>
        <p>
          Each block gets a slice. Threads in the block coordinate: load data from global
          into shared memory once, then all threads read from the shared slice for many
          compute steps. No repeated global traffic for the same data.
        </p>
      </section>

      <section className="space-y-2">
        <p className="font-bold tracking-widest" style={{ color: "var(--green)" }}>
          // 02 — THE REUSE PATTERN
        </p>
        <p>
          The canonical example is <strong style={{ color: "var(--green)" }}>tiled matrix
          multiply</strong>. Naive: each output C[i,j] = sum over k of A[i,k]*B[k,j]. Each
          thread loads a full row of A and full column of B from global — the same row and
          column are reloaded by other threads for their outputs.
        </p>
        <p>
          Tiled: partition C into blocks (tiles). Threads in a block cooperatively load
          one tile of A and one tile of B into shared memory. Everyone computes their
          portion of the output block from that tile. Repeat for the next tile-pair. Each
          global element is loaded once per tile phase instead of once per output.
        </p>
      </section>

      <section className="space-y-2">
        <p className="font-bold tracking-widest" style={{ color: "var(--green)" }}>
          // 03 — WHY IT MATTERS
        </p>
        <p>
          For an N×N matrix with T×T tiles, naive does O(N³) global loads. Tiled reduces
          that by roughly a factor of T — e.g. 4×4 tiles on 8×8 matrices can cut loads by
          4x. Real GPU matmuls use 16×16 or 32×32 tiles for massive savings.
        </p>
        <p style={{ color: "var(--green-dim)" }}>
          Use the simulation below to compare naive vs tiled global load counts.
        </p>
      </section>
    </div>
  );
}
