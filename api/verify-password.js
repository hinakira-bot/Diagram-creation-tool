export default async function handler(req, res) {
  const { password } = req.body || {};
  const accessPassword = process.env.ACCESS_PASSWORD;

  if (!accessPassword) {
    return res.status(500).json({ error: "ACCESS_PASSWORD not configured" });
  }

  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  if (password === accessPassword) {
    return res.status(200).json({ valid: true });
  }

  return res.status(401).json({ valid: false });
}
