import { Router } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'repomap_super_secret_jwt_key_2026';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

/**
 * GET /api/auth/github
 * Redirects user to GitHub OAuth authorize URL
 */
router.get('/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();

  if (!clientId || clientId === 'your_github_oauth_client_id') {
    return res.redirect(`${CLIENT_URL}?auth_error=oauth_not_configured`);
  }

  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=read:user`;
  res.redirect(redirectUri);
});

/**
 * GET /api/auth/github/callback
 * Exchanges code for access token, fetches profile, upserts user, returns JWT
 */
router.get('/github/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${CLIENT_URL}?auth_error=missing_code`);
    }

    const clientId = process.env.GITHUB_CLIENT_ID?.trim();
    const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret || clientId === 'your_github_oauth_client_id') {
      return res.redirect(`${CLIENT_URL}?auth_error=oauth_not_configured`);
    }

    // 1. Exchange code for access token
    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
      },
      {
        headers: { Accept: 'application/json' },
        timeout: 15000,
      }
    );

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) {
      return res.redirect(`${CLIENT_URL}?auth_error=token_exchange_failed`);
    }

    // 2. Fetch GitHub user profile
    const userRes = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'RepoMap-OAuth',
      },
      timeout: 15000,
    });

    const ghUser = userRes.data;

    // 3. Upsert User in MongoDB
    const user = await User.findOneAndUpdate(
      { githubId: String(ghUser.id) },
      {
        githubId: String(ghUser.id),
        username: ghUser.login,
        avatarUrl: ghUser.avatar_url,
        accessToken,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 4. Issue 7-day JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.redirect(`${CLIENT_URL}?token=${token}`);
  } catch (err) {
    console.error('❌ [OAuth Error]:', err.message);
    return res.redirect(`${CLIENT_URL}?auth_error=auth_internal_error`);
  }
});

/**
 * GET /api/auth/me
 * Returns current authenticated user, their scan history, and their public repos
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
    }

    const user = await User.findById(decoded.userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Fetch user's repositories if accessToken exists
    let userRepos = [];
    if (user.accessToken) {
      try {
        const reposRes = await axios.get(
          'https://api.github.com/user/repos?sort=updated&per_page=12&affiliation=owner',
          {
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
              'User-Agent': 'RepoMap-OAuth',
            },
            timeout: 10000,
          }
        );
        userRepos = (reposRes.data || []).map((r) => ({
          name: r.name,
          fullName: r.full_name,
          description: r.description,
          stars: r.stargazers_count,
          language: r.language,
          isPrivate: r.private,
        }));
      } catch (repoErr) {
        console.warn('⚠️ [OAuth] Could not fetch user repos:', repoErr.message);
      }
    }

    return res.json({
      success: true,
      user: {
        username: user.username,
        avatarUrl: user.avatarUrl,
      },
      history: (user.scanHistory || []).slice(0, 10),
      userRepos,
    });
  } catch (err) {
    console.error('❌ [Auth Me Error]:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to authenticate user' });
  }
});

export default router;
