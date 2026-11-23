const { ObjectId } = require("mongodb");
const { getEbooksCollection } = require("../config/db");

// Get all eBooks (with optional category / search)
async function getAllEbooks(req, res) {
  try {
    const ebooksCollection = getEbooksCollection();
    const query = {};
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { author: { $regex: req.query.search, $options: "i" } }
      ];
    }
    const ebooks = await ebooksCollection.find(query).toArray();
    res.json(ebooks);
  } catch (error) {
    console.error("Error fetching eBooks:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// Get single eBook by ID
async function getEbookById(req, res) {
  try {
    const ebooksCollection = getEbooksCollection();
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid eBook ID" });
    }
    const ebook = await ebooksCollection.findOne({ _id: new ObjectId(id) });
    if (!ebook) {
      return res.status(404).json({ success: false, message: "eBook not found" });
    }
    res.json(ebook);
  } catch (error) {
    console.error("Error fetching eBook:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// Create new eBook (Admin)
async function createEbook(req, res) {
  try {
    const ebooksCollection = getEbooksCollection();
    const ebookData = {
      ...req.body,
      createdAt: new Date(),
    };
    const result = await ebooksCollection.insertOne(ebookData);
    res.status(201).json({ success: true, insertedId: result.insertedId, data: ebookData });
  } catch (error) {
    console.error("Error creating eBook:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// Update eBook (Admin)
async function updateEbook(req, res) {
  try {
    const ebooksCollection = getEbooksCollection();
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid eBook ID" });
    }
    const modifiedData = req.body;
    delete modifiedData._id;

    const result = await ebooksCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...modifiedData, updatedAt: new Date() } }
    );
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error updating eBook:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// Delete eBook (Admin)
async function deleteEbook(req, res) {
  try {
    const ebooksCollection = getEbooksCollection();
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid eBook ID" });
    }
    const result = await ebooksCollection.deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error deleting eBook:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

module.exports = {
  getAllEbooks,
  getEbookById,
  createEbook,
  updateEbook,
  deleteEbook,
};
