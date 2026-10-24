
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5500"
}));

app.use(express.json({ limit: "10kb" }));

app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  limit: 30
}));

// Temporary storage for demonstration.
// Replace with a persistent database for production.
const sosRequests = new Map();

// API home
app.get("/", (req, res) => {
  res.json({
    name: "SurakshaPath API",
    status: "running",
    version: "1.0.0",
    features: [
      "Emergency SOS requests",
      "Location validation",
      "SOS cancellation",
      "API health check"
    ]
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Create an SOS request
app.post("/api/sos", (req, res) => {
  const { latitude, longitude, message } = req.body;

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return res.status(400).json({
      success: false,
      error: "Valid latitude and longitude are required."
    });
  }

  const id = crypto.randomUUID();

  const sos = {
    id,
    latitude,
    longitude,
    message:
      typeof message === "string"
        ? message.slice(0, 300)
        : "Emergency assistance requested",
    status: "received",
    createdAt: new Date().toISOString()
  };

  sosRequests.set(id, sos);

  return res.status(201).json({
    success: true,
    message: "SOS request recorded. No contacts were notified.",
    sos
  });
});

// Retrieve an SOS request
app.get("/api/sos/:id", (req, res) => {
  const sos = sosRequests.get(req.params.id);

  if (!sos) {
    return res.status(404).json({
      success: false,
      error: "SOS request not found."
    });
  }

  res.json({ success: true, sos });
});

// Cancel an SOS request
app.post("/api/sos/:id/cancel", (req, res) => {
  const sos = sosRequests.get(req.params.id);

  if (!sos) {
    return res.status(404).json({
      success: false,
      error: "SOS request not found."
    });
  }

  sos.status = "cancelled";
  sos.cancelledAt = new Date().toISOString();

  res.json({
    success: true,
    message: "SOS request cancelled.",
    sos
  });
});

// Handle unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    error: "API endpoint not found."
  });
});

// General error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);

  res.status(err.status || 500).json({
    success: false,
    error:
      err.status === 400
        ? "Invalid request body."
        : "Internal server error."
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`SurakshaPath API running on port ${PORT}`);
});
npm install express cors helmet express-rate-limit
node server.js
