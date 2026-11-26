import { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import GraphCanvas from './components/GraphCanvas';
import ExportModal from './components/ExportModal';
import LandingPage from './components/LandingPage';
import {
  analyzeRepository,
  fetchUserProfile,
  getGitHubLoginUrl,
} from './services/api';
import {
  GitBranch,
  Star,
  FolderGit2,
  Database,
  Radio,
  FileCode2,
  Search,
  Activity,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  HardDrive,
  Cpu,
  CheckCircle2,
  XCircle,
  Network,
  ExternalLink,
  Target,
  CornerDownRight,
  Compass,
  FolderLock,
  Github,
  Info,
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function App() {
  const [data, setData] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authBanner, setAuthBanner] = useState(null);

  // User and Auth State (Strictly authenticated history)
  const [user, setUser] = useState(null);
  const [userRepos, setUserRepos] = useState([]);
  const [userHistory, setUserHistory] = useState([]);

  const [activeTab, setActiveTab] = useState('graph'); // 'graph' | 'edges' | 'files'
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Landing page state
  const [showLanding, setShowLanding] = useState(true);

  // Global Theme State ('dark' | 'light')
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('repomap_theme') || 'dark';
  });

  const isDark = theme === 'dark';

  // Sync theme to <html> tag & localStorage
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    localStorage.setItem('repomap_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Check URL params for OAuth token or auth error on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const authError = urlParams.get('auth_error');

    if (token) {
      localStorage.setItem('repomap_token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchUserProfile().then((res) => {
        if (res?.user) {
          setUser(res.user);
          setUserHistory(res.history || []);
          setUserRepos(res.userRepos || []);
        }
      });
    } else if (authError) {
      window.history.replaceState({}, document.title, window.location.pathname);
      if (authError === 'oauth_not_configured') {
        setAuthBanner(
          'GitHub OAuth is not configured on the server. To enable 1-click GitHub login, add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to server/.env.'
        );
      } else {
        setAuthBanner(`Authentication notification: ${authError}`);
      }
    } else {
      // Check existing session
      const existingToken = localStorage.getItem('repomap_token');
      if (existingToken) {
        fetchUserProfile().then((res) => {
          if (res?.user) {
            setUser(res.user);
            setUserHistory(res.history || []);
            setUserRepos(res.userRepos || []);
          }
        });
      }
    }
  }, []);

  const handleLogin = () => {
    window.location.href = getGitHubLoginUrl();
  };

  const handleLogout = () => {
    localStorage.removeItem('repomap_token');
    setUser(null);
    setUserHistory([]);
    setUserRepos([]);
  };

  const handleScan = async (repoInput) => {
    setLoading(true);
    setError(null);
    setSelectedNodeId(null);
    setShowLanding(false); // Switch to studio view on scan
    try {
      const res = await analyzeRepository(repoInput);
      if (res.success && res.data) {
        setData(res.data);
        setFromCache(Boolean(res.fromCache));
        setActiveTab('graph');

        if (user) {
          // Refresh user profile & history from MongoDB
          fetchUserProfile().then((profile) => {
            if (profile?.history) setUserHistory(profile.history);
          });
        }
      } else {
        throw new Error(res.error || 'Failed to scan repository.');
      }
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Node telemetry inspector calculations
  const selectedNodeData = useMemo(() => {
    if (!data?.nodes || !selectedNodeId) return null;
    return data.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [data, selectedNodeId]);

  const selectedNodeImports = useMemo(() => {
    if (!data?.edges || !selectedNodeId) return [];
    return data.edges.filter((e) => e.source === selectedNodeId).map((e) => e.target);
  }, [data, selectedNodeId]);

  const selectedNodeImportedBy = useMemo(() => {
    if (!data?.edges || !selectedNodeId) return [];
    return data.edges.filter((e) => e.target === selectedNodeId).map((e) => e.source);
  }, [data, selectedNodeId]);

  // Filtered files
  const filteredFiles = useMemo(() => {
    if (!data?.files) return [];
    if (!filterQuery.trim()) return data.files;
    const q = filterQuery.toLowerCase();
    return data.files.filter((f) => f.path.toLowerCase().includes(q));
  }, [data, filterQuery]);

  // Filtered edges
  const filteredEdges = useMemo(() => {
    if (!data?.edges) return [];
    if (!filterQuery.trim()) return data.edges;
    const q = filterQuery.toLowerCase();
    return data.edges.filter(
      (e) => e.source.toLowerCase().includes(q) || e.target.toLowerCase().includes(q)
    );
  }, [data, filterQuery]);

  const totalByteSize = useMemo(() => {
    if (!data?.files) return 0;
    return data.files.reduce((acc, f) => acc + (f.size || 0), 0);
  }, [data]);

  // Render Landing Page if active
  if (showLanding) {
    return (
      <LandingPage
        onStartScan={handleScan}
        onEnterStudio={() => setShowLanding(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        user={user}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div
      className={`min-h-screen ${
        isDark ? 'bg-[#09090b] text-zinc-100' : 'bg-[#fafafa] text-zinc-900'
      } flex flex-col font-sans transition-colors duration-200`}
    >
      <Navbar
        onScan={handleScan}
        loading={loading}
        hasRepo={Boolean(data)}
        onOpenExport={() => setIsExportOpen(true)}
        onGoHome={() => setShowLanding(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Auth Notification Banner */}
      {authBanner && (
        <div
          className={`px-4 py-2 text-xs font-mono flex items-center justify-between border-b ${
            isDark
              ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
              : 'bg-zinc-100 border-zinc-200 text-zinc-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <Info size={14} className="text-emerald-500 shrink-0" />
            <span>{authBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setAuthBanner(null)}
            className="text-zinc-500 hover:text-zinc-300 ml-4"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Main Bento Grid Workspace */}
      <main
        className={`flex-1 grid grid-cols-1 lg:grid-cols-12 gap-px ${
          isDark ? 'bg-zinc-800/80' : 'bg-zinc-200'
        }`}
      >
        {/* Left Sticky Inspector Column */}
        <aside
          className={`lg:col-span-4 p-5 flex flex-col gap-5 border-b lg:border-b-0 overflow-y-auto max-h-screen ${
            isDark
              ? 'bg-[#09090b] border-zinc-800'
              : 'bg-[#fafafa] border-zinc-200'
          }`}
        >
          {/* Identity & Status */}
          <div
            className={`p-4 rounded border flex flex-col gap-3 shadow-xs ${
              isDark
                ? 'border-zinc-800/80 bg-[#111113]'
                : 'border-zinc-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Target Telemetry
              </span>
              {data ? (
                fromCache ? (
                  <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 font-medium">
                    <Database size={10} />
                    <span>MONGODB TTL CACHED</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/20 bg-cyan-500/10 text-cyan-500 font-medium">
                    <Radio size={10} className="animate-pulse" />
                    <span>LIVE GITHUB API</span>
                  </span>
                )
              ) : (
                <span className="text-[10px] font-mono text-zinc-500">STANDBY</span>
              )}
            </div>

            {data ? (
              <div className="flex flex-col gap-1.5">
                <h1
                  className={`font-mono text-base font-semibold flex items-center gap-2 truncate ${
                    isDark ? 'text-zinc-100' : 'text-zinc-900'
                  }`}
                >
                  <FolderGit2 size={16} className="text-emerald-500 shrink-0" />
                  <span className="truncate">
                    {data.owner}/{data.repo}
                  </span>
                </h1>
                <p className={`text-xs line-clamp-3 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {data.description || 'No description provided.'}
                </p>

                <div
                  className={`flex flex-wrap items-center gap-3 pt-2 text-[11px] font-mono border-t mt-1 ${
                    isDark ? 'border-zinc-800/60 text-zinc-400' : 'border-zinc-200 text-zinc-600'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <GitBranch size={12} className="text-zinc-500" />
                    {data.branch}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star size={12} className="text-amber-500" />
                    {data.stars?.toLocaleString() || 0}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded border ${
                      isDark
                        ? 'border-zinc-800 bg-zinc-900 text-zinc-300'
                        : 'border-zinc-200 bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    {data.language}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs font-mono text-zinc-500">
                No active repository loaded.
                <div className="mt-1 text-[11px] text-zinc-600">
                  Select a preset above or enter a GitHub slug to scan.
                </div>
              </div>
            )}
          </div>

          {/* Quick Metrics */}
          {data && (
            <div className="grid grid-cols-2 gap-2">
              <div
                className={`p-3 rounded border shadow-xs ${
                  isDark
                    ? 'border-zinc-800/80 bg-[#111113]'
                    : 'border-zinc-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between text-zinc-500 text-[10px] font-mono">
                  <span>INVENTORY</span>
                  <FileCode2 size={12} />
                </div>
                <div
                  className={`mt-1 text-lg font-mono font-semibold ${
                    isDark ? 'text-zinc-100' : 'text-zinc-900'
                  }`}
                >
                  {data.totalFiles?.toLocaleString() || data.files?.length || 0}
                </div>
                <div className="text-[10px] font-mono text-zinc-500">Filtered Blobs</div>
              </div>

              <div
                className={`p-3 rounded border shadow-xs ${
                  isDark
                    ? 'border-zinc-800/80 bg-[#111113]'
                    : 'border-zinc-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between text-zinc-500 text-[10px] font-mono">
                  <span>CODEBASE SIZE</span>
                  <HardDrive size={12} />
                </div>
                <div
                  className={`mt-1 text-lg font-mono font-semibold ${
                    isDark ? 'text-zinc-100' : 'text-zinc-900'
                  }`}
                >
                  {formatBytes(totalByteSize)}
                </div>
                <div className="text-[10px] font-mono text-zinc-500">Raw Byte Footprint</div>
              </div>
            </div>
          )}

          {/* User's GitHub Repositories (Only shown when authenticated) */}
          {user && userRepos.length > 0 && (
            <div
              className={`p-4 rounded border flex flex-col gap-2.5 shadow-xs ${
                isDark ? 'border-zinc-800/80 bg-[#111113]' : 'border-zinc-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  <Github size={12} className="text-emerald-500" />
                  My GitHub Repos
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {userRepos.length} Synced
                </span>
              </div>

              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1">
                {userRepos.map((repo) => (
                  <button
                    key={repo.fullName}
                    type="button"
                    onClick={() => handleScan(repo.fullName)}
                    className={`flex items-center justify-between p-1.5 px-2 rounded text-left border text-[11px] font-mono transition-colors ${
                      isDark
                        ? 'border-zinc-800/60 bg-[#18181b]/50 hover:bg-[#18181b] hover:border-zinc-700 text-zinc-300 hover:text-emerald-400'
                        : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300 text-zinc-700 hover:text-emerald-600'
                    }`}
                  >
                    <span className="truncate">{repo.name}</span>
                    <span className="text-[10px] text-zinc-500 shrink-0 ml-1">
                      {repo.language || 'Code'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tech Stack Detection */}
          {data && (
            <div
              className={`p-4 rounded border flex flex-col gap-2.5 shadow-xs ${
                isDark
                  ? 'border-zinc-800/80 bg-[#111113]'
                  : 'border-zinc-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  <Cpu size={12} className="text-emerald-500" />
                  Tech Stack
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {data.techStack?.length || 0} Identified
                </span>
              </div>

              {data.techStack && data.techStack.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {data.techStack.map((tech) => (
                    <span
                      key={tech}
                      className={`px-2 py-0.5 text-xs font-mono rounded border ${
                        isDark
                          ? 'bg-zinc-900 border-zinc-800 text-zinc-200'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-800'
                      }`}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs font-mono text-zinc-500 py-1">
                  No manifest frameworks identified.
                </div>
              )}
            </div>
          )}

          {/* Architecture Health Score */}
          {data && data.healthScore && (
            <div
              className={`p-4 rounded border flex flex-col gap-3 shadow-xs ${
                isDark
                  ? 'border-zinc-800/80 bg-[#111113]'
                  : 'border-zinc-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  <Activity size={12} className="text-emerald-500" />
                  Architecture Score
                </span>
                <span className="text-xs font-mono font-semibold text-emerald-500">
                  {data.healthScore.score} / 100
                </span>
              </div>

              {/* Progress Bar */}
              <div
                className={`w-full h-1.5 rounded-full border overflow-hidden ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
                }`}
              >
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, data.healthScore.score))}%` }}
                />
              </div>

              {/* Audit Checklist */}
              <div className="flex flex-col gap-1.5 pt-1">
                {data.healthScore.checks?.map((check) => (
                  <div
                    key={check.label}
                    className="flex items-center justify-between text-[11px] font-mono py-0.5"
                  >
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      {check.passed ? (
                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle size={12} className="text-zinc-400 shrink-0" />
                      )}
                      <span className={check.passed ? (isDark ? 'text-zinc-300' : 'text-zinc-800') : 'text-zinc-500'}>
                        {check.label}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 ${
                        check.passed ? 'text-emerald-500 font-medium' : 'text-zinc-400'
                      }`}
                    >
                      +{check.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Node Telemetry Inspector */}
          {data && (
            <div
              className={`p-4 rounded border flex flex-col gap-3 shadow-xs ${
                isDark
                  ? 'border-zinc-800/80 bg-[#111113]'
                  : 'border-zinc-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  <Target size={12} className="text-emerald-500" />
                  Node Telemetry
                </span>
                {selectedNodeData && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                    INSPECTING
                  </span>
                )}
              </div>

              {selectedNodeData ? (
                <div className="flex flex-col gap-3">
                  {/* Node Header */}
                  <div
                    className={`p-2.5 rounded border flex flex-col gap-1 ${
                      isDark
                        ? 'bg-[#18181b]/80 border-zinc-800'
                        : 'bg-zinc-50 border-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`font-mono text-xs font-semibold truncate ${
                          isDark ? 'text-zinc-100' : 'text-zinc-900'
                        }`}
                      >
                        {selectedNodeData.label}
                      </span>
                      <a
                        href={`https://github.com/${data.owner}/${data.repo}/blob/${data.branch}/${selectedNodeData.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-400 hover:text-emerald-500 p-0.5 transition-colors"
                        title="View on GitHub"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500 truncate" title={selectedNodeData.id}>
                      {selectedNodeData.id}
                    </div>
                    <div
                      className={`flex items-center justify-between pt-1 border-t text-[10px] font-mono ${
                        isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-600'
                      }`}
                    >
                      <span>Size: {formatBytes(selectedNodeData.size)}</span>
                      <span>Ext: {selectedNodeData.extension || 'none'}</span>
                    </div>
                  </div>

                  {/* Imported By List */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      Imported By ({selectedNodeImportedBy.length})
                    </span>
                    {selectedNodeImportedBy.length > 0 ? (
                      <div className="flex flex-col gap-1 max-h-28 overflow-y-auto pr-1">
                        {selectedNodeImportedBy.map((imp) => (
                          <button
                            key={imp}
                            type="button"
                            onClick={() => setSelectedNodeId(imp)}
                            className={`text-left p-1.5 rounded border text-[10px] font-mono truncate transition-colors ${
                              isDark
                                ? 'border-zinc-800/60 bg-[#18181b]/40 hover:bg-[#18181b] hover:border-zinc-700 text-zinc-300 hover:text-emerald-400'
                                : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300 text-zinc-700 hover:text-emerald-600'
                            }`}
                            title={imp}
                          >
                            ← {imp}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-500">
                        None (Root or entry module)
                      </span>
                    )}
                  </div>

                  {/* Imports List */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      Imports ({selectedNodeImports.length})
                    </span>
                    {selectedNodeImports.length > 0 ? (
                      <div className="flex flex-col gap-1 max-h-28 overflow-y-auto pr-1">
                        {selectedNodeImports.map((imp) => (
                          <button
                            key={imp}
                            type="button"
                            onClick={() => setSelectedNodeId(imp)}
                            className={`text-left p-1.5 rounded border text-[10px] font-mono truncate transition-colors ${
                              isDark
                                ? 'border-zinc-800/60 bg-[#18181b]/40 hover:bg-[#18181b] hover:border-zinc-700 text-zinc-300 hover:text-emerald-400'
                                : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300 text-zinc-700 hover:text-emerald-600'
                            }`}
                            title={imp}
                          >
                            → {imp}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-500">
                        None (Leaf module or external packages only)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-[11px] font-mono text-zinc-500 flex flex-col items-center gap-1">
                  <Compass size={16} className={isDark ? 'text-zinc-600 mb-1' : 'text-zinc-400 mb-1'} />
                  <span>Click any file node in the graph to inspect its imports & dependencies.</span>
                </div>
              )}
            </div>
          )}

          {/* History Section: Strictly requires login */}
          <div
            className={`mt-auto pt-4 border-t flex flex-col gap-2 ${
              isDark ? 'border-zinc-800/80' : 'border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                {user ? <Github size={11} className="text-emerald-500" /> : <FolderLock size={11} />}
                {user ? 'My Cloud History' : 'Scan History'}
              </span>
              {user ? (
                <Activity size={11} />
              ) : (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded border ${
                    isDark
                      ? 'border-zinc-800 bg-zinc-900 text-zinc-400'
                      : 'border-zinc-200 bg-zinc-100 text-zinc-600'
                  }`}
                >
                  SIGN IN REQUIRED
                </span>
              )}
            </div>

            {user ? (
              userHistory.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {userHistory.map((item) => (
                    <button
                      key={item.repoKey}
                      onClick={() => handleScan(item.repoKey)}
                      className={`flex items-center justify-between p-2 rounded text-left border transition-colors group ${
                        isDark
                          ? 'border-zinc-800/40 bg-[#111113]/80 hover:bg-[#18181b] hover:border-zinc-700'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div
                          className={`text-xs font-mono truncate transition-colors ${
                            isDark
                              ? 'text-zinc-300 group-hover:text-emerald-400'
                              : 'text-zinc-800 group-hover:text-emerald-600'
                          }`}
                        >
                          {item.owner}/{item.repo}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {item.language} • {item.stars} ★
                          {typeof item.healthScore === 'number' && (
                            <span className="ml-1.5 text-emerald-500">
                              • {item.healthScore} pts
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowUpRight
                        size={12}
                        className="text-zinc-400 group-hover:text-emerald-500 shrink-0"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] font-mono text-zinc-500 py-1">
                  No cloud scans recorded yet.
                </div>
              )
            ) : (
              /* Locked History Prompt for Guests */
              <div
                className={`p-3 rounded border flex flex-col gap-2.5 text-left ${
                  isDark ? 'bg-[#111113] border-zinc-800' : 'bg-white border-zinc-200 shadow-2xs'
                }`}
              >
                <p className="text-[11px] font-mono text-zinc-500 leading-relaxed">
                  Sign in with GitHub to save, sync, and access your personal architecture scan history.
                </p>
                <button
                  type="button"
                  onClick={handleLogin}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-[11px] font-mono font-medium border transition-colors ${
                    isDark
                      ? 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white'
                      : 'border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 hover:text-zinc-900'
                  }`}
                >
                  <Github size={12} />
                  <span>SIGN IN WITH GITHUB</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Right Main Workspace */}
        <section
          className={`lg:col-span-8 p-5 flex flex-col min-h-[650px] overflow-hidden ${
            isDark ? 'bg-[#09090b]' : 'bg-[#fafafa]'
          }`}
        >
          {error && (
            <div className="mb-4 p-3 rounded border border-red-500/30 bg-red-500/10 text-red-500 text-xs font-mono flex items-center gap-2">
              <ShieldAlert size={14} className="text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="relative flex h-8 w-8">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-30"></span>
                <span
                  className={`relative inline-flex rounded-full h-8 w-8 border border-emerald-500/40 items-center justify-center text-emerald-500 font-mono text-xs ${
                    isDark ? 'bg-zinc-900' : 'bg-white'
                  }`}
                >
                  <Activity size={16} className="animate-pulse" />
                </span>
              </div>
              <div className={`text-xs font-mono ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Fetching AST tree & building architecture diagram...
              </div>
              <div className="text-[10px] font-mono text-zinc-500">
                Calculating Dagre auto-layout matrix and dependency links
              </div>
            </div>
          ) : data ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Workspace Navigation Tabs & Filter */}
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${
                  isDark ? 'border-zinc-800' : 'border-zinc-200'
                }`}
              >
                {/* Tabs */}
                <div
                  className={`flex items-center gap-1 p-1 rounded border select-none ${
                    isDark ? 'bg-[#111113] border-zinc-800' : 'bg-white border-zinc-200 shadow-2xs'
                  }`}
                >
                  <button
                    onClick={() => setActiveTab('graph')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-colors ${
                      activeTab === 'graph'
                        ? isDark
                          ? 'bg-[#18181b] text-emerald-400 border border-zinc-700/80'
                          : 'bg-zinc-100 text-emerald-600 border border-zinc-300'
                        : isDark
                        ? 'text-zinc-400 hover:text-zinc-200'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <Network size={12} />
                    <span>ARCHITECTURE GRAPH</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded border ${
                        isDark
                          ? 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          : 'bg-zinc-200 text-zinc-700 border-zinc-300'
                      }`}
                    >
                      {data.nodes?.length || 0}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('edges')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-colors ${
                      activeTab === 'edges'
                        ? isDark
                          ? 'bg-[#18181b] text-emerald-400 border border-zinc-700/80'
                          : 'bg-zinc-100 text-emerald-600 border border-zinc-300'
                        : isDark
                        ? 'text-zinc-400 hover:text-zinc-200'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <CornerDownRight size={12} />
                    <span>DEPENDENCY LINKS</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded border ${
                        isDark
                          ? 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          : 'bg-zinc-200 text-zinc-700 border-zinc-300'
                      }`}
                    >
                      {data.edges?.length || 0}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('files')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-colors ${
                      activeTab === 'files'
                        ? isDark
                          ? 'bg-[#18181b] text-emerald-400 border border-zinc-700/80'
                          : 'bg-zinc-100 text-emerald-600 border border-zinc-300'
                        : isDark
                        ? 'text-zinc-400 hover:text-zinc-200'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <Layers size={12} />
                    <span>FILE INVENTORY</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded border ${
                        isDark
                          ? 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          : 'bg-zinc-200 text-zinc-700 border-zinc-300'
                      }`}
                    >
                      {data.files?.length || 0}
                    </span>
                  </button>
                </div>

                {/* Filter Input */}
                {activeTab !== 'graph' && (
                  <div
                    className={`flex items-center border rounded px-2.5 py-1 w-full sm:w-64 ${
                      isDark ? 'bg-[#111113] border-zinc-800' : 'bg-white border-zinc-200'
                    }`}
                  >
                    <Search size={12} className="text-zinc-500 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      placeholder={
                        activeTab === 'edges'
                          ? 'Filter modules (e.g. src/, auth)'
                          : 'Filter path (e.g. src/, .js)'
                      }
                      className={`w-full bg-transparent text-xs font-mono focus:outline-none ${
                        isDark
                          ? 'text-zinc-200 placeholder:text-zinc-600'
                          : 'text-zinc-900 placeholder:text-zinc-400'
                      }`}
                    />
                    {filterQuery && (
                      <button
                        onClick={() => setFilterQuery('')}
                        className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 ml-1"
                      >
                        CLEAR
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Tab 1: Interactive React Flow Architecture Graph */}
              {activeTab === 'graph' && (
                <div className="flex-1 h-[calc(100vh-10rem)] min-h-[580px] mt-3">
                  <GraphCanvas
                    nodes={data.nodes}
                    edges={data.edges}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={setSelectedNodeId}
                    repoUrl={`https://github.com/${data.owner}/${data.repo}`}
                    owner={data.owner}
                    repo={data.repo}
                    branch={data.branch}
                    theme={theme}
                  />
                </div>
              )}

              {/* Tab 2: Module Dependency Edges */}
              {activeTab === 'edges' && (
                <div className="flex-1 flex flex-col overflow-hidden mt-3">
                  <div className="text-[11px] font-mono text-zinc-500 mb-2 flex items-center justify-between">
                    <span>Statically resolved module import links</span>
                    <span>Showing {filteredEdges.length} links</span>
                  </div>

                  <div
                    className={`flex-1 overflow-auto border rounded ${
                      isDark ? 'border-zinc-800 bg-[#111113]' : 'border-zinc-200 bg-white'
                    }`}
                  >
                    {filteredEdges.length > 0 ? (
                      <div
                        className={`divide-y font-mono text-xs ${
                          isDark ? 'divide-zinc-800/60' : 'divide-zinc-100'
                        }`}
                      >
                        {filteredEdges.map((edge, idx) => (
                          <div
                            key={edge.id || `${edge.source}-${edge.target}-${idx}`}
                            className={`p-2.5 px-3 flex items-center gap-3 transition-colors group ${
                              isDark ? 'hover:bg-[#18181b]/70' : 'hover:bg-zinc-50'
                            }`}
                          >
                            <span className="text-zinc-400 text-[10px] w-8 shrink-0">
                              #{idx + 1}
                            </span>
                            {/* Source */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedNodeId(edge.source);
                                setActiveTab('graph');
                              }}
                              className={`flex-1 text-left truncate font-mono transition-colors ${
                                isDark
                                  ? 'text-zinc-200 group-hover:text-emerald-400'
                                  : 'text-zinc-800 group-hover:text-emerald-600'
                              }`}
                              title="Click to view in Graph"
                            >
                              {edge.source}
                            </button>
                            {/* Arrow */}
                            <div className="flex items-center gap-1 text-emerald-500 shrink-0 px-1 font-mono text-xs select-none">
                              <span className="text-zinc-400">──►</span>
                            </div>
                            {/* Target */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedNodeId(edge.target);
                                setActiveTab('graph');
                              }}
                              className={`flex-1 text-left truncate font-mono transition-colors ${
                                isDark
                                  ? 'text-zinc-400 group-hover:text-zinc-100'
                                  : 'text-zinc-600 group-hover:text-zinc-900'
                              }`}
                              title="Click to view in Graph"
                            >
                              {edge.target}
                            </button>
                            {/* Badge */}
                            <span className="hidden sm:inline-block text-[9px] font-mono px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 shrink-0">
                              INTERNAL
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                        {filterQuery ? (
                          `No dependency edges match query "${filterQuery}".`
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span>No relative import links detected among scanned code files.</span>
                            <span className="text-zinc-500 text-[11px]">
                              Check the File Inventory tab to inspect available source files.
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Source File Inventory */}
              {activeTab === 'files' && (
                <div className="flex-1 flex flex-col overflow-hidden mt-3">
                  <div
                    className={`flex-1 overflow-auto border rounded ${
                      isDark ? 'border-zinc-800 bg-[#111113]' : 'border-zinc-200 bg-white'
                    }`}
                  >
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead
                        className={`sticky top-0 border-b select-none ${
                          isDark
                            ? 'bg-[#18181b] text-zinc-400 border-zinc-800'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}
                      >
                        <tr>
                          <th className="py-2 px-3 font-normal text-[11px] w-12 text-zinc-500">#</th>
                          <th className="py-2 px-3 font-normal text-[11px]">FILE PATH</th>
                          <th className="py-2 px-3 font-normal text-[11px] text-right w-28">SIZE</th>
                        </tr>
                      </thead>
                      <tbody
                        className={`divide-y ${
                          isDark
                            ? 'divide-zinc-800/60 text-zinc-300'
                            : 'divide-zinc-100 text-zinc-800'
                        }`}
                      >
                        {filteredFiles.map((file, idx) => (
                          <tr
                            key={file.path}
                            className={`transition-colors group ${
                              isDark ? 'hover:bg-[#18181b]/70' : 'hover:bg-zinc-50'
                            }`}
                          >
                            <td className="py-1.5 px-3 text-zinc-400 text-[10px]">{idx + 1}</td>
                            <td
                              className={`py-1.5 px-3 truncate max-w-md font-mono ${
                                isDark
                                  ? 'text-zinc-200 group-hover:text-emerald-400'
                                  : 'text-zinc-800 group-hover:text-emerald-600'
                              }`}
                            >
                              {file.path}
                            </td>
                            <td className="py-1.5 px-3 text-right text-zinc-500 text-[11px]">
                              {formatBytes(file.size)}
                            </td>
                          </tr>
                        ))}
                        {filteredFiles.length === 0 && (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-zinc-500 text-xs">
                              No files match query "{filterQuery}".
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Empty State with Dot-matrix background */
            <div
              className={`flex-1 flex flex-col items-center justify-center p-8 bg-dot-matrix rounded border border-dashed text-center ${
                isDark ? 'border-zinc-800/80' : 'border-zinc-300'
              }`}
            >
              <div
                className={`p-3 rounded-full border mb-3 ${
                  isDark
                    ? 'border-zinc-800 bg-zinc-900/80 text-zinc-400'
                    : 'border-zinc-200 bg-zinc-100 text-zinc-600'
                }`}
              >
                <FolderGit2 size={24} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
              </div>
              <h2
                className={`text-sm font-mono font-semibold uppercase tracking-wider mb-1 ${
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                }`}
              >
                Telemetry Standby
              </h2>
              <p
                className={`text-xs max-w-md mb-4 leading-relaxed font-sans ${
                  isDark ? 'text-zinc-500' : 'text-zinc-600'
                }`}
              >
                Scan any public GitHub repository to generate an interactive React Flow architecture diagram, inspect module imports, and review structural telemetry.
              </p>
              <div
                className={`flex items-center gap-2 text-[11px] font-mono ${
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>ENGINE READY: React Flow & Dagre Auto-Layout Active</span>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        repoData={data}
        theme={theme}
      />
    </div>
  );
}
