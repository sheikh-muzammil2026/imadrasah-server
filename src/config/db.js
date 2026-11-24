const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config(); // fallback to cwd

const { MongoClient, ServerApiVersion } = require("mongodb");

let client = null;
let db = null;

function getClient() {
  if (!client) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error("MONGODB_URI is not defined in environment variables!");
    }
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
  }
  return client;
}

async function connectDB() {
  if (!db) {
    const cl = getClient();
    await cl.connect();
    db = cl.db("imadrasah");
    console.log("Successfully connected to MongoDB (imadrasah)");
  }
  return db;
}

function getDB() {
  if (!db) {
    const cl = getClient();
    db = cl.db("imadrasah");
  }
  return db;
}

module.exports = {
  connectDB,
  getDB,
  getClient,
  getCoursesCollection: () => getDB().collection("courses"),
  getEnrolledCollection: () => getDB().collection("enrolled"),
  getEbooksCollection: () => getDB().collection("ebooks"),
  getTestimonialsCollection: () => getDB().collection("testimonials"),
  getUsersCollection: () => getDB().collection("user"),
};
