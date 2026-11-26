import { useState, useMemo, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Code2,
  Shield,
  FileJson,
  Image as ImageIcon,
} from 'lucide-react';

/**
 * Sanitizes a file path into a valid Mermaid node identifier.
 */
function sanitizeMermaidId(path) {
  return 'node_' + path.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Generates valid Mermaid flowchart syntax from nodes & edges (capped at 35 edges for GitHub reliability).
 */
function generateMermaidCode(nodes = [], edges = [], direction = 'LR') {
  const cappedEdges = edges.slice(0, 35);
  const activeNodeIds = new Set();

  cappedEdges.forEach((e) => {
    activeNodeIds.add(e.source);
    activeNodeIds.add(e.target);
  });

  const lines = [`flowchart ${direction}`];

  nodes
    .filter((n) => activeNodeIds.has(n.id))
    .slice(0, 40)
    .forEach((n) => {
      const id = sanitizeMermaidId(n.id);
      const safeLabel = n.label.replace(/"/g, "'");
      lines.push(`  ${id}["${safeLabel}"]`);
    });

  cappedEdges.forEach((e) => {
    const src = sanitizeMermaidId(e.source);
    const tgt = sanitizeMermaidId(e.target);
    lines.push(`  ${src} --> ${tgt}`);
  });

  lines.push('  %% Generated via RepoMap (https://github.com/repomap)');

  return lines.join('\n');
}

/**
 * Generates GitHub README badges Markdown snippet.
 */
function generateBadgesMarkdown(repoData) {
  const score = repoData.healthScore?.score || 0;
  let scoreColor = 'ef4444'; // red
  if (score >= 75) scoreColor = '10b981'; // emerald
  else if (score >= 50) scoreColor = 'f59e0b'; // amber

  const repoLink = `https://github.com/${repoData.owner}/${repoData.repo}`;
  const healthBadge = `[![Architecture Health](https://img.shields.io/badge/Architecture%20Health-${score}%2F100-${scoreColor}?style=flat-square)](${repoLink})`;

  const techBadges = (repoData.techStack || []).map((tech) => {
    const encoded = encodeURIComponent(tech);
    return `![${tech}](https://img.shields.io/badge/${encoded}-111113?style=flat-square&logoColor=white)`;
  });

  const allBadges = [healthBadge, ...techBadges].join(' ');

  return `### Architecture & Tech Stack\n\n${allBadges}\n`;
}

export default function ExportModal({ isOpen, onClose, repoData, theme = 'dark' }) {
  const [activeTab, setActiveTab] = useState('mermaid'); // 'mermaid' | 'badges' | 'download'
  const [mermaidDir, setMermaidDir] = useState('LR'); // 'LR' | 'TD'
  const [copiedKey, setCopiedKey] = useState(null);
  const isDark = theme === 'dark';

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const mermaidMarkdown = useMemo(() => {
    if (!repoData) return '';
    const code = generateMermaidCode(repoData.nodes, repoData.edges, mermaidDir);
    return `\`\`\`mermaid\n${code}\n\`\`\``;
  }, [repoData, mermaidDir]);

  const badgesMarkdown = useMemo(() => {
    if (!repoData) return '';
    return generateBadgesMarkdown(repoData);
  }, [repoData]);

  if (!isOpen || !repoData) return null;

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleDownloadJSON = () => {
    const payload = {
      repository: `${repoData.owner}/${repoData.repo}`,
      branch: repoData.branch,
      stars: repoData.stars,
      language: repoData.language,
      description: repoData.description,
      techStack: repoData.techStack || [],
      healthScore: repoData.healthScore || { score: 0, checks: [] },
      nodes: repoData.nodes || [],
      edges: repoData.edges || [],
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repoData.repo}-architecture.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSVG = () => {
    const flowViewport = document.querySelector('.react-flow__viewport');
    let svgContent = '';

    if (flowViewport) {
      const bbox = flowViewport.getBoundingClientRect();
      const width = Math.max(800, bbox.width || 800);
      const height = Math.max(600, bbox.height || 600);

      svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    text { font-family: 'JetBrains Mono', monospace; }
  </style>
  <rect width="100%" height="100%" fill="${isDark ? '#09090b' : '#fafafa'}"/>
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml">
      ${flowViewport.innerHTML}
    </div>
  </foreignObject>
</svg>`;
    } else {
      const nodes = (repoData.nodes || []).slice(0, 20);
      svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
  <rect width="100%" height="100%" fill="${isDark ? '#09090b' : '#fafafa'}"/>
  <text x="30" y="40" fill="${isDark ? '#fafafa' : '#18181b'}" font-family="monospace" font-size="16" font-weight="bold">${repoData.owner}/${repoData.repo} Architecture</text>
  <text x="30" y="65" fill="#71717a" font-family="monospace" font-size="11">Generated via RepoMap // ${nodes.length} nodes, ${(repoData.edges || []).length} edges</text>
  ${nodes
    .map(
      (n, i) => `
  <g transform="translate(${(i % 4) * 210 + 30}, ${Math.floor(i / 4) * 90 + 90})">
    <rect width="190" height="65" rx="4" fill="${isDark ? '#111113' : '#ffffff'}" stroke="${isDark ? '#27272a' : '#e4e4e7'}" stroke-width="1"/>
    <text x="10" y="25" fill="${isDark ? '#f4f4f5' : '#18181b'}" font-family="monospace" font-size="12">${n.label}</text>
    <text x="10" y="48" fill="#10b981" font-family="monospace" font-size="10">${n.extension || '.js'}</text>
  </g>`
    )
    .join('')}
</svg>`;
    }

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repoData.repo}-architecture.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const healthScore = repoData.healthScore?.score || 0;
  let scoreBadgeColor = 'ef4444';
  if (healthScore >= 75) scoreBadgeColor = '10b981';
  else if (healthScore >= 50) scoreBadgeColor = 'f59e0b';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div
        className={`border max-w-2xl w-full rounded shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDark
            ? 'bg-[#111113] border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between ${
            isDark ? 'border-zinc-800 bg-[#141416]' : 'border-zinc-200 bg-zinc-50'
          }`}
        >
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-emerald-500 font-semibold">EXPORT ARCHITECTURE</span>
            <span className="text-zinc-500">//</span>
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
              {repoData.owner}/{repoData.repo}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                isDark
                  ? 'border-zinc-800 bg-zinc-900 text-zinc-500'
                  : 'border-zinc-200 bg-zinc-100 text-zinc-500'
              }`}
            >
              ESC
            </span>
            <button
              onClick={onClose}
              className={`p-1 rounded transition-colors ${
                isDark
                  ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Modal Tabs */}
        <div
          className={`flex items-center gap-1 px-5 pt-3 border-b ${
            isDark ? 'border-zinc-800 bg-[#111113]' : 'border-zinc-200 bg-white'
          }`}
        >
          <button
            onClick={() => setActiveTab('mermaid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-mono border-t border-x transition-colors ${
              activeTab === 'mermaid'
                ? isDark
                  ? 'bg-[#09090b] text-emerald-400 border-zinc-800 border-b-[#09090b]'
                  : 'bg-zinc-50 text-emerald-600 border-zinc-200 border-b-zinc-50'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Code2 size={13} />
            <span>MERMAID.JS (README)</span>
          </button>

          <button
            onClick={() => setActiveTab('badges')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-mono border-t border-x transition-colors ${
              activeTab === 'badges'
                ? isDark
                  ? 'bg-[#09090b] text-emerald-400 border-zinc-800 border-b-[#09090b]'
                  : 'bg-zinc-50 text-emerald-600 border-zinc-200 border-b-zinc-50'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Shield size={13} />
            <span>README BADGES</span>
          </button>

          <button
            onClick={() => setActiveTab('download')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-mono border-t border-x transition-colors ${
              activeTab === 'download'
                ? isDark
                  ? 'bg-[#09090b] text-emerald-400 border-zinc-800 border-b-[#09090b]'
                  : 'bg-zinc-50 text-emerald-600 border-zinc-200 border-b-zinc-50'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Download size={13} />
            <span>JSON & SVG DOWNLOAD</span>
          </button>
        </div>

        {/* Tab 1: Mermaid.js */}
        {activeTab === 'mermaid' && (
          <div className="p-5 flex flex-col gap-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-sans ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Native GitHub Markdown flowchart (renders automatically in GitHub READMEs):
              </span>

              {/* Layout Toggle */}
              <div
                className={`flex items-center rounded border p-0.5 text-[11px] font-mono ${
                  isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-zinc-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setMermaidDir('LR')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    mermaidDir === 'LR'
                      ? isDark
                        ? 'bg-zinc-800 text-emerald-400 font-medium'
                        : 'bg-white text-emerald-600 font-medium shadow-xs'
                      : isDark
                      ? 'text-zinc-400 hover:text-zinc-200'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  LR (Horizontal)
                </button>
                <button
                  type="button"
                  onClick={() => setMermaidDir('TD')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    mermaidDir === 'TD'
                      ? isDark
                        ? 'bg-zinc-800 text-emerald-400 font-medium'
                        : 'bg-white text-emerald-600 font-medium shadow-xs'
                      : isDark
                      ? 'text-zinc-400 hover:text-zinc-200'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  TD (Vertical)
                </button>
              </div>
            </div>

            <div className="relative">
              <pre
                className={`font-mono text-xs border p-4 rounded overflow-x-auto max-h-64 leading-relaxed ${
                  isDark
                    ? 'bg-[#09090b] border-zinc-800 text-zinc-300'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                }`}
              >
                {mermaidMarkdown}
              </pre>

              <button
                type="button"
                onClick={() => handleCopy(mermaidMarkdown, 'mermaid')}
                className={`absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
                  isDark
                    ? 'bg-zinc-900/90 border-zinc-700 hover:border-emerald-500/50 hover:bg-zinc-800 text-zinc-200'
                    : 'bg-white border-zinc-300 hover:border-emerald-500 hover:bg-zinc-50 text-zinc-800'
                }`}
              >
                {copiedKey === 'mermaid' ? (
                  <>
                    <Check size={12} className="text-emerald-500" />
                    <span className="text-emerald-500 font-medium">✓ COPIED</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>COPY MARKDOWN</span>
                  </>
                )}
              </button>
            </div>

            <div className={`text-[11px] font-mono ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
              * Automatically capped at 35 cleanest edges for 100% reliable GitHub rendering.
            </div>
          </div>
        )}

        {/* Tab 2: README Badges */}
        {activeTab === 'badges' && (
          <div className="p-5 flex flex-col gap-4 overflow-y-auto">
            {/* Live Preview */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                Live Badge Preview
              </span>
              <div
                className={`p-4 rounded border flex flex-wrap items-center gap-2 ${
                  isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <img
                  src={`https://img.shields.io/badge/Architecture%20Health-${healthScore}%2F100-${scoreBadgeColor}?style=flat-square`}
                  alt="Architecture Health"
                  className="h-5"
                />
                {(repoData.techStack || []).map((tech) => (
                  <img
                    key={tech}
                    src={`https://img.shields.io/badge/${encodeURIComponent(tech)}-111113?style=flat-square&logoColor=white`}
                    alt={tech}
                    className="h-5"
                  />
                ))}
              </div>
            </div>

            {/* Markdown Code */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                  Markdown Code
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(badgesMarkdown, 'badges')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-700 hover:border-emerald-500/50 hover:bg-zinc-800 text-zinc-200'
                      : 'bg-white border-zinc-300 hover:border-emerald-500 hover:bg-zinc-50 text-zinc-800'
                  }`}
                >
                  {copiedKey === 'badges' ? (
                    <>
                      <Check size={12} className="text-emerald-500" />
                      <span className="text-emerald-500 font-medium">✓ COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>COPY BADGES</span>
                    </>
                  )}
                </button>
              </div>

              <pre
                className={`font-mono text-xs border p-3.5 rounded overflow-x-auto leading-relaxed ${
                  isDark
                    ? 'bg-[#09090b] border-zinc-800 text-zinc-300'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                }`}
              >
                {badgesMarkdown}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 3: JSON & SVG Download */}
        {activeTab === 'download' && (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* JSON Box */}
            <div
              className={`p-4 rounded border flex flex-col justify-between gap-3 ${
                isDark ? 'border-zinc-800 bg-[#09090b]' : 'border-zinc-200 bg-zinc-50'
              }`}
            >
              <div className="flex flex-col gap-1.5">
                <div
                  className={`flex items-center gap-2 font-mono text-xs font-semibold ${
                    isDark ? 'text-zinc-200' : 'text-zinc-900'
                  }`}
                >
                  <FileJson size={16} className="text-emerald-500" />
                  <span>ARCHITECTURE DATA (.JSON)</span>
                </div>
                <p className={`text-xs leading-relaxed font-sans ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Export complete AST telemetry metadata, node hierarchy, and edge pairs for CI/CD or custom pipeline consumption.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadJSON}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded text-xs font-mono font-medium border transition-colors ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:border-emerald-500/40 hover:text-emerald-300'
                    : 'bg-white border-zinc-300 text-zinc-800 hover:bg-zinc-100 hover:border-emerald-500 hover:text-emerald-700 shadow-xs'
                }`}
              >
                <Download size={13} />
                <span>DOWNLOAD ARCHITECTURE.JSON</span>
              </button>
            </div>

            {/* SVG Box */}
            <div
              className={`p-4 rounded border flex flex-col justify-between gap-3 ${
                isDark ? 'border-zinc-800 bg-[#09090b]' : 'border-zinc-200 bg-zinc-50'
              }`}
            >
              <div className="flex flex-col gap-1.5">
                <div
                  className={`flex items-center gap-2 font-mono text-xs font-semibold ${
                    isDark ? 'text-zinc-200' : 'text-zinc-900'
                  }`}
                >
                  <ImageIcon size={16} className="text-emerald-500" />
                  <span>VECTOR DIAGRAM (.SVG)</span>
                </div>
                <p className={`text-xs leading-relaxed font-sans ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Export scalable vector graphic of the current architecture graph for presentations, docs, and high-res printouts.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadSVG}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded text-xs font-mono font-medium border transition-colors ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:border-emerald-500/40 hover:text-emerald-300'
                    : 'bg-white border-zinc-300 text-zinc-800 hover:bg-zinc-100 hover:border-emerald-500 hover:text-emerald-700 shadow-xs'
                }`}
              >
                <Download size={13} />
                <span>DOWNLOAD DIAGRAM.SVG</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
