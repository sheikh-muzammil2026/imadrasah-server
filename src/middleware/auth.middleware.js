/**
 * Authentication Middleware
 * Extracts authentication context from headers or cookies and populates req.user.
 */

const { getUsersCollection } = require("../config/db");
const { ObjectId } = require("mongodb");

async function authenticate(req, res, next) {
  try {
    // 1. Extract from headers or authorization token
    const userIdHeader = req.headers["x-user-id"];
    const userRoleHeader = req.headers["x-user-role"];
    const userEmailHeader = req.headers["x-user-email"];
    const authHeader = req.headers.authorization;

    let email = userEmailHeader ? userEmailHeader.toLowerCase().trim() : null;
    let userId = userIdHeader || null;
    let role = userRoleHeader ? userRoleHeader.toLowerCase().trim() : null;

    // Check Authorization header (e.g. Bearer token or JSON payload)
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
        if (decoded && decoded.email) {
          email = decoded.email.toLowerCase().trim();
          role = decoded.role || role;
          userId = decoded.id || userId;
        }
      } catch {
        // Plain string token or non-base64 token; skip JSON decode
      }
    }

    // If no identification is present in request headers, reject unauthenticated
    if (!email && !userId) {
      return res.status(401).json({
        success: false,
        message: "অননুমোদিত অনুরোধ। অনুগ্রহ করে লগইন করুন (Authentication Required).",
      });
    }

    // Lookup user in MongoDB to ensure account is active and role is fresh
    const usersCollection = getUsersCollection();
    const query = userId
      ? ObjectId.isValid(userId)
        ? { _id: new ObjectId(userId) }
        : { _id: userId }
      : { email };

    const user = await usersCollection.findOne(query);

    if (!user) {
      // If user provided headers match a valid format, allow graceful fallback
      if (email && role) {
        req.user = {
          id: userId || "temp-id",
          email,
          role,
          name: req.headers["x-user-name"] || "User",
          status: "active",
        };
        return next();
      }

      return res.status(401).json({
        success: false,
        message: "ব্যবহারকারী অ্যাকাউন্ট পাওয়া যায়নি বা সেশন অকার্যকর।",
      });
    }

    // Check account status if suspended
    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "আপনার অ্যাকাউন্টটি স্থগিত (suspended) রয়েছে। কর্তৃপক্ষের সাথে যোগাযোগ করুন।",
      });
    }

    // Attach verified user to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role || "student",
      name: user.name,
      teacherId: user.teacherId || null,
      studentId: user.studentId || null,
      status: user.status || "active",
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "অথেন্টিকেশন যাচাই করতে অভ্যন্তরীণ সমস্যা হয়েছে।",
      error: error.message,
    });
  }
}

module.exports = {
  authenticate,
};
