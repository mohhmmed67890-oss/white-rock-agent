const http = require("http");
const url = require("url");

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID || "1009397085016079";
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || "https://white-rock-agent.onrender.com/";

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const code = parsed.query.code;

  if (!code) {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("وكيل White Rock شغّال ✅");
    return;
  }

  try {
    const cleanCode = code.split("#")[0];

    const form = new FormData();
    form.append("client_id", INSTAGRAM_APP_ID);
    form.append("client_secret", INSTAGRAM_APP_SECRET);
    form.append("grant_type", "authorization_code");
    form.append("redirect_uri", REDIRECT_URI);
    form.append("code", cleanCode);

    const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      body: form,
    });

    const tokenData = await tokenResponse.json();

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      <html dir="rtl" lang="ar">
      <body style="font-family: sans-serif; padding: 40px; background: #f5f5f5;">
        <h2>نتيجة تبديل الرمز بتوكن</h2>
        <pre style="background:#fff; padding:20px; border-radius:8px; direction:ltr; text-align:left; overflow-wrap:break-word; white-space:pre-wrap;">${JSON.stringify(tokenData, null, 2)}</pre>
        <p>انسخ قيمة access_token اللي فوق واحفظها بمكان آمن. لا ترسلها لأي أحد.</p>
      </body>
      </html>
    `);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("حدث خطأ: " + error.message);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`السيرفر شغّال على المنفذ ${PORT}`);
});
