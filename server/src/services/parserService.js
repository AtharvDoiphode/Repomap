import path from 'path';
import { fetchRawFilesParallel } from './githubService.js';

/**
 * Resolves a relative import specifier from a source file against the repository's known files.
 * @param {string} sourcePath - e.g. "src/services/api.js"
 * @param {string} importSpecifier - e.g. "./db", "../config/db.js"
 * @param {Set<string>} knownFileSet - Set of all file paths in the repo
 * @returns {string|null} Resolved file path or null
 */
function resolveRelativePath(sourcePath, importSpecifier, knownFileSet) {
  if (!importSpecifier.startsWith('.')) return null;

  const sourceDir = path.posix.dirname(sourcePath);
  const normalized = path.posix.normalize(path.posix.join(sourceDir, importSpecifier));

  // If already exact match
  if (knownFileSet.has(normalized)) return normalized;

  // Potential extensions to try
  const extensions = [
    '.js',
    '.ts',
    '.jsx',
    '.tsx',
    '.mjs',
    '.cjs',
    '.py',
    '/index.js',
    '/index.ts',
    '/index.jsx',
    '/index.tsx',
    '/index.mjs',
  ];

  for (const ext of extensions) {
    const candidate = normalized + ext;
    if (knownFileSet.has(candidate)) return candidate;
  }

  return null;
}

/**
 * Extracts relative import targets from file content.
 */
function extractImports(filePath, content, knownFileSet) {
  const targets = new Set();
  const ext = path.extname(filePath).toLowerCase();

  // JavaScript / TypeScript
  if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) {
    // Matches:
    // import ... from './path'
    // import './path'
    // export ... from './path'
    // require('./path')
    // import('./path')
    const esImportRegex = /(?:import|export)\s+(?:[\w*{}\s,]+\s+from\s+)?['"](\.[^'"]+)['"]/g;
    const requireRegex = /(?:require|import)\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g;

    let match;
    while ((match = esImportRegex.exec(content)) !== null) {
      const resolved = resolveRelativePath(filePath, match[1], knownFileSet);
      if (resolved && resolved !== filePath) targets.add(resolved);
    }

    while ((match = requireRegex.exec(content)) !== null) {
      const resolved = resolveRelativePath(filePath, match[1], knownFileSet);
      if (resolved && resolved !== filePath) targets.add(resolved);
    }
  }

  // Python
  if (ext === '.py') {
    // Matches:
    // from .module import ...
    // from ..module import ...
    const pyRelativeRegex = /from\s+(\.+[a-zA-Z0-9_.]*)\s+import/g;
    let match;
    while ((match = pyRelativeRegex.exec(content)) !== null) {
      const dots = match[1];
      const converted = dots.replace(/^\.+/, (m) => (m.length === 1 ? './' : '../'.repeat(m.length - 1)));
      const resolved = resolveRelativePath(filePath, converted, knownFileSet);
      if (resolved && resolved !== filePath) targets.add(resolved);
    }
  }

  return [...targets];
}

/**
 * Detects tech stack labels from package manifests and files.
 */
function detectTechStack(files, contentMap) {
  const stack = new Set();
  const filePaths = files.map((f) => f.path.toLowerCase());

  // 1. Check package.json
  const pkgContent =
    contentMap['package.json'] ||
    contentMap['client/package.json'] ||
    contentMap['server/package.json'];

  if (pkgContent) {
    try {
      const pkg = JSON.parse(pkgContent);
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };

      const depKeys = Object.keys(allDeps).map((k) => k.toLowerCase());

      const libMap = [
        { test: (d) => d.includes('react') && !d.includes('react-router'), label: 'React' },
        { test: (d) => d === 'next', label: 'Next.js' },
        { test: (d) => d === 'vue', label: 'Vue.js' },
        { test: (d) => d === 'svelte', label: 'Svelte' },
        { test: (d) => d === 'express', label: 'Express' },
        { test: (d) => d === 'mongoose' || d === 'mongodb', label: 'MongoDB' },
        { test: (d) => d.includes('tailwind'), label: 'Tailwind CSS' },
        { test: (d) => d === 'typescript', label: 'TypeScript' },
        { test: (d) => d === 'vite', label: 'Vite' },
        { test: (d) => d.includes('reactflow') || d.includes('@xyflow/react'), label: 'React Flow' },
        { test: (d) => d.includes('prisma'), label: 'Prisma' },
        { test: (d) => d === 'zod', label: 'Zod' },
        { test: (d) => d.includes('jest') || d.includes('vitest') || d.includes('mocha'), label: 'Testing' },
        { test: (d) => d.includes('zustand') || d.includes('redux'), label: 'State Management' },
        { test: (d) => d === 'axios', label: 'Axios' },
        { test: (d) => d.includes('graphql'), label: 'GraphQL' },
      ];

      for (const item of libMap) {
        if (depKeys.some(item.test)) {
          stack.add(item.label);
        }
      }
    } catch {
      // Ignored malformed JSON
    }
  }

  // 2. Python requirements / pyproject
  const pyReqs = contentMap['requirements.txt'] || contentMap['pyproject.toml'];
  if (pyReqs) {
    const lower = pyReqs.toLowerCase();
    if (lower.includes('fastapi')) stack.add('FastAPI');
    if (lower.includes('flask')) stack.add('Flask');
    if (lower.includes('django')) stack.add('Django');
    if (lower.includes('torch')) stack.add('PyTorch');
    if (lower.includes('pandas')) stack.add('Pandas');
    if (lower.includes('numpy')) stack.add('NumPy');
  }

  // 3. Go
  if (contentMap['go.mod']) {
    stack.add('Go');
    if (contentMap['go.mod'].toLowerCase().includes('gin-gonic/gin')) stack.add('Gin');
  }

  // 4. File-based signals
  if (filePaths.some((p) => p.endsWith('.ts') || p.endsWith('.tsx'))) stack.add('TypeScript');
  if (filePaths.some((p) => p.endsWith('.rs'))) stack.add('Rust');
  if (filePaths.some((p) => p.endsWith('.py'))) stack.add('Python');
  if (filePaths.some((p) => p.includes('dockerfile') || p.endsWith('.dockerfile'))) stack.add('Docker');

  return [...stack].slice(0, 10);
}

/**
 * Detects circular dependencies using Depth-First Search (DFS) back-edge detection.
 * Returns circular edge IDs and up to 5 formatted cycles.
 */
export function findCircularDependencies(edges = []) {
  const adj = new Map();
  const allNodes = new Set();

  for (const edge of edges) {
    if (!edge.source || !edge.target) continue;
    allNodes.add(edge.source);
    allNodes.add(edge.target);

    if (!adj.has(edge.source)) {
      adj.set(edge.source, []);
    }
    adj.get(edge.source).push({
      target: edge.target,
      id: edge.id || `${edge.source}->${edge.target}`,
    });
  }

  const visited = new Set();
  const recursionStack = [];
  const recursionStackSet = new Set();
  const edgeStack = [];

  const circularEdgeIds = new Set();
  const cycles = [];

  function dfs(u) {
    visited.add(u);
    recursionStack.push(u);
    recursionStackSet.add(u);

    const neighbors = adj.get(u) || [];
    for (const { target: v, id: edgeId } of neighbors) {
      if (recursionStackSet.has(v)) {
        // Back-edge detected: cycle exists from v -> ... -> u -> v
        circularEdgeIds.add(edgeId);

        const cycleStartIndex = recursionStack.indexOf(v);
        if (cycleStartIndex !== -1) {
          const cycleNodes = [...recursionStack.slice(cycleStartIndex), v];
          const cycleEdgePath = edgeStack.slice(cycleStartIndex);
          for (const eid of cycleEdgePath) {
            circularEdgeIds.add(eid);
          }

          if (cycles.length < 5) {
            const cycleKey = cycleNodes.join('->');
            if (!cycles.some((c) => c.join('->') === cycleKey)) {
              cycles.push(cycleNodes);
            }
          }
        }
      } else if (!visited.has(v)) {
        edgeStack.push(edgeId);
        dfs(v);
        edgeStack.pop();
      }
    }

    recursionStack.pop();
    recursionStackSet.delete(u);
  }

  for (const node of allNodes) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return {
    circularEdgeIds: Array.from(circularEdgeIds),
    cycles,
  };
}

/**
 * Calculates deterministic architecture health score (0–100).
 */
function calculateHealthScore(files, edges, circularEdgeIds = []) {
  const filePaths = files.map((f) => f.path.toLowerCase());

  // 1. Documentation (+25 pts)
  const hasReadme = filePaths.some((p) =>
    /(?:^|\/)readme(?:\.md|\.rst|\.txt)?$/i.test(p)
  );

  // 2. Automated Tests (+25 pts)
  const hasTests = filePaths.some((p) =>
    p.includes('test') || p.includes('spec') || p.includes('__tests__')
  );

  // 3. Type Safety / Linting (+20 pts)
  const hasLintOrTypes = filePaths.some((p) =>
    p.includes('tsconfig') ||
    p.includes('.eslintrc') ||
    p.includes('eslint.config') ||
    p.includes('biome.json') ||
    p.includes('pyproject.toml') ||
    p.includes('.prettierrc')
  );

  // 4. Modular File Sizing (+15 pts) - average code file size < 15KB
  const codeFiles = files.filter((f) =>
    /\.(js|jsx|ts|tsx|py|go|rs|mjs|cjs)$/i.test(f.path)
  );
  const avgSize =
    codeFiles.length > 0
      ? codeFiles.reduce((acc, f) => acc + (f.size || 0), 0) / codeFiles.length
      : 0;
  const isModular = codeFiles.length > 0 && avgSize < 15360;

  // 5. Zero Circular Dependencies (+15 pts) - passes only when edges exist and zero cycles detected
  const noCircularDeps = edges.length > 0 && circularEdgeIds.length === 0;

  const checks = [
    { label: 'Documentation (README provided)', passed: hasReadme, points: 25 },
    { label: 'Automated Tests (test/spec files)', passed: hasTests, points: 25 },
    { label: 'Type Safety & Linting Config', passed: hasLintOrTypes, points: 20 },
    { label: 'Modular Sizing (Avg file < 15KB)', passed: isModular, points: 15 },
    { label: 'Zero Circular Dependencies', passed: noCircularDeps, points: 15 },
  ];

  const score = checks.reduce((sum, c) => (c.passed ? sum + c.points : sum), 0);

  return { score, checks };
}

/**
 * Analyzes repository code files, builds dependency graph, detects stack,
 * and computes architecture health score.
 */
export async function analyzeCodebase(owner, repo, branch, files) {
  if (!files || files.length === 0) {
    return {
      techStack: [],
      healthScore: { score: 0, checks: [] },
      nodes: [],
      edges: [],
      circularEdgeIds: [],
      cycles: [],
    };
  }

  const knownFileSet = new Set(files.map((f) => f.path));

  // 1. Identify manifest files
  const manifestPatterns = [
    /^package\.json$/i,
    /^(?:client|server)\/package\.json$/i,
    /^requirements\.txt$/i,
    /^pyproject\.toml$/i,
    /^go\.mod$/i,
    /^cargo\.toml$/i,
    /^readme(?:\.md|\.rst)?$/i,
  ];

  const manifestFiles = files
    .filter((f) => manifestPatterns.some((pattern) => pattern.test(f.path)))
    .map((f) => f.path);

  // 2. Select up to 45 core code files prioritized by shallow depth and src/ directory
  const codeExtensions = /\.(js|jsx|ts|tsx|mjs|cjs|py|go)$/i;
  const eligibleCodeFiles = files.filter(
    (f) => codeExtensions.test(f.path) && !f.path.includes('.min.')
  );

  eligibleCodeFiles.sort((a, b) => {
    const aIsSrc = a.path.startsWith('src/') || a.path.includes('/src/');
    const bIsSrc = b.path.startsWith('src/') || b.path.includes('/src/');
    if (aIsSrc && !bIsSrc) return -1;
    if (!aIsSrc && bIsSrc) return 1;

    const aDepth = a.path.split('/').length;
    const bDepth = b.path.split('/').length;
    if (aDepth !== bDepth) return aDepth - bDepth;

    return (a.size || 0) - (b.size || 0);
  });

  const selectedCodeFiles = eligibleCodeFiles.slice(0, 45).map((f) => f.path);
  const filesToFetch = [...new Set([...manifestFiles, ...selectedCodeFiles])];

  // 3. Fetch file contents concurrently via raw.githubusercontent.com
  const contentMap = await fetchRawFilesParallel(owner, repo, branch, filesToFetch);

  // 4. Parse relative imports to construct raw edges
  const rawEdges = [];
  const edgeSet = new Set();
  const linkedFilePaths = new Set();

  for (const codePath of selectedCodeFiles) {
    const content = contentMap[codePath];
    if (!content) continue;

    const imports = extractImports(codePath, content, knownFileSet);
    for (const target of imports) {
      const edgeId = `${codePath}->${target}`;
      if (!edgeSet.has(edgeId)) {
        edgeSet.add(edgeId);
        rawEdges.push({
          id: edgeId,
          source: codePath,
          target,
        });
        linkedFilePaths.add(codePath);
        linkedFilePaths.add(target);
      }
    }
  }

  // 5. Build clean nodes (limit to 50 cleanest nodes: linked files first, then top code files)
  const candidateNodePaths = [
    ...linkedFilePaths,
    ...selectedCodeFiles.filter((p) => !linkedFilePaths.has(p)),
  ].slice(0, 50);

  const nodePathSet = new Set(candidateNodePaths);

  // Filter edges so both source and target exist in the node set
  const cleanEdges = rawEdges.filter(
    (e) => nodePathSet.has(e.source) && nodePathSet.has(e.target)
  );

  // Compute degrees
  const inDegreeMap = new Map();
  const outDegreeMap = new Map();

  for (const edge of cleanEdges) {
    outDegreeMap.set(edge.source, (outDegreeMap.get(edge.source) || 0) + 1);
    inDegreeMap.set(edge.target, (inDegreeMap.get(edge.target) || 0) + 1);
  }

  const nodes = candidateNodePaths.map((filePath) => {
    const fileMeta = files.find((f) => f.path === filePath) || {};
    const parts = filePath.split('/');
    const label = parts[parts.length - 1];
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';
    const extension = path.extname(filePath) || '';

    return {
      id: filePath,
      label,
      folder,
      extension,
      size: fileMeta.size || 0,
      inDegree: inDegreeMap.get(filePath) || 0,
      outDegree: outDegreeMap.get(filePath) || 0,
    };
  });

  // 6. Detect Circular Dependencies
  const { circularEdgeIds, cycles } = findCircularDependencies(cleanEdges);

  // 7. Detect Tech Stack
  const techStack = detectTechStack(files, contentMap);

  // 8. Calculate Architecture Health Score
  const healthScore = calculateHealthScore(files, cleanEdges, circularEdgeIds);

  return {
    techStack,
    healthScore,
    nodes,
    edges: cleanEdges,
    circularEdgeIds,
    cycles,
  };
}
