const express = require('express');
const app = express();
const PORT = 8001;
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Featured codes data
let featuredCodes = [];

app.use(cors());
app.use(express.json());

// Get all featured codes
app.get('/api/codes', (req, res) => {
  res.json(featuredCodes);
});

// Submit a new code
app.post('/api/codes', (req, res) => {
  const { title, code } = req.body;
  const newCode = { id: uuidv4(), title, code };

  featuredCodes.push(newCode);
    console.log("new code received");
  res.setHeader('Content-Type', 'application/json');
  res.status(201).json(newCode);
});

app.listen('/', () => {
  console.log(`Server listeniang on port ${PORT}`);
});
