const http = require("http");
const url = require("url");

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID || "1009397085016079";
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || "https://white-rock-agent.onrender.com/";

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const code = parsed.query.code;

  // استقبال كود انستغرام وتحويله لتوكن
  if (code) {
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
        <body style="font-family: sans-serif; padding: 40px;">
          <h2>نتيجة تبديل الرمز بتوكن</h2>
          <pre style="background:#fff; padding:20px; border-radius:8px; direction:ltr; text-align:left; white-space:pre-wrap; word-break:break-all;">${JSON.stringify(tokenData, null, 2)}</pre>
        </body>
        </html>
      `);
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("خطأ: " + error.message);
    }
    return;
  }

  // صفحة النشر التجريبي
  if (parsed.pathname === "/publish") {
    const token = parsed.query.token;
    const igUserId = "38235807102676744";
    const imageUrl = "https://picsum.photos/1080/1080";
    const caption = "خدماتنا الآن بين إيديك 🎯 جودة تثق فيها، واحترافية تلمسها من أول تجربة. تواصل معنا اليوم وابدأ رحلتك معنا. #نسبه #خدمات";

    if (!token) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("لازم تضيف ?token=التوكن_بتاعك بآخر الرابط");
      return;
    }

    try {
      const createParams = new URLSearchParams();
      createParams.append("image_url", imageUrl);
      createParams.append("caption", caption);
      createParams.append("access_token", token);

      const createRes = await fetch(`https://graph.instagram.com/v21.0/${igUserId}/media`, {
        method: "POST",
        body: createParams,
      });
      const createData = await createRes.json();

      if (!createData.id) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<pre dir="ltr" style="white-space:pre-wrap;">فشل إنشاء الحاوية:\n${JSON.stringify(createData, null, 2)}</pre>`);
        return;
      }

      // ننتظر لين تصير الحاوية جاهزة
      let statusCheck;
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const checkRes = await fetch(
          `https://graph.instagram.com/v21.0/${createData.id}?fields=status_code&access_token=${token}`
        );
        statusCheck = await checkRes.json();
        if (statusCheck.status_code === "FINISHED") break;
      }

      const publishParams = new URLSearchParams();
      publishParams.append("creation_id", createData.id);
      publishParams.append("access_token", token);

      const publishRes = await fetch(`https://graph.instagram.com/v21.0/${igUserId}/media_publish`, {
        method: "POST",
        body: publishParams,
      });
      const publishData = await publishRes.json();

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<pre dir="ltr" style="white-space:pre-wrap;">حالة الحاوية: ${JSON.stringify(statusCheck)}\nنتيجة النشر:\n${JSON.stringify(publishData, null, 2)}</pre>`);
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("خطأ: " + error.message);
    }
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("وكيل White Rock شغّال ✅");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`السيرفر شغّال على المنفذ ${PORT}`);
});
