const express = require("express");
const app = express();
const mongoose = require("mongoose");
const adminAuthRoutes = require("./routes/admin/adminAuthRoutes");
const userAuthRoutes = require("./routes/userAuthRoutes");
const inventoriesRoutes = require("./routes/inventoriesRoute");
const cartRoutes = require("./routes/cartRoutes");

require("dotenv/config");

// body parser
app.use(express.json());

// For CORs
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// Middlewares

// Define Routes

app.use("/v1", userAuthRoutes);
app.use("/v1", inventoriesRoutes);
app.use("/v1", adminAuthRoutes);
app.use("/v1", cartRoutes);

// app.use("/uploads", express.static("./uploads"));

// Health Check
app.get("/", (req, res) => {
  res.send("Hello World, the endpoint is up and healthy!");
});

// Unspecified endpoints
app.get("*", (req, res) => {
  res.status(404).json({
    error: 404,
    message: "The resource you requested does not exist.",
  });
});

// Conect to Database

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_CONNECTION, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected.");
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
};

connectDB();

// Listening port
app.listen(process.env.PORT || 3030, () => {
  console.log(
    `This application is running on port ${process.env.PORT || 3030} `
  );
});
