const { createClient } = require("@supabase/supabase-js");
const { env } = require("./env");

const supabase = createClient(
  env.supabaseUrl,
  env.supabaseAnonKey
);

module.exports = { supabase };
