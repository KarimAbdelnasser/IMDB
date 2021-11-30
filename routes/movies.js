const validateObjectId = require("../middleware/validateObjectId");
const auth = require("../middleware/auth");
const { Movie, validate } = require("../models/movie");
const { User } = require("../models/user");
const express = require("express");
const router = express.Router();
require("dotenv").config();

//Search
router.get("/search/:name", async (req, res) => {
  const myName = req.params.name;
  const movie = await Movie.findOne(
    {
      movieName: {
        $regex: new RegExp(
          "^" + myName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$",
          "i"
        ),
      },
    },
    function (err) {
      if (err) {
        return res.send({ msg: err.message });
      }
    }
  ).clone();
  res.send(movie);
});

//Rate Movie after sign in
router.post("/rate/:movieName", auth, async (req, res) => {
  const user = await User.findOne({ _id: req.user._id });
  if (!user) {
    return res
      .status(404)
      .send("No user with this id was found,You can register by the way!");
  } else if (!user.isVerified) {
    return res
      .status(401)
      .send("You have to verify your email first and then come back!");
  }
  const movieName = req.params.movieName;
  const userRate = req.body.rate;
  const theMovie = await Movie.findOne(
    {
      movieName: {
        $regex: new RegExp(
          "^" + movieName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$",
          "i"
        ),
      },
    },
    function (err) {
      if (err) {
        return res.send({ msg: err.message });
      }
    }
  ).clone();

  if (!theMovie) {
    return res
      .status(404)
      .send("Sorry this Tv Show isn't in the DB,check again later!");
  }
  const newSave = new Movie({
    user: req.user._id,
    movieName: theMovie.movieName,
    userRate: userRate,
    releaseDate: theMovie.releaseDate,
    averageRate: theMovie.averageRate,
    moviePoster: theMovie.moviePoster,
  });
  const extra = await Movie.findOne({
    movieName: {
      $regex: new RegExp(
        "^" + movieName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$",
        "i"
      ),
    },
    user: req.user._id,
  });
  if (extra) {
    return res
      .status(400)
      .send("This user with the given ID has already rated this Movie!");
  } else {
    await newSave.save((err) => {
      if (err) {
        return res.status(500).send({ msg: err.message });
      }
      console.log("New Movie Saved Successfully");
    });
    user.lastMovies.push(newSave);
    await user.save((err) => {
      if (err) {
        return res.status(500).send({ msg: err.message });
      }
      console.log("User Saved Successfully");
    });
    return res.status(201).send(newSave);
  }
});

//Add a Movie to the User's WatchList
router.post("/add/:movieName", auth, async (req, res) => {
  const user = await User.findOne({ _id: req.user._id });
  if (!user) {
    return res
      .status(404)
      .send("No user with this id was found,You can register by the way!");
  } else if (!user.isVerified) {
    return res
      .status(401)
      .send("You have to verify your email first and then come back!");
  }
  const movieName = req.params.movieName;
  const theMovie = await Movie.findOne(
    {
      movieName: {
        $regex: new RegExp(
          "^" + movieName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$",
          "i"
        ),
      },
    },
    function (err) {
      if (err) {
        return res.send({ msg: err.message });
      }
    }
  ).clone();

  if (!theMovie) {
    return res
      .status(404)
      .send("Sorry this Tv Show isn't in the DB,check again later!");
  }

  const extra = await Movie.findOne({
    movieName: {
      $regex: new RegExp(
        "^" + movieName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$",
        "i"
      ),
    },
    user: req.user._id,
  });
  if (extra) {
    return res
      .status(400)
      .send("This user with the given ID has already rated this Movie!");
  } else {
    const dup = user.watchList;
    for (let i = 0; i < dup.length; i++) {
      if ((dup[i]._id = theMovie._id)) {
        return res
          .status(400)
          .send("This user have already added this Movie to his watchList!");
      }
    }
    user.watchList.push(theMovie);
    await user.save((err) => {
      if (err) {
        return res.status(500).send({ msg: err.message });
      }
      console.log("User Saved Successfully");
    });
    return res
      .status(201)
      .send(
        `This TV Show has added to your watchList successfully\n${theMovie}`
      );
  }
});

//change rating of Movie
router.put("/changeRate", auth, async (req, res) => {
  const thisUser = await User.findById(req.user._id);
  if (!thisUser) {
    return res.status(404).send("The user with the give ID could not found!");
  } else if (!thisUser.isVerified) {
    return res
      .status(401)
      .send("You have to verify your email first and then come back!");
  }
  const newRate = req.body.newRate;
  const movieName = req.body.movieName;
  const movieDb = await Movie.findOne({
    user: req.user._id,
    movieName: {
      $regex: new RegExp(
        "^" + movieName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$",
        "i"
      ),
    },
  });
  if (newRate == movieDb.userRate) {
    return res
      .status(404)
      .send(
        "The rate which stored in your DB is the same rate that you trying to store it!"
      );
  }
  const updateMovie = await Movie.findOneAndUpdate(
    {
      user: req.user._id,
      movieName: {
        $regex: new RegExp(
          "^" + movieName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$",
          "i"
        ),
      },
    },
    { userRate: newRate }
  );
  await updateMovie.save((err) => {
    if (err) {
      return res.status(500).send({ msg: err.message });
    }
    console.log("Movie Saved Successfully");
  });
  res.send(
    `"${movieName}" movie in your DB have been changed its rate to "${newRate}",and its average rate is "${movieDb.averageRate}"`
  );
});

//Shows to any guest the top rated movies
router.get("/guest", async (req, res) => {
  const pageOptions = {
    page: parseInt(req.query.page, 10) || 0,
    limit: parseInt(req.query.limit, 10) || 10,
  };

  Movie.find()
    .skip(pageOptions.page * pageOptions.limit)
    .limit(pageOptions.limit)
    .exec(function (err, doc) {
      if (err) {
        res.status(500).json(err);
        return;
      }
      res.status(200).json(doc);
    });
});

module.exports = router;
