const auth = require("../middleware/auth");
const validateObjectId = require("../middleware/validateObjectId");
const isAdmin = require("../middleware/admin");
const bcrypt = require("bcrypt");
const _ = require("lodash");
const { User, validate } = require("../models/user");
const { Movie } = require("../models/movie");
const { Show } = require("../models/tvShow");
const { Token } = require("../models/token");
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const { oauth2 } = require("googleapis/build/src/apis/oauth2");
const Oauth2 = google.auth.OAuth2;
require("dotenv").config();

const OauthClient = new Oauth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET
);
OauthClient.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const accessToken = OauthClient.getAccessToken();

//Sign Up
router.post("/signUp", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let user = await User.findOne({ email: req.body.email });
  if (user) return res.status(400).send("User already registered.");

  user = new User(_.pick(req.body, ["name", "email", "password"]));
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt); //==bcrypt.hashSync(user.password,10)
  const newToken = new Token({
    _userId: user._id,
    token: crypto.randomBytes(16).toString("hex"),
  });
  await newToken.save();
  await user.save(function (err) {
    if (err) {
      return res.status(500).send({ msg: err.message });
    }
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.GMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    const mailOptions = {
      from: "no-reply@lastMovie.com",
      to: user.email,
      subject: "Account Verification Link",
      text:
        "Hello " +
        user.name +
        ",\n\n" +
        "Please verify your account by clicking the link: \nhttps://" +
        req.headers.host +
        "/users/confirmation/" +
        user.email +
        "/" +
        newToken.token +
        "\n\nThank You!\n",
    };

    transport.sendMail(mailOptions, (err, result) => {
      if (err) {
        return res.status(500).send({
          msg: "Technical Issue!, Please click on resend for verify your Email.",
        });
      } else {
        console.log("Success: ", result);
        res
          .status(200)
          .send(
            "A verification email has been sent to " +
              user.email +
              ". It will be expire after one day. If you not get verification Email click on resend token."
          );
      }
      transport.close();
    });
  });
});

//Verification
router.get("/confirmation/:email/:token", (req, res) => {
  Token.findOne({ token: req.params.token }, function (err, token) {
    if (err) {
      return res.status(500).send({ msg: err.message });
    } else if (!token) {
      return res.status(400).send({
        msg: "Your verification link may have expired. Please click on resend for verify your Email.",
      });
    } else {
      User.findOne(
        { _id: token._userId, email: req.params.email },
        function (err, user) {
          console.log(req.params.email, token._userId);
          if (err) {
            return res.status(500).send({ msg: err.message });
          }
          //not valid user
          if (!user) {
            return res.status(401).send({
              msg: "We were unable to find a user for this verification. Please SignUp!",
            });
          }
          //User is already verified
          else if (user.isVerified) {
            return res
              .status(200)
              .send("User has been already verified. You can Login");
          }
          //Verify user
          else {
            //Change isVerified to true
            user.isVerified = true;
            user.save(function (err) {
              if (err) {
                return res.statusMessage(500).send({ msg: err.message });
              }
            });
            Token.findOneAndDelete(
              { token: req.params.token },
              function (err, token) {
                if (err) {
                  return res.status(500).send({ msg: err.message });
                } else {
                  User.findOne(
                    { _id: token._userId, email: req.params.email },
                    function (err, user) {
                      if (err) {
                        return res.status(500).send({ msg: err.message });
                      } else {
                        const token = user.generateAuthToken();
                        //account successfully verified
                        return res
                          .status(200)
                          .header("x-auth-token", token)
                          .send("Your account has been successfully verified");
                      }
                    }
                  );
                }
              }
            );
          }
        }
      );
    }
  });
});

//resend verification
router.get("/resendVerification", (req, res) => {
  User.findOne({ email: req.body.email }, async function (err, user) {
    if (err) {
      return res.status(500).send({ msg: err.message });
    } else if (!user) {
      return res
        .status(400)
        .send(
          "We were unable to find a user with that email. Make sure your Email is correct!"
        );
    }
    //user has already verified
    else if (user.isVerified) {
      return res
        .status(200)
        .send("This account has been already verified. You can login.");
    }
    //send verification link
    else {
      const token = await Token.findOne({
        _userId: user._id,
      });
      //send email
      const transport = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: process.env.GMAIL_USER,
          clientId: process.env.CLIENT_ID,
          clientSecret: process.env.CLIENT_SECRET,
          refreshToken: process.env.REFRESH_TOKEN,
          accessToken: accessToken,
        },
      });

      const mailOptions = {
        from: "no-reply@example.com",
        to: req.body.email,
        subject: "Account Verification Link",
        text:
          "Hello " +
          req.body.name +
          ",\n\n" +
          "Please verify your account by clicking the link: \nhttps://" +
          req.headers.host +
          "/users/confirmation/" +
          req.body.email +
          "/" +
          token.token +
          "\n\nThank You!\n",
      };

      transport.sendMail(mailOptions, (err, result) => {
        if (err) {
          return res.status(500).send({
            msg: "Technical Issue!, Please click on resend for verify your Email.",
          });
        } else {
          console.log("Success: ", result);
          res
            .status(200)
            .send(
              "A verification email has been sent to " +
                req.body.email +
                ". It will be expire after one day. If you not get verification Email click on resend token."
            );
        }
        transport.close();
      });
    }
  });
});

//Sign In with jwt
router.get("/me", auth, async (req, res) => {
  const thisUser = await User.findById(req.user._id, {
    password: 0,
    isVerified: 0,
    __v: 0,
    _id: 0,
  });
  if (!thisUser) {
    return res.status(401).send("We can't find any user with this ID!");
  } else if ((thisUser.isVerified = false)) {
    return res.status(401).send({
      msg: "Your Email has not been verified. Please click on resend",
    });
  } else {
    res.send(`Sign In successfully!\n${thisUser}`);
  }
});

//Sign In with User's ID
router.get("/:id", validateObjectId, async (req, res) => {
  const user = await User.findById(req.params.id, {
    password: 0,
    isVerified: 0,
    __v: 0,
    _id: 0,
  });
  if (!user) {
    return res.status(401).send("We can't find any user with this ID!");
  } else if ((user.isVerified = false)) {
    return res.status(401).send({
      msg: "Your Email has not been verified. Please click on resend",
    });
  } else {
    const token = user.generateAuthToken();

    res.header("x-auth-token", token).send(`Sign In successfully!\n${user}`);
  }
});

//Reset password
router.put("/resetPass", auth, async (req, res) => {
  const thisUser = await User.findById(req.user._id);
  if (!thisUser) {
    return res.status(404).send("No user with this ID was found!");
  } else if (!req.user.isVerified || (req.user.isVerified = false)) {
    return res.status(401).send({
      msg: "Your Email has not been verified. Please verify by clicking on resend",
    });
  }
  const oldPass = req.body.oldPassword;
  const newPass = req.body.newPassword;
  const salt = await bcrypt.genSalt(10);
  const compareOldPass = await bcrypt.compare(oldPass, thisUser.password);
  const compareNewPass = await bcrypt.compare(newPass, thisUser.password);
  if (!compareOldPass) {
    return res.send(
      "wrong password!\nIf you can't remember the old password you can go to this link to get into your account==>https://localhost:5000/users/forgetPass\n , You have to Know the email that you registered with!"
    );
  }
  if (compareNewPass) {
    return res
      .status(404)
      .send("The new password could not match old passwords!");
  } else {
    const freshPass = await bcrypt.hash(newPass, salt);
    const updateUser = await User.findByIdAndUpdate(
      req.user._id,
      { password: freshPass },
      {
        new: true,
      }
    );
    res.status(201).send("your password has changed successfully!");
  }
});

//FORGET OLD PASSWORD
router.put("/forgetPass", auth, async (req, res) => {
  const thisUser = await User.findById(req.user._id);
  if (!thisUser) {
    return res.status(404).send("No user with this Id was found!");
  }
  const userEmail = req.body.email;
  const userName = req.body.name;
  if (userEmail != thisUser.email || userName != thisUser.name) {
    return res.send("You have enter wrong email or username!");
  }
  const newPass = req.body.password;
  const compareNewPass = await bcrypt.compare(newPass, thisUser.password);
  if (compareNewPass) {
    return res
      .status(404)
      .send("The new password could not match old passwords!");
  } else {
    const salt = await bcrypt.genSalt(10);
    const freshPass = await bcrypt.hash(newPass, salt);
    const updateUser = await User.findByIdAndUpdate(
      req.user._id,
      { password: freshPass },
      {
        new: true,
      }
    );
    res.status(201).send("your password has changed successfully!");
  }
});

//Show User's lastMovies list
router.get("/mine/movieList", auth, async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "lastMovies",
    model: Movie,
  });
  if (!user) {
    return res
      .status(404)
      .send("The user with the given ID hasn't found, you can sign up!");
  } else if (!user.isVerified) {
    return res
      .status(401)
      .send(
        "the user with the given ID hasn't verified, you can go to resend verification! "
      );
  } else {
    res.status(200).send(user.lastMovies);
  }
});

//Show User's rated Tv Shows list
router.get("/mine/tvList", auth, async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "tvShows",
    model: Show,
  });
  if (!user) {
    return res
      .status(404)
      .send("The user with the given ID hasn't found, you can sign up!");
  } else if (!user.isVerified) {
    return res
      .status(401)
      .send(
        "the user with the given ID hasn't verified, you can go to resend verification! "
      );
  } else {
    res.status(200).send(user.tvShows);
  }
});

//Show User's WatchList
router.get("/mine/watchList", auth, async (req, res) => {
  const movie = await User.findById(req.user._id).populate({
    path: "watchList",
    model: Movie,
  });
  if (!movie) {
    return res
      .status(404)
      .send("The user with the given ID hasn't found, you can sign up!");
  } else if (!movie.isVerified) {
    return res
      .status(401)
      .send(
        "the user with the given ID hasn't verified, you can go to resend verification! "
      );
  }
  const show = await User.findById(req.user._id).populate({
    path: "watchList",
    model: Show,
  });
  if (!show) {
    return res
      .status(404)
      .send("The user with the given ID hasn't found, you can sign up!");
  } else if (!show.isVerified) {
    return res
      .status(401)
      .send(
        "the user with the given ID hasn't verified, you can go to resend verification! "
      );
  }
  res
    .status(200)
    .send(`Movie:${movie.watchList},\n\nTv shows:${show.watchList}`);
});

//Remove User
router.delete("/removeUser", [auth, isAdmin], async (req, res) => {
  const thisUser = await User.findByIdAndRemove(req.user._id);
  res.send(`this User have been deleted==>${thisUser}`);
});

module.exports = router;
