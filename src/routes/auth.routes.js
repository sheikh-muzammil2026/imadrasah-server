const express = require("express");
const router = express.Router();
const { getUsersCollection } = require("../config/db");
const { ObjectId } = require("mongodb");

// Role verification endpoint
router.get("/me/:email", async (req, res) => {
  try {
    const usersCollection = getUsersCollection();
    const { email } = req.params;
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "student",
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;
