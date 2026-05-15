const mongoose = require("mongoose");

function dbConnection() {
  mongoose
    .connect(`${process.env.DB_URL}`)
    .then(() => console.log("Connected! to the database EcommerceApi successfully"));
}

module.exports = dbConnection;

