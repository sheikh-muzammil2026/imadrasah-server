const express = require("express");
const router = express.Router();
const {
  getAllTestimonials,
  createTestimonial,
  deleteTestimonial,
} = require("../controllers/testimonials.controller");

router.get("/", getAllTestimonials);
router.post("/", createTestimonial);
router.delete("/:id", deleteTestimonial);

module.exports = router;
