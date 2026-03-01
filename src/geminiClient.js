import { GoogleGenAI } from "@google/genai";

// --- Text Generation (Structure Analysis) ---
export async function analyzeAndStructure(apiKey, userText, diagramType = null) {
  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = `You are an expert diagram/infographic content strategist.
Analyze the user's input text and generate ALL text elements needed for a single diagram image.

RULES:
- Generate a compelling title, optional badge text, main content items, and optional summary/CTA
- Choose the best diagram type if not specified
- All text must be in the SAME language as the user input
- Keep each text element concise (suitable for a visual diagram)
- Generate 3-7 main content items depending on the content
- Each item should have: label, title, description, and an icon hint for visual representation

Respond ONLY with valid JSON in this exact format:
{
  "diagramType": "flow|list|compare|matrix|before_after|pyramid|cycle|free",
  "suggestedTaste": "clean_business|pop_casual|tech_dark|flat_minimal|hand_drawn|infographic|magazine|retro_vintage|gradient_modern|japanese_kawaii",
  "suggestedColor": "#hexcolor",
  "texts": [
    { "id": "title", "role": "タイトル", "content": "...", "visible": true },
    { "id": "badge", "role": "バッジ", "content": "...", "visible": true },
    { "id": "item1_label", "role": "ラベル1", "content": "...", "visible": true },
    { "id": "item1_title", "role": "見出し1", "content": "...", "visible": true },
    { "id": "item1_desc", "role": "説明1", "content": "...", "visible": true },
    { "id": "item1_icon", "role": "アイコン1", "content": "...", "visible": true },
    ... more items as needed ...
    { "id": "summary", "role": "まとめ", "content": "...", "visible": true },
    { "id": "cta", "role": "CTA", "content": "...", "visible": false }
  ]
}`;

  const userPrompt = diagramType
    ? `以下のテキストを「${diagramType}」タイプの図解用に構造化してください:\n\n${userText}`
    : `以下のテキストを最適な図解用に構造化してください:\n\n${userText}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-05-20",
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.7,
    },
  });

  const text = response.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(text);
}

// --- Text Generation from URL ---
export async function fetchAndAnalyze(apiKey, url) {
  const corsProxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];

  let htmlText = "";
  for (const proxy of corsProxies) {
    try {
      const res = await fetch(proxy);
      if (res.ok) {
        htmlText = await res.text();
        break;
      }
    } catch (e) {
      continue;
    }
  }

  if (!htmlText) throw new Error("URLからテキストを取得できませんでした");

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, "text/html");
  ["script", "style", "nav", "header", "footer", "aside", "iframe"].forEach((tag) => {
    doc.querySelectorAll(tag).forEach((el) => el.remove());
  });

  const articleText = (doc.querySelector("article") || doc.body).textContent
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);

  return articleText;
}

// --- Text Generation from File ---
export async function extractTextFromFile(apiKey, fileDataUrl, mimeType) {
  const ai = new GoogleGenAI({ apiKey });
  const base64Data = fileDataUrl.split(",")[1];

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-05-20",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "このファイルからテキスト内容を全て抽出してください。テキストのみ返してください。" },
        ],
      },
    ],
  });

  return response.text;
}

// --- Image Generation ---
export async function generateImage(apiKey, prompt, aspectRatio = "1:1") {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseModalities: ["IMAGE"],
      aspectRatio: aspectRatio,
    },
  });

  const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) throw new Error("画像が生成されませんでした");

  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
}

// --- Image Generation with Reference Images ---
export async function generateImageWithReferences(apiKey, prompt, referenceDataUrls, aspectRatio = "1:1") {
  const ai = new GoogleGenAI({ apiKey });

  const parts = [];

  for (const dataUrl of referenceDataUrls) {
    const [meta, base64] = dataUrl.split(",");
    const mimeType = meta.match(/data:(.*?);/)?.[1] || "image/jpeg";
    parts.push({ inlineData: { mimeType, data: base64 } });
  }

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: ["IMAGE"],
      aspectRatio: aspectRatio,
    },
  });

  const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) throw new Error("画像が生成されませんでした");

  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
}
