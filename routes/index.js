const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.send({ response: "I am alive" }).status(200);
});

router.get("/health", (req, res) => {
  var stringJson = "{ \"health\": \"up\" }"
  res.send(JSON.parse(stringJson)).status(200);
});

module.exports = router;