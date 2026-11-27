const express = require("express");
const router = express.Router();
const {
  submitEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  approveEnrollment,
  rejectEnrollment,
  deleteEnrollment,
} = require("../controllers/courseEnrollments.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");

// Public/Student: Submit & List
router.post("/", submitEnrollment);
router.get("/", getAllEnrollments);
router.get("/:id", getEnrollmentById);

// Admin: Approve, Reject, Delete (Protected by RBAC)
router.patch("/:id/approve", authenticate, requireAdmin, approveEnrollment);
router.post("/:id/approve", authenticate, requireAdmin, approveEnrollment);
router.patch("/:id/reject", authenticate, requireAdmin, rejectEnrollment);
router.post("/:id/reject", authenticate, requireAdmin, rejectEnrollment);
router.delete("/:id", authenticate, requireAdmin, deleteEnrollment);

module.exports = router;
