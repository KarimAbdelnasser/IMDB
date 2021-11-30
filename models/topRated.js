const Joi = require("joi");
const mongoose = require("mongoose");

const topRatedSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId },
  movieName: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 225,
  },
  movieRate: {
    type: Number,
    required: false,
    min: 0,
    max: 10,
  },
  releaseDate: { type: Date },
  averageRate: { type: String },
  moviePoster: { type: String },
});

const TopRated = mongoose.model("TopRated", topRatedSchema);

function validateMovie(topRated) {
  const schema = {
    user: Joi.ObjectId(),
    movieName: Joi.string().min(2).max(255).required(),
    movieRate: Joi.String().min(0).max(10),
  };

  return Joi.validate(topRated, schema);
}

module.exports = {
  topRatedSchema,
  TopRated,
  validate: validateMovie,
};
