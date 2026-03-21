em++ wasm/warp_sim.cpp \
  --bind \
  -O3 \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -o wasm/warp_sim.js