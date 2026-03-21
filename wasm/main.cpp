#include "warp_divergence.h"
#include "memory_coalescing.h"
#include <emscripten/bind.h>

using emscripten::function;

EMSCRIPTEN_BINDINGS(warp_sim_bindings) {
  function("simulateWarp",        &simulateWarp);
  function("simulateCoalescing",  &simulateCoalescing);
}
