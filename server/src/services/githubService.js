import axios from 'axios';

/**
 * Extracts { owner, repo } from full GitHub URLs or 'owner/repo' shorthand strings.
 */
export function parseGitHubInput(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Repository URL or shorthand is required.');
  }

  const trimmed = input.trim();

  // Match https://github.com/owner/repo or http://...
  const urlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i
  );

  if (urlMatch) {
    const owner = urlMatch[1];
    let repo = urlMatch[2];
    if (repo.endsWith('.git')) repo = repo.slice(0, -4);
    return { owner, repo };
  }

  // Match shorthand "owner/repo"
  const shorthandMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (shorthandMatch) {
    const owner = shorthandMatch[1];
    let repo = shorthandMatch[2];
    if (repo.endsWith('.git')) repo = repo.slice(0, -4);
    return { owner, repo };
  }

  throw new Error(`Invalid GitHub repository input: "${input}". Provide "owner/repo" or a GitHub URL.`);
}

/**
 * Creates configured Axios instance with GitHub token if available and valid.
 */
function getGitHubClient() {
  const token = process.env.GITHUB_TOKEN?.trim();
  const isValidToken = token && !token.includes('your_optional_github_pat_here');

  return axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Accept: 'application/vnd.github.v3+json',
      ...(isValidToken ? { Authorization: `Bearer ${token}` } : {}),
      'User-Agent': 'RepoMap-Architect/1.0',
    },
    timeout: 25000,
  });
}

const EXCLUDED_DIR_PATTERNS = [
  /(?:^|\/)node_modules\//i,
  /(?:^|\/)\.git\//i,
  /(?:^|\/)dist\//i,
  /(?:^|\/)build\//i,
  /(?:^|\/)\.next\//i,
  /(?:^|\/)\.nuxt\//i,
  /(?:^|\/)vendor\//i,
  /(?:^|\/)__pycache__\//i,
  /(?:^|\/)\.vscode\//i,
  /(?:^|\/)\.idea\//i,
  /(?:^|\/)coverage\//i,
];

const EXCLUDED_FILE_EXTENSIONS = [
  // Images & Media
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp', '.mp4', '.mp3', '.mov', '.wav',
  // Binaries & Archives
  '.pdf', '.zip', '.tar', '.gz', '.tgz', '.7z', '.exe', '.dll', '.so', '.dylib', '.bin', '.wasm',
  // Fonts
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  // Lock files & Source Maps
  '.lock', '.map',
];

const EXCLUDED_FILENAMES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'cargo.lock',
  'composer.lock',
  'gemfile.lock',
  'poetry.lock',
]);

/**
 * Determines whether a file path should be included in the architecture tree.
 */
function shouldIncludeFile(path) {
  for (const pattern of EXCLUDED_DIR_PATTERNS) {
    if (pattern.test(path)) return false;
  }

  const lowercasePath = path.toLowerCase();
  const filename = lowercasePath.split('/').pop();

  if (EXCLUDED_FILENAMES.has(filename)) return false;

  for (const ext of EXCLUDED_FILE_EXTENSIONS) {
    if (lowercasePath.endsWith(ext)) return false;
  }

  return true;
}

/**
 * Fetches repository metadata and entire recursive file tree in ONE git-trees API call.
 */
export async function fetchGitHubTree(owner, repo) {
  const gh = getGitHubClient();

  // 1. Fetch Repository Metadata
  let repoData;
  try {
    const res = await gh.get(`/repos/${owner}/${repo}`);
    repoData = res.data;
  } catch (err) {
    if (err.response?.status === 404) {
      throw new Error(`Repository "${owner}/${repo}" was not found or is private.`);
    }
    if (err.response?.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Provide a valid GITHUB_TOKEN in server/.env.');
    }
    throw new Error(`Failed to fetch repo metadata: ${err.message}`);
  }

  const branch = repoData.default_branch || 'main';

  // 2. Fetch Entire Recursive Tree in ONE API Call
  let treeData;
  try {
    const treeRes = await gh.get(`/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
    treeData = treeRes.data;
  } catch (err) {
    if (err.response?.status === 404) {
      throw new Error(`Git tree for branch "${branch}" could not be retrieved.`);
    }
    throw new Error(`Failed to fetch git tree: ${err.message}`);
  }

  if (!treeData.tree || !Array.isArray(treeData.tree)) {
    throw new Error('Malformed tree response from GitHub API.');
  }

  // 3. Filter for blobs and valid source code files
  const filteredFiles = treeData.tree
    .filter((item) => item.type === 'blob' && shouldIncludeFile(item.path))
    .map((item) => ({
      path: item.path,
      size: typeof item.size === 'number' ? item.size : 0,
    }));

  return {
    owner: repoData.owner?.login || owner,
    repo: repoData.name || repo,
    branch,
    description: repoData.description || 'No description provided.',
    stars: repoData.stargazers_count || 0,
    language: repoData.language || 'Plain Text',
    files: filteredFiles,
    totalFilesCount: filteredFiles.length,
    rawTreeCount: treeData.tree.length,
    truncated: Boolean(treeData.truncated),
  };
}

/**
 * Fetches raw file contents concurrently using raw.githubusercontent.com
 * to bypass GitHub REST API rate limits.
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} branch
 * @param {string[]} filePaths
 * @returns {Promise<Record<string, string>>} map of filePath to raw string content
 */
export async function fetchRawFilesParallel(owner, repo, branch, filePaths) {
  if (!filePaths || filePaths.length === 0) return {};

  const rawClient = axios.create({
    timeout: 12000,
    responseType: 'text',
    transformResponse: [(data) => data], // Keep raw string
  });

  const promises = filePaths.map(async (filePath) => {
    // encode path components but preserve slashes
    const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodedPath}`;
    try {
      const res = await rawClient.get(url);
      if (res.status === 200 && typeof res.data === 'string') {
        return { filePath, content: res.data };
      }
      return null;
    } catch {
      return null;
    }
  });

  const settled = await Promise.allSettled(promises);
  const contentMap = {};

  for (const item of settled) {
    if (item.status === 'fulfilled' && item.value) {
      contentMap[item.value.filePath] = item.value.content;
    }
  }

  return contentMap;
}
