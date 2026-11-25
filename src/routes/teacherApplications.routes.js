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

// Public endpoint: Submit application
router.post("/", submitApplication);

// Admin endpoints: List, Details, Approve, Reject, Delete
router.get("/", getAllApplications);
router.get("/:id", getApplicationById);
router.patch("/:id/approve", approveApplication);
router.post("/:id/approve", approveApplication);
router.patch("/:id/reject", rejectApplication);
router.post("/:id/reject", rejectApplication);
router.delete("/:id", deleteApplication);

module.exports = router;
