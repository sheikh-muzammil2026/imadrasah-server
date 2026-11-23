const express = require("express");
const router = express.Router();
const {
  getAllCourses,
  getAvailableCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollCourse,
  getEnrolledCoursesByUser,
  deleteEnrolledCourse,
} = require("../controllers/courses.controller");

// Public
router.get("/", getAllCourses);
router.get("/available", getAvailableCourses);
router.get("/:id", getCourseById);

// Admin / Teacher
router.post("/", createCourse);
router.patch("/:id", updateCourse);
router.delete("/:id", deleteCourse);

// Enrollment
router.post("/enroll", enrollCourse);
router.get("/enrolled/:userId", getEnrolledCoursesByUser);
router.delete("/enrolled/:id", deleteEnrolledCourse);

module.exports = router;
