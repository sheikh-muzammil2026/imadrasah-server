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

// Public/Student: Submit & List
router.post("/", submitEnrollment);
router.get("/", getAllEnrollments);
router.get("/:id", getEnrollmentById);

// Admin: Approve, Reject, Delete
router.patch("/:id/approve", approveEnrollment);
router.post("/:id/approve", approveEnrollment);
router.patch("/:id/reject", rejectEnrollment);
router.post("/:id/reject", rejectEnrollment);
router.delete("/:id", deleteEnrollment);

module.exports = router;
