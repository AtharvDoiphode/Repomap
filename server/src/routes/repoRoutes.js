import { Router } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import RepoCache from '../models/RepoCache.js';
import User from '../models/User.js';
import { parseGitHubInput, fetchGitHubTree } from '../services/githubService.js';
import { analyzeCodebase } from '../services/parserService.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'repomap_super_secret_jwt_key_2026';

/**
 * Helper to extract userId from optional Bearer token
 */
function getUserIdFromAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId || null;
  } catch {
    return null;
  }
}

/**
 * POST /api/analyze
 * Body: { repoUrl: "owner/repo" | "https://github.com/owner/repo" }
 * Optional Header: Authorization: Bearer <jwt>
 */
router.post('/analyze', async (req, res) => {
  try {
    const { repoUrl } = req.body;

    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field "repoUrl" in request body.',
      });
    }

    const { owner, repo } = parseGitHubInput(repoUrl);
    const repoKey = `${owner}/${repo}`.toLowerCase();

    const isDbConnected = mongoose.connection.readyState === 1;
    const userId = getUserIdFromAuth(req.headers.authorization);

    // 1. Check MongoDB cache first
    let resultPayload = null;
    let fromCache = false;

    if (isDbConnected) {
      try {
        const cachedDoc = await RepoCache.findOne({ repoKey }).lean();
        if (cachedDoc && Array.isArray(cachedDoc.nodes) && cachedDoc.nodes.length > 0) {
          resultPayload = {
            repoKey: cachedDoc.repoKey,
            owner: cachedDoc.owner,
            repo: cachedDoc.repo,
            branch: cachedDoc.branch,
            description: cachedDoc.description,
            stars: cachedDoc.stars,
            language: cachedDoc.language,
            files: cachedDoc.files,
            totalFiles: cachedDoc.files.length,
            techStack: cachedDoc.techStack || [],
            healthScore: cachedDoc.healthScore || { score: 0, checks: [] },
            nodes: cachedDoc.nodes || [],
            edges: cachedDoc.edges || [],
            circularEdgeIds: cachedDoc.circularEdgeIds || [],
            cycles: cachedDoc.cycles || [],
            cachedAt: cachedDoc.createdAt,
          };
          fromCache = true;
        }
      } catch (cacheErr) {
        console.warn('⚠️ [Cache] Failed to query cache:', cacheErr.message);
      }
    }

    // 2. Fetch fresh git-tree if not cached
    if (!resultPayload) {
      const freshData = await fetchGitHubTree(owner, repo);
      const analysis = await analyzeCodebase(
        freshData.owner,
        freshData.repo,
        freshData.branch,
        freshData.files
      );

      resultPayload = {
        repoKey,
        owner: freshData.owner,
        repo: freshData.repo,
        branch: freshData.branch,
        description: freshData.description,
        stars: freshData.stars,
        language: freshData.language,
        files: freshData.files,
        totalFiles: freshData.files.length,
        truncated: freshData.truncated,
        techStack: analysis.techStack,
        healthScore: analysis.healthScore,
        nodes: analysis.nodes,
        edges: analysis.edges,
        circularEdgeIds: analysis.circularEdgeIds || [],
        cycles: analysis.cycles || [],
        cachedAt: null,
      };

      // Upsert into RepoCache
      if (isDbConnected) {
        try {
          await RepoCache.findOneAndUpdate(
            { repoKey },
            {
              repoKey,
              owner: freshData.owner,
              repo: freshData.repo,
              branch: freshData.branch,
              description: freshData.description,
              stars: freshData.stars,
              language: freshData.language,
              files: freshData.files,
              techStack: analysis.techStack,
              healthScore: analysis.healthScore,
              nodes: analysis.nodes,
              edges: analysis.edges,
              circularEdgeIds: analysis.circularEdgeIds || [],
              cycles: analysis.cycles || [],
              createdAt: new Date(),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } catch (saveErr) {
          console.warn('⚠️ [Cache] Failed to persist repo in cache:', saveErr.message);
        }
      }
    }

    // 3. If authenticated user, save scan to their personal scanHistory in User doc
    if (isDbConnected && userId && resultPayload) {
      try {
        const user = await User.findById(userId);
        if (user) {
          // Remove existing entry if already in history
          const filtered = (user.scanHistory || []).filter((h) => h.repoKey !== repoKey);
          // Prepend new entry
          filtered.unshift({
            repoKey,
            owner: resultPayload.owner,
            repo: resultPayload.repo,
            stars: resultPayload.stars || 0,
            language: resultPayload.language || 'Unknown',
            healthScore: resultPayload.healthScore?.score || 0,
            scannedAt: new Date(),
          });
          // Cap at 15 items
          user.scanHistory = filtered.slice(0, 15);
          await user.save();
        }
      } catch (userErr) {
        console.warn('⚠️ [User] Could not record user scan history:', userErr.message);
      }
    }

    return res.json({
      success: true,
      fromCache,
      data: resultPayload,
    });
  } catch (err) {
    console.error('❌ [Analyze Error]:', err.message);
    const statusCode = err.message.includes('not found') ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/badge/:owner/:repo
 * Dynamic live SVG badge showing RepoMap architecture health score
 */
router.get('/badge/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const repoKey = `${owner}/${repo}`.toLowerCase();

    let score = null;
    const isDbConnected = mongoose.connection.readyState === 1;

    // 1. Try cache first
    if (isDbConnected) {
      try {
        const cachedDoc = await RepoCache.findOne({ repoKey }).lean();
        if (cachedDoc && cachedDoc.healthScore && typeof cachedDoc.healthScore.score === 'number') {
          score = cachedDoc.healthScore.score;
        }
      } catch (err) {
        console.warn('⚠️ [Badge Cache Check Failed]:', err.message);
      }
    }

    // 2. If not cached, analyze on the fly
    if (score === null) {
      try {
        const freshData = await fetchGitHubTree(owner, repo);
        const analysis = await analyzeCodebase(
          freshData.owner,
          freshData.repo,
          freshData.branch,
          freshData.files
        );
        score = analysis.healthScore?.score ?? 0;

        if (isDbConnected) {
          await RepoCache.findOneAndUpdate(
            { repoKey },
            {
              repoKey,
              owner: freshData.owner,
              repo: freshData.repo,
              branch: freshData.branch,
              description: freshData.description,
              stars: freshData.stars,
              language: freshData.language,
              files: freshData.files,
              techStack: analysis.techStack,
              healthScore: analysis.healthScore,
              nodes: analysis.nodes,
              edges: analysis.edges,
              circularEdgeIds: analysis.circularEdgeIds || [],
              cycles: analysis.cycles || [],
              createdAt: new Date(),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          ).catch(() => {});
        }
      } catch (fetchErr) {
        console.warn('⚠️ [Badge Live Fetch Failed]:', fetchErr.message);
        score = 0;
      }
    }

    const safeScore = Math.max(0, Math.min(100, Math.round(score)));
    let accentColor = '#ef4444'; // red (< 50)
    if (safeScore >= 75) {
      accentColor = '#10b981'; // emerald (>= 75)
    } else if (safeScore >= 50) {
      accentColor = '#f59e0b'; // amber (>= 50)
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="196" height="26" viewBox="0 0 196 26" fill="none">
  <rect width="196" height="26" rx="4" fill="#09090b" stroke="#27272a" stroke-width="1"/>
  <text x="12" y="16.5" font-family="'JetBrains Mono', monospace, -apple-system, sans-serif" font-size="8.5" font-weight="600" fill="#a1a1aa" letter-spacing="0.5">REPOMAP // ARCH SCORE</text>
  <line x1="130" y1="5" x2="130" y2="21" stroke="#27272a" stroke-width="1"/>
  <rect x="136" y="4" width="52" height="18" rx="3" fill="${accentColor}18" stroke="${accentColor}44" stroke-width="1"/>
  <text x="162" y="16.5" font-family="'JetBrains Mono', monospace, -apple-system, sans-serif" font-size="9.5" font-weight="700" fill="${accentColor}" text-anchor="middle">${safeScore}/100</text>
</svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(svg);
  } catch (err) {
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="196" height="26" viewBox="0 0 196 26" fill="none">
  <rect width="196" height="26" rx="4" fill="#09090b" stroke="#27272a" stroke-width="1"/>
  <text x="12" y="16.5" font-family="'JetBrains Mono', monospace, sans-serif" font-size="8.5" font-weight="600" fill="#a1a1aa">REPOMAP // ARCH SCORE</text>
  <rect x="136" y="4" width="52" height="18" rx="3" fill="#ef444418" stroke="#ef444444" stroke-width="1"/>
  <text x="162" y="16.5" font-family="'JetBrains Mono', monospace, sans-serif" font-size="9.5" font-weight="700" fill="#ef4444" text-anchor="middle">ERR</text>
</svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.status(200).send(fallbackSvg);
  }
});

export default router;
