const jwt = require("jsonwebtoken");
const joi = require("joi");
const mongoose = require("mongoose");
const Joi = require("joi");
const Movie = require("./movie");
const Show = require("./tvShow");
require("dotenv").config();

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 4,
  },
  email: {
    type: String,
    required: true,
    minlength: 8,
    unique: true,
  },
  isVerified: { type: Boolean, default: false },
  password: {
    type: String,
    required: true,
    minlength: 5,
  },
  createAt: { type: Date, default: Date.now },
  isAdmin: Boolean,
  lastMovies: [{ type: mongoose.Schema.Types.ObjectId }],
  tvShows: [{ type: mongoose.Schema.Types.ObjectId }],
  watchList: [{ type: mongoose.Schema.Types.ObjectId }],
});

userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { _id: this._id, isAdmin: this.isAdmin, isVerified: this.isVerified },
    process.env.jwtPrivateKey
  );
  return token;
};

const User = mongoose.model("User", userSchema);

function validateUser(user) {
  const schema = {
    name: Joi.string().min(4).max(30).required(),
    email: Joi.string().min(8).max(100).required(),
    password: Joi.string().min(5).max(255).required(),
  };
  return Joi.validate(user, schema);
}

module.exports = {
  User,
  validate: validateUser,
};
