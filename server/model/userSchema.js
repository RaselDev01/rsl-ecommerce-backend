const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    trim: true
  },
    role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
},
{ timestamps: true });   

module.exports = mongoose.model("User", userSchema);
