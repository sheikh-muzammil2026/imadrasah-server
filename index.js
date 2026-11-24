const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const { connectDB } = require("./src/config/db");

// Import Routes
const coursesRoutes = require("./src/routes/courses.routes");
const ebooksRoutes = require("./src/routes/ebooks.routes");
const testimonialsRoutes = require("./src/routes/testimonials.routes");
const usersRoutes = require("./src/routes/users.routes");
const authRoutes = require("./src/routes/auth.routes");

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Root healthcheck
app.get("/", (req, res) => {
  res.send("Quran Kanon Online Madrasah API is Running!");
});

// Modular Routes
app.use("/api/courses", coursesRoutes);
app.use("/api/ebooks", ebooksRoutes);
app.use("/api/testimonials", testimonialsRoutes);
app.use("/api/dashboard", usersRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/auth", authRoutes);

// Backwards-compatible aliases
app.use("/courses", coursesRoutes);
app.use("/available-courses", (req, res, next) => {
  req.url = "/available";
  coursesRoutes(req, res, next);
});
app.use("/enrolled-courses", (req, res, next) => {
  if (req.method === "POST") req.url = "/enroll";
  coursesRoutes(req, res, next);
});

// Initialize database and start server
connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Quran Kanon Server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB, starting server anyway...", err);
    app.listen(port, () => {
      console.log(`Quran Kanon Server listening on port ${port} (DB connecting in background)`);
    });
  });

module.exports = app;
