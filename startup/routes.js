const express = require("express");
const helmet = require("helmet");
const users = require("../routes/users");
const movies = require("../routes/movies");
const topRated = require("../routes/topRateds");
const tvShows = require("../routes/tvShows");
const fetchTopMovies = require("../routes/fetchTopMovies");
const fetchTvShows = require("../routes/fetchTvShows");
const fetchMovies = require("../routes/fetchMovies");

module.exports = (app) => {
  app.use(express.json());
  app.use(helmet());
  app.use("/users", users);
  app.use("/movies", movies);
  app.use("/", topRated);
  app.use("/tv", tvShows);
  app.use("/fetch/topMovie", fetchTopMovies);
  app.use("/fetch/tvShow", fetchTvShows);
  app.use("/fetch/movies", fetchMovies);
};
