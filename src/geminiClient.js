import { GoogleGenAI } from "@google/genai";

// --- Per-diagram-type text element schemas ---
const DIAGRAM_SCHEMAS = {
  flow: {
    label: "フローチャート（手順・プロセス）",
    fields: [
      { suffix: "step", role: "ステップ名" },
      { suffix: "desc", role: "説明" },
    ],
    example: '{ "id": "item1_step", "role": "ステップ名1", "content": "企画を立てる" }, { "id": "item1_desc", "role": "説明1", "content": "目的とゴールを明確にする" }',
    count: "3-7 steps",
  },
  list: {
    label: "リスト型（箇条書き・ポイント）",
    fields: [
      { suffix: "point", role: "ポイント" },
      { suffix: "detail", role: "補足" },
    ],
    example: '{ "id": "item1_point", "role": "ポイント1", "content": "早起きする" }, { "id": "item1_detail", "role": "補足1", "content": "朝の1時間で集中作業" }',
    count: "3-7 points",
  },
  compare: {
    label: "比較表（A vs B の対比）",
    fields: [
      { suffix: "name", role: "項目名" },
      { suffix: "trait", role: "特徴" },
    ],
    example: '{ "id": "item1_name", "role": "項目名1", "content": "プランA" }, { "id": "item1_trait", "role": "特徴1", "content": "低コスト・導入が簡単" }',
    count: "2-4 items to compare",
  },
  matrix: {
    label: "マトリクス（2軸分類・4象限）",
    fields: [
      { suffix: "quadrant", role: "象限名" },
      { suffix: "desc", role: "説明" },
    ],
    example: '{ "id": "item1_quadrant", "role": "象限名1", "content": "高効果・低コスト" }, { "id": "item1_desc", "role": "説明1", "content": "SNS運用" }',
    count: "exactly 4 quadrants",
    extra: 'Also generate { "id": "axis_x", "role": "X軸", "content": "..." } and { "id": "axis_y", "role": "Y軸", "content": "..." }',
  },
  before_after: {
    label: "ビフォーアフター（変化・改善）",
    fields: [
      { suffix: "state", role: "状態" },
      { suffix: "desc", role: "説明" },
    ],
    example: '{ "id": "item1_state", "role": "状態1", "content": "Before: 手作業で3時間" }, { "id": "item1_desc", "role": "説明1", "content": "毎日の集計に時間がかかる" }',
    count: "exactly 2 items (Before and After)",
  },
  pyramid: {
    label: "ピラミッド（階層・優先度）",
    fields: [
      { suffix: "level", role: "階層名" },
      { suffix: "desc", role: "説明" },
    ],
    example: '{ "id": "item1_level", "role": "階層名1", "content": "ビジョン" }, { "id": "item1_desc", "role": "説明1", "content": "組織の最上位目標" }',
    count: "3-5 levels (top=most important)",
  },
  cycle: {
    label: "サイクル（循環プロセス）",
    fields: [
      { suffix: "phase", role: "フェーズ" },
      { suffix: "desc", role: "説明" },
    ],
    example: '{ "id": "item1_phase", "role": "フェーズ1", "content": "Plan" }, { "id": "item1_desc", "role": "説明1", "content": "計画を立てる" }',
    count: "3-6 phases (cyclical)",
  },
  manga: {
    label: "カラー漫画風（コマ割り・吹き出し）",
    fields: [
      { suffix: "scene", role: "シーン" },
      { suffix: "dialogue", role: "セリフ" },
      { suffix: "sfx", role: "効果音" },
    ],
    example: '{ "id": "item1_scene", "role": "シーン1", "content": "主人公が問題に直面" }, { "id": "item1_dialogue", "role": "セリフ1", "content": "えっ、マジで!?" }, { "id": "item1_sfx", "role": "効果音1", "content": "ガーン！" }',
    count: "3-6 panels",
  },
  simple: {
    label: "シンプル系（最小限の構成）",
    fields: [
      { suffix: "point", role: "ポイント" },
    ],
    example: '{ "id": "item1_point", "role": "ポイント1", "content": "シンプルに伝える" }',
    count: "3-5 points (keep very concise, no extra detail)",
  },
  free: {
    label: "フリーレイアウト（自由構成）",
    fields: [
      { suffix: "element", role: "項目" },
      { suffix: "desc", role: "説明" },
    ],
    example: '{ "id": "item1_element", "role": "項目1", "content": "中心テーマ" }, { "id": "item1_desc", "role": "説明1", "content": "詳細な説明文" }',
    count: "3-7 elements",
  },
};

// --- Text Generation (Structure Analysis) ---
export async function analyzeAndStructure(apiKey, userText, diagramType = null) {
  const ai = new GoogleGenAI({ apiKey });

  const schema = diagramType ? DIAGRAM_SCHEMAS[diagramType] : null;

  let schemaBlock = "";
  if (schema) {
    schemaBlock = `
DIAGRAM TYPE (MUST use): ${schema.label}
Generate ${schema.count}.
Each item MUST use exactly these field suffixes:
${schema.fields.map((f) => `  - item{N}_${f.suffix}  (role: "${f.role}")`).join("\n")}

Example item set:
${schema.example}
${schema.extra || ""}`;
  }

  const systemPrompt = `You are an expert diagram/infographic content strategist.
Analyze the user's input and generate ALL text elements needed for a single diagram image.

RULES:
- Generate a compelling title and optional badge
- All text must be in the SAME language as the user input
- Keep each text concise (suitable for a visual diagram)
- End with a summary
${schemaBlock || `- Pick the best diagram type from: flow, list, compare, matrix, before_after, pyramid, cycle, manga, simple, free
- Generate 3-7 items with fields matching that type`}

Respond ONLY with valid JSON:
{
  "diagramType": "${diagramType || "chosen_type"}",
  "suggestedTaste": "clean_business|pop_casual|tech_dark|flat_minimal|hand_drawn|infographic|magazine|retro_vintage|gradient_modern|japanese_kawaii",
  "suggestedColor": "#hexcolor",
  "texts": [
    { "id": "title", "role": "タイトル", "content": "..." },
    { "id": "badge", "role": "バッジ", "content": "..." },
    ${schema ? schema.example : '{ "id": "item1_element", "role": "項目1", "content": "..." }'},
    ... more items ...
    { "id": "summary", "role": "まとめ", "content": "..." }
  ]
}`;

  const userPrompt = diagramType
    ? `以下のテキストを「${schema?.label || diagramType}」タイプの図解用に構造化してください:\n\n${userText}`
    : `以下のテキストを最適な図解用に構造化してください:\n\n${userText}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
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

function extractTextFromHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  ["script", "style", "nav", "header", "footer", "aside", "iframe"].forEach((tag) => {
    doc.querySelectorAll(tag).forEach((el) => el.remove());
  });
  return (doc.querySelector("article") || doc.body).textContent
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

export async function fetchAndAnalyze(apiKey, url) {
  // 方法1: 自前のAPI Route経由でHTML取得（CORS問題なし、最も信頼性が高い）
  try {
    const res = await fetch(`/api/fetch-url?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const html = await res.text();
      const articleText = extractTextFromHtml(html);
      if (articleText.length > 50) {
        return articleText;
      }
    }
  } catch (e) {
    console.warn("API route fetch failed:", e.message);
  }

  // 方法2: Gemini APIのGoogle Searchグラウンディングでページ内容を取得
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            { text: `以下のURLのWebページの本文テキストを抽出してください。広告やナビゲーションは除外し、記事の本文内容のみをそのまま返してください。余計な説明は不要です。テキストのみ返してください。\n\nURL: ${url}` },
          ],
        },
      ],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const extractedText = response.text?.trim();
    if (extractedText && extractedText.length > 50) {
      return extractedText;
    }
  } catch (e) {
    console.warn("Gemini Google Search grounding failed:", e.message);
  }

  // 方法3: Gemini APIにURLを直接渡して内容を推測させる（Google Searchなし）
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            { text: `以下のURLのページ内容について知っていることを教えてください。図解を作るために使うので、主要なポイントを構造的にまとめてください。\n\nURL: ${url}` },
          ],
        },
      ],
    });

    const extractedText = response.text?.trim();
    if (extractedText && extractedText.length > 50) {
      return extractedText;
    }
  } catch (e) {
    console.warn("Gemini direct fallback also failed:", e.message);
  }

  throw new Error("URLからテキストを取得できませんでした。URLが正しいか確認してください。");
}

// --- Text Generation from File ---
export async function extractTextFromFile(apiKey, fileDataUrl, mimeType) {
  const ai = new GoogleGenAI({ apiKey });
  const base64Data = fileDataUrl.split(",")[1];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
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
    model: "gemini-3.1-flash-image-preview",
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
    model: "gemini-3.1-flash-image-preview",
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
