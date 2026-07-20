const http = require("http");
const url = require("url");

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);

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
      // الخطوة 1: إنشاء حاوية المحتوى
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
        res.end(`<pre dir="ltr">فشل إنشاء الحاوية:\n${JSON.stringify(createData, null, 2)}</pre>`);
        return;
      }

      // الخطوة 2: نشر الحاوية
      const publishParams = new URLSearchParams();
      publishParams.append("creation_id", createData.id);
      publishParams.append("access_token", token);

      const publishRes = await fetch(`https://graph.instagram.com/v21.0/${igUserId}/media_publish`, {
        method: "POST",
        body: publishParams,
      });
      const publishData = await publishRes.json();

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<pre dir="ltr" style="white-space:pre-wrap;">نتيجة النشر:\n${JSON.stringify(publishData, null, 2)}</pre>`);
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
