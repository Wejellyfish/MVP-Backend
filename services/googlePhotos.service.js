const axios = require("axios");

const TTL_MS = 60 * 60 * 1000;
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.url;
}

function setCached(key, url) {
  cache.set(key, { url, at: Date.now() });
}

async function resolveOne(photoName, apiKey, maxWidthPx) {
  const key = `${photoName}|${maxWidthPx}`;
  const cached = getCached(key);
  if (cached !== null) return cached;

  try {
    const url = `https://places.googleapis.com/v1/${photoName}/media`;
    const { data } = await axios.get(url, {
      params: { maxWidthPx, skipHttpRedirect: true, key: apiKey },
      timeout: 5000,
    });
    const photoUri = data?.photoUri;
    if (typeof photoUri === "string" && photoUri.startsWith("http")) {
      setCached(key, photoUri);
      return photoUri;
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function resolvePhotos(rawPhotos, apiKey, maxWidthPx = 800) {
  if (!Array.isArray(rawPhotos) || rawPhotos.length === 0) return [];
  const names = rawPhotos
    .map((p) => (p && typeof p === "object" ? p.name : null))
    .filter((n) => typeof n === "string" && n.length > 0);
  if (names.length === 0) return [];
  const resolved = await Promise.all(names.map((n) => resolveOne(n, apiKey, maxWidthPx)));
  return resolved.filter((u) => u !== null);
}

module.exports = { resolvePhotos };
