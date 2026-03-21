export const lesson3Meta = {
  id: "l3-coalescing",
  number: 2,
  title: "Memory Coalescing",
  subtitle: "Don't waste bandwidth",
  painPoint:
    "Even with no branches, scattered global-memory reads can trigger many small transactions. Neighboring threads should touch neighboring addresses so the hardware can merge loads.",
};
