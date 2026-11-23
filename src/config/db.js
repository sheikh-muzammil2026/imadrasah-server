const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db = null;

async function connectDB() {
  if (!db) {
    // client.connect() is optional in v4.7+ but calling ensures connection
    await client.connect();
    db = client.db("imadrasah");
    console.log("Successfully connected to MongoDB (imadrasah)");
  }
  return db;
}

function getDB() {
  if (!db) {
    db = client.db("imadrasah");
  }
  return db;
}

module.exports = {
  connectDB,
  getDB,
  client,
  getCoursesCollection: () => getDB().collection("courses"),
  getEnrolledCollection: () => getDB().collection("enrolled"),
  getEbooksCollection: () => getDB().collection("ebooks"),
  getTestimonialsCollection: () => getDB().collection("testimonials"),
  getUsersCollection: () => getDB().collection("user"),
};
