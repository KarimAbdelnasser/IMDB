const auth = require("../middleware/auth");
const { Show, validate } = require("../models/tvShow");
const { User } = require("../models/user");
const express = require("express");
const router = express.Router();
require("dotenv").config();

//Search
router.get("/search/:name", async (req, res) => {
  const myName = req.params.name;
  const show = await Show.findOne(
    {
      name: {
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
  res.send(show);
});

//Rate Tv Show after sign in
router.post("/rate/:tvName", auth, async (req, res) => {
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
  const showName = req.params.tvName;
  const userRate = req.body.rate;
  const theShow = await Show.findOne(
    {
      name: {
        $regex: new RegExp(
          "^" + showName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$",
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

  if (!theShow) {
    return res
      .status(404)
      .send("Sorry this Tv Show isn't in the DB,check again later!");
  }
  const newSave = new Show({
    user: req.user._id,
    name: theShow.name,
    userRate: userRate,
    releaseDate: theShow.releaseDate,
    averageRate: theShow.averageRate,
    poster: theShow.poster,
  });
  const extra = await Show.findOne({
    name: {
      $regex: new RegExp(
        "^" + showName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$",
        "i"
      ),
    },
    user: req.user._id,
  });
  if (extra) {
    return res
      .status(400)
      .send("This user with the given ID has already rated this Tv Show!");
  } else {
    await newSave.save((err) => {
      if (err) {
        return res.status(500).send({ msg: err.message });
      }
      console.log("New Tv Show Saved Successfully");
    });
    user.tvShows.push(newSave);
    await user.save((err) => {
      if (err) {
        return res.status(500).send({ msg: err.message });
      }
      console.log("User Saved Successfully");
    });
    return res.status(201).send(newSave);
  }
});

//change rating of Tv Show
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
  const showName = req.body.showName;
  const showDB = await Show.findOne({
    user: req.user._id,
    name: {
      $regex: new RegExp(
        "^" + showName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$",
        "i"
      ),
    },
  });
  if (newRate == showDB.userRate) {
    return res
      .status(404)
      .send(
        "The rate which stored in your DB is the same rate that you trying to store it!"
      );
  }
  const updateShow = await Show.findOneAndUpdate(
    {
      user: req.user._id,
      name: {
        $regex: new RegExp(
          "^" + showName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$",
          "i"
        ),
      },
    },
    { userRate: newRate }
  );
  await updateShow.save((err) => {
    if (err) {
      return res.status(500).send({ msg: err.message });
    }
    console.log("TV Show Saved Successfully");
  });
  res.send(
    `"${showName}" TV Show in your DB have been changed its rate to "${newRate}",and its average rate is "${showDB.averageRate}"`
  );
});

//Add a Tv Show to the User's WatchList
router.post("/add/:tvName", auth, async (req, res) => {
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
  const showName = req.params.tvName;
  const theShow = await Show.findOne(
    {
      name: {
        $regex: new RegExp(
          "^" + showName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$",
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

  if (!theShow) {
    return res
      .status(404)
      .send("Sorry this Tv Show isn't in the DB,check again later!");
  }

  const extra = await Show.findOne({
    name: {
      $regex: new RegExp(
        "^" + showName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "$",
        "i"
      ),
    },
    user: req.user._id,
  });

  if (extra) {
    return res
      .status(400)
      .send("This user with the given ID has already rated this Tv Show!");
  } else {
    const dup = user.watchList;
    for (let i = 0; i < dup.length; i++) {
      if ((dup[i]._id = theShow._id)) {
        return res
          .status(400)
          .send("This user have already added this TV show to his watchList!");
      }
    }
    user.watchList.push(theShow);
    await user.save((err) => {
      if (err) {
        return res.status(500).send({ msg: err.message });
      }
      console.log("User Saved Successfully");
    });
    return res
      .status(201)
      .send(
        `This TV Show has added to your watchList successfully\n${theShow}`
      );
  }
});

//Shows to any guest the top rated Tv Shows
router.get("/guest", async (req, res) => {
  const pageOptions = {
    page: parseInt(req.query.page, 10) || 0,
    limit: parseInt(req.query.limit, 10) || 10,
  };

  Show.find()
    .skip(pageOptions.page * pageOptions.limit)
    .limit(pageOptions.limit)
    .sort("-averageRate")
    .exec(function (err, doc) {
      if (err) {
        res.status(500).json(err);
        return;
      }
      res.status(200).json(doc);
    });
});

module.exports = router;
