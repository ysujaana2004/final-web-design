const express = require("express");
const cors = require("cors");

const { env } = require("./lib/env");
const healthRoutes = require("./routes/health");
const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const recipesRoutes = require("./routes/recipes");
const pantryRoutes = require("./routes/pantry");
const groceriesRoutes = require("./routes/groceries");

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.frontendOrigin || true
    })
  );
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({
      name: "Make Me A Sandwich API",
      runtime: "node"
    });
  });

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/recipes", recipesRoutes);
  app.use("/api/pantry", pantryRoutes);
  app.use("/api/groceries", groceriesRoutes);

  app.use((err, _req, res, _next) => {
    res.status(500).json({
      error: err.message || "Internal server error"
    });
  });

  return app;
}

module.exports = { createApp };
