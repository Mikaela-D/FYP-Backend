// C:\Users\Mikaela\FYP-Backend\routes\index.js

require("dotenv").config();
let express = require("express");
let router = express.Router();

let mongoose = require("mongoose");
let Schema = mongoose.Schema;

// Use the default mongoose instance
mongoose.connect("mongodb://127.0.0.1:27017/db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Admin server page
router.get("/", async function (req, res, next) {
  res.render("index");
});

module.exports = router;
