import { createHmac } from "crypto";

function generateMonthlyPassword(secret) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return createHmac("sha256", secret).update(yearMonth).digest("hex").slice(0, 8);
}

export default async function handler(req, res) {
  const { password } = req.body || {};
  const secret = process.env.PASSWORD_SECRET;

  if (!secret) {
    return res.status(500).json({ error: "PASSWORD_SECRET not configured" });
  }

  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  const currentPassword = generateMonthlyPassword(secret);

  if (password === currentPassword) {
    return res.status(200).json({ valid: true, expiresAt: getEndOfMonth() });
  }

  return res.status(401).json({ valid: false });
}

function getEndOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}
