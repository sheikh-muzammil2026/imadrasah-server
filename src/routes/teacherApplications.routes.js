const express = require("express");
const router = express.Router();
const {
  submitApplication,
  getAllApplications,
  getApplicationById,
  approveApplication,
  rejectApplication,
  deleteApplication,
} = require("../controllers/teacherApplications.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");

// Public endpoint: Submit application
router.post("/", submitApplication);

// Admin endpoints: List, Details, Approve, Reject, Delete (Protected by RBAC)
router.get("/", authenticate, requireAdmin, getAllApplications);
router.get("/:id", authenticate, requireAdmin, getApplicationById);
router.patch("/:id/approve", authenticate, requireAdmin, approveApplication);
router.post("/:id/approve", authenticate, requireAdmin, approveApplication);
router.patch("/:id/reject", authenticate, requireAdmin, rejectApplication);
router.post("/:id/reject", authenticate, requireAdmin, rejectApplication);
router.delete("/:id", authenticate, requireAdmin, deleteApplication);

module.exports = router;
