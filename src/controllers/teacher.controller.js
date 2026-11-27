/**
 * Teacher Workflows Controller
 * Handles class attendance recording, student progress roster, assignments & grading.
 */

const { ObjectId } = require("mongodb");
const {
  getAttendanceCollection,
  getAssignmentsCollection,
  getSubmissionsCollection,
  getCourseEnrollmentsCollection,
  getCoursesCollection,
} = require("../config/db");
const { recordAuditLog } = require("../services/auditLog.service");

/**
 * POST /api/teacher/attendance
 * Save or update daily class attendance for a course
 */
async function saveAttendance(req, res) {
  try {
    const {
      courseSlug,
      courseTitle,
      date,
      lessonTopic,
      records,
    } = req.body || {};

    if (!courseSlug || !date || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: "কোর্স আইডি, ক্লাসের তারিখ এবং শিক্ষার্থীদের হাজিরা তালিকা আবশ্যক।",
      });
    }

    const attendanceCollection = getAttendanceCollection();
    const teacherId = req.user?.teacherId || req.user?.id || req.body.teacherId || "0202";
    const teacherName = req.user?.name || req.body.teacherName || "শিক্ষক";

    const formattedRecords = records.map((r) => ({
      studentId: String(r.studentId || "0401"),
      studentName: String(r.studentName || ""),
      studentEmail: String(r.studentEmail || "").toLowerCase().trim(),
      status: ["present", "absent", "late", "excused"].includes(r.status)
        ? r.status
        : "present",
      notes: r.notes || "",
    }));

    const attendanceDoc = {
      courseSlug,
      courseTitle: courseTitle || courseSlug,
      date,
      teacherId,
      teacherName,
      lessonTopic: lessonTopic ? lessonTopic.trim() : "দৈনিক পাঠ ও তিলাওয়াত মাশক",
      records: formattedRecords,
      totalCount: formattedRecords.length,
      presentCount: formattedRecords.filter((r) => r.status === "present").length,
      absentCount: formattedRecords.filter((r) => r.status === "absent").length,
      lateCount: formattedRecords.filter((r) => r.status === "late").length,
      updatedAt: new Date(),
    };

    // Upsert attendance for the same course and date
    const existing = await attendanceCollection.findOne({ courseSlug, date });

    if (existing) {
      await attendanceCollection.updateOne(
        { _id: existing._id },
        { $set: attendanceDoc }
      );
      attendanceDoc._id = existing._id;
    } else {
      attendanceDoc.createdAt = new Date();
      const insertResult = await attendanceCollection.insertOne(attendanceDoc);
      attendanceDoc._id = insertResult.insertedId;
    }

    // Optional audit log for teacher attendance entry
    await recordAuditLog({
      actor: req.user,
      action: existing ? "ATTENDANCE_UPDATED" : "ATTENDANCE_RECORDED",
      target: {
        type: "attendance",
        id: attendanceDoc._id.toString(),
        name: `${courseTitle || courseSlug} (${date})`,
      },
      details: {
        courseSlug,
        date,
        total: attendanceDoc.totalCount,
        present: attendanceDoc.presentCount,
      },
      ip: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: "আজকের ক্লাসের হাজিরা সফলভাবে সংরক্ষিত হয়েছে!",
      record: attendanceDoc,
    });
  } catch (error) {
    console.error("Save attendance error:", error);
    return res.status(500).json({
      success: false,
      message: "হাজিরা সংরক্ষণ করতে অভ্যন্তরীণ সমস্যা হয়েছে।",
      error: error.message,
    });
  }
}

/**
 * GET /api/teacher/attendance
 * Retrieve attendance logs scoped by teacher or course
 */
async function getAttendance(req, res) {
  try {
    const { courseSlug, date, studentEmail, limit = 50, skip = 0 } = req.query;
    const filter = {};

    if (courseSlug) filter.courseSlug = courseSlug;
    if (date) filter.date = date;
    if (studentEmail) filter["records.studentEmail"] = studentEmail.toLowerCase().trim();

    // If teacher role, scope to teacher's courses
    if (req.user?.role === "teacher" && req.user?.teacherId) {
      filter.$or = [
        { teacherId: req.user.teacherId },
        { teacherId: req.user.id },
      ];
    }

    const attendanceCollection = getAttendanceCollection();
    const [total, records] = await Promise.all([
      attendanceCollection.countDocuments(filter).catch(() => 0),
      attendanceCollection
        .find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .toArray()
        .catch(() => []),
    ]);

    return res.status(200).json({
      success: true,
      count: total,
      records,
    });
  } catch (error) {
    console.error("Get attendance error:", error);
    return res.status(500).json({
      success: false,
      message: "হাজিরা রেকর্ড লোড করতে সমস্যা হয়েছে।",
      error: error.message,
    });
  }
}

/**
 * GET /api/teacher/students
 * Retrieve enrolled students for teacher's assigned courses
 */
async function getTeacherStudents(req, res) {
  try {
    const enrollmentsCollection = getCourseEnrollmentsCollection();
    const filter = { status: "approved" };

    const students = await enrollmentsCollection.find(filter).toArray().catch(() => []);

    return res.status(200).json({
      success: true,
      count: students.length,
      students: students.map((s) => ({
        id: s._id.toString(),
        studentId: s.studentId || "0401",
        studentName: s.studentName,
        studentEmail: s.studentEmail,
        courseId: s.courseId,
        courseTitle: s.courseTitle,
        teacherName: s.teacherName,
        enrolledAt: s.approvedAt || s.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get teacher students error:", error);
    return res.status(500).json({
      success: false,
      message: "শিক্ষার্থী তালিকা লোড করতে ব্যর্থ হয়েছে।",
      error: error.message,
    });
  }
}

/**
 * GET /api/teacher/assignments
 * Retrieve assignments for teacher courses
 */
async function getAssignments(req, res) {
  try {
    const { courseId } = req.query;
    const filter = {};
    if (courseId) filter.courseId = courseId;

    const assignmentsCollection = getAssignmentsCollection();
    const assignments = await assignmentsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray()
      .catch(() => []);

    return res.status(200).json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error("Get assignments error:", error);
    return res.status(500).json({
      success: false,
      message: "অ্যাসাইনমেন্ট লোড করতে ব্যর্থ হয়েছে।",
      error: error.message,
    });
  }
}

/**
 * POST /api/teacher/assignments
 * Create a new assignment
 */
async function createAssignment(req, res) {
  try {
    const { courseId, courseTitle, title, dueDate, totalMarks, instructions } = req.body || {};

    if (!courseId || !title) {
      return res.status(400).json({
        success: false,
        message: "কোর্স আইডি এবং অ্যাসাইনমেন্টের শিরোনাম আবশ্যক।",
      });
    }

    const assignmentsCollection = getAssignmentsCollection();
    const newAssignment = {
      courseId,
      courseTitle: courseTitle || courseId,
      title: title.trim(),
      dueDate: dueDate || null,
      totalMarks: Number(totalMarks) || 20,
      instructions: instructions ? instructions.trim() : "",
      teacherId: req.user?.teacherId || req.user?.id || "teacher-1",
      teacherName: req.user?.name || "শিক্ষক",
      createdAt: new Date(),
    };

    const result = await assignmentsCollection.insertOne(newAssignment);
    newAssignment._id = result.insertedId;

    return res.status(201).json({
      success: true,
      message: "নতুন অ্যাসাইনমেন্ট সফলভাবে তৈরি হয়েছে!",
      assignment: newAssignment,
    });
  } catch (error) {
    console.error("Create assignment error:", error);
    return res.status(500).json({
      success: false,
      message: "অ্যাসাইনমেন্ট তৈরি করতে অভ্যন্তরীণ সমস্যা হয়েছে।",
      error: error.message,
    });
  }
}

/**
 * GET /api/teacher/submissions
 * Get student assignment submissions
 */
async function getSubmissions(req, res) {
  try {
    const { courseId, assignmentId, status } = req.query;
    const filter = {};
    if (courseId) filter.courseId = courseId;
    if (assignmentId) filter.assignmentId = assignmentId;
    if (status) filter.status = status;

    const submissionsCollection = getSubmissionsCollection();
    const submissions = await submissionsCollection
      .find(filter)
      .sort({ submittedAt: -1 })
      .toArray()
      .catch(() => []);

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    console.error("Get submissions error:", error);
    return res.status(500).json({
      success: false,
      message: "জমা পড়া অ্যাসাইনমেন্ট লোড করতে ব্যর্থ হয়েছে।",
      error: error.message,
    });
  }
}

/**
 * PATCH /api/teacher/submissions/:id/grade
 * Grade a student assignment submission
 */
async function gradeSubmission(req, res) {
  try {
    const { id } = req.params;
    const { grade, note } = req.body || {};

    if (!grade) {
      return res.status(400).json({
        success: false,
        message: "মার্ক বা গ্রেড প্রদান আবশ্যক।",
      });
    }

    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const submissionsCollection = getSubmissionsCollection();

    const result = await submissionsCollection.updateOne(query, {
      $set: {
        grade: String(grade).trim(),
        note: note ? String(note).trim() : "",
        status: "graded",
        gradedAt: new Date(),
        gradedBy: req.user?.name || "শিক্ষক",
      },
    });

    return res.status(200).json({
      success: true,
      message: "অ্যাসাইনমেন্ট মূল্যায়ন সম্পন্ন হয়েছে!",
      result,
    });
  } catch (error) {
    console.error("Grade submission error:", error);
    return res.status(500).json({
      success: false,
      message: "মূল্যায়ন সংরক্ষণ করতে সমস্যা হয়েছে।",
      error: error.message,
    });
  }
}

module.exports = {
  saveAttendance,
  getAttendance,
  getTeacherStudents,
  getAssignments,
  createAssignment,
  getSubmissions,
  gradeSubmission,
};
