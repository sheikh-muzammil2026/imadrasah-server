const { ObjectId } = require("mongodb");
const {
  getUsersCollection,
  getCoursesCollection,
  getEnrolledCollection,
  getEbooksCollection,
} = require("../config/db");

// Get overview stats for Admin Dashboard & Public stats
async function getDashboardStats(req, res) {
  try {
    const usersCollection = getUsersCollection();
    const coursesCollection = getCoursesCollection();
    const enrolledCollection = getEnrolledCollection();
    const ebooksCollection = getEbooksCollection();

    const [totalStudents, totalTeachers, totalCourses, totalEnrolled, totalEbooks] =
      await Promise.all([
        usersCollection.countDocuments({ role: "student" }).catch(() => 0),
        usersCollection.countDocuments({ role: "teacher" }).catch(() => 0),
        coursesCollection.countDocuments().catch(() => 0),
        enrolledCollection.countDocuments().catch(() => 0),
        ebooksCollection.countDocuments().catch(() => 0),
      ]);

    res.json({
      success: true,
      stats: {
        registeredStudents: totalStudents > 0 ? totalStudents : 12400,
        runningCourses: totalCourses > 0 ? totalCourses : 38,
        experiencedTeachers: totalTeachers > 0 ? totalTeachers : 26,
        certifiedStudents: 910,
        totalEnrolled: totalEnrolled || 1450,
        totalEbooks: totalEbooks || 24,
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// Get all users (Admin)
async function getAllUsers(req, res) {
  try {
    const usersCollection = getUsersCollection();
    const { role, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    const users = await usersCollection.find(query, { projection: { password: 0 } }).toArray();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// Update user role (Admin)
async function updateUserRole(req, res) {
  try {
    const usersCollection = getUsersCollection();
    const { id } = req.params;
    const { role } = req.body;
    if (!["admin", "teacher", "student"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role specified" });
    }
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const result = await usersCollection.updateOne(query, {
      $set: { role, updatedAt: new Date() },
    });
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

module.exports = {
  getDashboardStats,
  getAllUsers,
  updateUserRole,
};
