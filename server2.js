const { createClient } = require('redis');

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());




const client = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

client.on('error', (err) => console.log('Redis Client Error', err));
await client.connect();
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


const ratingSchema = new mongoose.Schema({
    codeId: mongoose.Schema.Types.ObjectId,
    email: String,
    rating: Number,
});

const Code = mongoose.model("Code", codeSchema);
const Rating = mongoose.model("Rating", ratingSchema);

app.get("/api/codes", async (req, res) => {
    try {
        const cacheKey = "api_codes";
        const cachedData = await client.get(cacheKey);

        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        } else {
            const codes = await Code.find();
            await client.setEx(cacheKey, 3600, JSON.stringify(codes));
            res.json(codes);
        }
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
        await client.del("api_codes");
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
            const oldRatingValue = existingRating.rating;
            existingRating.rating = rating;
            await existingRating.save();

            const code = await Code.findById(codeId);
            code.totalRating = code.totalRating - oldRatingValue + rating;
            await code.save();
            await client.del("api_codes");
        } else {
           
            const newRating = new Rating({ codeId, email, rating });
            await newRating.save();
            // Update totalRating and ratingCount in the code document
            const code = await Code.findById(codeId);
            code.totalRating += rating;
            code.ratingCount++;
            await code.save();
            await client.del("api_codes");
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
