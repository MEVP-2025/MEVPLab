// server.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "100mb" }));

// mount routes
app.use("/api/sequences", require("./routes/sequences"));
app.use("/api/haplotypes", require("./routes/haplotypes"));
app.use("/api/files", require("./routes/files"));

// global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res
    .status(err.status || 500)
    .json({ error: err.message || "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
