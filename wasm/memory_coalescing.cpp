#include "memory_coalescing.h"
#include "js_utils.h"

#include <vector>
#include <unordered_set>
#include <algorithm>
#include <emscripten/val.h>

using emscripten::val;

// ---------------------------------------------------------------------------
// Data structures
// ---------------------------------------------------------------------------

struct MemoryInput {
  int warp_width   = 32;
  int word_size    = 4;   // bytes per lane load, e.g. float = 4
  int base_address = 0;   // byte address
  int stride_words = 1;   // address delta in words between neighboring lanes
  std::vector<int> active_mask;
};

struct MemoryTrace {
  int warp_width   = 32;
  int word_size    = 4;
  int base_address = 0;
  int stride_words = 1;

  std::vector<int> lane_addresses;
  std::vector<int> lane_segments;
  std::vector<int> active_mask;

  int    active_lanes     = 0;
  int    num_transactions = 0;
  int    requested_bytes  = 0;
  int    fetched_bytes    = 0;
  double load_efficiency  = 0.0;
};

// ---------------------------------------------------------------------------
// Pipeline: parse → simulate → serialize
// ---------------------------------------------------------------------------

static MemoryInput parse_memory_input(const val& js) {
  MemoryInput in;
  in.warp_width   = js["warp_width"].as<int>();
  in.word_size    = js["word_size"].as<int>();
  in.base_address = js["base_address"].as<int>();
  in.stride_words = js["stride_words"].as<int>();

  in.warp_width   = clamp_min(in.warp_width,   1, 32);
  in.word_size    = clamp_min(in.word_size,     1,  4);
  in.stride_words = clamp_min(in.stride_words,  1,  1);

  in.active_mask.assign(in.warp_width, 1);

  if (!js["active_mask"].isUndefined() && js["active_mask"].isArray()) {
    int n = js["active_mask"]["length"].as<int>();
    for (int i = 0; i < std::min(n, in.warp_width); ++i) {
      in.active_mask[i] = js["active_mask"][i].as<int>() ? 1 : 0;
    }
  }

  return in;
}

static MemoryTrace simulate_coalescing_core(const MemoryInput& in) {
  MemoryTrace out;
  out.warp_width   = in.warp_width;
  out.word_size    = in.word_size;
  out.base_address = in.base_address;
  out.stride_words = in.stride_words;
  out.active_mask  = in.active_mask;

  out.lane_addresses.resize(in.warp_width, -1);
  out.lane_segments.resize(in.warp_width, -1);

  std::unordered_set<int> unique_segments;

  for (int lane = 0; lane < in.warp_width; ++lane) {
    if (!in.active_mask[lane]) continue;

    int addr = in.base_address + lane * in.stride_words * in.word_size;
    int seg  = addr / kTransactionBytes;

    out.lane_addresses[lane] = addr;
    out.lane_segments[lane]  = seg;
    unique_segments.insert(seg);
    out.active_lanes += 1;
  }

  out.num_transactions = static_cast<int>(unique_segments.size());
  out.requested_bytes  = out.active_lanes * in.word_size;
  out.fetched_bytes    = out.num_transactions * kTransactionBytes;

  if (out.fetched_bytes > 0) {
    out.load_efficiency =
      static_cast<double>(out.requested_bytes) /
      static_cast<double>(out.fetched_bytes);
  }

  return out;
}

static val memory_trace_to_js(const MemoryTrace& trace) {
  val obj = val::object();
  obj.set("warp_width",       trace.warp_width);
  obj.set("word_size",        trace.word_size);
  obj.set("base_address",     trace.base_address);
  obj.set("stride_words",     trace.stride_words);
  obj.set("active_lanes",     trace.active_lanes);
  obj.set("num_transactions", trace.num_transactions);
  obj.set("requested_bytes",  trace.requested_bytes);
  obj.set("fetched_bytes",    trace.fetched_bytes);
  obj.set("load_efficiency",  trace.load_efficiency);
  obj.set("lane_addresses",   vec_to_js(trace.lane_addresses));
  obj.set("lane_segments",    vec_to_js(trace.lane_segments));
  obj.set("active_mask",      vec_to_js(trace.active_mask));
  return obj;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

val simulateCoalescing(val jsInput) {
  MemoryInput  in    = parse_memory_input(jsInput);
  MemoryTrace  trace = simulate_coalescing_core(in);
  return memory_trace_to_js(trace);
}
