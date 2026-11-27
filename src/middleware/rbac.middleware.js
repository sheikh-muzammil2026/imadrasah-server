/**
 * Granular Role-Based Access Control (RBAC) Middleware
 * Enforces role checks: teacher, admin, super_admin, student.
 */

const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  TEACHER: "teacher",
  STUDENT: "student",
};

/**
 * Higher-order middleware factory that checks if req.user has an allowed role.
 * @param {Array<string>} allowedRoles List of roles permitted to access the route
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "অননুমোদিত অনুরোধ। ব্যবহারকারী তথ্য পাওয়া যায়নি (Authentication Required).",
      });
    }

    const userRole = (req.user.role || "").toLowerCase();

    // Check if user's role is in the permitted list
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `অ্যাক্সেস অস্বীকৃত: এই কার্য সম্পাদনে আপনার অনুমতি নেই। প্রয়োজনীয় রোল: [${allowedRoles.join(", ")}], আপনার রোল: [${userRole}].`,
      });
    }

    next();
  };
}

// Convenience RBAC guards
const requireSuperAdmin = requireRole([ROLES.SUPER_ADMIN]);
const requireAdmin = requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
const requireTeacher = requireRole([ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPER_ADMIN]);
const requireAnyAuthenticated = requireRole([
  ROLES.STUDENT,
  ROLES.TEACHER,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
]);

module.exports = {
  ROLES,
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  requireTeacher,
  requireAnyAuthenticated,
};
