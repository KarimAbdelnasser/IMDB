const { TopRated, validate } = require("../models/topRated");
const { User } = require("../models/user");
const express = require("express");
const router = express.Router();
require("dotenv").config();

//Shows to any guest the top rated movies
router.get("/guest", async (req, res) => {
  const pageOptions = {
    page: parseInt(req.query.page, 10) || 0,
    limit: parseInt(req.query.limit, 10) || 10,
  };

  TopRated.find()
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
