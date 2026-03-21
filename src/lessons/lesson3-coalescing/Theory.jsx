export function Theory() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>
        Global memory is high bandwidth but has <strong>transaction granularity</strong>. On many
        NVIDIA GPUs (teaching model here), loads are often grouped into{" "}
        <strong>32-byte segments</strong>. The hardware issues one transaction per distinct
        segment touched by active lanes in a warp.
      </p>
      <p>
        If 32 threads read consecutive <code className="text-emerald-300">float</code>s (4 bytes
        each), their addresses often fall in the same few segments →{" "}
        <strong>coalesced</strong> access, few transactions, high{" "}
        <strong>load efficiency</strong>.
      </p>
      <p>
        If each thread strides by a large multiple (e.g. every 8th float), lanes scatter across
        many segments → many transactions, and you fetch bytes you do not need → efficiency
        drops.
      </p>
      <p>
        This lab uses a simplified rule: count <strong>unique 32-byte segment indices</strong>{" "}
        for the addresses computed per lane. Compare <strong>requested_bytes</strong> (what the
        program wanted) vs <strong>fetched_bytes</strong> (what memory actually moved at segment
        granularity).
      </p>
      <p className="text-slate-500">
        Toggle stride and base address; watch how the colored segment IDs spread across lanes.
      </p>
    </div>
  );
}
