#include "warp_divergence.h"
#include "js_utils.h"

#include <vector>
#include <cstdint>
#include <algorithm>
#include <cmath>
#include <emscripten/val.h>

using emscripten::val;

// ---------------------------------------------------------------------------
// Data structures
// ---------------------------------------------------------------------------

struct WarpInput {
  int image_width  = 640;
  int image_height = 480;
  int start_px     = 0;
  int py           = 0;
  int warp_width   = 32;
  int max_iter     = 128;
  double x_min = -2.0;
  double x_max =  1.0;
  double y_min = -1.0;
  double y_max =  1.0;
};

struct WarpTrace {
  int warp_width           = 32;
  int max_iter             = 128;
  int start_px             = 0;
  int py                   = 0;
  int divergence_start_iter = -1;
  double utilization       = 0.0;
  std::vector<int>   pixel_x;
  std::vector<int>   lane_escape_iters;
  std::vector<int>   active_counts;
  std::vector<std::vector<uint8_t>> steps;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

static double lerp(double a, double b, double t) {
  return a + (b - a) * t;
}

// ---------------------------------------------------------------------------
// Pipeline: parse → simulate → serialize
// ---------------------------------------------------------------------------

static WarpInput parse_input(const val& js) {
  WarpInput in;
  in.image_width  = js["image_width"].as<int>();
  in.image_height = js["image_height"].as<int>();
  in.start_px     = js["start_px"].as<int>();
  in.py           = js["py"].as<int>();
  in.warp_width   = js["warp_width"].as<int>();
  in.max_iter     = js["max_iter"].as<int>();
  in.x_min        = js["x_min"].as<double>();
  in.x_max        = js["x_max"].as<double>();
  in.y_min        = js["y_min"].as<double>();
  in.y_max        = js["y_max"].as<double>();

  in.warp_width   = clamp_min(in.warp_width,   1,  32);
  in.max_iter     = clamp_min(in.max_iter,      1, 128);
  in.image_width  = clamp_min(in.image_width,   2,   2);
  in.image_height = clamp_min(in.image_height,  2,   2);

  if (in.py < 0)                     in.py = 0;
  if (in.py >= in.image_height)      in.py = in.image_height - 1;
  if (in.start_px < 0)               in.start_px = 0;
  if (in.start_px >= in.image_width) in.start_px = in.image_width - 1;

  return in;
}

static WarpTrace simulate_warp_core(const WarpInput& in) {
  WarpTrace trace;
  trace.warp_width = in.warp_width;
  trace.max_iter   = in.max_iter;
  trace.start_px   = in.start_px;
  trace.py         = in.py;
  trace.pixel_x.resize(in.warp_width);
  trace.lane_escape_iters.assign(in.warp_width, in.max_iter);

  std::vector<double>  cx(in.warp_width), cy(in.warp_width);
  std::vector<double>  zx(in.warp_width, 0.0), zy(in.warp_width, 0.0);
  std::vector<int>     iter_count(in.warp_width, 0);
  std::vector<uint8_t> active(in.warp_width, 1);

  for (int lane = 0; lane < in.warp_width; ++lane) {
    int px = std::min(in.start_px + lane, in.image_width - 1);
    trace.pixel_x[lane] = px;

    double u = static_cast<double>(px)    / static_cast<double>(in.image_width  - 1);
    double v = static_cast<double>(in.py) / static_cast<double>(in.image_height - 1);
    cx[lane] = lerp(in.x_min, in.x_max, u);
    cy[lane] = lerp(in.y_min, in.y_max, v);
  }

  double total_active_slots = 0.0;

  for (int step = 0; step < in.max_iter; ++step) {
    std::vector<uint8_t> row(in.warp_width, 0);
    int active_count = 0;

    for (int lane = 0; lane < in.warp_width; ++lane) {
      if (active[lane]) { row[lane] = 1; active_count++; }
    }

    if (active_count == 0) break;

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
  obj.set("warp_width",             trace.warp_width);
  obj.set("max_iter",               trace.max_iter);
  obj.set("start_px",               trace.start_px);
  obj.set("py",                     trace.py);
  obj.set("divergence_start_iter",  trace.divergence_start_iter);
  obj.set("utilization",            trace.utilization);
  obj.set("pixel_x",                vec_to_js(trace.pixel_x));
  obj.set("lane_escape_iters",      vec_to_js(trace.lane_escape_iters));
  obj.set("active_counts",          vec_to_js(trace.active_counts));

  val steps = val::array();
  for (const auto& row : trace.steps) {
    steps.call<void>("push", vec_to_js(row));
  }
  obj.set("steps", steps);

  return obj;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

val simulateWarp(val jsInput) {
  WarpInput  in    = parse_input(jsInput);
  WarpTrace  trace = simulate_warp_core(in);
  return trace_to_js(trace);
}
