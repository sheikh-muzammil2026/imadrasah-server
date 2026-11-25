const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getAllUsers,
  updateUserRole,
} = require("../controllers/users.controller");
const authRoutes = require("./auth.routes");

router.get("/stats", getDashboardStats);
router.get("/users", getAllUsers);
router.patch("/users/:id/role", updateUserRole);

// Forward /api/users/register and /api/users/login to auth router
router.use("/", authRoutes);

module.exports = router;
