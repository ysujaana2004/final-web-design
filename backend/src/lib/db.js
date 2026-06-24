const { env } = require("./env");

function getDatabaseConfig() {
  return {
    provider: "supabase",
    url: env.supabaseUrl,
    anonKey: env.supabaseAnonKey
  };
}

module.exports = { getDatabaseConfig };
