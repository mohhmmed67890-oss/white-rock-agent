const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

async function generateCaption({ clientName, toneProfile, topic, platform }) {
  const prompt = `
أنت مساعد كتابة محتوى سوشل ميديا لعميل اسمه "${clientName}".
نبرة الصوت المطلوبة: ${toneProfile}
المنصة المستهدفة: ${platform}
الموضوع المطلوب كتابة منشور عنه: ${topic}

اكتب كابشن جذاب ومناسب للمنصة، باللغة العربية، مع إضافة 3-5 هاشتاقات مناسبة في النهاية.
أعطني فقط نص الكابشن، بدون أي مقدمات أو شرح إضافي.
`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`فشل الاتصال بـ Claude API: ${errorText}`);
  }

  const data = await response.json();
  const textBlock = data.content.find((block) => block.type === "text");
  return textBlock ? textBlock.text.trim() : null;
}

const http = require("http");
const server = http.createServer(async (req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("وكيل White Rock شغّال ✅");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`السيرفر شغّال على المنفذ ${PORT}`);
});

module.exports = { generateCaption };
