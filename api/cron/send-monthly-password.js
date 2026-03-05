export default async function handler(req, res) {
  // シークレットで認証（手動呼び出し or Vercel Cron）
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const accessPassword = process.env.ACCESS_PASSWORD;
  const resendApiKey = process.env.RESEND_API_KEY;
  const subscriberEmails = process.env.SUBSCRIBER_EMAILS;
  const fromEmail = process.env.FROM_EMAIL || "noreply@example.com";

  if (!accessPassword || !resendApiKey || !subscriberEmails) {
    return res.status(500).json({ error: "Missing environment variables" });
  }

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
          subject: "【ZukaiMaker】新しいアクセスパスワードのお知らせ",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #4F46E5;">ZukaiMaker</h2>
              <p>いつもメルマガをご購読いただきありがとうございます。</p>
              <p>新しいアクセスパスワードをお届けします。</p>
              <div style="background: #F3F4F6; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                <p style="font-size: 12px; color: #6B7280; margin: 0 0 8px;">アクセスパスワード</p>
                <p style="font-size: 28px; font-weight: bold; color: #4F46E5; letter-spacing: 4px; margin: 0;">${accessPassword}</p>
              </div>
              <p style="font-size: 13px; color: #6B7280;">
                次回変更時にまたお届けします。
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
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  });
}
