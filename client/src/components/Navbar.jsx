import { useState } from 'react';
import {
  Search,
  Loader2,
  Terminal,
  ArrowRight,
  Download,
  Sun,
  Moon,
  Github,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

const PRESETS = [
  'pmndrs/zustand',
  'expressjs/express',
  'axios/axios',
];

export default function Navbar({
  onScan,
  onAnalyze,
  loading,
  hasRepo,
  onOpenExport,
  onGoHome,
  theme = 'dark',
  onToggleTheme,
  user,
  onLogin,
  onLogout,
}) {
  const [inputVal, setInputVal] = useState('');
  const triggerScan = onScan || onAnalyze;
  const isDark = theme === 'dark';

  const handleSubmit = (e) => {
    e?.preventDefault();
    const target = inputVal.trim();
    if (!target || loading) return;
    if (triggerScan) triggerScan(target);
  };

  const handleSelectPreset = (preset) => {
    setInputVal(preset);
    if (triggerScan) triggerScan(preset);
  };

  return (
    <header
      className={`h-14 border-b ${
        isDark
          ? 'border-zinc-800 bg-[#09090b]'
          : 'border-zinc-200 bg-white'
      } px-4 md:px-6 flex items-center justify-between gap-4 sticky top-0 z-40 select-none transition-colors duration-200`}
    >
      {/* Left: Brand Telemetry & Home Button */}
      <button
        type="button"
        onClick={onGoHome}
        className="flex items-center gap-2.5 shrink-0 group text-left cursor-pointer"
        title="Return to Home / Overview"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
        </span>
        <div className="flex items-center gap-2 font-mono">
          <span
            className={`text-xs font-semibold tracking-widest uppercase transition-colors ${
              isDark
                ? 'text-zinc-100 group-hover:text-emerald-400'
                : 'text-zinc-900 group-hover:text-emerald-600'
            }`}
          >
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
      </button>

      {/* Center: Command-line Search Bar */}
      <form
        onSubmit={handleSubmit}
        className={`flex-1 max-w-xl flex items-center border rounded px-2.5 py-1 transition-colors ${
          isDark
            ? 'bg-[#111113] border-zinc-800 focus-within:border-zinc-700'
            : 'bg-zinc-50 border-zinc-200 focus-within:border-zinc-400'
        }`}
      >
        <div className="text-zinc-500 mr-2 shrink-0">
          <Terminal size={14} />
        </div>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Enter owner/repo or https://github.com/owner/repo"
          disabled={loading}
          className={`w-full bg-transparent text-xs font-mono focus:outline-none ${
            isDark
              ? 'text-zinc-100 placeholder:text-zinc-600'
              : 'text-zinc-900 placeholder:text-zinc-400'
          }`}
        />
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          <span
            className={`hidden sm:inline-block text-[10px] font-mono px-1 py-0.2 rounded border ${
              isDark
                ? 'border-zinc-800 text-zinc-500 bg-zinc-900'
                : 'border-zinc-200 text-zinc-500 bg-zinc-100'
            }`}
          >
            ⏎
          </span>
          <button
            type="submit"
            disabled={loading || !inputVal.trim()}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                <span>SCANNING</span>
              </>
            ) : (
              <>
                <span>SCAN</span>
                <ArrowRight size={11} />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Right: Presets, Theme Toggle, Auth, & Export */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden xl:flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-zinc-500 mr-1 uppercase tracking-wider">
            Presets:
          </span>
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              disabled={loading}
              className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors disabled:opacity-40 ${
                isDark
                  ? 'border-zinc-800/80 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 hover:border-zinc-700'
                  : 'border-zinc-200 bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 hover:border-zinc-300'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          className={`p-1.5 rounded border transition-colors ${
            isDark
              ? 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              : 'border-zinc-200 bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
          }`}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
        >
          {isDark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
        </button>

        {/* GitHub Auth Section */}
        {user ? (
          <div className="flex items-center gap-1.5">
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-mono ${
                isDark
                  ? 'border-zinc-800 bg-zinc-900 text-zinc-300'
                  : 'border-zinc-200 bg-zinc-100 text-zinc-800'
              }`}
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-4 h-4 rounded-full"
                />
              ) : (
                <UserIcon size={12} className="text-emerald-400" />
              )}
              <span className="hidden sm:inline-block text-[11px] font-medium truncate max-w-[80px]">
                {user.username}
              </span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className={`p-1.5 rounded border transition-colors ${
                isDark
                  ? 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-red-400 hover:border-red-900'
                  : 'border-zinc-200 bg-zinc-100 text-zinc-600 hover:text-red-600 hover:border-red-200'
              }`}
              title="Sign Out"
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onLogin}
            className={`hidden sm:flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1.5 border rounded transition-colors ${
              isDark
                ? 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700'
                : 'border-zinc-200 bg-zinc-100 text-zinc-700 hover:text-zinc-900 hover:border-zinc-300'
            }`}
          >
            <Github size={13} />
            <span>SIGN IN</span>
          </button>
        )}

        {/* Export Button */}
        {hasRepo && (
          <button
            type="button"
            onClick={onOpenExport}
            className="flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 border border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded transition-colors shadow-sm"
          >
            <Download size={13} />
            <span>EXPORT</span>
          </button>
        )}
      </div>
    </header>
  );
}
