const { createClient } = require('redis');
const axios = require('axios');

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

const rateLimit = async (req, res, next) => {
    const userEmail = req.body.email; 
    const key = `rate_limit:${userEmail}`;
    const limit = 3; 
    const duration = 60; 

    try {
        const requestCount = await client.get(key);
        if (requestCount && parseInt(requestCount) >= limit) {
            return res.status(429).json({ message: 'Rate limit exceeded' });
        }

        if (requestCount) {
            await client.incr(key);
        } else {
            // Convert the value '1' to a string
            await client.setEx(key, duration, '1');
        }

        next();
    } catch (error) {
        console.error('Error in rate limiting:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


app.post('/compile', rateLimit, async (req, res) => {
    const { language_id, source_code, stdin, email } = req.body; // Include email in the destructured data

    const options = {
        method: "POST",
        url: "YOUR_EXTERNAL_API_ENDPOINT",
        params: { base64_encoded: "true", fields: "*" },
        headers: {
            "content-type": "application/json",
            "X-RapidAPI-Host": "YOUR_RAPID_API_HOST",
            "X-RapidAPI-Key": "YOUR_RAPID_API_KEY",
        },
        data: {
            language_id,
            source_code,
            stdin
        },
    };
    try {
        const response = await axios.request(options);
        res.json(response.data);
    } catch (error) {
        console.log('Error calling external API:', error);
        res.status(500).send('Internal Server Error');
    }
    
});
async function initialize() {
    try {
        await client.connect();
        console.log('Connected to Redis');

        app.listen(3001, () => {
            console.log("Server started on port 3001");
        });
    } catch (err) {
        console.error('Error initializing the application:', err);
    }
}

initialize();
