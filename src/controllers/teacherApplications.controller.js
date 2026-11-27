const { ObjectId } = require("mongodb");
const {
  getTeacherApplicationsCollection,
  getUsersCollection,
  getDB,
} = require("../config/db");
const { recordAuditLog } = require("../services/auditLog.service");

/**
 * Generate sequential unique Teacher ID starting from "0203"
 * "02" = Teacher prefix code.
 * Sequence starts at 03 ("0203"), then 04 ("0204"), 05 ("0205")...
 */
async function generateNextTeacherId() {
  const usersCollection = getUsersCollection();
  const applicationsCollection = getTeacherApplicationsCollection();

  const [usersWithTid, appsWithTid] = await Promise.all([
    usersCollection
      .find({ teacherId: { $exists: true, $ne: null } }, { projection: { teacherId: 1 } })
      .toArray()
      .catch(() => []),
    applicationsCollection
      .find({ teacherId: { $exists: true, $ne: null } }, { projection: { teacherId: 1 } })
      .toArray()
      .catch(() => []),
  ]);

  let maxSequence = 2; // Default baseline before 03 is 2

  const allTeacherIds = [...usersWithTid, ...appsWithTid].map((doc) =>
    String(doc.teacherId || "").trim()
  );

  for (const tid of allTeacherIds) {
    if (tid.startsWith("02")) {
      const suffix = tid.slice(2);
      const parsedNum = parseInt(suffix, 10);
      if (!isNaN(parsedNum) && parsedNum > maxSequence) {
        maxSequence = parsedNum;
      }
    }
  }

  const nextSeq = maxSequence + 1;
  const formattedSuffix = nextSeq < 10 ? `0${nextSeq}` : `${nextSeq}`;
  return `02${formattedSuffix}`;
}

// 1. Submit teacher application (Public)
async function submitApplication(req, res) {
  try {
    const applicationsCollection = getTeacherApplicationsCollection();
    const {
      name,
      fatherName,
      phone,
      email,
      nidOrBrn,
      qualification,
      department,
      experience,
      address,
      bioOrCvLink,
    } = req.body;

    if (!name || !phone || !email || !qualification || !department) {
      return res.status(400).json({
        success: false,
        message: "অনুগ্রহ করে সকল আবশ্যক তথ্য (নাম, ফোন, ইমেইল, শিক্ষাগত যোগ্যতা ও বিভাগ) পূরণ করুন।",
      });
    }

    const applicationDoc = {
      name: name.trim(),
      fatherName: fatherName ? fatherName.trim() : "",
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      nidOrBrn: nidOrBrn ? nidOrBrn.trim() : "",
      qualification: qualification.trim(),
      department: department.trim(),
      experience: experience ? experience.trim() : "নতুন",
      address: address ? address.trim() : "",
      bioOrCvLink: bioOrCvLink ? bioOrCvLink.trim() : "",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await applicationsCollection.insertOne(applicationDoc);

    res.status(201).json({
      success: true,
      message: "আপনার শিক্ষক আবেদনটি সফলভাবে গৃহীত হয়েছে। অ্যাডমিন প্যানেল পর্যালোচনা করে দ্রুত যোগাযোগ করবে।",
      applicationId: result.insertedId,
      application: applicationDoc,
    });
  } catch (error) {
    console.error("Error submitting teacher application:", error);
    res.status(500).json({
      success: false,
      message: "আবেদন জমা দিতে সমস্যা হয়েছে। দয়া করে পুনরায় চেষ্টা করুন।",
    });
  }
}

// 2. Get all applications (Admin)
async function getAllApplications(req, res) {
  try {
    const applicationsCollection = getTeacherApplicationsCollection();
    const { status, department, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (department) query.department = department;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { teacherId: { $regex: search, $options: "i" } },
      ];
    }

    const applications = await applicationsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error("Error fetching teacher applications:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// 3. Get single application by ID
async function getApplicationById(req, res) {
  try {
    const applicationsCollection = getTeacherApplicationsCollection();
    const { id } = req.params;

    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const application = await applicationsCollection.findOne(query);

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    res.json({ success: true, application });
  } catch (error) {
    console.error("Error fetching application details:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// 4. Approve application: Generate Teacher ID (0203+) and grant role: "teacher"
async function approveApplication(req, res) {
  try {
    const applicationsCollection = getTeacherApplicationsCollection();
    const usersCollection = getUsersCollection();
    const { id } = req.params;

    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const application = await applicationsCollection.findOne(query);

    if (!application) {
      return res.status(404).json({ success: false, message: "আবেদনটি খুঁজে পাওয়া যায়নি।" });
    }

    // If already approved and has teacherId, return existing
    let teacherId = application.teacherId;
    if (!teacherId || application.status !== "approved") {
      teacherId = await generateNextTeacherId();
    }

    // 1. Update Application status
    await applicationsCollection.updateOne(query, {
      $set: {
        status: "approved",
        teacherId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // 2. Link or create user in MongoDB user collection with role: "teacher"
    const userEmail = application.email.toLowerCase().trim();
    const existingUser = await usersCollection.findOne({ email: userEmail });

    if (existingUser) {
      await usersCollection.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            role: "teacher",
            teacherId,
            department: application.department,
            phone: application.phone || existingUser.phone,
            qualification: application.qualification,
            updatedAt: new Date(),
          },
        }
      );
    } else {
      await usersCollection.insertOne({
        name: application.name,
        email: userEmail,
        role: "teacher",
        teacherId,
        department: application.department,
        phone: application.phone,
        qualification: application.qualification,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // 3. Record audit log
    await recordAuditLog({
      actor: req.user,
      action: "TEACHER_APPLICATION_APPROVED",
      target: {
        type: "teacher_application",
        id: application._id.toString(),
        name: `${application.name} (${application.department})`,
      },
      details: {
        teacherId,
        email: application.email,
        phone: application.phone,
      },
      ip: req.ip,
    });

    res.json({
      success: true,
      message: `শিক্ষক আবেদন সফলভাবে অনুমোদিত হয়েছে। আইডি: ${teacherId}`,
      teacherId,
      status: "approved",
    });
  } catch (error) {
    console.error("Error approving teacher application:", error);
    res.status(500).json({ success: false, message: "আবেদন অনুমোদন করতে ত্রুটি হয়েছে।" });
  }
}

// 5. Reject application
async function rejectApplication(req, res) {
  try {
    const applicationsCollection = getTeacherApplicationsCollection();
    const { id } = req.params;
    const { rejectionReason, feedback } = req.body || {};
    const reason = rejectionReason || feedback || "অভিজ্ঞতা বা যোগ্যতার শর্ত পূরণ না হওয়ায়";

    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const application = await applicationsCollection.findOne(query);

    if (!application) {
      return res.status(404).json({ success: false, message: "আবেদনটি খুঁজে পাওয়া যায়নি।" });
    }

    await applicationsCollection.updateOne(query, {
      $set: {
        status: "rejected",
        rejectionReason: reason,
        rejectedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Record audit log
    await recordAuditLog({
      actor: req.user,
      action: "TEACHER_APPLICATION_REJECTED",
      target: {
        type: "teacher_application",
        id: application._id.toString(),
        name: application.name,
      },
      details: {
        reason,
        email: application.email,
      },
      ip: req.ip,
    });

    res.json({
      success: true,
      message: "শিক্ষক নিয়োগ আবেদনটি কারণসহ বাতিল করা হয়েছে।",
      status: "rejected",
      rejectionReason: reason,
    });
  } catch (error) {
    console.error("Error rejecting application:", error);
    res.status(500).json({ success: false, message: "আবেদন বাতিল করতে সমস্যা হয়েছে।" });
  }
}

// 6. Delete application
async function deleteApplication(req, res) {
  try {
    const applicationsCollection = getTeacherApplicationsCollection();
    const { id } = req.params;

    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const result = await applicationsCollection.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "আবেদনটি খুঁজে পাওয়া যায়নি।" });
    }

    res.json({
      success: true,
      message: "শিক্ষক আবেদন সফলভাবে মুছে ফেলা হয়েছে।",
    });
  } catch (error) {
    console.error("Error deleting application:", error);
    res.status(500).json({ success: false, message: "আবেদন মুছতে সমস্যা হয়েছে।" });
  }
}

module.exports = {
  submitApplication,
  getAllApplications,
  getApplicationById,
  approveApplication,
  rejectApplication,
  deleteApplication,
  generateNextTeacherId,
};
