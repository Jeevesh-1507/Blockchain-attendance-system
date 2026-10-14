require("dotenv").config();
const path = require("path");
const express = require("express");
const attendanceRoutes = require("./routes/attendanceRoutes");

const app = express();

// Body Parser Middleware
app.use(express.json());

// Serve static frontend files
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

// API Routes
app.use("/api/attendance", attendanceRoutes);

// Serve index.html for root path
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// 404 Handler for Unmatched Routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler Middleware
app.use((err, req, res, _next) => {
  // Log error message internally without leaking sensitive details
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    message
  });
});

// Start Server if launched directly
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend API server running on port ${PORT}`);
  });
}

module.exports = app;
