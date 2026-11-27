const { ObjectId } = require("mongodb");
const {
  getUsersCollection,
  getCoursesCollection,
  getEnrolledCollection,
  getEbooksCollection,
} = require("../config/db");
const { recordAuditLog, getAuditLogs } = require("../services/auditLog.service");

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

// Update user role (Admin / Super Admin)
async function updateUserRole(req, res) {
  try {
    const usersCollection = getUsersCollection();
    const { id } = req.params;
    const { role } = req.body;
    const validRoles = ["super_admin", "admin", "teacher", "student"];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: "অকার্যকর রোল নির্দেশ করা হয়েছে।" });
    }

    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const targetUser = await usersCollection.findOne(query);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "ব্যবহারকারী পাওয়া যায়নি।" });
    }

    // Role Escalation Protection: Only super_admin can assign or modify a super_admin
    const currentActorRole = req.user?.role || "admin";
    if ((role === "super_admin" || targetUser.role === "super_admin") && currentActorRole !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "কেবলমাত্র সুপার অ্যাডমিন এই রোলটি পরিবর্তন করতে পারেন।",
      });
    }

    const result = await usersCollection.updateOne(query, {
      $set: { role, updatedAt: new Date() },
    });

    // Record audit log
    await recordAuditLog({
      actor: req.user,
      action: "USER_ROLE_UPDATED",
      target: {
        type: "user",
        id: targetUser._id.toString(),
        name: targetUser.name,
      },
      details: {
        previousRole: targetUser.role,
        newRole: role,
        userEmail: targetUser.email,
      },
      ip: req.ip,
    });

    res.json({ success: true, message: `রোল সফলভাবে ${role} এ আপডেট করা হয়েছে।`, result });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// Toggle user status between "active" and "suspended" (Admin / Super Admin)
async function toggleUserStatus(req, res) {
  try {
    const usersCollection = getUsersCollection();
    const { id } = req.params;
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const targetUser = await usersCollection.findOne(query);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "ব্যবহারকারী পাওয়া যায়নি।" });
    }

    // Cannot suspend yourself
    if (req.user?.id && targetUser._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ success: false, message: "আপনি নিজের অ্যাকাউন্ট স্থগিত করতে পারবেন না।" });
    }

    // Non-superadmin cannot suspend a superadmin
    if (targetUser.role === "super_admin" && req.user?.role !== "super_admin") {
      return res.status(403).json({ success: false, message: "সুপার অ্যাডমিন অ্যাকাউন্ট স্থগিত করার অনুমতি নেই।" });
    }

    const newStatus = targetUser.status === "suspended" ? "active" : "suspended";

    await usersCollection.updateOne(query, {
      $set: { status: newStatus, updatedAt: new Date() },
    });

    // Record audit log
    await recordAuditLog({
      actor: req.user,
      action: "USER_STATUS_TOGGLED",
      target: {
        type: "user",
        id: targetUser._id.toString(),
        name: targetUser.name,
      },
      details: {
        previousStatus: targetUser.status || "active",
        newStatus,
        userEmail: targetUser.email,
      },
      ip: req.ip,
    });

    res.json({
      success: true,
      message: `ব্যবহারকারী অ্যাকাউন্ট সফলভাবে ${newStatus === "active" ? "সক্রিয়" : "স্থগিত"} করা হয়েছে।`,
      status: newStatus,
    });
  } catch (error) {
    console.error("Error toggling user status:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// Get Audit Logs (Super Admin only)
async function fetchAuditLogs(req, res) {
  try {
    const { limit, skip, action, actorEmail } = req.query;
    const data = await getAuditLogs({ limit, skip, action, actorEmail });
    res.json(data);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

module.exports = {
  getDashboardStats,
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
  fetchAuditLogs,
};
