#pragma once

#include <vector>
#include <emscripten/val.h>

using emscripten::val;

// Segment size used by the GPU memory transaction model (cc 6.0+, teaching approximation).
static constexpr int kTransactionBytes = 32;

// Returns `v` if v >= min_val, otherwise returns `fallback`.
static inline int clamp_min(int v, int min_val, int fallback) {
  return (v >= min_val) ? v : fallback;
}

// Converts a std::vector<T> to a JS array via emscripten::val.
template <typename T>
static val vec_to_js(const std::vector<T>& v) {
  val arr = val::array();
  for (const auto& item : v) {
    arr.call<void>("push", item);
  }
  return arr;
}
