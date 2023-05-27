// // const express = require('express');
// // const app = express();
// // const PORT = 8001;
// // const cors = require('cors');
// // const { v4: uuidv4 } = require('uuid');

// // // Featured codes data
// // let featuredCodes = [];

// // app.use(cors());
// // app.use(express.json());

// // // Get all featured codes
// // app.get('/api/codes', (req, res) => {
// //   res.json(featuredCodes);
// // });

// // // Submit a new code
// // app.post('/api/codes', (req, res) => {
// //   const { title, code } = req.body;
// //   const newCode = { id: uuidv4(), title, code };

// //   featuredCodes.push(newCode);
// //     console.log("new code received");
// //   res.setHeader('Content-Type', 'application/json');
// //   res.status(201).json(newCode);
// // });

// // app.listen(PORT, () => {
// //   console.log(`Server listeniang on port ${PORT}`);
// // });


// const express = require('express');
// const app = express();
// const PORT = 8001;
// const cors = require('cors');
// const { v4: uuidv4 } = require('uuid');
// const mongoose = require('mongoose');

// // Connect to MongoDB
// mongoose.connect('mongodb://localhost:27017/your-database-name', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// // Define a MongoDB schema for the featured codes
// const featuredCodeSchema = new mongoose.Schema({
//   id: String,
//   title: String,
//   code: String,
// });

// // Create a MongoDB model
// const FeaturedCode = mongoose.model('FeaturedCode', featuredCodeSchema);

// app.use(cors());
// app.use(express.json());

// // Get all featured codes
// app.get('/api/codes', (req, res) => {
//   // Retrieve all codes from the MongoDB collection
//   FeaturedCode.find({}, (err, codes) => {
//     if (err) {
//       console.error(err);
//       res.status(500).json({ error: 'An error occurred' });
//     } else {
//       res.json(codes);
//     }
//   });
// });

// // Submit a new code
// app.post('/api/codes', (req, res) => {
//   const { title, code } = req.body;
//   const newCode = new FeaturedCode({ id: uuidv4(), title, code });

//   // Save the new code to the MongoDB collection
//   newCode.save((err) => {
//     if (err) {
//       console.error(err);
//       res.status(500).json({ error: 'An error occurred' });
//     } else {
//       console.log('New code received');
//       res.setHeader('Content-Type', 'application/json');
//       res.status(201).json(newCode);
//     }
//   });
// });

// app.listen(PORT, () => {
//   console.log(`Server listening on port ${PORT}`);
// });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());
mongoose.set('strictQuery', false);

// Connect to MongoDB cluster
mongoose.connect('process.env.MONGODB_URL', { useNewUrlParser: true, useUnifiedTopology: true });

// Create a schema for codes
const codeSchema = new mongoose.Schema({
  title: String,
  code: String,
});

// Create a schema for ratings
const ratingSchema = new mongoose.Schema({
  codeId: mongoose.Schema.Types.ObjectId,
  email: String,
  rating: Number,
});

// Create models for codes and ratings
const Code = mongoose.model("Code", codeSchema);
const Rating = mongoose.model("Rating", ratingSchema);

// API to get all codes with average rating
app.get("/api/codes", async (req, res) => {
  try {
    const codesWithRating = await Code.aggregate([
      {
        $lookup: {
          from: "ratings",
          localField: "_id",
          foreignField: "codeId",
          as: "ratings",
        },
      },
      {
        $addFields: {
          averageRating: {
            $avg: "$ratings.rating",
          },
        },
      },
    ]);

    res.json(codesWithRating);
  } catch (error) {
    console.error("Error fetching codes:", error);
    res.sendStatus(500);
  }
});

// API to add a new code
app.post("/api/codes", async (req, res) => {
  try {
    const { title, code } = req.body;
    const newCode = new Code({
      title,
      code,
    });
    await newCode.save();
    res.sendStatus(201);
  } catch (error) {
    console.error("Error adding code:", error);
    res.sendStatus(500);
  }
});


app.post("/api/rating/:codeId", async (req, res) => {
  try {
    const { email, rating } = req.body;
    const codeId = req.params.codeId;

    // Check if the codeId exists in the Code model
    const codeExists = await Code.exists({ _id: codeId });
    if (!codeExists) {
      return res.sendStatus(404);
    }

    const newRating = new Rating({
      codeId: mongoose.Types.ObjectId(codeId), // Convert the codeId to ObjectId type
      email,
      rating,
    });
    await newRating.save();

    res.sendStatus(200);
  } catch (error) {
    console.error("Error submitting rating:", error);
    res.sendStatus(500);
  }
});



app.listen(3001, () => {
  console.log("Server started on port 3001");
});
