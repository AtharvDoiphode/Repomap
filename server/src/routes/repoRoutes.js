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

export default router;
