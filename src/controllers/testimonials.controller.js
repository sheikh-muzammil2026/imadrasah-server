const { ObjectId } = require("mongodb");
const { getTestimonialsCollection } = require("../config/db");

// Get all testimonials
async function getAllTestimonials(req, res) {
  try {
    const testimonialsCollection = getTestimonialsCollection();
    const testimonials = await testimonialsCollection.find({}).toArray();
    res.json(testimonials);
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// Create testimonial (Admin or verified student)
async function createTestimonial(req, res) {
  try {
    const testimonialsCollection = getTestimonialsCollection();
    const testimonialData = {
      ...req.body,
      createdAt: new Date(),
    };
    const result = await testimonialsCollection.insertOne(testimonialData);
    res.status(201).json({ success: true, insertedId: result.insertedId, data: testimonialData });
  } catch (error) {
    console.error("Error creating testimonial:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// Delete testimonial (Admin)
async function deleteTestimonial(req, res) {
  try {
    const testimonialsCollection = getTestimonialsCollection();
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Testimonial ID" });
    }
    const result = await testimonialsCollection.deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error deleting testimonial:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

module.exports = {
  getAllTestimonials,
  createTestimonial,
  deleteTestimonial,
};
