import { useEffect, useRef, useState } from "react";

// Matrix rain characters — katakana + digits
const CHARS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン" +
  "0123456789ABCDEF<>/[]{}|=+-*&^%$#@!";

function useMatrixRain(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const fontSize = 14;
    let cols;
    let drops;
    let raf;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.floor(canvas.width / fontSize);
      drops = new Array(cols).fill(1);
    }

    resize();
    window.addEventListener("resize", resize);

    function draw() {
      ctx.fillStyle = "rgba(2, 10, 3, 0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px 'Ubuntu Mono', monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Head character — bright
        ctx.fillStyle = "#afffbe";
        ctx.fillText(char, x, y);

        // Body fade — dimmer green for the column above
        if (drops[i] > 1) {
          ctx.fillStyle = "#00ff41";
          ctx.fillText(
            CHARS[Math.floor(Math.random() * CHARS.length)],
            x,
            y - fontSize
          );
        }

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      raf = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef]);
}

const LINES = [
  "> INITIALIZING PARALLEL_XRAY v0.1...",
  "> LOADING GPU INTERNALS...",
  "> GPU internals. Exposed.",
];

function useTypewriter(lines, speedMs = 40) {
  const [lineIdx, setLineIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (lineIdx >= lines.length) {
      setDone(true);
      return;
    }

    const target = lines[lineIdx];
    let charIdx = displayed.length;

    if (charIdx >= target.length) {
      // Pause then move to next line
      const t = setTimeout(() => {
        setDisplayed("");
        setLineIdx((i) => i + 1);
      }, 700);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      setDisplayed(target.slice(0, charIdx + 1));
    }, speedMs);
    return () => clearTimeout(t);
  });

  return { line: displayed, lineIdx, done };
}

export function IntroScreen({ onEnter }) {
  const canvasRef = useRef(null);
  useMatrixRain(canvasRef);

  const { line, lineIdx, done } = useTypewriter(LINES);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Matrix rain canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ zIndex: 0 }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 20%, rgba(2,10,3,0.85) 100%)",
          zIndex: 1,
        }}
      />

      {/* Terminal panel */}
      <div
        className="relative z-10 flex flex-col gap-6 rounded-lg p-8 sm:p-12"
        style={{
          border: "1px solid #00ff41",
          boxShadow: "0 0 40px #00ff4133, 0 0 8px #00ff41",
          background: "rgba(2,10,3,0.82)",
          minWidth: "min(600px, 90vw)",
        }}
      >
        {/* Top bar */}
        <div
          className="flex items-center gap-2 border-b pb-3 text-xs"
          style={{ borderColor: "#00ff4133", color: "#00aa2a" }}
        >
          <span className="h-2 w-2 rounded-full bg-[#00ff41]" />
          <span>PARALLEL_XRAY — TERMINAL</span>
          <span className="ml-auto">SYS_OK</span>
        </div>

        {/* Typewriter output */}
        <div className="space-y-2">
          {/* Lines already completed */}
          {LINES.slice(0, lineIdx).map((l, i) => (
            <p key={i} className="text-sm" style={{ color: "#00aa2a" }}>
              {l}
            </p>
          ))}
          {/* Current typing line */}
          {!done && (
            <p className="text-sm" style={{ color: "#00ff41" }}>
              {line}
              <span className="cursor-blink ml-0.5 inline-block w-2">█</span>
            </p>
          )}
          {/* Final state */}
          {done && (
            <>
              <p
                className="glow-text mt-4 text-2xl font-bold tracking-widest sm:text-3xl"
                style={{ color: "#00ff41" }}
              >
                GPU INTERNALS.
              </p>
              <p
                className="text-2xl font-bold tracking-widest sm:text-3xl"
                style={{ color: "#00aa2a" }}
              >
                EXPOSED.
              </p>
            </>
          )}
        </div>

        {/* JACK IN button — only shown when typewriter is done */}
        {done && (
          <button
            type="button"
            onClick={onEnter}
            className="glow mt-2 w-full rounded px-6 py-3 text-lg font-bold tracking-widest transition-all duration-150 hover:glow-strong"
            style={{
              border: "1px solid #00ff41",
              background: "transparent",
              color: "#00ff41",
              letterSpacing: "0.3em",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#00ff41";
              e.currentTarget.style.color = "#020a03";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#00ff41";
            }}
          >
            [ JACK IN ]
          </button>
        )}

        {/* Bottom hint */}
        <p className="text-xs" style={{ color: "#1a3d1e" }}>
          // GPU concepts — one level at a time — fundamentals unchanged since
          2007
        </p>
      </div>
    </div>
  );
}
