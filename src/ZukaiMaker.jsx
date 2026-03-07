import { useState, useRef, useCallback, useEffect } from "react";
import {
  Settings, Sparkles, Download, Eye, Loader2, Plus, Trash2, ChevronDown, ChevronUp,
  Upload, Image as ImageIcon, Type, Palette, Layout, User, MessageCircle,
  FileText, Link, RefreshCw, X, Check, AlertCircle, GripVertical, ZoomIn,
  Wand2, ToggleLeft, ToggleRight, HelpCircle, Copy, Package
} from "lucide-react";
import { analyzeAndStructure, fetchAndAnalyze, extractTextFromFile, generateImage, generateImageWithReferences } from "./geminiClient";
import JSZip from "jszip";
import { saveAs } from "file-saver";

// ============================================================
// Constants
// ============================================================
const DIAGRAM_TYPES = [
  { id: "flow", name: "フローチャート", desc: "手順・プロセスの流れ" },
  { id: "list", name: "リスト型", desc: "箇条書き・ポイント" },
  { id: "compare", name: "比較表", desc: "A vs B の対比" },
  { id: "matrix", name: "マトリクス", desc: "2軸での分類" },
  { id: "before_after", name: "ビフォーアフター", desc: "変化・改善の表現" },
  { id: "pyramid", name: "ピラミッド", desc: "階層・優先度" },
  { id: "cycle", name: "サイクル", desc: "循環プロセス" },
  { id: "manga", name: "カラー漫画風", desc: "コマ割り・吹き出し・漫画表現" },
  { id: "simple", name: "シンプル系", desc: "最小限でわかりやすく" },
  { id: "free", name: "フリー", desc: "自由レイアウト" },
];

const TASTES = [
  { id: "clean_business", name: "ビジネスクリーン", desc: "白背景、直線的、企業資料風", atmosphere: "Clean corporate style with white background, straight lines, professional layout, subtle shadows, structured grid", defaultColor: "#1E40AF" },
  { id: "pop_casual", name: "ポップカジュアル", desc: "パステル、角丸、SNS映え", atmosphere: "Bright pastel colors, rounded corners, playful layout, cute icons, social media friendly, cheerful mood", defaultColor: "#EC4899" },
  { id: "tech_dark", name: "テックダーク", desc: "ダークモード、ネオン、IT系", atmosphere: "Dark background (#1a1a2e), neon accent colors, tech/futuristic vibe, glowing edges, monospace hints", defaultColor: "#06B6D4" },
  { id: "flat_minimal", name: "フラットミニマル", desc: "ベクター風、影なし、モダン", atmosphere: "Flat design, no shadows, bold solid colors, geometric shapes, clean vector style, minimal decoration", defaultColor: "#8B5CF6" },
  { id: "hand_drawn", name: "手描き風", desc: "鉛筆/クレヨンタッチ、温かみ", atmosphere: "Hand-drawn sketch style, pencil or crayon texture, warm paper background, imperfect lines, cozy feeling", defaultColor: "#D97706" },
  { id: "infographic", name: "インフォグラフィック", desc: "データビジュアル、アイコン多用", atmosphere: "Data visualization style, lots of icons, charts, numbers highlighted, structured information flow, bold headers", defaultColor: "#059669" },
  { id: "magazine", name: "マガジン風", desc: "雑誌レイアウト、洗練", atmosphere: "Magazine editorial layout, sophisticated typography, photo-realistic elements, elegant spacing, premium feel", defaultColor: "#374151" },
  { id: "retro_vintage", name: "レトロビンテージ", desc: "くすみカラー、アナログ質感", atmosphere: "Retro vintage style, muted dusty colors, analog texture, aged paper, serif fonts, nostalgic mood", defaultColor: "#92400E" },
  { id: "gradient_modern", name: "グラデーション", desc: "グラデ背景、ガラスモーフィズム", atmosphere: "Modern gradient background (coral to lavender to sky), glassmorphism elements, frosted glass cards, vibrant", defaultColor: "#7C3AED" },
  { id: "japanese_kawaii", name: "和風かわいい", desc: "いらすとや風、親しみやすい", atmosphere: "Japanese kawaii illustration style like irasutoya, simple cute characters, pastel colors, friendly rounded shapes, dot eyes", defaultColor: "#F472B6" },
];

const FONT_STYLES = [
  { id: "bold_gothic", name: "太ゴシック", prompt: "Heavy bold sans-serif gothic typography, strong impact" },
  { id: "round_gothic", name: "丸ゴシック", prompt: "Rounded gothic sans-serif, soft and friendly" },
  { id: "mincho", name: "明朝体", prompt: "Elegant serif/mincho typography, intellectual and formal" },
  { id: "handwriting", name: "手書き風", prompt: "Handwritten casual font style, warm and personal" },
];

const TITLE_DECORATIONS = [
  { id: "bold_fill", name: "ベタ塗り", prompt: "Extra bold filled text, solid color, heavy weight" },
  { id: "outline", name: "袋文字", prompt: "White filled text with thick dark outline/stroke around characters" },
  { id: "shadow", name: "ドロップシャドウ", prompt: "Bold text with dramatic drop shadow for depth" },
  { id: "gradient_text", name: "グラデーション", prompt: "Text with gradient color fill" },
  { id: "highlight", name: "マーカー", prompt: "Semi-transparent highlighter brush stroke behind text" },
  { id: "frame_box", name: "枠囲み", prompt: "Text enclosed in a decorative bordered frame/box" },
];

const TEXT_SIZES = [
  { id: "xl", name: "特大", px: 48, prompt: "extra large ~48px" },
  { id: "lg", name: "大", px: 36, prompt: "large ~36px" },
  { id: "md", name: "中", px: 28, prompt: "medium ~28px" },
  { id: "sm", name: "小", px: 22, prompt: "small ~22px" },
];

const CHAR_SIZES = [
  { id: "mini", name: "ミニ", prompt: "occupying about 1/12 of the image area, tiny accent" },
  { id: "small", name: "小", prompt: "occupying about 1/8 of the image area, full body, wide shot" },
  { id: "medium", name: "中", prompt: "occupying about 1/5 of the image area, bust-up shot" },
  { id: "large", name: "大", prompt: "occupying about 1/3 of the image area, close-up" },
];

const CHAR_POSITIONS = [
  { id: "top_left", name: "左上" },
  { id: "top_right", name: "右上" },
  { id: "bottom_left", name: "左下" },
  { id: "bottom_right", name: "右下" },
  { id: "center_left", name: "中央左" },
  { id: "center_right", name: "中央右" },
];

const ASPECT_RATIOS = [
  { id: "1:1", name: "1:1", desc: "正方形 (SNS)" },
  { id: "4:5", name: "4:5", desc: "Instagram" },
  { id: "16:9", name: "16:9", desc: "ブログ/プレゼン" },
  { id: "9:16", name: "9:16", desc: "ストーリーズ" },
];

const COLOR_PATTERNS = [
  { id: "mono", name: "モノトーン", desc: "同系色の濃淡" },
  { id: "complementary", name: "補色", desc: "反対色でメリハリ" },
  { id: "triadic", name: "トライアド", desc: "3色で華やかに" },
  { id: "analogous", name: "類似色", desc: "隣り合う色で調和" },
  { id: "split_complementary", name: "スプリット", desc: "補色を2分割" },
  { id: "preset", name: "プリセット", desc: "厳選パレットから選択" },
];

const CURATED_PALETTES = [
  // Warm & Trendy
  { id: "sunset_glow", name: "サンセット", colors: ["#FF6B6B", "#FEC89A", "#FFD93D", "#6BCB77"], category: "warm" },
  { id: "terracotta", name: "テラコッタ", colors: ["#E07A5F", "#3D405B", "#81B29A", "#F2CC8F"], category: "warm" },
  { id: "coral_reef", name: "コーラルリーフ", colors: ["#FF7675", "#FDCB6E", "#6C5CE7", "#00CEC9"], category: "warm" },
  { id: "autumn_mood", name: "オータム", colors: ["#D4A373", "#FAEDCD", "#FEFAE0", "#CCD5AE"], category: "warm" },
  // Cool & Modern
  { id: "ocean_breeze", name: "オーシャン", colors: ["#0077B6", "#00B4D8", "#90E0EF", "#CAF0F8"], category: "cool" },
  { id: "midnight", name: "ミッドナイト", colors: ["#22223B", "#4A4E69", "#9A8C98", "#C9ADA7"], category: "cool" },
  { id: "arctic", name: "アークティック", colors: ["#264653", "#2A9D8F", "#E9C46A", "#F4A261"], category: "cool" },
  { id: "lavender_haze", name: "ラベンダー", colors: ["#7B2D8E", "#C77DFF", "#E0AAFF", "#F0E6FF"], category: "cool" },
  // Pastel & Soft
  { id: "cotton_candy", name: "コットンキャンディ", colors: ["#FFB5E8", "#FF9CEE", "#B5DEFF", "#97E8D3"], category: "pastel" },
  { id: "macaron", name: "マカロン", colors: ["#F8C8DC", "#A8D8EA", "#AA96DA", "#FCBAD3"], category: "pastel" },
  { id: "mint_fresh", name: "ミントフレッシュ", colors: ["#95E1D3", "#EAFFD0", "#FCE38A", "#F38181"], category: "pastel" },
  { id: "sakura", name: "サクラ", colors: ["#FADCE6", "#F2A6B5", "#D4789C", "#8B5E83"], category: "pastel" },
  // Bold & Vivid
  { id: "neon_pop", name: "ネオンポップ", colors: ["#FF006E", "#8338EC", "#3A86FF", "#FFBE0B"], category: "bold" },
  { id: "retro_pop", name: "レトロポップ", colors: ["#F94144", "#F8961E", "#43AA8B", "#577590"], category: "bold" },
  { id: "electric", name: "エレクトリック", colors: ["#7400B8", "#5390D9", "#48BFE3", "#56CFE1"], category: "bold" },
  { id: "tokyo_night", name: "トーキョーナイト", colors: ["#0D1B2A", "#1B263B", "#E63946", "#A8DADC"], category: "bold" },
  // Business & Clean
  { id: "corporate_blue", name: "コーポレート", colors: ["#1D3557", "#457B9D", "#A8DADC", "#F1FAEE"], category: "business" },
  { id: "olive_chic", name: "オリーブシック", colors: ["#606C38", "#283618", "#FEFAE0", "#DDA15E"], category: "business" },
  { id: "monochrome_plus", name: "モノクロ+", colors: ["#212529", "#495057", "#ADB5BD", "#E8B931"], category: "business" },
  { id: "slate_rose", name: "スレートローズ", colors: ["#2B2D42", "#8D99AE", "#EDF2F4", "#EF233C"], category: "business" },
];

const BG_TYPES = [
  { id: "white", name: "ホワイト", prompt: "clean white background" },
  { id: "solid", name: "単色", prompt: "solid color background using the main theme color (lightened)" },
  { id: "gradient", name: "グラデーション", prompt: "subtle gradient background using theme colors" },
  { id: "pattern", name: "パターン", prompt: "subtle geometric or decorative pattern background" },
  { id: "image", name: "イメージ", prompt: "thematic illustration-based background related to the content" },
];

// ============================================================
// Utility Functions
// ============================================================
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

function lightenColor(hex, percent) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * (percent / 100)));
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * (percent / 100)));
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * (percent / 100)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function darkenColor(hex, percent) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.max(0, Math.round(rgb.r * (1 - percent / 100)));
  const g = Math.max(0, Math.round(rgb.g * (1 - percent / 100)));
  const b = Math.max(0, Math.round(rgb.b * (1 - percent / 100)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function isLightColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000 > 128;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; };
  let r, g, b;
  if (s === 0) { r = g = b = l; } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3);
  }
  return `#${Math.round(r * 255).toString(16).padStart(2, "0")}${Math.round(g * 255).toString(16).padStart(2, "0")}${Math.round(b * 255).toString(16).padStart(2, "0")}`;
}

function generateColorPalette(hex, pattern, presetId) {
  // Preset mode: use curated palette directly
  if (pattern === "preset" && presetId) {
    const preset = CURATED_PALETTES.find(p => p.id === presetId);
    if (preset) {
      const c = preset.colors;
      return { main: c[0], colors: c, description: `Curated palette "${preset.name}": Primary ${c[0]}, Secondary ${c[1]}, Accent ${c[2]}, Highlight ${c[3]} — use all 4 colors across the design for a cohesive yet vibrant look` };
    }
  }

  const rgb = hexToRgb(hex);
  if (!rgb) return { main: hex, colors: [hex], description: "" };
  const [h, s, l] = rgbToHsl(rgb.r, rgb.g, rgb.b);
  switch (pattern) {
    case "complementary": {
      const comp = hslToHex((h + 180) % 360, s, l);
      return { main: hex, colors: [hex, comp, lightenColor(hex, 30), lightenColor(comp, 30)], description: `Main: ${hex}, Complementary accent: ${comp}, Light main: ${lightenColor(hex, 30)}, Light accent: ${lightenColor(comp, 30)}` };
    }
    case "triadic": {
      const c1 = hslToHex((h + 120) % 360, s, l);
      const c2 = hslToHex((h + 240) % 360, s, l);
      return { main: hex, colors: [hex, c1, c2, lightenColor(hex, 30)], description: `Main: ${hex}, Triadic accent 1: ${c1}, Triadic accent 2: ${c2}, Light main: ${lightenColor(hex, 30)}` };
    }
    case "analogous": {
      const c1 = hslToHex((h + 30) % 360, s, l);
      const c2 = hslToHex((h + 330) % 360, s, l);
      return { main: hex, colors: [hex, c1, c2, lightenColor(hex, 30)], description: `Main: ${hex}, Analogous warm: ${c1}, Analogous cool: ${c2}, Light main: ${lightenColor(hex, 30)}` };
    }
    case "split_complementary": {
      const c1 = hslToHex((h + 150) % 360, s, l);
      const c2 = hslToHex((h + 210) % 360, s, l);
      return { main: hex, colors: [hex, c1, c2, lightenColor(hex, 30)], description: `Main: ${hex}, Split-comp accent 1: ${c1}, Split-comp accent 2: ${c2}, Light main: ${lightenColor(hex, 30)}` };
    }
    case "mono":
    default:
      return { main: hex, colors: [hex, lightenColor(hex, 40), darkenColor(hex, 30)], description: `Main: ${hex}, Light: ${lightenColor(hex, 40)}, Dark: ${darkenColor(hex, 30)}` };
  }
}

function compressImage(dataUrl, maxSize = 512, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}

// --- Generic role words to hide from display ---
const HIDDEN_ROLE_WORDS = ["要素", "項目", "説明", "補足"];

// ============================================================
// Sub-Components
// ============================================================
function MiniImageUpload({ label, value, onChange, onClear }) {
  const inputRef = useRef(null);
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result);
      onChange(compressed);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="border border-dashed border-gray-300 rounded-lg p-2 text-center">
      {value ? (
        <div className="relative">
          <img src={value} alt={label} className="w-full h-20 object-cover rounded" />
          <button onClick={onClear} className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">
            <X size={12} />
          </button>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()} className="flex flex-col items-center gap-1 w-full py-2 text-gray-400 hover:text-gray-600 transition-colors">
          <Upload size={16} />
          <span className="text-xs">{label}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// --- Inline editable field ---
function InlineField({ item, onEdit, onDelete, compact = false, hideRole = false }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.content);
  const handleSave = () => { onEdit(item.id, editValue); setEditing(false); };

  // Auto-hide generic role labels like "要素1", "説明2", "補足3"
  const roleBase = item.role.replace(/\d+$/, "").trim();
  const shouldHideRole = hideRole || HIDDEN_ROLE_WORDS.includes(roleBase);

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        {!shouldHideRole && <span className="text-[10px] text-gray-400 w-10 flex-shrink-0 truncate">{item.role}</span>}
        <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
          className="flex-1 text-xs border border-indigo-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }} autoFocus />
        <button onClick={handleSave} className="text-green-500 hover:text-green-700"><Check size={14} /></button>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-1.5 hover:bg-white/60 rounded px-1 py-0.5 -mx-1 transition-colors">
      {!shouldHideRole && <span className="text-[10px] text-gray-400 w-10 flex-shrink-0 pt-0.5 truncate">{item.role}</span>}
      <span className={`flex-1 ${compact ? "text-xs text-gray-600" : "text-sm text-gray-800"} cursor-pointer`}
        onClick={() => { setEditValue(item.content); setEditing(true); }}>
        {item.content}
      </span>
      <button onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all flex-shrink-0 pt-0.5">
        <X size={12} />
      </button>
    </div>
  );
}

// --- Group related items together ---
function groupTextItems(items) {
  const singles = [];
  const groups = {};

  for (const item of items) {
    const match = item.id.match(/^item(\d+)_/);
    if (match) {
      const num = match[1];
      if (!groups[num]) groups[num] = [];
      groups[num].push(item);
    } else {
      singles.push(item);
    }
  }

  const result = [];
  const headerItems = singles.filter((s) => ["title", "badge"].includes(s.id));
  if (headerItems.length > 0) result.push({ type: "header", items: headerItems });

  const sortedNums = Object.keys(groups).sort((a, b) => Number(a) - Number(b));
  for (const num of sortedNums) {
    result.push({ type: "group", num, items: groups[num] });
  }

  const footerItems = singles.filter((s) => !["title", "badge"].includes(s.id));
  if (footerItems.length > 0) result.push({ type: "footer", items: footerItems });

  return result;
}

// --- Diagram-type-specific visual config ---
const DIAGRAM_VISUALS = {
  flow: {
    badge: (num, total) => <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{"①②③④⑤⑥⑦⑧⑨⑩"[num - 1] || num}</span>,
    connector: (isLast) => !isLast && <div className="flex justify-center py-0.5"><ChevronDown size={14} className="text-blue-300" /></div>,
    accent: "border-blue-200 bg-blue-50/40",
    borderL: "border-blue-200",
  },
  list: {
    badge: (num) => <span className="w-5 h-5 rounded bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{num}</span>,
    connector: () => null,
    accent: "border-emerald-200 bg-emerald-50/30",
    borderL: "border-emerald-200",
  },
  compare: {
    badge: (num, total) => {
      const labels = ["A", "B", "C", "D"];
      const colors = ["bg-rose-500", "bg-sky-500", "bg-amber-500", "bg-violet-500"];
      return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${colors[num - 1] || "bg-gray-500"} flex-shrink-0`}>{labels[num - 1] || num}</span>;
    },
    connector: (isLast, num, total) => !isLast && total === 2 && <div className="flex justify-center py-1"><span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">VS</span></div>,
    accent: "border-gray-200 bg-gray-50/50",
    borderL: "border-gray-300",
  },
  matrix: {
    badge: (num) => {
      const quadrants = ["↗", "↖", "↘", "↙"];
      return <span className="w-5 h-5 rounded bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{quadrants[num - 1] || "•"}</span>;
    },
    connector: () => null,
    accent: "border-violet-200 bg-violet-50/30",
    borderL: "border-violet-200",
  },
  before_after: {
    badge: (num) => {
      const isB = num === 1;
      return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white flex-shrink-0 ${isB ? "bg-gray-500" : "bg-green-500"}`}>{isB ? "BEFORE" : "AFTER"}</span>;
    },
    connector: (isLast, num, total) => !isLast && num === 1 && <div className="flex justify-center py-1"><span className="text-lg text-orange-400">→</span></div>,
    accent: "border-gray-200 bg-gray-50/50",
    borderL: "border-orange-200",
  },
  pyramid: {
    badge: (num, total) => {
      const sizes = ["text-[11px]", "text-[10px]", "text-[10px]", "text-[9px]", "text-[9px]"];
      const opacities = ["bg-amber-600", "bg-amber-500", "bg-amber-400", "bg-amber-300 text-amber-800", "bg-amber-200 text-amber-700"];
      return <span className={`px-1.5 py-0.5 rounded ${opacities[num - 1] || "bg-amber-300"} ${sizes[num - 1] || "text-[9px]"} font-bold text-white flex-shrink-0`}>▲{num}</span>;
    },
    connector: () => null,
    accent: "border-amber-200 bg-amber-50/30",
    borderL: "border-amber-200",
  },
  cycle: {
    badge: (num, total) => <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{num}</span>,
    connector: (isLast) => <div className="flex justify-center py-0.5"><span className="text-teal-300 text-xs">{isLast ? "↩" : "↓"}</span></div>,
    accent: "border-teal-200 bg-teal-50/30",
    borderL: "border-teal-200",
  },
  manga: {
    badge: (num) => <span className="px-1.5 py-0.5 rounded text-[10px] font-black text-white bg-pink-500 flex-shrink-0 italic" style={{transform:"skewX(-6deg)"}}>コマ{num}</span>,
    connector: (isLast) => !isLast && <div className="flex justify-center py-0.5"><span className="text-pink-300 text-sm font-bold">⚡</span></div>,
    accent: "border-pink-200 bg-pink-50/30",
    borderL: "border-pink-300",
  },
  simple: {
    badge: (num) => <span className="w-5 h-5 rounded-full border-2 border-gray-400 text-gray-500 text-[10px] font-medium flex items-center justify-center flex-shrink-0">{num}</span>,
    connector: () => null,
    accent: "border-gray-100 bg-white",
    borderL: "border-gray-200",
  },
  free: {
    badge: (num) => <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0 mt-1.5"></span>,
    connector: () => null,
    accent: "border-gray-100 bg-white",
    borderL: "border-gray-200",
  },
};

// --- Diagram-aware text list renderer ---
function DiagramTextList({ textItems, diagramType, onEdit, onDelete }) {
  const grouped = groupTextItems(textItems);
  const vis = DIAGRAM_VISUALS[diagramType] || DIAGRAM_VISUALS.free;
  const contentGroups = grouped.filter((g) => g.type === "group");
  const totalGroups = contentGroups.length;

  return (
    <div className="space-y-1.5">
      {grouped.map((group, gIdx) => {
        // === Header (Title / Badge) ===
        if (group.type === "header") {
          return (
            <div key="header" className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg px-3 py-2.5">
              {group.items.map((item) => (
                <InlineField key={item.id} item={item} onEdit={onEdit} onDelete={onDelete}
                  compact={item.id === "badge"} />
              ))}
            </div>
          );
        }

        // === Footer (Summary / CTA / Custom) ===
        if (group.type === "footer") {
          return (
            <div key="footer" className="bg-gray-50 border border-dashed border-gray-300 rounded-lg px-3 py-2 mt-1">
              {group.items.map((item) => (
                <InlineField key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} compact />
              ))}
            </div>
          );
        }

        // === Content Groups (diagram-type-aware) ===
        const num = Number(group.num);
        const groupIdx = contentGroups.indexOf(group);
        const isLast = groupIdx === totalGroups - 1;
        const titleItem = group.items.find((i) => i.id.endsWith("_title"));
        const otherItems = group.items.filter((i) => i !== titleItem);

        // Special layout for compare: side-by-side pairs
        if (diagramType === "compare" && totalGroups === 2) {
          return (
            <div key={`group-${group.num}`}>
              <div className={`border rounded-lg p-2.5 ${vis.accent}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  {vis.badge(num, totalGroups)}
                  {titleItem && (
                    <span className="text-xs font-bold text-gray-800 truncate cursor-pointer"
                      onClick={() => { /* handled by InlineField */ }}>
                      {titleItem.content}
                    </span>
                  )}
                </div>
                <div className={`space-y-0.5 pl-2 border-l-2 ${vis.borderL} ml-1`}>
                  {titleItem && <InlineField item={titleItem} onEdit={onEdit} onDelete={onDelete} compact hideRole />}
                  {otherItems.map((item) => (
                    <InlineField key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} compact />
                  ))}
                </div>
              </div>
              {vis.connector(isLast, num, totalGroups)}
            </div>
          );
        }

        // Special: Pyramid gets wider padding per level
        const pyramidPadding = diagramType === "pyramid"
          ? { paddingLeft: `${4 + (num - 1) * 6}px`, paddingRight: `${4 + (num - 1) * 6}px` }
          : {};

        // Special: Matrix uses 2-col grid
        if (diagramType === "matrix" && totalGroups === 4) {
          // Render in pairs: handled at the container level
        }

        return (
          <div key={`group-${group.num}`}>
            <div className={`border rounded-lg p-2.5 ${vis.accent} transition-all`} style={pyramidPadding}>
              <div className="flex items-center gap-2 mb-1">
                {vis.badge(num, totalGroups)}
                {titleItem ? (
                  <InlineField item={titleItem} onEdit={onEdit} onDelete={onDelete} hideRole />
                ) : (
                  <span className="text-xs text-gray-500">項目 {num}</span>
                )}
              </div>
              {otherItems.length > 0 && (
                <div className={`space-y-0.5 pl-2 border-l-2 ${vis.borderL} ml-1`}>
                  {otherItems.map((item) => (
                    <InlineField key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} compact />
                  ))}
                </div>
              )}
            </div>
            {vis.connector(isLast, num, totalGroups)}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================
export default function ZukaiMaker() {
  // --- API Key ---
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("zukai_api_key") || "");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // --- Input ---
  const [inputMethod, setInputMethod] = useState("text"); // text, url, file, keyword
  const [inputText, setInputText] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [inputKeyword, setInputKeyword] = useState("");

  // --- AI Analysis ---
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [textItems, setTextItems] = useState([]);
  const [diagramType, setDiagramType] = useState("free");
  const [showTextInImage, setShowTextInImage] = useState(true);

  // --- Visual Settings ---
  const [taste, setTaste] = useState("clean_business");
  const [mainColor, setMainColor] = useState("#1E40AF");
  const [colorPattern, setColorPattern] = useState("mono");
  const [selectedPalette, setSelectedPalette] = useState("");
  const [fontStyle, setFontStyle] = useState("bold_gothic");
  const [titleDecoration, setTitleDecoration] = useState("bold_fill");
  const [textSize, setTextSize] = useState("lg");
  const [bgType, setBgType] = useState("white");
  const [aspectRatio, setAspectRatio] = useState("1:1");

  // --- Character ---
  const [useCharacter, setUseCharacter] = useState(false);
  const [charSource, setCharSource] = useState("generate"); // generate, upload
  const [charImage, setCharImage] = useState(() => localStorage.getItem("zukai_char_image") || "");
  const [charDesc, setCharDesc] = useState("");
  const [charSize, setCharSize] = useState("small");
  const [charPosition, setCharPosition] = useState("bottom_left");
  const [charExpression, setCharExpression] = useState("smiling and pointing");
  const [useBubble, setUseBubble] = useState(false);
  const [bubbleText, setBubbleText] = useState("");

  // --- Reference Images ---
  const [tasteRef1, setTasteRef1] = useState(() => localStorage.getItem("zukai_taste_ref1") || "");
  const [tasteRef2, setTasteRef2] = useState(() => localStorage.getItem("zukai_taste_ref2") || "");
  const [layoutRef, setLayoutRef] = useState(() => localStorage.getItem("zukai_layout_ref") || "");
  const [contentRef1, setContentRef1] = useState(() => localStorage.getItem("zukai_content_ref1") || "");
  const [contentRef2, setContentRef2] = useState(() => localStorage.getItem("zukai_content_ref2") || "");

  // --- Must-Use Image ---
  const [mustUseImage, setMustUseImage] = useState(() => localStorage.getItem("zukai_must_use_image") || "");
  const [showMustUseSection, setShowMustUseSection] = useState(false);

  // --- Output ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [generateError, setGenerateError] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // --- Batch / Variation ---
  const [isVariationMode, setIsVariationMode] = useState(false);
  const [variationTastes, setVariationTastes] = useState([]);
  const batchCancelRef = useRef(false);

  // --- Sections visibility ---
  const [showCharSection, setShowCharSection] = useState(false);
  const [showRefSection, setShowRefSection] = useState(false);

  // --- Persist ---
  useEffect(() => { localStorage.setItem("zukai_api_key", apiKey); }, [apiKey]);
  useEffect(() => { if (charImage) localStorage.setItem("zukai_char_image", charImage); }, [charImage]);
  useEffect(() => { if (tasteRef1) localStorage.setItem("zukai_taste_ref1", tasteRef1); else localStorage.removeItem("zukai_taste_ref1"); }, [tasteRef1]);
  useEffect(() => { if (tasteRef2) localStorage.setItem("zukai_taste_ref2", tasteRef2); else localStorage.removeItem("zukai_taste_ref2"); }, [tasteRef2]);
  useEffect(() => { if (layoutRef) localStorage.setItem("zukai_layout_ref", layoutRef); else localStorage.removeItem("zukai_layout_ref"); }, [layoutRef]);
  useEffect(() => { if (contentRef1) localStorage.setItem("zukai_content_ref1", contentRef1); else localStorage.removeItem("zukai_content_ref1"); }, [contentRef1]);
  useEffect(() => { if (contentRef2) localStorage.setItem("zukai_content_ref2", contentRef2); else localStorage.removeItem("zukai_content_ref2"); }, [contentRef2]);
  useEffect(() => { if (mustUseImage) localStorage.setItem("zukai_must_use_image", mustUseImage); else localStorage.removeItem("zukai_must_use_image"); }, [mustUseImage]);

  // --- Taste change -> update main color ---
  const handleTasteChange = (tasteId) => {
    setTaste(tasteId);
    const t = TASTES.find((t) => t.id === tasteId);
    if (t) setMainColor(t.defaultColor);
  };

  // ============================================================
  // AI Analysis
  // ============================================================
  const handleAnalyze = async () => {
    if (!apiKey) { setAnalysisError("APIキーを設定してください"); return; }

    let sourceText = "";
    setIsAnalyzing(true);
    setAnalysisError("");

    try {
      switch (inputMethod) {
        case "text":
          sourceText = inputText;
          break;
        case "url":
          sourceText = await fetchAndAnalyze(apiKey, inputUrl);
          break;
        case "file":
          setAnalysisError("ファイルをアップロードしてください");
          setIsAnalyzing(false);
          return;
        case "keyword":
          sourceText = `以下のテーマ/キーワードについて、図解にふさわしい内容を考えて構造化してください: ${inputKeyword}`;
          break;
      }

      if (!sourceText.trim()) {
        setAnalysisError("テキストを入力してください");
        setIsAnalyzing(false);
        return;
      }

      const result = await analyzeAndStructure(apiKey, sourceText, diagramType);
      setTextItems(result.texts || []);
      // diagramTypeはユーザーが事前選択済みなので上書きしない

      if (result.suggestedTaste) {
        setTaste(result.suggestedTaste);
        const t = TASTES.find((t) => t.id === result.suggestedTaste);
        if (t) setMainColor(t.defaultColor);
      }
      if (result.suggestedColor) setMainColor(result.suggestedColor);

    } catch (err) {
      setAnalysisError(`分析エラー: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !apiKey) return;

    setIsAnalyzing(true);
    setAnalysisError("");

    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const extracted = await extractTextFromFile(apiKey, ev.target.result, file.type);
          const result = await analyzeAndStructure(apiKey, extracted, diagramType);
          setTextItems(result.texts || []);
          if (result.suggestedTaste) handleTasteChange(result.suggestedTaste);
          if (result.suggestedColor) setMainColor(result.suggestedColor);
        } catch (err) {
          setAnalysisError(`ファイル処理エラー: ${err.message}`);
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setAnalysisError(`ファイル読み込みエラー: ${err.message}`);
      setIsAnalyzing(false);
    }
    e.target.value = "";
  };

  // --- Text Item Operations ---
  const editTextItem = (id, newContent) => {
    setTextItems((prev) => prev.map((item) => item.id === id ? { ...item, content: newContent } : item));
  };

  const deleteTextItem = (id) => {
    setTextItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addTextItem = () => {
    const newId = `custom_${Date.now()}`;
    setTextItems((prev) => [...prev, { id: newId, role: "カスタム", content: "新しいテキスト", visible: true }]);
  };

  // ============================================================
  // Prompt Generation
  // ============================================================
  const buildPrompt = useCallback((overrideTaste = null) => {
    const currentTaste = TASTES.find((t) => t.id === (overrideTaste || taste));
    const currentFont = FONT_STYLES.find((f) => f.id === fontStyle);
    const currentDeco = TITLE_DECORATIONS.find((d) => d.id === titleDecoration);
    const currentSize = TEXT_SIZES.find((s) => s.id === textSize);
    const currentBg = BG_TYPES.find((b) => b.id === bgType);
    const currentDiagram = DIAGRAM_TYPES.find((d) => d.id === diagramType);

    if (textItems.length === 0) return "";

    // When showTextInImage is OFF, don't include any text in the prompt
    const activeTexts = showTextInImage ? textItems : [];

    // Separate title, badge, items, summary, etc.
    const titleItem = activeTexts.find((t) => t.id === "title");
    const badgeItem = activeTexts.find((t) => t.id === "badge");
    const summaryItem = activeTexts.find((t) => t.id === "summary");
    const ctaItem = activeTexts.find((t) => t.id === "cta");
    const contentItems = activeTexts.filter((t) => !["title", "badge", "summary", "cta"].includes(t.id));

    const palette = generateColorPalette(mainColor, colorPattern, selectedPalette);

    let prompt = `CREATE A SINGLE DIAGRAM/INFOGRAPHIC IMAGE.

=== IMAGE SPECIFICATIONS ===
- Aspect ratio: ${aspectRatio}
- Style: ${currentTaste?.atmosphere || "clean professional"}
- Background: ${currentBg?.prompt || "white background"}
- Color palette (${COLOR_PATTERNS.find(p => p.id === colorPattern)?.name || "モノトーン"}): ${palette.description}
- Use these colors strategically: main color for primary elements, accent colors for highlights, contrast, and visual variety
- Ensure visual interest by using different palette colors for different sections/items

=== TYPOGRAPHY ===
- Font style: ${currentFont?.prompt || "bold sans-serif"}
- Title decoration: ${currentDeco?.prompt || "bold filled"}
- Base text size: ${currentSize?.prompt || "large ~36px"}
- ALL TEXT MUST BE RENDERED CLEARLY AND LEGIBLY
- Text must be the EXACT content provided below - do not change, translate, or omit any text

=== DIAGRAM TYPE: ${currentDiagram?.name || "List"} ===
Layout the content as a ${currentDiagram?.id || "list"} diagram.
`;

    // Diagram-type specific layout instructions
    const layoutInstructions = {
      flow: "Arrange items in a left-to-right or top-to-bottom FLOW with arrows connecting each step. Each step should be in a distinct card/shape.",
      list: "Arrange items in a VERTICAL LIST with numbers or bullet points. Each item gets its own row with icon, title, and description.",
      compare: "Create a SIDE-BY-SIDE COMPARISON layout. Split the image into columns for each compared item.",
      matrix: "Create a 2x2 MATRIX/GRID layout with labeled axes.",
      before_after: "Split the image into LEFT (Before) and RIGHT (After) sections with a clear divider and arrow.",
      pyramid: "Arrange items in a PYRAMID/TRIANGLE from top (most important) to bottom (foundation).",
      cycle: "Arrange items in a CIRCULAR/CYCLE layout with arrows showing the continuous flow.",
      manga: "Create a COLOR MANGA / COMIC PANEL style layout. Use comic panel frames (コマ割り) to separate each item. Include speech bubbles, action lines (集中線), sound effects (擬音), bold manga-style typography, and expressive character reactions. Use vivid colors and dynamic composition like a Japanese manga page. Each panel should visually tell part of the story.",
      simple: "Create an extremely SIMPLE and MINIMAL layout. Use only essential elements: clean icons, short text, lots of whitespace. No decorative elements, no complex shapes. Focus on clarity and readability. Think 'less is more' - like a clean whiteboard sketch or a minimal presentation slide. Use a single accent color sparingly.",
      free: "Arrange items in a visually balanced FREE LAYOUT that best communicates the content.",
    };
    prompt += `${layoutInstructions[diagramType] || layoutInstructions.list}\n\n`;

    prompt += `=== CONTENT TO DISPLAY ===\n`;

    if (titleItem) {
      prompt += `\n** MAIN TITLE: "${titleItem.content}" **
- Display prominently at the top of the diagram
- Apply ${currentDeco?.prompt || "bold"} decoration
- Size: ${currentSize?.prompt || "large"}\n`;
    }

    if (badgeItem) {
      prompt += `\n** BADGE/LABEL: "${badgeItem.content}" **
- Small accent badge near the title
- Use accent color background with white text\n`;
    }

    if (contentItems.length > 0) {
      prompt += `\n** DIAGRAM CONTENT ITEMS: **\n`;
      contentItems.forEach((item, idx) => {
        prompt += `[${idx + 1}] Role: ${item.role} | Text: "${item.content}"\n`;
      });
      prompt += `- Render ALL items above as part of the ${currentDiagram?.id || "list"} diagram\n`;
      prompt += `- Each item should be visually distinct and easy to read\n`;
    }

    if (summaryItem) {
      prompt += `\n** SUMMARY/FOOTER: "${summaryItem.content}" **
- Display at the bottom of the diagram\n`;
    }

    if (ctaItem) {
      prompt += `\n** CTA: "${ctaItem.content}" **
- Small text at the very bottom\n`;
    }

    // Character
    if (useCharacter) {
      const cSize = CHAR_SIZES.find((s) => s.id === charSize);
      const cPos = CHAR_POSITIONS.find((p) => p.id === charPosition);
      prompt += `\n=== CHARACTER ===
- Position: ${cPos?.name || "bottom-left"} corner of the image
- Size: ${cSize?.prompt || "small"}
- Expression/Pose: ${charExpression || "smiling"}
`;
      if (charSource === "generate" && charDesc) {
        prompt += `- Character description: ${charDesc}\n`;
      }
      if (charSource === "upload") {
        prompt += `- IMPORTANT: Match the uploaded character image EXACTLY. Same hair, outfit, proportions.\n`;
      }
      if (useBubble && bubbleText) {
        prompt += `- Speech bubble saying: "${bubbleText}"\n`;
      }
    }

    // Reference images
    const hasRefs = tasteRef1 || tasteRef2 || layoutRef || contentRef1 || contentRef2;
    if (hasRefs) {
      prompt += `\n=== STYLE REFERENCE ===
I have uploaded reference image(s). Match the visual style, color palette, composition, and artistic technique shown in the reference(s).\n`;
    }

    // Must-use image
    if (mustUseImage) {
      prompt += `\n=== MUST-USE IMAGE (CRITICAL) ===
I have uploaded a product/service image that MUST be prominently displayed in the diagram.
- This image MUST appear clearly and prominently in the generated diagram
- Do NOT modify, distort, or obscure this image
- Integrate it naturally as a key visual element of the diagram layout
- The image should be easily recognizable and visually prominent
- Position it where it has the most visual impact within the diagram\n`;
    }

    prompt += `
=== CRITICAL RULES ===
1. ALL text must be rendered in the image EXACTLY as provided. Do NOT omit, change, or summarize any text.
2. Text must be clear, legible, and properly sized.
3. The diagram must be visually appealing and professional.
4. Use the specified color palette prominently — distribute accent colors across the diagram for visual variety.
5. Maintain proper visual hierarchy: title > content items > summary.
6. Icons and visual elements should enhance understanding.
`;

    return prompt;
  }, [textItems, showTextInImage, taste, mainColor, colorPattern, selectedPalette, fontStyle, titleDecoration, textSize, bgType, aspectRatio, diagramType, useCharacter, charSource, charDesc, charSize, charPosition, charExpression, useBubble, bubbleText, tasteRef1, tasteRef2, layoutRef, contentRef1, contentRef2, mustUseImage]);

  // ============================================================
  // Image Generation
  // ============================================================
  const handleGenerate = async (overrideTaste = null) => {
    if (!apiKey) { setGenerateError("APIキーを設定してください"); return; }
    if (textItems.length === 0) { setGenerateError("テキストがありません。AI分析を実行してください"); return; }

    setIsGenerating(true);
    setGenerateError("");

    try {
      const prompt = buildPrompt(overrideTaste);

      // Collect reference images
      const refImages = [];
      if (tasteRef1) refImages.push(tasteRef1);
      if (tasteRef2) refImages.push(tasteRef2);
      if (layoutRef) refImages.push(layoutRef);
      if (contentRef1) refImages.push(contentRef1);
      if (contentRef2) refImages.push(contentRef2);
      if (useCharacter && charSource === "upload" && charImage) refImages.push(charImage);
      if (mustUseImage) refImages.push(mustUseImage);

      let imageDataUrl;
      if (refImages.length > 0) {
        imageDataUrl = await generateImageWithReferences(apiKey, prompt, refImages, aspectRatio);
      } else {
        imageDataUrl = await generateImage(apiKey, prompt, aspectRatio);
      }

      if (overrideTaste) {
        setGeneratedImages((prev) => [...prev, { taste: overrideTaste, image: imageDataUrl }]);
      } else {
        setGeneratedImages((prev) => [...prev, { taste, image: imageDataUrl }]);
        setSelectedImageIndex(generatedImages.length);
      }
    } catch (err) {
      setGenerateError(`生成エラー: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVariationGenerate = async () => {
    if (variationTastes.length === 0) return;
    batchCancelRef.current = false;

    for (const t of variationTastes) {
      if (batchCancelRef.current) break;
      await handleGenerate(t);
      await new Promise((r) => setTimeout(r, 2000));
    }
  };

  // --- Download ---
  const downloadImage = (index) => {
    const item = generatedImages[index];
    if (!item) return;
    const link = document.createElement("a");
    link.download = `zukai_${item.taste}_${index + 1}.png`;
    link.href = item.image;
    link.click();
  };

  const downloadAllAsZip = async () => {
    if (generatedImages.length === 0) return;
    const zip = new JSZip();
    generatedImages.forEach((item, idx) => {
      const base64 = item.image.split(",")[1];
      zip.file(`zukai_${item.taste}_${idx + 1}.png`, base64, { base64: true });
    });
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "zukai_images.zip");
  };

  const deleteImage = (index) => {
    setGeneratedImages((prev) => prev.filter((_, i) => i !== index));
    if (selectedImageIndex >= index && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  // ============================================================
  // File input ref
  // ============================================================
  const fileInputRef = useRef(null);

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Layout size={18} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-800">ZukaiMaker</h1>
            <span className="text-xs text-gray-400 ml-1">AI図解作成ツール</span>
          </div>
          <button onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors text-sm">
            <Settings size={16} />
            <span>API設定</span>
          </button>
        </div>
        {showApiKeyInput && (
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
            <div className="max-w-[1800px] mx-auto flex items-center gap-3">
              <label className="text-sm text-gray-600 whitespace-nowrap">Gemini API Key:</label>
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="flex-1 max-w-md text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              {apiKey && <Check size={16} className="text-green-500" />}
            </div>
          </div>
        )}
      </header>

      {/* ===== MAIN LAYOUT ===== */}
      <div className="max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">

        {/* ===== LEFT: Input & AI ===== */}
        <div className="lg:col-span-3 space-y-4">
          {/* Input Method */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <FileText size={16} className="text-indigo-500" />
              テキスト入力
              <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">STEP 1</span>
            </h2>

            {/* Input method tabs */}
            <div className="flex gap-1 mb-3">
              {[
                { id: "text", icon: Type, label: "テキスト" },
                { id: "url", icon: Link, label: "URL" },
                { id: "file", icon: Upload, label: "ファイル" },
                { id: "keyword", icon: Wand2, label: "キーワード" },
              ].map(({ id, icon: Icon, label }) => (
                <button key={id} onClick={() => setInputMethod(id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${inputMethod === id ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>

            {/* Input fields */}
            {inputMethod === "text" && (
              <textarea value={inputText} onChange={(e) => setInputText(e.target.value)}
                placeholder="図解にしたいテキストを入力してください..."
                className="w-full h-40 text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            )}
            {inputMethod === "url" && (
              <input type="url" value={inputUrl} onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            )}
            {inputMethod === "file" && (
              <div>
                <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleFileUpload} />
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg py-6 text-center text-gray-400 hover:border-indigo-400 hover:text-indigo-400 transition-colors">
                  <Upload size={24} className="mx-auto mb-1" />
                  <span className="text-sm">PDF / 画像をアップロード</span>
                </button>
              </div>
            )}
            {inputMethod === "keyword" && (
              <input type="text" value={inputKeyword} onChange={(e) => setInputKeyword(e.target.value)}
                placeholder="例: 副業で月5万円稼ぐ方法"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            )}

          </div>

          {/* Diagram Type - STEP 2: 先に選んでからAI分析 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Layout size={16} className="text-indigo-500" />
              図解タイプ
              <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">STEP 2</span>
            </h2>
            <p className="text-[10px] text-gray-400 mb-2">タイプに応じたテキストをAIが生成します</p>
            <div className="grid grid-cols-2 gap-1.5">
              {DIAGRAM_TYPES.map((dt) => (
                <button key={dt.id} onClick={() => setDiagramType(dt.id)}
                  className={`text-left px-2.5 py-2 rounded-lg text-xs transition-colors border
                    ${diagramType === dt.id ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50"}`}>
                  <div className="font-medium">{dt.name}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{dt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Analyze Button - STEP 3 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-500" />
              AI構成
              <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">STEP 3</span>
            </h2>
            <button onClick={handleAnalyze} disabled={isAnalyzing}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all">
              {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {isAnalyzing ? "AI分析中..." : "AI分析 & テキスト生成"}
            </button>
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">
              「{DIAGRAM_TYPES.find((d) => d.id === diagramType)?.name}」用のテキストを生成
            </p>

            {analysisError && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                <AlertCircle size={12} /> {analysisError}
              </p>
            )}
          </div>
        </div>

        {/* ===== CENTER: Text Items ===== */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Type size={16} className="text-indigo-500" />
                テキスト一覧
                {textItems.length > 0 && (
                  <span className="text-xs font-normal text-gray-400">({textItems.length}件)</span>
                )}
              </h2>
              <button onClick={addTextItem}
                className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                <Plus size={14} /> 追加
              </button>
            </div>

            {/* 全体ON/OFFスイッチ */}
            {textItems.length > 0 && (
              <div className={`flex items-center justify-between mb-3 p-2.5 rounded-lg border transition-colors ${showTextInImage ? "bg-indigo-50 border-indigo-200" : "bg-orange-50 border-orange-200"}`}>
                <span className="text-xs font-medium text-gray-700">テキストを画像に反映</span>
                <button onClick={() => setShowTextInImage(!showTextInImage)}>
                  {showTextInImage ? (
                    <ToggleRight size={24} className="text-indigo-500" />
                  ) : (
                    <ToggleLeft size={24} className="text-orange-400" />
                  )}
                </button>
              </div>
            )}
            {textItems.length > 0 && !showTextInImage && (
              <p className="text-xs text-orange-500 mb-2">※ OFFのため、テキストは画像に反映されません</p>
            )}

            {textItems.length === 0 ? (
              <div className="text-center py-12 text-gray-300">
                <Type size={32} className="mx-auto mb-2" />
                <p className="text-sm">左のパネルでテキストを入力し</p>
                <p className="text-sm">「AI分析」を実行してください</p>
              </div>
            ) : (
              <div>
                {/* Matrix: 2x2 grid wrapper */}
                {diagramType === "matrix" && groupTextItems(textItems).filter((g) => g.type === "group").length === 4 ? (
                  <div className="space-y-1.5">
                    {/* Header */}
                    {groupTextItems(textItems).filter((g) => g.type === "header").map((g) => (
                      <div key="header" className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg px-3 py-2.5">
                        {g.items.map((item) => (
                          <InlineField key={item.id} item={item} onEdit={editTextItem} onDelete={deleteTextItem} compact={item.id === "badge"} />
                        ))}
                      </div>
                    ))}
                    {/* 2x2 Grid */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {groupTextItems(textItems).filter((g) => g.type === "group").map((group) => {
                        const num = Number(group.num);
                        const vis = DIAGRAM_VISUALS.matrix;
                        const titleItem = group.items.find((i) => i.id.endsWith("_title"));
                        const otherItems = group.items.filter((i) => i !== titleItem);
                        return (
                          <div key={`group-${group.num}`} className={`border rounded-lg p-2 ${vis.accent}`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              {vis.badge(num, 4)}
                              {titleItem && <InlineField item={titleItem} onEdit={editTextItem} onDelete={deleteTextItem} compact hideRole />}
                            </div>
                            <div className={`space-y-0.5 pl-1.5 border-l-2 ${vis.borderL}`}>
                              {otherItems.map((item) => (
                                <InlineField key={item.id} item={item} onEdit={editTextItem} onDelete={deleteTextItem} compact />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Footer */}
                    {groupTextItems(textItems).filter((g) => g.type === "footer").map((g) => (
                      <div key="footer" className="bg-gray-50 border border-dashed border-gray-300 rounded-lg px-3 py-2 mt-1">
                        {g.items.map((item) => (
                          <InlineField key={item.id} item={item} onEdit={editTextItem} onDelete={deleteTextItem} compact />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <DiagramTextList textItems={textItems} diagramType={diagramType} onEdit={editTextItem} onDelete={deleteTextItem} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== RIGHT: Visual Settings & Output ===== */}
        <div className="lg:col-span-5 space-y-4">
          {/* Taste */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Palette size={16} className="text-indigo-500" />
              テイスト
            </h2>
            <div className="grid grid-cols-2 gap-1.5">
              {TASTES.map((t) => (
                <button key={t.id} onClick={() => handleTasteChange(t.id)}
                  className={`text-left px-2.5 py-2 rounded-lg text-xs transition-colors border
                    ${taste === t.id ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50"}`}>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Color & Text Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
            {/* Color Palette */}
            <div>
              <h3 className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                <Palette size={14} /> カラーパレット
              </h3>
              {/* Pattern mode selector */}
              <div className="flex gap-1 mb-2 flex-wrap">
                {COLOR_PATTERNS.map((p) => (
                  <button key={p.id} onClick={() => { setColorPattern(p.id); if (p.id !== "preset") setSelectedPalette(""); }}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors border
                      ${colorPattern === p.id ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"}`}
                    title={p.desc}>
                    {p.name}
                  </button>
                ))}
              </div>

              {/* Main color picker (for non-preset modes) */}
              {colorPattern !== "preset" && (
                <div className="flex items-center gap-2">
                  <input type="color" value={mainColor} onChange={(e) => setMainColor(e.target.value)}
                    className="w-10 h-8 rounded border border-gray-200 cursor-pointer" />
                  <input type="text" value={mainColor} onChange={(e) => setMainColor(e.target.value)}
                    className="w-24 text-xs border border-gray-200 rounded px-2 py-1 font-mono" />
                  <div className="flex gap-1 ml-2">
                    {generateColorPalette(mainColor, colorPattern, selectedPalette).colors.map((c, i) => (
                      <div key={i} className="w-6 h-6 rounded border border-gray-200" style={{ backgroundColor: c }} title={c} />
                    ))}
                  </div>
                </div>
              )}

              {/* Curated palette grid (for preset mode) */}
              {colorPattern === "preset" && (
                <div className="space-y-2">
                  {["warm", "cool", "pastel", "bold", "business"].map((cat) => {
                    const catNames = { warm: "ウォーム", cool: "クール", pastel: "パステル", bold: "ビビッド", business: "ビジネス" };
                    const palettes = CURATED_PALETTES.filter(p => p.category === cat);
                    return (
                      <div key={cat}>
                        <span className="text-[10px] text-gray-400 font-medium">{catNames[cat]}</span>
                        <div className="grid grid-cols-2 gap-1.5 mt-1">
                          {palettes.map((p) => (
                            <button key={p.id}
                              onClick={() => { setSelectedPalette(p.id); setMainColor(p.colors[0]); }}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-left
                                ${selectedPalette === p.id ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200" : "border-gray-100 hover:border-gray-300 bg-white"}`}>
                              <div className="flex gap-0.5 flex-shrink-0">
                                {p.colors.map((c, i) => (
                                  <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: c }} />
                                ))}
                              </div>
                              <span className="text-[10px] text-gray-600 truncate">{p.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {/* Active palette preview */}
                  {selectedPalette && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 rounded-lg">
                      <span className="text-[10px] text-gray-500">選択中:</span>
                      <div className="flex gap-1">
                        {generateColorPalette(mainColor, colorPattern, selectedPalette).colors.map((c, i) => (
                          <div key={i} className="w-7 h-7 rounded border border-gray-200" style={{ backgroundColor: c }} title={c} />
                        ))}
                      </div>
                      <span className="text-[10px] font-medium text-gray-700">{CURATED_PALETTES.find(p => p.id === selectedPalette)?.name}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Font Style */}
            <div>
              <h3 className="text-xs font-bold text-gray-600 mb-2">テキストの種類</h3>
              <div className="flex gap-1.5">
                {FONT_STYLES.map((f) => (
                  <button key={f.id} onClick={() => setFontStyle(f.id)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border
                      ${fontStyle === f.id ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"}`}>
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Title Decoration */}
            <div>
              <h3 className="text-xs font-bold text-gray-600 mb-2">テキスト装飾</h3>
              <div className="grid grid-cols-3 gap-1.5">
                {TITLE_DECORATIONS.map((d) => (
                  <button key={d.id} onClick={() => setTitleDecoration(d.id)}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-colors border
                      ${titleDecoration === d.id ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"}`}>
                    {d.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Size */}
            <div>
              <h3 className="text-xs font-bold text-gray-600 mb-2">テキスト大きさ</h3>
              <div className="flex gap-1.5">
                {TEXT_SIZES.map((s) => (
                  <button key={s.id} onClick={() => setTextSize(s.id)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border
                      ${textSize === s.id ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"}`}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Background */}
            <div>
              <h3 className="text-xs font-bold text-gray-600 mb-2">背景タイプ</h3>
              <div className="flex gap-1.5 flex-wrap">
                {BG_TYPES.map((b) => (
                  <button key={b.id} onClick={() => setBgType(b.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border
                      ${bgType === b.id ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"}`}>
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <h3 className="text-xs font-bold text-gray-600 mb-2">アスペクト比</h3>
              <div className="flex gap-1.5">
                {ASPECT_RATIOS.map((ar) => (
                  <button key={ar.id} onClick={() => setAspectRatio(ar.id)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border
                      ${aspectRatio === ar.id ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"}`}>
                    <div>{ar.name}</div>
                    <div className="text-[10px] text-gray-400">{ar.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Character Settings (Collapsible) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <button onClick={() => setShowCharSection(!showCharSection)}
              className="w-full px-4 py-3 flex items-center justify-between text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors rounded-xl">
              <span className="flex items-center gap-2">
                <User size={16} className="text-indigo-500" />
                キャラ設定
                {useCharacter && <span className="text-xs font-normal text-green-500 bg-green-50 px-1.5 py-0.5 rounded">ON</span>}
              </span>
              {showCharSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showCharSection && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                {/* Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">キャラクターを使用</span>
                  <button onClick={() => setUseCharacter(!useCharacter)}>
                    {useCharacter ? <ToggleRight size={24} className="text-indigo-500" /> : <ToggleLeft size={24} className="text-gray-300" />}
                  </button>
                </div>

                {useCharacter && (
                  <>
                    {/* Source */}
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">ソース</h4>
                      <div className="flex gap-1.5">
                        <button onClick={() => setCharSource("generate")}
                          className={`flex-1 py-1.5 rounded text-xs border ${charSource === "generate" ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-100 text-gray-500"}`}>
                          AI生成
                        </button>
                        <button onClick={() => setCharSource("upload")}
                          className={`flex-1 py-1.5 rounded text-xs border ${charSource === "upload" ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-100 text-gray-500"}`}>
                          アップロード
                        </button>
                      </div>
                    </div>

                    {charSource === "generate" ? (
                      <textarea value={charDesc} onChange={(e) => setCharDesc(e.target.value)}
                        placeholder="キャラの外見を説明... 例: 茶髪ショートの女の子、白いシャツ"
                        className="w-full text-xs border border-gray-200 rounded-lg p-2 h-16 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                    ) : (
                      <MiniImageUpload label="キャラ画像" value={charImage}
                        onChange={(v) => setCharImage(v)} onClear={() => setCharImage("")} />
                    )}

                    {/* Size */}
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">サイズ</h4>
                      <div className="flex gap-1">
                        {CHAR_SIZES.map((s) => (
                          <button key={s.id} onClick={() => setCharSize(s.id)}
                            className={`flex-1 py-1 rounded text-xs border ${charSize === s.id ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-100 text-gray-500"}`}>
                            {s.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Position */}
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">配置</h4>
                      <div className="grid grid-cols-3 gap-1">
                        {CHAR_POSITIONS.map((p) => (
                          <button key={p.id} onClick={() => setCharPosition(p.id)}
                            className={`py-1 rounded text-xs border ${charPosition === p.id ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-100 text-gray-500"}`}>
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Expression */}
                    <input type="text" value={charExpression} onChange={(e) => setCharExpression(e.target.value)}
                      placeholder="表情・ポーズ: 笑顔で指さし"
                      className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400" />

                    {/* Bubble */}
                    <div className="flex items-center gap-2">
                      <button onClick={() => setUseBubble(!useBubble)}>
                        {useBubble ? <ToggleRight size={20} className="text-indigo-500" /> : <ToggleLeft size={20} className="text-gray-300" />}
                      </button>
                      <span className="text-xs text-gray-600">吹き出し</span>
                    </div>
                    {useBubble && (
                      <input type="text" value={bubbleText} onChange={(e) => setBubbleText(e.target.value)}
                        placeholder="吹き出しテキスト"
                        className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Reference Images (Collapsible) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <button onClick={() => setShowRefSection(!showRefSection)}
              className="w-full px-4 py-3 flex items-center justify-between text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors rounded-xl">
              <span className="flex items-center gap-2">
                <ImageIcon size={16} className="text-indigo-500" />
                参考イメージ
                {(tasteRef1 || tasteRef2 || layoutRef || contentRef1 || contentRef2) && (
                  <span className="text-xs font-normal text-green-500 bg-green-50 px-1.5 py-0.5 rounded">設定済</span>
                )}
              </span>
              {showRefSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showRefSection && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-1.5">テイスト参考 (最大2枚)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <MiniImageUpload label="参考1" value={tasteRef1} onChange={setTasteRef1} onClear={() => setTasteRef1("")} />
                    <MiniImageUpload label="参考2" value={tasteRef2} onChange={setTasteRef2} onClear={() => setTasteRef2("")} />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-1.5">レイアウト参考 (最大1枚)</h4>
                  <MiniImageUpload label="レイアウト" value={layoutRef} onChange={setLayoutRef} onClear={() => setLayoutRef("")} />
                </div>
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-1.5">コンテンツ参考 (最大2枚)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <MiniImageUpload label="コンテンツ1" value={contentRef1} onChange={setContentRef1} onClear={() => setContentRef1("")} />
                    <MiniImageUpload label="コンテンツ2" value={contentRef2} onChange={setContentRef2} onClear={() => setContentRef2("")} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Must-Use Image (Collapsible) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <button onClick={() => setShowMustUseSection(!showMustUseSection)}
              className="w-full px-4 py-3 flex items-center justify-between text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors rounded-xl">
              <span className="flex items-center gap-2">
                <ImageIcon size={16} className="text-orange-500" />
                必須画像（商品・サービス）
                {mustUseImage && <span className="text-xs font-normal text-green-500 bg-green-50 px-1.5 py-0.5 rounded">設定済</span>}
              </span>
              {showMustUseSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showMustUseSection && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                <p className="text-[10px] text-gray-400">図解に必ず表示したい画像（商品写真・サービス画像など）を設定できます</p>
                <MiniImageUpload label="必須画像をアップロード" value={mustUseImage}
                  onChange={setMustUseImage} onClear={() => setMustUseImage("")} />
                {mustUseImage && (
                  <p className="text-[10px] text-orange-500 flex items-center gap-1">
                    <AlertCircle size={10} />
                    この画像は生成される図解に必ず表示されます
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ===== OUTPUT ===== */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <ImageIcon size={16} className="text-indigo-500" />
              出力
            </h2>

            {/* Generate Buttons */}
            <div className="space-y-2 mb-4">
              <button onClick={() => handleGenerate()} disabled={isGenerating || textItems.length === 0}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all">
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isGenerating ? "生成中..." : "図解を生成"}
              </button>

              {/* Variation Mode */}
              <div className="border border-gray-100 rounded-lg p-2">
                <button onClick={() => setIsVariationMode(!isVariationMode)}
                  className="text-xs text-gray-500 hover:text-indigo-500 flex items-center gap-1 transition-colors w-full">
                  {isVariationMode ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  バリエーション一括生成
                </button>
                {isVariationMode && (
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-1">
                      {TASTES.map((t) => (
                        <label key={t.id} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                          <input type="checkbox" checked={variationTastes.includes(t.id)}
                            onChange={(e) => {
                              if (e.target.checked) setVariationTastes([...variationTastes, t.id]);
                              else setVariationTastes(variationTastes.filter((v) => v !== t.id));
                            }}
                            className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-400" />
                          {t.name}
                        </label>
                      ))}
                    </div>
                    <button onClick={handleVariationGenerate}
                      disabled={isGenerating || variationTastes.length === 0}
                      className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white text-xs font-medium py-2 rounded-lg flex items-center justify-center gap-1 transition-colors">
                      <Package size={12} />
                      {variationTastes.length}件のバリエーションを生成
                    </button>
                  </div>
                )}
              </div>
            </div>

            {generateError && (
              <p className="text-xs text-red-500 mb-3 flex items-center gap-1">
                <AlertCircle size={12} /> {generateError}
              </p>
            )}

            {/* Generated Images */}
            {generatedImages.length > 0 && (
              <div className="space-y-3">
                {/* Thumbnails */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {generatedImages.map((item, idx) => (
                    <button key={idx} onClick={() => setSelectedImageIndex(idx)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors
                        ${selectedImageIndex === idx ? "border-indigo-500" : "border-gray-200 hover:border-gray-400"}`}>
                      <img src={item.image} alt={`Generated ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>

                {/* Selected Image Preview */}
                {generatedImages[selectedImageIndex] && (
                  <div>
                    <img src={generatedImages[selectedImageIndex].image} alt="Preview"
                      className="w-full rounded-lg border border-gray-200" />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => downloadImage(selectedImageIndex)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium py-2 rounded-lg flex items-center justify-center gap-1 transition-colors">
                        <Download size={14} /> ダウンロード
                      </button>
                      <button onClick={() => handleGenerate()}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium py-2 rounded-lg flex items-center justify-center gap-1 transition-colors">
                        <RefreshCw size={14} /> 再生成
                      </button>
                      <button onClick={() => deleteImage(selectedImageIndex)}
                        className="bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 text-xs font-medium py-2 px-3 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Batch Download */}
                {generatedImages.length > 1 && (
                  <button onClick={downloadAllAsZip}
                    className="w-full bg-gray-800 hover:bg-gray-900 text-white text-xs font-medium py-2 rounded-lg flex items-center justify-center gap-1 transition-colors">
                    <Package size={14} /> 全{generatedImages.length}枚をZIPダウンロード
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
