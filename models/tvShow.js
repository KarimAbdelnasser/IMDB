const Joi = require("joi");
const mongoose = require("mongoose");

const showSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId },
  name: {
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
  poster: { type: String },
});

const Show = mongoose.model("Show", showSchema);

function validateMovie(show) {
  const schema = {
    user: Joi.ObjectId(),
    name: Joi.string().min(1).max(255).required(),
    rate: Joi.String().min(0).max(10),
  };

  return Joi.validate(show, schema);
}

module.exports = {
  showSchema,
  Show,
  validate: validateMovie,
};
