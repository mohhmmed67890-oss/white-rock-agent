const http = require("http");
const url = require("url");

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID || "1009397085016079";
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || "https://white-rock-agent.onrender.com/";
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const MY_NUMBER = process.env.MY_WHATSAPP_NUMBER;
const IG_USER_ID = "38235807102676744";

// حالة مؤقتة بالذاكرة (منشور بانتظار الموافقة)
let pendingPost = null;
// التوكن الطويل الأمد (يتحدث لما نستبدله)
let longLivedToken = process.env.IG_LONG_LIVED_TOKEN || null;

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });
}

async function sendWhatsApp(message) {
  const body = new URLSearchParams();
  body.append("From", "whatsapp:+14155238886");
  body.append("To", MY_NUMBER);
  body.append("Body", message);
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return res.json();
}

async function publishToInstagram(imageUrl, caption, token) {
  const createParams = new URLSearchParams();
  createParams.append("image_url", imageUrl);
  createParams.append("caption", caption);
  createParams.append("access_token", token);
  const createRes = await fetch(`https://graph.instagram.com/v21.0/${IG_USER_ID}/media`, { method: "POST", body: createParams });
  const createData = await createRes.json();
  if (!createData.id) return { error: createData };

  let statusCheck;
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const checkRes = await fetch(`https://graph.instagram.com/v21.0/${createData.id}?fields=status_code&access_token=${token}`);
    statusCheck = await checkRes.json();
    if (statusCheck.status_code === "FINISHED") break;
  }

  const publishParams = new URLSearchParams();
  publishParams.append("creation_id", createData.id);
  publishParams.append("access_token", token);
  const publishRes = await fetch(`https://graph.instagram.com/v21.0/${IG_USER_ID}/media_publish`, { method: "POST", body: publishParams });
  return publishRes.json();
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const code = parsed.query.code;

  // 1) استقبال كود انستغرام وتحويله لتوكن قصير، ثم لتوكن طويل الأمد
  if (code) {
    try {
      const cleanCode = code.split("#")[0];
      const form = new FormData();
      form.append("client_id", INSTAGRAM_APP_ID);
      form.append("client_secret", INSTAGRAM_APP_SECRET);
      form.append("grant_type", "authorization_code");
      form.append("redirect_uri", REDIRECT_URI);
      form.append("code", cleanCode);

      const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: form });
      const tokenData = await tokenResponse.json();

      if (tokenData.access_token) {
        const exchangeRes = await fetch(
          `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${INSTAGRAM_APP_SECRET}&access_token=${tokenData.access_token}`
        );
        const exchangeData = await exchangeRes.json();
        if (exchangeData.access_token) {
          longLivedToken = exchangeData.access_token;
        }
      }

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`
        <html dir="rtl" lang="ar"><body style="font-family: sans-serif; padding: 40px;">
        <h2>نتيجة تبديل الرمز بتوكن طويل الأمد</h2>
        <pre style="background:#fff; padding:20px; border-radius:8px; direction:ltr; white-space:pre-wrap; word-break:break-all;">التوكن الطويل الأمد جاهز الآن ومحفوظ بالسيرفر ✅
مدة صلاحيته: 60 يوم تقريبًا</pre>
        </body></html>
      `);
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("خطأ: " + error.message);
    }
    return;
  }

  // 2) توليد كابشن بالذكاء الاصطناعي وإرساله واتساب للمراجعة
  if (parsed.pathname === "/generate-and-send") {
    try {
      const prompt = `أنت مساعد كتابة محتوى سوشل ميديا لعميل اسمه "نسبه"، نبرة رسمية وواثقة. اكتب كابشن قصير جذاب لمنشور انستغرام عن خدمات الشركة، مع 3 هاشتاقات مناسبة بالعربي. أعطني فقط نص الكابشن بدون أي مقدمات.`;

      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const claudeData = await claudeRes.json();
      const caption = claudeData.content?.find((b) => b.type === "text")?.text?.trim() || "خدماتنا بين إيديك 🎯";

      const imageUrl = "https://picsum.photos/1080/1080";
      pendingPost = { imageUrl, caption };

      const message = `عميل: نسبه\nمنصة: انستغرام\n\nالكابشن المقترح:\n${caption}\n\nرد بـ "موافق" للنشر أو "لا" للإلغاء`;
      const twilioResult = await sendWhatsApp(message);

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<pre dir="rtl" style="white-space:pre-wrap; font-family:sans-serif;">تم توليد الكابشن وإرساله واتساب:\n\n${caption}\n\nحالة الإرسال: ${twilioResult.status}</pre>`);
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("خطأ: " + error.message);
    }
    return;
  }

  // 3) استقبال رد واتساب (موافق/لا) من Twilio
  if (parsed.pathname === "/webhook" && req.method === "POST") {
    try {
      const rawBody = await readBody(req);
      const params = new URLSearchParams(rawBody);
      const replyText = (params.get("Body") || "").trim();

      let replyMessage = "";

      if (!pendingPost) {
        replyMessage = "ما فيه منشور بانتظار الموافقة حاليًا.";
      } else if (replyText.includes("موافق")) {
        if (!longLivedToken) {
          replyMessage = "ما فيه توكن انستغرام صالح حاليًا، لازم تجدده.";
        } else {
          const publishResult = await publishToInstagram(pendingPost.imageUrl, pendingPost.caption, longLivedToken);
          if (publishResult.id) {
            replyMessage = "✅ تم النشر بنجاح على انستغرام!";
            pendingPost = null;
          } else {
            replyMessage = "❌ صار خطأ أثناء النشر: " + JSON.stringify(publishResult.error || publishResult);
          }
        }
      } else if (replyText.includes("لا")) {
        replyMessage = "تم إلغاء المنشور.";
        pendingPost = null;
      } else {
        replyMessage = 'رد بـ "موافق" أو "لا" بس.';
      }

      res.writeHead(200, { "Content-Type": "text/xml; charset=utf-8" });
      res.end(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${replyMessage}</Message></Response>`);
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
