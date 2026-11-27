const express = require("express");
const router = express.Router();
const {
  saveAttendance,
  getAttendance,
  getTeacherStudents,
  getAssignments,
  createAssignment,
  getSubmissions,
  gradeSubmission,
} = require("../controllers/teacher.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { requireTeacher } = require("../middleware/rbac.middleware");

// Attendance management
router.post("/attendance", authenticate, requireTeacher, saveAttendance);
router.get("/attendance", authenticate, requireTeacher, getAttendance);

// Root path for /api/attendance alias
router.post("/", authenticate, requireTeacher, saveAttendance);
router.get("/", authenticate, requireTeacher, getAttendance);

// Teacher's enrolled students
router.get("/students", authenticate, requireTeacher, getTeacherStudents);

// Assignments management
router.get("/assignments", authenticate, requireTeacher, getAssignments);
router.post("/assignments", authenticate, requireTeacher, createAssignment);

// Submissions & Grading
router.get("/submissions", authenticate, requireTeacher, getSubmissions);
router.patch("/submissions/:id/grade", authenticate, requireTeacher, gradeSubmission);

module.exports = router;
