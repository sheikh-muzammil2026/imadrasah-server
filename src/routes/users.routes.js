const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getAllUsers,
  updateUserRole,
} = require("../controllers/users.controller");

router.get("/stats", getDashboardStats);
router.get("/users", getAllUsers);
router.patch("/users/:id/role", updateUserRole);

module.exports = router;
