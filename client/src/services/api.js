import axios from 'axios';

/**
 * Resolves the API base URL dynamically.
 * Gracefully defaults to Render in production if VITE_API_URL is missing,
 * while maintaining localhost for local development.
 */
export function getApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return 'https://repomap-qut7.onrender.com/api';
  }
  return 'http://localhost:5000/api';
}

const API_BASE_URL = getApiBaseUrl();

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000,
});

// Automatically attach JWT token if present
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('repomap_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Initiates architectural telemetry scan for a given repository.
 * @param {string} repoUrl - Full GitHub URL or "owner/repo" shorthand.
 */
export async function analyzeRepository(repoUrl) {
  try {
    const response = await client.post('/analyze', { repoUrl });
    return response.data;
  } catch (err) {
    const errorMsg =
      err.response?.data?.error ||
      err.message ||
      'Failed to connect to RepoMap backend service.';
    throw new Error(errorMsg);
  }
}

/**
 * Fetches current authenticated user profile, cloud history, and user's GitHub repos.
 */
export async function fetchUserProfile() {
  try {
    const response = await client.get('/auth/me');
    return response.data;
  } catch (err) {
    if (err.response?.status === 401) {
      localStorage.removeItem('repomap_token');
    }
    return null;
  }
}

/**
 * Returns GitHub OAuth redirect URL
 */
export function getGitHubLoginUrl() {
  return `${API_BASE_URL}/auth/github`;
}
