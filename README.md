# parallel-xray

## Build WASM (Emscripten)

```bash
em++ wasm/main.cpp wasm/warp_divergence.cpp wasm/memory_coalescing.cpp \
  --bind \
  -O3 \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -o public/wasm/warp_sim.js
```

## Web app (Vite + React)

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## Adding a new lesson simulator

1. Create `wasm/your_sim.h` — declare `val simulateYourSim(val jsInput);`
2. Create `wasm/your_sim.cpp` — implement parse → core → to\_js using `js_utils.h` helpers
3. Add `wasm/your_sim.cpp` to the `em++` command above
4. Call `function("simulateYourSim", &simulateYourSim);` in `wasm/main.cpp`
5. Create your lesson folder under `src/lessons/` and register it in `src/lessons/registry.js`
