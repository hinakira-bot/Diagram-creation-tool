import { createHmac } from "crypto";

function generateMonthlyPassword(secret) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return createHmac("sha256", secret).update(yearMonth).digest("hex").slice(0, 8);
}

export default async function handler(req, res) {
  // Vercel Cronからの呼び出しを検証
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const secret = process.env.PASSWORD_SECRET;
  const resendApiKey = process.env.RESEND_API_KEY;
  const subscriberEmails = process.env.SUBSCRIBER_EMAILS; // カンマ区切り
  const fromEmail = process.env.FROM_EMAIL || "noreply@example.com";

  if (!secret || !resendApiKey || !subscriberEmails) {
    return res.status(500).json({ error: "Missing environment variables" });
  }

  const password = generateMonthlyPassword(secret);
  const now = new Date();
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;
  const emails = subscriberEmails.split(",").map((e) => e.trim()).filter(Boolean);

  const results = [];

  for (const email of emails) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: email,
          subject: `【ZukaiMaker】${monthLabel}のアクセスパスワード`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #4F46E5;">ZukaiMaker</h2>
              <p>いつもメルマガをご購読いただきありがとうございます。</p>
              <p>${monthLabel}のアクセスパスワードをお届けします。</p>
              <div style="background: #F3F4F6; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                <p style="font-size: 12px; color: #6B7280; margin: 0 0 8px;">今月のパスワード</p>
                <p style="font-size: 28px; font-weight: bold; color: #4F46E5; letter-spacing: 4px; margin: 0;">${password}</p>
              </div>
              <p style="font-size: 13px; color: #6B7280;">
                このパスワードは${monthLabel}末まで有効です。<br>
                来月のパスワードは翌月1日にお届けします。
              </p>
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
              <p style="font-size: 11px; color: #9CA3AF;">
                このメールはZukaiMakerメルマガ登録者にお送りしています。
              </p>
            </div>
          `,
        }),
      });

      const data = await response.json();
      results.push({ email, success: response.ok, data });
    } catch (e) {
      results.push({ email, success: false, error: e.message });
    }
  }

  return res.status(200).json({
    month: monthLabel,
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  });
}
