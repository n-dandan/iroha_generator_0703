// ===================================================
// いろは — logic.js
// 純粋 JS ロジック（JSX なし）
// config.js / font-list.js の後に読み込む
// ===================================================

// ── config.js から取得 ───────────────────────────────
// APIキー・プロンプト・スキーマはすべてバックエンド（api/generate.php）側に隠蔽。
// フロントは API_URL に入力値を POST するだけ。
const { API_URL } = window.IROHA_CONFIG;
const FONT_LIST = window.FONT_LIST;

// ── 定数 ─────────────────────────────────────────────
const MAIN_COLORS = [
  { key: "red",      label: "赤",        hint: "#d8453c" },
  { key: "orange",   label: "オレンジ",  hint: "#e8843c" },
  { key: "yellow",   label: "黄",        hint: "#e8c23c" },
  { key: "green",    label: "緑",        hint: "#4ca85f" },
  { key: "blue",     label: "青",        hint: "#3c6fe8" },
  { key: "purple",   label: "紫",        hint: "#8a5ce8" },
  { key: "monotone", label: "モノクロ",      hint: "#5a6271" },
];

const TONE_AXES = [
  { key: "form",   left: "やわらか",   right: "かっちり" },
  { key: "era",    left: "クラシック", right: "モダン" },
  { key: "energy", left: "にぎやか",   right: "静か" },
  { key: "class",  left: "カジュアル", right: "ラグジュアリー" },
];

const ROLE_LABELS = {
  primary: "Primary", secondary: "Secondary",
  accent: "Accent", base: "Base", text: "Text",
};

// ── 色ユーティリティ ──────────────────────────────────
const C = {
  hexToRGB(hex) {
    const h = hex.replace("#", "");
    return {
      r: parseInt(h.slice(0,2),16),
      g: parseInt(h.slice(2,4),16),
      b: parseInt(h.slice(4,6),16),
    };
  },
  hexToHSL(hex) {
    let {r,g,b} = C.hexToRGB(hex);
    r/=255; g/=255; b/=255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b);
    let h,s,l=(max+min)/2;
    if(max===min){ h=s=0; }
    else{
      const d=max-min;
      s=l>0.5?d/(2-max-min):d/(max+min);
      switch(max){
        case r: h=((g-b)/d+(g<b?6:0))/6; break;
        case g: h=((b-r)/d+2)/6; break;
        case b: h=((r-g)/d+4)/6; break;
      }
    }
    return {h:h*360,s:s*100,l:l*100};
  },
  hslToHex(h,s,l){
    s/=100; l/=100;
    const a=s*Math.min(l,1-l);
    const f=n=>{const k=(n+h/30)%12;const c=l-a*Math.max(-1,Math.min(k-3,9-k,1));return Math.round(255*c).toString(16).padStart(2,"0");};
    return `#${f(0)}${f(8)}${f(4)}`;
  },
  rgbToCMYK(r,g,b){
    const r1=r/255,g1=g/255,b1=b/255;
    const k=1-Math.max(r1,g1,b1);
    if(k===1) return {c:0,m:0,y:0,k:100};
    return {
      c:Math.round((1-r1-k)/(1-k)*100),
      m:Math.round((1-g1-k)/(1-k)*100),
      y:Math.round((1-b1-k)/(1-k)*100),
      k:Math.round(k*100),
    };
  },
  lum(hex){
    const {r,g,b}=C.hexToRGB(hex);
    const [rs,gs,bs]=[r,g,b].map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});
    return 0.2126*rs+0.7152*gs+0.0722*bs;
  },
  contrast(a,b){
    const la=C.lum(a),lb=C.lum(b);
    return (Math.max(la,lb)+0.05)/(Math.min(la,lb)+0.05);
  },
  textOn(bg){return C.lum(bg)>0.4?"#20242f":"#ffffff";},
  valid(h){return /^#[0-9A-Fa-f]{6}$/.test(h);},
};

// ── フォント動的ロード ────────────────────────────────
const dynLoaded = new Set();
function loadFont(family, weights=[400,700]) {
  if (dynLoaded.has(family)) return;
  dynLoaded.add(family);
  const w = weights.join(";");
  const href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g,"+")}:wght@${w}&display=swap`;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

// ── guardPalette（Gemini出力検証） ───────────────────
function guardPalette(palette) {
  const roles = ["primary","secondary","accent","base","text"];
  const result = [...(palette||[])];
  roles.forEach(role => {
    if (!result.find(p=>p.role===role)) {
      result.push({hex:"#888888",role,name:role});
    }
  });
  const validResult = result.map(p=>({...p, hex: C.valid(p.hex)?p.hex:"#888888"}));
  // コントラスト比チェック
  const base = validResult.find(p=>p.role==="base");
  const text = validResult.find(p=>p.role==="text");
  if (base && text) {
    const ratio = C.contrast(base.hex, text.hex);
    if (ratio < 4.5) {
      const baseLum = C.lum(base.hex);
      const {h,s} = C.hexToHSL(text.hex);
      text.hex = baseLum > 0.4 ? C.hslToHex(h,s,18) : C.hslToHex(h,s,92);
    }
  }
  return validResult;
}

// ── resolveFont（フォント検証） ──────────────────────
function resolveFont(family, weight, preferJp=false) {
  const found = FONT_LIST.find(f=>f.family.toLowerCase()===family?.toLowerCase());
  if (!found) {
    const fb = preferJp ? FONT_LIST.find(f=>f.subset==="jp") : FONT_LIST[0];
    return {font: fb, weight: fb.weights[0]};
  }
  const nearest = found.weights.reduce((a,b)=>Math.abs(b-weight)<Math.abs(a-weight)?b:a, found.weights[0]);
  return {font: found, weight: nearest};
}

// ── CSS変数動的適用 ───────────────────────────────────
function applyToCSS(palette) {
  const map = {primary:"--gen-primary",secondary:"--gen-secondary",accent:"--gen-accent",base:"--gen-base",text:"--gen-text"};
  palette.forEach(p=>document.documentElement.style.setProperty(map[p.role], p.hex));
}

// ── クリップボードコピー ──────────────────────────────
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { return false; }
}

// ── メインカラー key → ラベル（UI 表示用に保持） ─────
function mainColorLabel(key) {
  return MAIN_COLORS.find(c=>c.key===key)?.label || "";
}

// ── バックエンド呼び出し ──────────────────────────────
// 入力値だけを api/generate.php に POST する。
// APIキー・プロンプト・スキーマはバックエンド側にあり、フロントには露出しない。
async function callGenerate(input) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mainColor: input.mainColor,
      tone:      input.tone,
      purpose:   input.purpose,
      fontMode:  input.fontMode,
      langMode:  input.langMode,
      free:      input.free,
    }),
  });

  let json = null;
  try { json = await res.json(); } catch { /* パース不能はステータスで判定 */ }

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error?.message || `APIエラー HTTP ${res.status}`);
  }
  return json.data.proposals;
}

async function generate(input) {
  // バックエンドから生の proposals（2案）を受け取り、
  // フロント側で配色・フォントを検証・補正してからUIに渡す。
  const rawProposals = await callGenerate(input);

  const proposals = rawProposals.map(p => {
    const palette = guardPalette(p.palette);
    const needJp = input.langMode === "jp_only";
    const {font: hFont, weight: hW} = resolveFont(p.fontPairing.heading.family, p.fontPairing.heading.weight, needJp);
    let {font: bFont, weight: bW} = resolveFont(p.fontPairing.body.family, p.fontPairing.body.weight, needJp);
    if (input.fontMode === "single") { bFont = hFont; bW = hW; }
    loadFont(hFont.family, hFont.weights);
    if (bFont.family !== hFont.family) loadFont(bFont.family, bFont.weights);
    return {
      ...p,
      palette,
      fontPairing: {
        heading: {family:hFont.family, weight:hW, subset:hFont.subset, category:hFont.category},
        body:    {family:bFont.family, weight:bW, subset:bFont.subset, category:bFont.category},
      },
    };
  });
  return proposals;
}

// ── 定型文プロンプト生成（AI不使用） ─────────────────
function buildDesignPrompt(color, font, purpose) {
  const roleJa = {primary:"メイン",secondary:"サブ",accent:"アクセント",base:"背景",text:"文字"};
  const hexes = color.palette.map(p=>`${roleJa[p.role]}=${p.hex}`).join(", ");
  const kind = purpose==="print" ? "チラシ／印刷物" : "Webサイト";
  return [
    `次の配色とフォントで${kind}のデザイン案を作成してください。`,
    `配色: ${hexes}`,
    `見出しフォント（${font.heading.subset==="jp"?"和文":"欧文"}）: ${font.heading.family} (${font.heading.weight})`,
    `本文フォント（${font.body.subset==="jp"?"和文":"欧文"}）: ${font.body.family} (${font.body.weight})`,
    `メインカラーを主役、アクセントをポイント、背景色を地色、文字色をテキストに使ってください。`,
  ].join("\n");
}

// ── 状態管理 useReducer ──────────────────────────────

// 生成 reducer
const genInitial = {status:"idle", proposals:[], selectedIndex:null, error:null};
function genReducer(state, action) {
  switch(action.type) {
    case "GENERATE_START":   return {...state, status:"loading", error:null, selectedIndex:null};
    case "GENERATE_SUCCESS": return {...state, status:"ready", proposals:action.proposals};
    case "GENERATE_ERROR":   return {...state, status:"error", error:action.error};
    case "SELECT":           return {...state, selectedIndex:action.index};
    case "RESET":            return genInitial;
    default: return state;
  }
}

// お気に入り reducer
const favInitial = {colors:[], fonts:[], selColorId:null, selFontId:null};
function favReducer(state, action) {
  switch(action.type) {
    case "HYDRATE": return {...state, ...action.payload};
    case "ADD_COLOR": {
      if (state.colors.find(c=>c.id===action.item.id)) return state;
      const colors = [action.item, ...state.colors].slice(0,10);
      return {...state, colors, selColorId: state.selColorId || action.item.id};
    }
    case "REMOVE_COLOR": {
      const colors = state.colors.filter(c=>c.id!==action.id);
      return {...state, colors, selColorId: state.selColorId===action.id ? (colors[0]?.id||null) : state.selColorId};
    }
    case "SELECT_COLOR": return {...state, selColorId:action.id};
    case "ADD_FONT": {
      if (state.fonts.find(f=>f.id===action.item.id)) return state;
      const fonts = [action.item, ...state.fonts].slice(0,10);
      return {...state, fonts, selFontId: state.selFontId || action.item.id};
    }
    case "REMOVE_FONT": {
      const fonts = state.fonts.filter(f=>f.id!==action.id);
      return {...state, fonts, selFontId: state.selFontId===action.id ? (fonts[0]?.id||null) : state.selFontId};
    }
    case "SELECT_FONT": return {...state, selFontId:action.id};
    default: return state;
  }
}
