const express = require("express");

const router = express.Router();

router.all("*", (_req, res) => {
  res.status(501).json({
    message: "Pantry routes are scaffolded but not implemented yet."
  });
});

module.exports = router;
