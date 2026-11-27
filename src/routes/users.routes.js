const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
  fetchAuditLogs,
} = require("../controllers/users.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { requireAdmin, requireSuperAdmin } = require("../middleware/rbac.middleware");
const authRoutes = require("./auth.routes");

router.get("/stats", getDashboardStats);
router.get("/users", authenticate, requireAdmin, getAllUsers);
router.patch("/users/:id/role", authenticate, requireAdmin, updateUserRole);
router.patch("/users/:id/status", authenticate, requireAdmin, toggleUserStatus);
router.get("/audit-logs", authenticate, requireSuperAdmin, fetchAuditLogs);

// Forward /api/users/register and /api/users/login to auth router
router.use("/", authRoutes);

module.exports = router;
