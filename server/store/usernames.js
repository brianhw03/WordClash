const activeUsernames = new Map();

function normalizeUsername(name = "") {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function claimUsername({ name, socketId }) {
  const key = normalizeUsername(name);
  if (!key || key.length > 20) return { error: "Username must be between 1 and 20 characters" };

  const ownerSocketId = activeUsernames.get(key);
  if (ownerSocketId && ownerSocketId !== socketId) {
    return { error: "Username is already in use" };
  }

  activeUsernames.set(key, socketId);
  return { username: name.trim() };
}

function isUsernameClaimedBy({ name, socketId }) {
  return activeUsernames.get(normalizeUsername(name)) === socketId;
}

function releaseUsername({ name, socketId }) {
  const key = normalizeUsername(name);
  if (activeUsernames.get(key) === socketId) activeUsernames.delete(key);
}

function releaseSocketUsername(socketId) {
  for (const [key, ownerSocketId] of activeUsernames.entries()) {
    if (ownerSocketId === socketId) activeUsernames.delete(key);
  }
}

module.exports = {
  claimUsername,
  isUsernameClaimedBy,
  releaseUsername,
  releaseSocketUsername,
};
