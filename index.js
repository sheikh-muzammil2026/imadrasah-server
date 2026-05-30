const express = require('express')
const app = express()
const dotenv = require("dotenv");
const cors = require("cors")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

dotenv.config();
const port = process.env.PORT || 8000

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('iMadrasah Server is Running!');
})


const uri = process.env.MONGODB_URI

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    const database = client.db("imadrasah");
    const coursesCollection = database.collection("courses");
    const enrolledCollection = database.collection("enrolled");
    const admissionCollection = database.collection("admissions");
    // const myAddedCOursesCollection = database.collection("addedCourses");

    app.get('/courses', async(req, res)=>{
        try {
            const cursor = await coursesCollection.find();
            const courses = await cursor.toArray();
            res.send(courses);
            
        } catch (error) {
            console.error("Error fetching courses:", error);
             res.status(500).send({ 
            success: false, 
            message: "Internal Server Error. Could not fetch courses." 
        });
        }
    })

    app.get('/available-courses', async(req, res)=>{
      const cursor = await coursesCollection.find().limit(6);
      const result = await cursor.toArray();
      res.json(result);
    })

    app.get('/courses/:id', async(req, res)=>{
        try {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const course = await coursesCollection.findOne(query);
        res.json(course);
        } catch (error) {
           console.error("Error fetching courses:", error);
           res.status(500).json({ message: "Internal Server Error" });
            
        }
    })

    app.patch('/courses/:courseId', async(req, res)=>{
      const courseId = req.params.courseId;
      const query    = {_id: new ObjectId(courseId)}
      const modifiedData = req.body;
      const updatedDocuments = {
        $set: {
          title: modifiedData?.title,
          teacher: modifiedData?.teacher,
          subject: modifiedData?.subject,
          schedule: modifiedData?.schedule,
          fee: modifiedData?.fee,
          seats: modifiedData?.seats,
          duration: modifiedData?.duration,
          level: modifiedData?.level,
          image: modifiedData?.image,
          shortDescription: modifiedData?.shortDescription,
          fullDescription: modifiedData?.fullDescription,
          requirements: modifiedData?.requirements,
          specialNotes: modifiedData?.specialNotes  
        }}

        const result = await coursesCollection.updateOne(query, updatedDocuments);
        res.json(result)

    })

    app.delete('/courses/:courseId', async(req, res)=>{
      const courseId = req.params.courseId;
      const query    = {_id: new ObjectId(courseId)};
      const result   = await coursesCollection.deleteOne(query);
      res.json(result);
    })

    app.post('/enrolled-courses',async (req, res) =>{
      try {
        const enrolledCourses = req.body;
        const result = await enrolledCollection.insertOne(enrolledCourses);
        res.json(result)
      } catch (error) {
        console.log(error, "enrolled post time catching error")
        res.status(500).json({ message: "Internal Server Error" });
      }
    })

      app.get('/enrolled-courses/:userId', async(req, res)=>{
        try {
          const userId = req.params.userId;
          const query = {userId: userId}
//                         ▲        ▲
//                         │        │
//                 ডাটাবেজের ফিল্ডের নাম     প্যারামস থেকে পাওয়া ভ্যারিয়েবলের মান

          const cursor = await enrolledCollection.find(query)
          const enrolledCourses = await cursor.toArray()
          res.json(enrolledCourses)
          
        } catch (error) {
         console.error("Error fetching enrolled-courses:", error);
         res.status(500).json({ message: "Internal Server Error" });
        }
      })

       app.delete('/enrolled-courses/:courseId', async(req, res)=>{
        try {
          const courseId = req.params.courseId;
          const query = {_id: new ObjectId(courseId) }
          const result = await enrolledCollection.deleteOne(query)
          res.json(result)
          
        } catch (error) {
          console.log(error, "from deleting enrolled-courses");
        }
      })

      app.patch('/enrolled-courses/:classId', async(req, res)=>{
        try {
          const classId = req.params.classId;
          console.log(classId, "from server side, params id");
          const query   = {_id: new ObjectId(classId)}
          const modifiedData = req.body;
          console.log(modifiedData)
         const updateDocuments = {
              $set: {
                courseName: modifiedData.courseName,
                teacherName: modifiedData.teacherName,
                subject: modifiedData.subject,
                classTime: modifiedData.classTime,
                userEmail: modifiedData.userEmail
              }
            }
          
          const result = await enrolledCollection.updateOne(query, updateDocuments)
          res.json(result)
          
        } catch (error) {
          console.log(error, "from server side on patching update data");
        }
      })

      app.post('/admissions', async(req, res)=>{
        try {

          const admitedData = req.body;
          const result = await admissionCollection.insertOne(admitedData);
          res.json(result)
          
        } catch (error) {
          console.error("Error fetching admissions:", error);
          res.status(500).json({ message: "Internal Server Error" });
          
        }
      })


      app.get('/admissions', async(req,res)=>{
        try {

          const cursor = await admissionCollection.find()
          const result = await cursor.toArray()
          res.json(result)
          
        } catch (error) {
          console.error("Error fetching admissions:", error);
          res.status(500).json({ message: "Internal Server Error" });
          
        }
      })

      app.post('/my-added-courses', async(req, res)=>{
        try {
          const coursesData = req.body;
          const result = await coursesCollection.insertOne(coursesData)
          res.json(result)
          
        } catch (error) {
          console.error("Error fetching my-added-courses:", error);
          res.status(500).json({ message: "Internal Server Error" });
        }
      })

      app.get('/my-added-courses/:userId', async(req, res)=>{
        try {
          const userId = req.params.userId;
          const query = {userId: userId};
          const cursor = await coursesCollection.find(query);
          const myAddedCourses = await cursor.toArray()
          res.json(myAddedCourses);
          
        } catch (error) {
          console.log(error);
        }
      })

      app.delete('/my-added-courses/:courseId', async(req, res)=>{
        try {
          const courseId = req.params.courseId;
          const query  = {_id: courseId};
          const result = await coursesCollection.deleteOne(query)
          res.json(result)
        } catch (error) {
          console.log(error);
        }
      })
     
      app.patch('/my-added-courses/:courseId', async(req, res) =>{
        try {
          const courseId = req.params.courseId;
          const query = {_id: new ObjectId(courseId)}
          const modifyedData = req.body;
          const updateDocuments = {
            $set: {
              title: modifyedData.title,
              level: modifyedData.level,
              fee: modifyedData.fee,
              image: modifyedData.image,
              shortDescription: modifyedData.shortDescription
            }
          }
           const result = await  coursesCollection.updateOne(query, updateDocuments);
           res.send(result)
          
        } catch (error) {
          console.log(error, "server error in patchin time");
        }
      })


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

