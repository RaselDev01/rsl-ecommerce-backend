require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");

const connectDB = require("./config/dbConnection");
const routes = require("./routes");

const app = express();

app.disable("x-powered-by");

app.use(helmet({
  crossOriginResourcePolicy: {
    policy: "cross-origin",
  },
}));

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((origin) => origin.trim())
  : [];

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS."));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({
  extended: true,
  limit: "1mb",
}));

app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    index: false,
    dotfiles: "deny",
    maxAge: "7d",
  })
);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "E-commerce API server is running.",
  });
});

app.use("/api/v1", routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Requested resource not found.",
  });
});

app.use((error, req, res, next) => {
  console.error("Global Error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  if (error.message === "Origin not allowed by CORS.") {
    return res.status(403).json({
      success: false,
      message: "Access denied by CORS policy.",
    });
  }

  return res.status(500).json({
    success: false,
    message: "An internal server error occurred.",
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed.");
    process.exit(1);
  }
}

startServer();

module.exports = app;