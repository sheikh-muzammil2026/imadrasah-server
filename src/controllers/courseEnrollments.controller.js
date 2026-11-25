const { ObjectId } = require("mongodb");
const {
  getCourseEnrollmentsCollection,
  getUsersCollection,
} = require("../config/db");

/**
 * Generate sequential unique Student ID starting from "0401"
 * "04" = Student prefix code.
 * Sequence starts at 01 ("0401"), then 02 ("0402"), 03 ("0403")...
 */
async function generateNextStudentId() {
  const usersCollection = getUsersCollection();
  const enrollmentsCollection = getCourseEnrollmentsCollection();

  const [usersWithSid, enrollmentsWithSid] = await Promise.all([
    usersCollection
      .find({ studentId: { $exists: true, $ne: null } }, { projection: { studentId: 1 } })
      .toArray()
      .catch(() => []),
    enrollmentsCollection
      .find({ studentId: { $exists: true, $ne: null } }, { projection: { studentId: 1 } })
      .toArray()
      .catch(() => []),
  ]);

  let maxSequence = 0; // Baseline before 01 is 0

  const allStudentIds = [...usersWithSid, ...enrollmentsWithSid].map((doc) =>
    String(doc.studentId || "").trim()
  );

  for (const sid of allStudentIds) {
    if (sid.startsWith("04")) {
      const suffix = sid.slice(2);
      const parsedNum = parseInt(suffix, 10);
      if (!isNaN(parsedNum) && parsedNum > maxSequence) {
        maxSequence = parsedNum;
      }
    }
  }

  const nextSeq = maxSequence + 1;
  const formattedSuffix = nextSeq < 10 ? `0${nextSeq}` : `${nextSeq}`;
  return `04${formattedSuffix}`;
}

// 1. Submit course enrollment request (Student)
async function submitEnrollment(req, res) {
  try {
    const enrollmentsCollection = getCourseEnrollmentsCollection();
    const {
      userId,
      userName,
      userEmail,
      courseSlug,
      courseTitle,
      phone,
    } = req.body;

    if (!userEmail || !courseSlug) {
      return res.status(400).json({
        success: false,
        message: "ব্যবহারকারীর ইমেইল ও কোর্সের তথ্য আবশ্যক।",
      });
    }

    const email = userEmail.toLowerCase().trim();

    // Check if active pending or approved enrollment exists
    const existing = await enrollmentsCollection.findOne({
      userEmail: email,
      courseSlug,
      status: { $in: ["pending", "approved"] },
    });

    if (existing) {
      if (existing.status === "approved") {
        return res.status(400).json({
          success: false,
          message: "আপনি ইতোমধ্যে এই কোর্সে ভর্তি রয়েছেন।",
          status: "approved",
          enrollment: existing,
        });
      }
      return res.status(400).json({
        success: false,
        message: "এই কোর্সে আপনার একটি আবেদন ইতোমধ্যেই প্রক্রিয়াধীন রয়েছে।",
        status: "pending",
        enrollment: existing,
      });
    }

    const enrollmentDoc = {
      userId: userId || "",
      userName: userName ? userName.trim() : "শিক্ষার্থী",
      userEmail: email,
      phone: phone ? phone.trim() : "",
      courseSlug: courseSlug.trim(),
      courseTitle: courseTitle ? courseTitle.trim() : courseSlug,
      status: "pending",
      adminFeedback: "",
      appliedAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await enrollmentsCollection.insertOne(enrollmentDoc);

    res.status(201).json({
      success: true,
      message: "কোর্সে ভর্তির আবেদন সফলভাবে জমা হয়েছে। অ্যাডমিন প্যানেল পর্যালোচনা করে অনুমোদন প্রদান করবে।",
      enrollmentId: result.insertedId,
      enrollment: enrollmentDoc,
    });
  } catch (error) {
    console.error("Error submitting course enrollment:", error);
    res.status(500).json({
      success: false,
      message: "আবেদন জমা দিতে সমস্যা হয়েছে।",
    });
  }
}

// 2. Get enrollments with filters (Student: by email / Admin: all)
async function getAllEnrollments(req, res) {
  try {
    const enrollmentsCollection = getCourseEnrollmentsCollection();
    const { userEmail, courseSlug, status, search } = req.query;

    const query = {};
    if (userEmail) query.userEmail = userEmail.toLowerCase().trim();
    if (courseSlug) query.courseSlug = courseSlug;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: "i" } },
        { userEmail: { $regex: search, $options: "i" } },
        { courseTitle: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
      ];
    }

    const enrollments = await enrollmentsCollection
      .find(query)
      .sort({ appliedAt: -1 })
      .toArray();

    res.json({
      success: true,
      count: enrollments.length,
      enrollments,
    });
  } catch (error) {
    console.error("Error fetching course enrollments:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// 3. Get single enrollment
async function getEnrollmentById(req, res) {
  try {
    const enrollmentsCollection = getCourseEnrollmentsCollection();
    const { id } = req.params;

    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const enrollment = await enrollmentsCollection.findOne(query);

    if (!enrollment) {
      return res.status(404).json({ success: false, message: "Enrollment not found" });
    }

    res.json({ success: true, enrollment });
  } catch (error) {
    console.error("Error fetching enrollment:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// 4. Approve enrollment: Generate 0401+ Student ID if not already assigned, add to user enrolledCourses
async function approveEnrollment(req, res) {
  try {
    const enrollmentsCollection = getCourseEnrollmentsCollection();
    const usersCollection = getUsersCollection();
    const { id } = req.params;

    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const enrollment = await enrollmentsCollection.findOne(query);

    if (!enrollment) {
      return res.status(404).json({ success: false, message: "আবেদনটি খুঁজে পাওয়া যায়নি।" });
    }

    const userEmail = enrollment.userEmail.toLowerCase().trim();
    const existingUser = await usersCollection.findOne({ email: userEmail });

    // Check if user already has studentId
    let studentId = existingUser?.studentId || enrollment.studentId;
    if (!studentId) {
      // Generate next 0401+ sequential ID
      studentId = await generateNextStudentId();
    }

    // 1. Update enrollment document
    await enrollmentsCollection.updateOne(query, {
      $set: {
        status: "approved",
        studentId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // 2. Grant course access & update user record
    const courseAccessItem = {
      courseSlug: enrollment.courseSlug,
      courseTitle: enrollment.courseTitle,
      enrolledAt: new Date(),
    };

    if (existingUser) {
      await usersCollection.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            studentId,
            role: existingUser.role === "admin" || existingUser.role === "teacher" ? existingUser.role : "student",
            updatedAt: new Date(),
          },
          $addToSet: {
            enrolledCourses: courseAccessItem,
          },
        }
      );
    } else {
      await usersCollection.insertOne({
        name: enrollment.userName,
        email: userEmail,
        role: "student",
        studentId,
        enrolledCourses: [courseAccessItem],
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    res.json({
      success: true,
      message: `কোর্সে ভর্তি আবেদন সফলভাবে অনুমোদিত হয়েছে। শিক্ষার্থী আইডি: ${studentId}`,
      studentId,
      status: "approved",
    });
  } catch (error) {
    console.error("Error approving course enrollment:", error);
    res.status(500).json({ success: false, message: "অনুমোদনে সমস্যা হয়েছে।" });
  }
}

// 5. Reject enrollment with adminFeedback note
async function rejectEnrollment(req, res) {
  try {
    const enrollmentsCollection = getCourseEnrollmentsCollection();
    const { id } = req.params;
    const { adminFeedback } = req.body;

    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const feedbackNote =
      adminFeedback && adminFeedback.trim()
        ? adminFeedback.trim()
        : "আবেদন পর্যালোচনায় তথ্যের ঘাটতি থাকায় এই মুহূর্তে আবেদনটি গ্রহণ করা সম্ভব হয়নি। অনুগ্রহ করে বিস্তারিত তথ্যসহ পুনরায় আবেদন করুন।";

    const result = await enrollmentsCollection.updateOne(query, {
      $set: {
        status: "rejected",
        adminFeedback: feedbackNote,
        rejectedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "আবেদনটি খুঁজে পাওয়া যায়নি।" });
    }

    res.json({
      success: true,
      message: "ভর্তি আবেদন বাতিল করা হয়েছে এবং শিক্ষার্থীকে কারণ জানানো হয়েছে।",
      status: "rejected",
      adminFeedback: feedbackNote,
    });
  } catch (error) {
    console.error("Error rejecting course enrollment:", error);
    res.status(500).json({ success: false, message: "বাতিল করতে সমস্যা হয়েছে।" });
  }
}

// 6. Delete enrollment
async function deleteEnrollment(req, res) {
  try {
    const enrollmentsCollection = getCourseEnrollmentsCollection();
    const { id } = req.params;

    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const result = await enrollmentsCollection.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "আবেদনটি পাওয়া যায়নি।" });
    }

    res.json({ success: true, message: "আবেদন মুছে ফেলা হয়েছে।" });
  } catch (error) {
    console.error("Error deleting course enrollment:", error);
    res.status(500).json({ success: false, message: "মুছতে সমস্যা হয়েছে।" });
  }
}

module.exports = {
  submitEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  approveEnrollment,
  rejectEnrollment,
  deleteEnrollment,
  generateNextStudentId,
};
