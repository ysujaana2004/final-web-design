const express = require("express");

/*
Purpose:
- Define the GET /api/groceries HTTP endpoint.
- Keep this file focused on request validation, user resolution, and response formatting.

What needs to be done:
- Resolve the user id with the same precedence used by pantry and recipes.
- Validate that a user id exists, using DEV_TEST_USER_ID as the local fallback.
- Call the groceries service layer to compute ranked recommendations.
- Return the structured grocery response payload.
- Forward unexpected failures to Express error middleware.
*/

const router = express.Router();

router.all("*", (_req, res) => {
  res.status(501).json({
    message: "Grocery routes are scaffolded but not implemented yet."
  });
});

module.exports = router;
