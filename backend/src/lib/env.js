const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(__dirname, "../../.env")
});

const env = {
  port: Number(process.env.PORT || 3001),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  geminiApiKey: process.env.GEMINI_API_KEY || ""
};

module.exports = { env };
