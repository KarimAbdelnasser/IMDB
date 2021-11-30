const Joi = require("joi");
const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId },
  movieName: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 225,
  },
  userRate: {
    type: Number,
    required: false,
    min: 0,
    max: 10,
  },
  releaseDate: { type: Date },
  averageRate: { type: String },
  moviePoster: { type: String },
});

const Movie = mongoose.model("Movie", movieSchema);

function validateMovie(movie) {
  const schema = {
    user: Joi.ObjectId(),
    movieName: Joi.string().min(1).max(255).required(),
    movieRate: Joi.String().min(0).max(10),
  };

  return Joi.validate(movie, schema);
}

module.exports = {
  movieSchema,
  Movie,
  validate: validateMovie,
};
