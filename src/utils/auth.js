const crypto = require("crypto");

/**
 * Hash password using standard scrypt (built-in Node.js crypto)
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored hash or fallback plaintext
 */
function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  // Support legacy plain text credentials (e.g. demo seed accounts)
  if (!storedHash.includes(":")) {
    return password === storedHash;
  }
  try {
    const [salt, key] = storedHash.split(":");
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch (err) {
    console.error("Error verifying password:", err);
    return false;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
};
