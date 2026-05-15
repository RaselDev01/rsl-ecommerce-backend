const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/dbConnection");
const routes = require("./routes");

const app = express();
dotenv.config();
connectDB();

app.use(express.json());
app.use(cors());
app.use(express.json());
app.use("/api/v1", routes);

app.get("/", (req, res) => {
  res.send("Server Running successfully & connected to the database successfully too");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server Running On Port ${PORT}`);
});