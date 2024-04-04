const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const redis = require("redis");
const util = require("util");

const app = express();
app.use(cors());
app.use(express.json());

// Connect to Redis
const redisClient = redis.createClient();
const getAsync = util.promisify(redisClient.get).bind(redisClient);
const setAsync = util.promisify(redisClient.set).bind(redisClient);

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

        // Rate limiting using Redis
        const key = `user:${email}:rate_limit`;
        const limit = 2; 
        const expiration = 60; 

        const currentCount = await getAsync(key);
        if (currentCount === null || parseInt(currentCount) < limit) {
            // Increase count and set expiration
            await redisClient.multi()
                .incr(key)
                .expire(key, expiration)
                .exec();

            let existingRating = await Rating.findOne({ codeId, email });
            if (existingRating) {
               
                const oldRatingValue = existingRating.rating;
                existingRating.rating = rating;
                await existingRating.save();
               
                const code = await Code.findById(codeId);
                code.totalRating = code.totalRating - oldRatingValue + rating;
                await code.save();
            } else {
                
                const newRating = new Rating({ codeId, email, rating });
                await newRating.save();
                // Update totalRating and ratingCount in the code document
                const code = await Code.findById(codeId);
                code.totalRating += rating;
                code.ratingCount++;
                await code.save();
            }
            res.sendStatus(200);
        } else {
           
            console.error("Rate limit exceeded for user:", email);
            res.status(429).send("Rate limit exceeded. Try again later.");
        }
    } catch (error) {
        console.error("Error submitting rating:", error);
        res.sendStatus(500);
    }
});

app.listen(3001, () => {
    console.log("Server started on port 3001");
});
