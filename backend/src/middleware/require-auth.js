const { createUserScopedSupabase, supabase } = require("../lib/db");

function getBearerToken(request) {
  const authorization = request.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() || "";
}

async function requireAuth(req, res, next) {
  const accessToken = getBearerToken(req);

  if (!accessToken) {
    return res.status(401).json({ error: "Authentication is required." });
  }

  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return res.status(401).json({ error: "Your session is invalid or has expired." });
    }

    req.user = user;
    req.supabase = createUserScopedSupabase(accessToken);
    return next();
  } catch {
    return res.status(401).json({ error: "Your session could not be verified." });
  }
}

module.exports = { getBearerToken, requireAuth };
