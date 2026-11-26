import { useState, useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useMotionTemplate,
} from 'framer-motion';
import {
  ArrowRight,
  Terminal,
  Sun,
  Moon,
  Cpu,
  Network,
  ShieldCheck,
  FileCode2,
  Sparkles,
  GitBranch,
  Layers,
  Activity,
  CheckCircle2,
  Github,
  LogOut,
  User as UserIcon,
  Play,
  Share2,
  Code2,
  Zap,
} from 'lucide-react';

const PRESETS = [
  'pmndrs/zustand',
  'expressjs/express',
  'axios/axios',
];

const SCHEMATIC_PRESETS = {
  mern: {
    id: 'mern',
    name: 'MERN API',
    score: 92,
    tech: ['Express', 'MongoDB', 'Node.js'],
    nodes: [
      { name: 'server/index.js', ext: '.JS', role: 'Entrypoint • HTTP Router', inDegree: 0, outDegree: 4 },
      { name: 'routes/api.js', ext: '.JS', role: 'Controller • AST Pipeline', inDegree: 1, outDegree: 2 },
      { name: 'models/Cache.js', ext: '.JS', role: 'MongoDB Schema • 24h TTL', inDegree: 2, outDegree: 0 },
    ],
  },
  react: {
    id: 'react',
    name: 'React State',
    score: 96,
    tech: ['React', 'Zustand', 'TypeScript'],
    nodes: [
      { name: 'src/App.tsx', ext: '.TSX', role: 'Root Provider • Layout', inDegree: 0, outDegree: 3 },
      { name: 'hooks/useStore.ts', ext: '.TS', role: 'Custom Hook • Selectors', inDegree: 2, outDegree: 1 },
      { name: 'store/slices.ts', ext: '.TS', role: 'Immutable Slice • State', inDegree: 1, outDegree: 0 },
    ],
  },
  ml: {
    id: 'ml',
    name: 'Python ML',
    score: 88,
    tech: ['PyTorch', 'FastAPI', 'NumPy'],
    nodes: [
      { name: 'main.py', ext: '.PY', role: 'FastAPI Runner • Endpoints', inDegree: 0, outDegree: 2 },
      { name: 'pipelines/model.py', ext: '.PY', role: 'PyTorch Inference Net', inDegree: 1, outDegree: 2 },
      { name: 'datasets/loader.py', ext: '.PY', role: 'Tensor Normalizer • ETL', inDegree: 1, outDegree: 0 },
    ],
  },
};

export default function LandingPage({
  onStartScan,
  onEnterStudio,
  theme,
  onToggleTheme,
  user,
  onLogin,
  onLogout,
}) {
  const [inputVal, setInputVal] = useState('');
  const [activeSchematic, setActiveSchematic] = useState('mern');
  const isDark = theme === 'dark';

  // ── 60fps Spring-Physics Cursor Spotlight ──────────────────────────
  const mouseX = useMotionValue(typeof window !== 'undefined' ? window.innerWidth / 2 : 500);
  const mouseY = useMotionValue(250);

  const smoothX = useSpring(mouseX, { stiffness: 140, damping: 24, mass: 0.5 });
  const smoothY = useSpring(mouseY, { stiffness: 140, damping: 24, mass: 0.5 });

  const handleMouseMove = (e) => {
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
  };

  const spotlightBg = useMotionTemplate`radial-gradient(520px circle at ${smoothX}px ${smoothY}px, ${
    isDark ? 'rgba(139, 92, 246, 0.18)' : 'rgba(139, 92, 246, 0.14)'
  }, rgba(16, 185, 129, 0.04) 45%, transparent 80%)`;

  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Parallax transforms for the hero schematic card
  const schematicY = useTransform(scrollYProgress, [0, 0.4], [0, -30]);
  const schematicScale = useTransform(scrollYProgress, [0, 0.35], [1, 0.985]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const target = inputVal.trim();
    if (!target) return;
    onStartScan(target);
  };

  const currentSchematic = SCHEMATIC_PRESETS[activeSchematic];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`min-h-screen relative bg-arch-grid ${
        isDark ? 'bg-[#09090b] text-zinc-100' : 'bg-[#fafafa] text-zinc-900'
      } flex flex-col font-sans transition-colors duration-200 select-none overflow-x-hidden`}
    >
      {/* ── 60fps Spring Cursor Glow ───────────────────────────── */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: spotlightBg }}
      />

      {/* ── Top Ambient Violet Wash (Kernel Aesthetic) ─────────── */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[520px] bg-gradient-to-b from-violet-500/[0.07] via-transparent to-transparent rounded-full blur-3xl -z-10" />

      {/* ── Top Navigation Bar ─────────────────────────────────── */}
      <header
        className={`h-14 border-b ${
          isDark
            ? 'border-zinc-800/80 bg-[#09090b]/80'
            : 'border-zinc-200/80 bg-[#fafafa]/80'
        } backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30`}
      >
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-xs font-semibold tracking-widest uppercase">
              REPOMAP
            </span>
            <span
              className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                isDark
                  ? 'border-zinc-800 bg-zinc-900/80 text-zinc-400'
                  : 'border-zinc-200 bg-zinc-100 text-zinc-600'
              }`}
            >
              v1.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Theme Toggle */}
          <motion.button
            type="button"
            onClick={onToggleTheme}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.95 }}
            className={`p-1.5 rounded border transition-colors ${
              isDark
                ? 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                : 'border-zinc-200 bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          >
            {isDark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
          </motion.button>

          {/* GitHub Auth Section */}
          {user ? (
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-mono ${
                  isDark
                    ? 'border-zinc-800 bg-zinc-900 text-zinc-300'
                    : 'border-zinc-200 bg-zinc-100 text-zinc-800'
                }`}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="w-4 h-4 rounded-full ring-1 ring-emerald-500/40"
                  />
                ) : (
                  <UserIcon size={12} className="text-emerald-400" />
                )}
                <span className="text-[11px] font-medium">@{user.username}</span>
              </div>

              <motion.button
                type="button"
                onClick={onLogout}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                className={`border px-2.5 py-1.5 rounded text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isDark
                    ? 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10'
                    : 'border-zinc-300 bg-white text-zinc-600 hover:border-red-500/50 hover:text-red-500 hover:bg-red-50'
                }`}
                title="Sign Out"
              >
                <LogOut size={12} />
                <span className="font-semibold">LOGOUT</span>
              </motion.button>
            </div>
          ) : (
            <motion.button
              type="button"
              onClick={onLogin}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-colors ${
                isDark
                  ? 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700'
                  : 'border-zinc-200 bg-zinc-100 text-zinc-700 hover:text-zinc-900 hover:border-zinc-300'
              }`}
            >
              <Github size={13} />
              <span className="hidden sm:inline">SIGN IN WITH GITHUB</span>
              <span className="sm:hidden">SIGN IN</span>
            </motion.button>
          )}

          {/* Launch Studio Action */}
          <motion.button
            type="button"
            onClick={onEnterStudio}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-mono font-medium transition-all shadow-sm ${
              isDark
                ? 'bg-zinc-100 text-zinc-900 hover:bg-white'
                : 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            <span>LAUNCH STUDIO</span>
            <ArrowRight size={12} />
          </motion.button>
        </div>
      </header>

      {/* ── Hero Section ───────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center px-4 pt-16 pb-12 max-w-5xl mx-auto w-full text-center relative z-10">
        {/* Telemetry Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-4"
        >
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono border ${
              isDark
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-emerald-600/30 bg-emerald-50 text-emerald-700'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>ZERO-CONFIG ARCHITECTURE TELEMETRY</span>
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className={`text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl leading-[1.15] ${
            isDark ? 'text-zinc-100' : 'text-zinc-900'
          }`}
        >
          Map any GitHub repository into an{' '}
          <span className="text-emerald-500 underline decoration-emerald-500/30 decoration-2 underline-offset-4">
            interactive system graph
          </span>
          .
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className={`mt-4 text-sm sm:text-base max-w-2xl leading-relaxed ${
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          }`}
        >
          Paste a public GitHub URL to visualize module dependencies, audit architecture
          health, and export native Mermaid.js diagrams for your README in seconds.
        </motion.p>

        {/* Hero Input Form */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="w-full max-w-xl mt-8"
        >
          <form
            onSubmit={handleSubmit}
            className={`flex items-center rounded-lg border p-1.5 shadow-xl transition-all focus-within:ring-2 focus-within:ring-emerald-500/30 ${
              isDark
                ? 'bg-[#111113]/90 border-zinc-800'
                : 'bg-white/95 border-zinc-200'
            }`}
          >
            <div className="pl-3 pr-2 text-zinc-500">
              <Terminal size={15} />
            </div>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="github.com/owner/repo or owner/repo"
              className={`w-full bg-transparent text-xs sm:text-sm font-mono focus:outline-none ${
                isDark ? 'text-zinc-100 placeholder:text-zinc-600' : 'text-zinc-900 placeholder:text-zinc-400'
              }`}
            />
            <motion.button
              type="submit"
              disabled={!inputVal.trim()}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-mono font-medium transition-all shrink-0 ${
                inputVal.trim()
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                  : 'bg-zinc-800/40 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <span>VISUALIZE REPO</span>
              <ArrowRight size={13} />
            </motion.button>
          </form>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-[11px] font-mono">
            <span className="text-zinc-500">Quick presets:</span>
            {PRESETS.map((preset) => (
              <motion.button
                key={preset}
                type="button"
                onClick={() => onStartScan(preset)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                className={`px-2 py-0.5 rounded border transition-colors ${
                  isDark
                    ? 'border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-emerald-400 hover:border-zinc-700'
                    : 'border-zinc-200 bg-zinc-100 text-zinc-600 hover:text-emerald-600 hover:border-zinc-300'
                }`}
              >
                {preset}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Kernel-Style High-Contrast Hero Terminal Card ───── */}
        <motion.div
          style={{ y: schematicY, scale: schematicScale }}
          className="w-full max-w-3xl mt-12"
        >
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl shadow-2xl relative overflow-hidden text-zinc-100 text-left">
            {/* macOS Terminal Title Bar */}
            <div className="px-4 py-2.5 border-b border-zinc-800/80 bg-[#121215] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/90 border border-red-500/30" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/90 border border-amber-500/30" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]/90 border border-emerald-500/30" />
                <span className="ml-2 font-mono text-[11px] text-zinc-400">~/repomap — architecture-ast</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-semibold">HEALTH SCORE: {currentSchematic.score}/100</span>
              </div>
            </div>

            {/* Interactive 3-Preset Selector with spring layoutId pill */}
            <div className="flex items-center justify-center gap-2 px-4 py-2.5 border-b border-zinc-800/60 bg-[#0f0f12]">
              {Object.values(SCHEMATIC_PRESETS).map((preset) => {
                const isActive = activeSchematic === preset.id;
                return (
                  <motion.button
                    key={preset.id}
                    type="button"
                    onClick={() => setActiveSchematic(preset.id)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative px-3 py-1 rounded text-xs font-mono transition-colors z-10 ${
                      isActive ? 'text-emerald-400 font-medium' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="activeSchematicPill"
                        className="absolute inset-0 bg-emerald-500/15 border border-emerald-500/30 rounded"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{preset.name}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Terminal Body */}
            <div className="p-5 sm:p-6 bg-[#0c0c0e]">
              {/* 3-Node Simulated Architecture Pipeline with Animated SVG connection lines */}
              <div className="relative py-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
                  <AnimatePresence mode="wait">
                    {currentSchematic.nodes.map((node, i) => (
                      <motion.div
                        key={`${activeSchematic}-${node.name}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, delay: i * 0.06 }}
                        whileHover={{ y: -2, transition: { type: 'spring', stiffness: 350, damping: 25 } }}
                        className={`p-3.5 rounded-lg border flex flex-col gap-1 text-left ${
                          i === 1
                            ? 'bg-[#18181b] border-emerald-500/50 ring-1 ring-emerald-500/20'
                            : 'bg-[#141418] border-zinc-800/90'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold text-emerald-400 truncate max-w-[140px]">
                            {node.name}
                          </span>
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400">
                            {node.ext}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400 truncate">
                          {node.role}
                        </div>
                        <div className="text-[9px] font-mono text-zinc-500 mt-1">
                          IN:{node.inDegree} OUT:{node.outDegree}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Animated SVG Connection Track */}
                <div className="hidden sm:block absolute top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none z-0 px-10">
                  <svg className="w-full h-8" overflow="visible">
                    <motion.line
                      x1="22%"
                      y1="50%"
                      x2="45%"
                      y2="50%"
                      stroke="#27272a"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <motion.circle
                      cx="33%"
                      cy="50%"
                      r="3"
                      fill="#10b981"
                      animate={{ cx: ['22%', '45%'], opacity: [0, 1, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.line
                      x1="55%"
                      y1="50%"
                      x2="78%"
                      y2="50%"
                      stroke="#27272a"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <motion.circle
                      cx="66%"
                      cy="50%"
                      r="3"
                      fill="#10b981"
                      animate={{ cx: ['55%', '78%'], opacity: [0, 1, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'linear', delay: 0.8 }}
                    />
                  </svg>
                </div>
              </div>

              {/* Micro audit checklist strip */}
              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500 uppercase">Frameworks:</span>
                  {currentSchematic.tech.map((t) => (
                    <span
                      key={t}
                      className="px-1.5 py-0.2 rounded border border-zinc-800 bg-zinc-900 text-zinc-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    <span>Tests Active</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    <span>Dagre Auto-Layout</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── 4-Column Bento Metrics Strip ───────────────────────── */}
      <section className="px-4 pb-12 max-w-5xl mx-auto w-full relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {[
            { value: '95%', label: 'Fewer GitHub API calls', sub: 'Single-call tree traversal' },
            { value: '< 50ms', label: 'MongoDB TTL cache hit', sub: 'Sub-second AST hydration' },
            { value: 'DFS', label: 'Circular import detection', sub: 'Back-edge recursion stack' },
            { value: '0–100', label: 'Architecture health audit', sub: 'Deterministic scoring' },
          ].map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
              whileHover={{ y: -3, transition: { type: 'spring', stiffness: 350, damping: 25 } }}
              whileTap={{ scale: 0.98 }}
              className={`p-4 rounded-xl border flex flex-col gap-1 text-left transition-colors cursor-default ${
                isDark
                  ? 'bg-[#111113]/80 border-zinc-800 hover:border-zinc-700 shadow-sm backdrop-blur-xs'
                  : 'bg-white/80 border-zinc-200 hover:border-zinc-300 shadow-sm backdrop-blur-xs'
              }`}
            >
              <span className="font-mono text-xl sm:text-2xl font-bold text-emerald-500 tracking-tight">
                {item.value}
              </span>
              <span className={`text-xs font-semibold font-mono uppercase tracking-wider ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                {item.label}
              </span>
              <span className="text-[11px] text-zinc-500 font-sans">
                {item.sub}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── 3-Step Workflow Section (whileInView) ──────────────── */}
      <section className="px-4 py-16 max-w-5xl mx-auto w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <span className="text-xs font-mono text-emerald-500 uppercase tracking-widest">
            3-STEP SYSTEM PIPELINE
          </span>
          <h2
            className={`text-2xl sm:text-3xl font-bold mt-1 tracking-tight ${
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            }`}
          >
            How RepoMap Inspects Your Codebase
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            whileHover={{ y: -3, transition: { type: 'spring', stiffness: 350, damping: 25 } }}
            className={`p-5 rounded-xl border flex flex-col gap-2.5 ${
              isDark ? 'bg-[#111113]/80 border-zinc-800' : 'bg-white/80 border-zinc-200'
            } backdrop-blur-xs shadow-sm`}
          >
            <span className="font-mono text-xs text-emerald-500 font-semibold">01 / FETCH</span>
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider">
              Single-Call Git Trees
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Retrieves the complete recursive repository directory in one API call, stripping
              dependencies, lockfiles, and media blobs.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: 0.12 }}
            whileHover={{ y: -3, transition: { type: 'spring', stiffness: 350, damping: 25 } }}
            className={`p-5 rounded-xl border flex flex-col gap-2.5 ${
              isDark ? 'bg-[#111113]/80 border-zinc-800' : 'bg-white/80 border-zinc-200'
            } backdrop-blur-xs shadow-sm`}
          >
            <span className="font-mono text-xs text-emerald-500 font-semibold">02 / PARSE</span>
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider">
              AST & Import Resolution
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Concurrently samples core code files to extract ES, CommonJS, and Python imports,
              validating every target against real filesystem paths.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: 0.19 }}
            whileHover={{ y: -3, transition: { type: 'spring', stiffness: 350, damping: 25 } }}
            className={`p-5 rounded-xl border flex flex-col gap-2.5 ${
              isDark ? 'bg-[#111113]/80 border-zinc-800' : 'bg-white/80 border-zinc-200'
            } backdrop-blur-xs shadow-sm`}
          >
            <span className="font-mono text-xs text-emerald-500 font-semibold">03 / VISUALIZE</span>
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider">
              Dagre Graph & Export
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Runs non-overlapping layout calculations on React Flow canvas and formats
              copy-pasteable Mermaid.js markdown for your GitHub README.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── 3-Column Bento Grid Features ───────────────────────── */}
      <section className="px-4 py-12 max-w-5xl mx-auto w-full relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.35 }}
            whileHover={{ y: -3, transition: { type: 'spring', stiffness: 350, damping: 25 } }}
            className={`p-5 rounded-xl border flex flex-col gap-2 ${
              isDark
                ? 'bg-[#111113]/80 border-zinc-800 hover:border-zinc-700'
                : 'bg-white/80 border-zinc-200 hover:border-zinc-300'
            } transition-colors backdrop-blur-xs shadow-sm`}
          >
            <div className="flex items-center justify-between text-zinc-500 font-mono text-[10px]">
              <span>FEATURE 01</span>
              <Network size={14} className="text-emerald-400" />
            </div>
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider">
              AST & Import Parsing
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Resolves internal JS, TS, Python, and Go module imports without cloning code locally,
              bypassing GitHub REST limits via raw streams.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            whileHover={{ y: -3, transition: { type: 'spring', stiffness: 350, damping: 25 } }}
            className={`p-5 rounded-xl border flex flex-col gap-2 ${
              isDark
                ? 'bg-[#111113]/80 border-zinc-800 hover:border-zinc-700'
                : 'bg-white/80 border-zinc-200 hover:border-zinc-300'
            } transition-colors backdrop-blur-xs shadow-sm`}
          >
            <div className="flex items-center justify-between text-zinc-500 font-mono text-[10px]">
              <span>FEATURE 02</span>
              <ShieldCheck size={14} className="text-emerald-400" />
            </div>
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider">
              Architecture Health Audit
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Scores documentation, test coverage, type safety configs, and modular file sizing out
              of 100 with an actionable pass/fail checklist.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.35, delay: 0.16 }}
            whileHover={{ y: -3, transition: { type: 'spring', stiffness: 350, damping: 25 } }}
            className={`p-5 rounded-xl border flex flex-col gap-2 ${
              isDark
                ? 'bg-[#111113]/80 border-zinc-800 hover:border-zinc-700'
                : 'bg-white/80 border-zinc-200 hover:border-zinc-300'
            } transition-colors backdrop-blur-xs shadow-sm`}
          >
            <div className="flex items-center justify-between text-zinc-500 font-mono text-[10px]">
              <span>FEATURE 03</span>
              <FileCode2 size={14} className="text-emerald-400" />
            </div>
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider">
              1-Click README Mermaid Export
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Generates copy-pasteable Mermaid flowcharts and Shields.io badges like GPRM, ready for
              GitHub repository READMEs.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Footer CTA ─────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.4 }}
        className="px-4 py-16 text-center max-w-3xl mx-auto w-full relative z-10"
      >
        <motion.div
          whileHover={{ y: -2, transition: { type: 'spring', stiffness: 350, damping: 25 } }}
          className={`p-8 rounded-xl border flex flex-col items-center gap-4 ${
            isDark ? 'bg-[#111113]/90 border-zinc-800' : 'bg-white/90 border-zinc-200'
          } backdrop-blur-xs shadow-lg`}
        >
          <h2
            className={`text-xl sm:text-2xl font-bold tracking-tight ${
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            }`}
          >
            Ready to inspect your architecture?
          </h2>
          <p className={`text-xs sm:text-sm max-w-md ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Enter any public GitHub repository to map dependencies, audit health, and export diagrams.
          </p>
          <motion.button
            type="button"
            onClick={onEnterStudio}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded text-xs font-mono font-medium transition-all shadow-sm ${
              isDark
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <span>OPEN REPOMAP STUDIO</span>
            <ArrowRight size={13} />
          </motion.button>
        </motion.div>

        <footer
          className={`mt-12 text-[11px] font-mono ${
            isDark ? 'text-zinc-600' : 'text-zinc-400'
          } flex items-center justify-center gap-2`}
        >
          <span>REPOMAP // ARCHITECTURE TELEMETRY ENGINE</span>
          <span>•</span>
          <span>NODE AST + REACT FLOW + DAGRE</span>
        </footer>
      </motion.section>
    </div>
  );
}
