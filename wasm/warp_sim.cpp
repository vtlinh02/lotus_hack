#include <set>
#include <string>
#include <vector>
#include <cstdint>
#include <algorithm>
#include <cmath>
#include <emscripten/bind.h>
#include <emscripten/val.h>


using emscripten::function;
using emscripten::val;

struct WarpInput {
  int image_width = 640;
  int image_height = 480;
  int start_px = 0;   // first pixel in the warp packet
  int py = 0;         // row
  int warp_width = 32;
  int max_iter = 128;
  double x_min = -2.0;
  double x_max = 1.0;
  double y_min = -1.0;
  double y_max = 1.0;
};

struct WarpTrace {
  int warp_width = 32;
  int max_iter = 128;
  int start_px = 0;
  int py = 0;
  int divergence_start_iter = -1;
  double utilization = 0.0;
  std::vector<int> pixel_x;
  std::vector<int> lane_escape_iters;
  std::vector<int> active_counts;
  std::vector<std::vector<uint8_t>> steps;
};

static double lerp(double a, double b, double t) {
  return a + (b - a) * t;
}

static WarpInput parse_input(const val& js) {
  WarpInput in;
  in.image_width = js["image_width"].as<int>();
  in.image_height = js["image_height"].as<int>();
  in.start_px = js["start_px"].as<int>();
  in.py = js["py"].as<int>();
  in.warp_width = js["warp_width"].as<int>();
  in.max_iter = js["max_iter"].as<int>();
  in.x_min = js["x_min"].as<double>();
  in.x_max = js["x_max"].as<double>();
  in.y_min = js["y_min"].as<double>();
  in.y_max = js["y_max"].as<double>();

  if (in.warp_width <= 0) in.warp_width = 32;
  if (in.max_iter <= 0) in.max_iter = 128;
  if (in.image_width <= 1) in.image_width = 2;
  if (in.image_height <= 1) in.image_height = 2;
  if (in.py < 0) in.py = 0;
  if (in.py >= in.image_height) in.py = in.image_height - 1;
  if (in.start_px < 0) in.start_px = 0;
  if (in.start_px >= in.image_width) in.start_px = in.image_width - 1;

  return in;
}

static WarpTrace simulate_warp_core(const WarpInput& in) {
  WarpTrace trace;
  trace.warp_width = in.warp_width;
  trace.max_iter = in.max_iter;
  trace.start_px = in.start_px;
  trace.py = in.py;
  trace.pixel_x.resize(in.warp_width);
  trace.lane_escape_iters.assign(in.warp_width, in.max_iter);

  std::vector<double> cx(in.warp_width);
  std::vector<double> cy(in.warp_width);
  std::vector<double> zx(in.warp_width, 0.0);
  std::vector<double> zy(in.warp_width, 0.0);
  std::vector<int> iter_count(in.warp_width, 0);
  std::vector<uint8_t> active(in.warp_width, 1);

  for (int lane = 0; lane < in.warp_width; ++lane) {
    int px = std::min(in.start_px + lane, in.image_width - 1);
    trace.pixel_x[lane] = px;

    double u = static_cast<double>(px) / static_cast<double>(in.image_width - 1);
    double v = static_cast<double>(in.py) / static_cast<double>(in.image_height - 1);

    cx[lane] = lerp(in.x_min, in.x_max, u);
    cy[lane] = lerp(in.y_min, in.y_max, v);
  }

  double total_active_slots = 0.0;

  for (int step = 0; step < in.max_iter; ++step) {
    std::vector<uint8_t> row(in.warp_width, 0);
    int active_count = 0;

    for (int lane = 0; lane < in.warp_width; ++lane) {
      if (active[lane]) {
        row[lane] = 1;
        active_count++;
      }
    }

    if (active_count == 0) {
      break;
    }

    trace.steps.push_back(row);
    trace.active_counts.push_back(active_count);
    total_active_slots += active_count;

    if (trace.divergence_start_iter == -1 && active_count < in.warp_width) {
      trace.divergence_start_iter = step;
    }

    for (int lane = 0; lane < in.warp_width; ++lane) {
      if (!active[lane]) continue;

      double new_zx = zx[lane] * zx[lane] - zy[lane] * zy[lane] + cx[lane];
      double new_zy = 2.0 * zx[lane] * zy[lane] + cy[lane];

      zx[lane] = new_zx;
      zy[lane] = new_zy;
      iter_count[lane] += 1;

      double mag2 = new_zx * new_zx + new_zy * new_zy;
      if (mag2 > 4.0) {
        active[lane] = 0;
        trace.lane_escape_iters[lane] = iter_count[lane];
      } else if (iter_count[lane] >= in.max_iter) {
        active[lane] = 0;
        trace.lane_escape_iters[lane] = in.max_iter;
      }
    }
  }

  if (!trace.steps.empty()) {
    trace.utilization =
      total_active_slots /
      (static_cast<double>(in.warp_width) * static_cast<double>(trace.steps.size()));
  }

  return trace;
}

static val trace_to_js(const WarpTrace& trace) {
  val obj = val::object();

  obj.set("warp_width", trace.warp_width);
  obj.set("max_iter", trace.max_iter);
  obj.set("start_px", trace.start_px);
  obj.set("py", trace.py);
  obj.set("divergence_start_iter", trace.divergence_start_iter);
  obj.set("utilization", trace.utilization);

  val pixel_x = val::array();
  for (int x : trace.pixel_x) {
    pixel_x.call<void>("push", x);
  }
  obj.set("pixel_x", pixel_x);

  val lane_escape_iters = val::array();
  for (int it : trace.lane_escape_iters) {
    lane_escape_iters.call<void>("push", it);
  }
  obj.set("lane_escape_iters", lane_escape_iters);

  val active_counts = val::array();
  for (int c : trace.active_counts) {
    active_counts.call<void>("push", c);
  }
  obj.set("active_counts", active_counts);

  val steps = val::array();
  for (const auto& row : trace.steps) {
    val js_row = val::array();
    for (uint8_t cell : row) {
      js_row.call<void>("push", static_cast<int>(cell));
    }
    steps.call<void>("push", js_row);
  }
  obj.set("steps", steps);

  return obj;
}

val simulateWarp(val jsInput) {
  WarpInput in = parse_input(jsInput);
  WarpTrace trace = simulate_warp_core(in);
  return trace_to_js(trace);
}


// ======================================================================= //

struct MemoryInput {
  int warp_width = 32;
  int word_size = 4;          // bytes per lane load, e.g. float = 4
  int base_address = 0;       // byte address
  int stride_words = 1;       // address delta in words between neighboring lanes
  std::vector<int> active_mask;
};

struct MemoryTrace {
  int warp_width = 32;
  int word_size = 4;
  int base_address = 0;
  int stride_words = 1;

  std::vector<int> lane_addresses;
  std::vector<int> lane_segments;
  std::vector<int> active_mask;

  int active_lanes = 0;
  int num_transactions = 0;
  int requested_bytes = 0;
  int fetched_bytes = 0;
  double load_efficiency = 0.0;
};

static MemoryInput parse_memory_input(const val& js) {
  MemoryInput in;

  in.warp_width = js["warp_width"].as<int>();
  in.word_size = js["word_size"].as<int>();
  in.base_address = js["base_address"].as<int>();
  in.stride_words = js["stride_words"].as<int>();

  if (in.warp_width <= 0) in.warp_width = 32;
  if (in.word_size <= 0) in.word_size = 4;
  if (in.stride_words <= 0) in.stride_words = 1;

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
  out.warp_width = in.warp_width;
  out.word_size = in.word_size;
  out.base_address = in.base_address;
  out.stride_words = in.stride_words;
  out.active_mask = in.active_mask;

  out.lane_addresses.resize(in.warp_width, -1);
  out.lane_segments.resize(in.warp_width, -1);

  std::set<int> unique_segments;

  for (int lane = 0; lane < in.warp_width; ++lane) {
      if (!in.active_mask[lane]) continue;

      int addr = in.base_address + lane * in.stride_words * in.word_size;
      int seg = addr / 32;  // cc 6.0+ teaching model: 32-byte transaction units

      out.lane_addresses[lane] = addr;
      out.lane_segments[lane] = seg;

      unique_segments.insert(seg);
      out.active_lanes += 1;
  }

  out.num_transactions = static_cast<int>(unique_segments.size());
  out.requested_bytes = out.active_lanes * in.word_size;
  out.fetched_bytes = out.num_transactions * 32;

  if (out.fetched_bytes > 0) {
      out.load_efficiency =
          static_cast<double>(out.requested_bytes) /
          static_cast<double>(out.fetched_bytes);
  }

  return out;
}

static val memory_trace_to_js(const MemoryTrace& trace) {
  val obj = val::object();

  obj.set("warp_width", trace.warp_width);
  obj.set("word_size", trace.word_size);
  obj.set("base_address", trace.base_address);
  obj.set("stride_words", trace.stride_words);

  obj.set("active_lanes", trace.active_lanes);
  obj.set("num_transactions", trace.num_transactions);
  obj.set("requested_bytes", trace.requested_bytes);
  obj.set("fetched_bytes", trace.fetched_bytes);
  obj.set("load_efficiency", trace.load_efficiency);

  val laneAddresses = val::array();
  for (int x : trace.lane_addresses) laneAddresses.call<void>("push", x);
  obj.set("lane_addresses", laneAddresses);

  val laneSegments = val::array();
  for (int x : trace.lane_segments) laneSegments.call<void>("push", x);
  obj.set("lane_segments", laneSegments);

  val activeMask = val::array();
  for (int x : trace.active_mask) activeMask.call<void>("push", x);
  obj.set("active_mask", activeMask);

  return obj;
}

val simulateCoalescing(val jsInput) {
  MemoryInput in = parse_memory_input(jsInput);
  MemoryTrace trace = simulate_coalescing_core(in);
  return memory_trace_to_js(trace);
}

EMSCRIPTEN_BINDINGS(warp_sim_bindings) {
  function("simulateWarp", &simulateWarp);
  function("simulateCoalescing", &simulateCoalescing);
}