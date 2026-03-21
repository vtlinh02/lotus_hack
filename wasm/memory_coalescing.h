#pragma once

#include <emscripten/val.h>

using emscripten::val;

// Public entry point exposed to JavaScript via EMSCRIPTEN_BINDINGS.
val simulateCoalescing(val jsInput);
