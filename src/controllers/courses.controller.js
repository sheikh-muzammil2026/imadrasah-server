const { ObjectId } = require("mongodb");
const { getCoursesCollection, getEnrolledCollection } = require("../config/db");

// Get all courses (public)
async function getAllCourses(req, res) {
  try {
    const coursesCollection = getCoursesCollection();
    const query = {};
    if (req.query.search) {
      query.title = { $regex: req.query.search, $options: "i" };
    }
    const courses = await coursesCollection.find(query).toArray();
    res.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// Get available courses for featured section
async function getAvailableCourses(req, res) {
  try {
    const coursesCollection = getCoursesCollection();
    const limit = parseInt(req.query.limit) || 6;
    const courses = await coursesCollection.find({}).limit(limit).toArray();
    res.json(courses);
  } catch (error) {
    console.error("Error fetching available courses:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// Get single course by ID
async function getCourseById(req, res) {
  try {
    const coursesCollection = getCoursesCollection();
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Course ID" });
    }
    const course = await coursesCollection.findOne({ _id: new ObjectId(id) });
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    res.json(course);
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// Create new course (Admin / Teacher)
async function createCourse(req, res) {
  try {
    const coursesCollection = getCoursesCollection();
    const courseData = {
      ...req.body,
      createdAt: new Date(),
    };
    const result = await coursesCollection.insertOne(courseData);
    res.status(201).json({ success: true, insertedId: result.insertedId, data: courseData });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// Update course
async function updateCourse(req, res) {
  try {
    const coursesCollection = getCoursesCollection();
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Course ID" });
    }
    const modifiedData = req.body;
    delete modifiedData._id;

    const result = await coursesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...modifiedData, updatedAt: new Date() } }
    );
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// Delete course
async function deleteCourse(req, res) {
  try {
    const coursesCollection = getCoursesCollection();
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Course ID" });
    }
    const result = await coursesCollection.deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// Enroll into a course (Student)
async function enrollCourse(req, res) {
  try {
    const enrolledCollection = getEnrolledCollection();
    const enrolledData = {
      ...req.body,
      enrolledAt: new Date(),
    };
    const result = await enrolledCollection.insertOne(enrolledData);
    res.status(201).json({ success: true, result });
  } catch (error) {
    console.error("Error enrolling course:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// Get enrolled courses for a user
async function getEnrolledCoursesByUser(req, res) {
  try {
    const enrolledCollection = getEnrolledCollection();
    const { userId } = req.params;
    const courses = await enrolledCollection.find({
      $or: [{ userId: userId }, { userEmail: userId }],
    }).toArray();
    res.json(courses);
  } catch (error) {
    console.error("Error fetching enrolled courses:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// Delete enrollment
async function deleteEnrolledCourse(req, res) {
  try {
    const enrolledCollection = getEnrolledCollection();
    const { id } = req.params;
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const result = await enrolledCollection.deleteOne(query);
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error deleting enrolled course:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

module.exports = {
  getAllCourses,
  getAvailableCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollCourse,
  getEnrolledCoursesByUser,
  deleteEnrolledCourse,
};
