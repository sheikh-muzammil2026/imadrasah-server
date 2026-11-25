const express = require("express");
const router = express.Router();
const { getUsersCollection } = require("../config/db");
const { hashPassword, verifyPassword } = require("../utils/auth");
const { ObjectId } = require("mongodb");

/**
 * POST /api/auth/register
 * Registers user into MongoDB 'users' collection with hashed password
 */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "নাম, ইমেইল এবং পাসওয়ার্ড আবশ্যক।",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।",
      });
    }

    const usersCollection = getUsersCollection();
    const normalizedEmail = email.toLowerCase().trim();

    // Check duplicate email
    const existingUser = await usersCollection.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা আছে।",
      });
    }

    // Hash password & insert into 'users' collection
    const hashedPassword = hashPassword(password);
    const newUser = {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role || "student",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    return res.status(201).json({
      success: true,
      message: "নিবন্ধন সফলভাবে সম্পন্ন হয়েছে!",
      user: {
        id: result.insertedId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "নিবন্ধন সম্পন্ন করতে ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।",
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticates user from MongoDB 'users' collection
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "দয়া করে ইমেইল ও পাসওয়ার্ড প্রদান করুন।",
      });
    }

    const usersCollection = getUsersCollection();
    const normalizedEmail = email.toLowerCase().trim();

    const user = await usersCollection.findOne({ email: normalizedEmail });
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({
        success: false,
        message: "ভুল ইমেইল বা পাসওয়ার্ড। দয়া করে আবার চেষ্টা করুন।",
      });
    }

    return res.status(200).json({
      success: true,
      message: "লগইন সফল হয়েছে!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "student",
        studentId: user.studentId || null,
        teacherId: user.teacherId || null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "লগইন করতে ব্যর্থ হয়েছে। সার্ভার এরর।",
      error: error.message,
    });
  }
});

// Role verification endpoint
router.get("/me/:email", async (req, res) => {
  try {
    const usersCollection = getUsersCollection();
    const { email } = req.params;
    const user = await usersCollection.findOne({ email: email.toLowerCase().trim() });
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
        studentId: user.studentId || null,
        teacherId: user.teacherId || null,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;
