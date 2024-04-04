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

// Connect to MongoDB cluster
mongoose.connect("mongodb+srv://ashishkbazad:Ashish++@cluster0.zf9mbg5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", { useNewUrlParser: true, useUnifiedTopology: true });

// Create a schema for codes
const codeSchema = new mongoose.Schema({
    title: String,
    code: String,
    email: String,
    totalRating: { type: Number, default: 0 }, 
    ratingCount: { type: Number, default: 0 }   
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
        const codes = await Code.find();
        res.json(codes);
    } catch (error) {
        console.error("Error fetching codes:", error);
        res.sendStatus(500);
    }
});

// API to add a new code
app.post("/api/codes", async (req, res) => {
    try {
        const { title, code, email } = req.body; 
        const newCode = new Code({ title, code, email });
        await newCode.save();
        res.sendStatus(201);
    } catch (error) {
        console.error("Error adding code:", error);
        res.sendStatus(500);
    }
});
// API to submit or update rating for a code
app.post("/api/rating/:codeId", async (req, res) => {
    try {
        const { email, rating } = req.body;
        const codeId = req.params.codeId;

        // Check if there's an existing rating by the same user for the same code
        let existingRating = await Rating.findOne({ codeId, email });

        if (existingRating) {
            // If existing rating found, update it
            const oldRatingValue = existingRating.rating;
            existingRating.rating = rating;
            await existingRating.save();

            // Update totalRating by subtracting old rating and adding new rating
            const code = await Code.findById(codeId);
            code.totalRating = code.totalRating - oldRatingValue + rating;
            await code.save();
        } else {
            // If no existing rating found, create a new rating
            const newRating = new Rating({ codeId, email, rating });
            await newRating.save();

            // Update totalRating and ratingCount in the code document
            const code = await Code.findById(codeId);
            code.totalRating += rating;
            code.ratingCount++;
            await code.save();
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("Error submitting rating:", error);
        res.sendStatus(500);
    }
});

app.listen(3001, () => {
    console.log("Server started on port 3001");
});
