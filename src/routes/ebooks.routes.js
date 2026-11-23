const express = require("express");
const router = express.Router();
const {
  getAllEbooks,
  getEbookById,
  createEbook,
  updateEbook,
  deleteEbook,
} = require("../controllers/ebooks.controller");

router.get("/", getAllEbooks);
router.get("/:id", getEbookById);
router.post("/", createEbook);
router.patch("/:id", updateEbook);
router.delete("/:id", deleteEbook);

module.exports = router;
