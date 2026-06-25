// ===================================================
// いろは — app.js
// React コンポーネント（JSX）
// logic.js の後に type="text/babel" で読み込む
// ===================================================

const { useState, useReducer, useEffect, useRef, useCallback } = React;

// ── トーストフック ───────────────────────────────────
function useToast() {
  const [toast, setToast] = useState({msg:"",show:false});
  const timerRef = useRef(null);
  const showToast = useCallback(msg=>{
    clearTimeout(timerRef.current);
    setToast({msg,show:true});
    timerRef.current = setTimeout(()=>setToast(t=>({...t,show:false})),2000);
  },[]);
  return {toast, showToast};
}

// ── ToneSlider コンポーネント ─────────────────────────
function ToneSlider({axis, value, onChange}) {
  const trackRef = useRef(null);
  const thumbPercent = value===-1 ? 4 : value===0 ? 50 : 96;

  function handleClick(e) {
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    if (ratio < 0.33) onChange(-1);
    else if (ratio < 0.67) onChange(0);
    else onChange(1);
  }

  return (
    <div className="tone-axis">
      <div className="tone-axis-labels">
        <span>{axis.left}</span>
        <span>{axis.right}</span>
      </div>
      <div className="tone-track" ref={trackRef} onClick={handleClick}>
        <div className="tone-thumb" style={{left:`calc(${thumbPercent}% - 11px)`}} />
      </div>
    </div>
  );
}

// ── SitePreview コンポーネント ────────────────────────
function SitePreview({palette, fonts}) {
  const get = role => palette.find(p=>p.role===role)?.hex || "#888";
  const base=get("base"), text=get("text"), primary=get("primary"),
        secondary=get("secondary"), accent=get("accent");
  const textOnPrimary = C.textOn(primary);

  return (
    <div className="site-preview" style={{background:base}}>
      <nav className="site-nav" style={{borderBottomColor:`${text}18`}}>
        <span className="site-nav-logo" style={{color:primary, fontFamily:fonts.heading.family, fontWeight:fonts.heading.weight}}>
          いろは
        </span>
        <div className="site-nav-links">
          {["About","Work","Contact"].map(l=>(
            <span key={l} className="site-nav-link" style={{color:text, fontFamily:fonts.body.family}}>
              {l}
            </span>
          ))}
        </div>
      </nav>
      <div className="site-hero">
        <div className="site-accent-bar" style={{background:accent}} />
        <span className="site-hero-eyebrow" style={{background:`${primary}18`, color:primary, fontFamily:fonts.body.family}}>
          Design System
        </span>
        <h2 className="site-hero-heading" style={{color:text, fontFamily:fonts.heading.family, fontWeight:fonts.heading.weight}}>
          ブランドの世界観を<br/>色と文字で表現する
        </h2>
        <p className="site-hero-body" style={{color:secondary, fontFamily:fonts.body.family}}>
          このパレットとフォントがもたらす印象を確認してください。配色とタイポグラフィが一体となって、デザインの方向性を形づくります。
        </p>
        <div className="site-hero-cta">
          <span className="site-cta-btn" style={{background:primary, color:textOnPrimary, fontFamily:fonts.heading.family}}>
            詳しく見る
          </span>
          <span className="site-cta-secondary" style={{color:accent, fontFamily:fonts.body.family}}>
            事例を見る
          </span>
        </div>
      </div>
    </div>
  );
}

// ── FlyerPreview コンポーネント ───────────────────────
function FlyerPreview({palette, fonts}) {
  const get = role => palette.find(p=>p.role===role)?.hex || "#888";
  const base=get("base"), text=get("text"), primary=get("primary"),
        secondary=get("secondary"), accent=get("accent");
  const textOnPrimary = C.textOn(primary);

  return (
    <div className="flyer-preview" style={{background:base}}>
      <div className="flyer-header" style={{background:primary}}>
        <p className="flyer-header-label" style={{color:textOnPrimary, fontFamily:fonts.body.family}}>
          SPECIAL EVENT
        </p>
        <h2 className="flyer-title" style={{color:textOnPrimary, fontFamily:fonts.heading.family, fontWeight:fonts.heading.weight}}>
          季節のおしらせ
        </h2>
      </div>
      <div className="flyer-body">
        <p className="flyer-lead" style={{color:text, fontFamily:fonts.body.family}}>
          この配色とフォントで構成したチラシのイメージです。メインカラーを帯として使い、本文は読みやすい文字色で表示しています。
        </p>
        <div className="flyer-accent-line" style={{background:`${accent}18`}}>
          <span className="flyer-accent-dot" style={{background:accent}} />
          <span style={{color:accent, fontFamily:fonts.body.family, fontWeight:700}}>
            重要なポイントはここに
          </span>
        </div>
        <p style={{fontSize:".8rem", color:secondary, fontFamily:fonts.body.family}}>
          サブ情報・補足テキスト・問い合わせ先など
        </p>
      </div>
      <div className="flyer-footer" style={{borderTopColor:`${text}18`, color:secondary, fontFamily:fonts.body.family}}>
        お問い合わせ：info@example.com
      </div>
    </div>
  );
}

// ── Preview 共通部品 ──────────────────────────────────
function Preview({palette, fonts, purpose}) {
  if (!palette || !fonts) return null;
  const label = purpose==="print" ? "🖨 チラシ風プレビュー" : "🌐 Webサイト風プレビュー";
  return (
    <div className="preview-wrapper">
      <div className="preview-label">
        <span className="preview-label-dot" style={{background: palette.find(p=>p.role==="primary")?.hex||"#888"}} />
        {label}
      </div>
      {purpose==="print"
        ? <FlyerPreview palette={palette} fonts={fonts} />
        : <SitePreview  palette={palette} fonts={fonts} />
      }
    </div>
  );
}

// ── PaletteResult コンポーネント ─────────────────────
function PaletteResult({palette, purpose, onFavAdd, alreadyFav, showToast}) {
  function handleChipCopy(p) {
    const {r,g,b} = C.hexToRGB(p.hex);
    copyText(`${p.hex} / rgb(${r},${g},${b})`);
    showToast(`${p.name} (${p.hex}) をコピー`);
  }
  function handleAllCopy() {
    const hexes = palette.map(p=>p.hex).join(", ");
    copyText(hexes);
    showToast("5色をコピーしました");
  }
  function handleCssCopy() {
    const vars = palette.map(p=>`  --color-${p.role}: ${p.hex};`).join("\n");
    copyText(`:root {\n${vars}\n}`);
    showToast("CSS変数をコピーしました");
  }
  function handleCmykCopy() {
    const lines = palette.map(p=>{
      const {r,g,b}=C.hexToRGB(p.hex);
      const {c,m,y,k}=C.rgbToCMYK(r,g,b);
      return `${ROLE_LABELS[p.role]}: C${c} M${m} Y${y} K${k}`;
    }).join("\n");
    copyText(lines+"\n（参考値）");
    showToast("CMYK参考値をコピーしました");
  }

  return (
    <div>
      <div className="palette-chips">
        {palette.map(p => {
          const fg = C.textOn(p.hex);
          return (
            <div key={p.role} className="palette-chip" style={{background:p.hex, color:fg}}
              onClick={()=>handleChipCopy(p)} title="クリックでコピー">
              <span className="palette-chip-role">{ROLE_LABELS[p.role]}</span>
              <span className="palette-chip-name">{p.name}</span>
              <span className="palette-chip-hex">{p.hex}</span>
            </div>
          );
        })}
      </div>
      <div className="palette-actions">
        <button className="palette-action-btn" onClick={handleAllCopy}>📋 5色コピー</button>
        <button className="palette-action-btn" onClick={handleCssCopy}>⚙️ CSS変数</button>
        {purpose==="print" && (
          <button className="palette-action-btn" onClick={handleCmykCopy}>🖨 CMYK(参考)</button>
        )}
        <button className={`fav-add-btn${alreadyFav?" added":""}`} onClick={onFavAdd}>
          {alreadyFav ? "⭐ 登録済" : "☆ お気に入り"}
        </button>
      </div>
      {purpose==="print" && (
        <p style={{fontSize:".72rem",color:"var(--text-muted)",marginTop:8,lineHeight:1.6}}>
          ※ CMYK値は参考値です。モニタ環境により実際の印刷結果と異なります。
        </p>
      )}
    </div>
  );
}

// ── FontResult コンポーネント ─────────────────────────
function FontResult({fonts, fontMode, onFavAdd, alreadyFav, showToast}) {
  function handleNameCopy() {
    const heading = `見出し: ${fonts.heading.family} (${fonts.heading.weight})`;
    const body = fontMode==="single" ? "" : `\n本文: ${fonts.body.family} (${fonts.body.weight})`;
    copyText(heading+body);
    showToast("フォント名をコピーしました");
  }
  function handleCssCopy() {
    const hLine = `  --font-heading: "${fonts.heading.family}", sans-serif; /* weight: ${fonts.heading.weight} */`;
    const bLine = `  --font-body: "${fonts.body.family}", sans-serif; /* weight: ${fonts.body.weight} */`;
    copyText(`:root {\n${hLine}\n${fontMode!=="single"?bLine+"\n":""}}`.trim());
    showToast("フォントCSS変数をコピーしました");
  }

  const previewJp = "あいうえお、サンプルテキスト。";
  const previewEn = "The quick brown fox.";
  const previewBody = "配色とタイポグラフィが一体となって、デザインの世界観を形づくります。";

  return (
    <div>
      <div className="font-pair">
        <div className="font-card">
          <p className="font-card-role">見出し</p>
          <span className="font-card-pill">
            {fonts.heading.family}
            <span className="font-card-pill-dot" />
            {fonts.heading.weight}
          </span>
          <p className="font-preview-main"
            style={{fontFamily:fonts.heading.family, fontWeight:fonts.heading.weight}}>
            {previewJp}
          </p>
          {fonts.heading.subset!=="jp" && (
            <p className="font-preview-sub"
              style={{fontFamily:fonts.heading.family, fontWeight:fonts.heading.weight}}>
              {previewEn}
            </p>
          )}
          <p className="font-preview-body"
            style={{fontFamily:fonts.heading.family, fontWeight:fonts.heading.weight}}>
            {previewBody}
          </p>
          <p className="font-card-footer">{fonts.heading.category} · {fonts.heading.subset}</p>
        </div>
        {fontMode!=="single" && (
          <div className="font-card">
            <p className="font-card-role">本文</p>
            <span className="font-card-pill">
              {fonts.body.family}
              <span className="font-card-pill-dot" />
              {fonts.body.weight}
            </span>
            <p className="font-preview-main"
              style={{fontFamily:fonts.body.family, fontWeight:fonts.body.weight, fontSize:"1.4rem"}}>
              {previewJp}
            </p>
            <p className="font-preview-sub"
              style={{fontFamily:fonts.body.family, fontWeight:fonts.body.weight}}>
              {previewEn}
            </p>
            <p className="font-preview-body"
              style={{fontFamily:fonts.body.family, fontWeight:fonts.body.weight}}>
              {previewBody}
            </p>
            <p className="font-card-footer">{fonts.body.category} · {fonts.body.subset}</p>
          </div>
        )}
      </div>
      <div className="font-actions">
        <button className="palette-action-btn" onClick={handleNameCopy}>📋 フォント名コピー</button>
        <button className="palette-action-btn" onClick={handleCssCopy}>⚙️ CSS変数</button>
        <button className={`fav-add-btn${alreadyFav?" added":""}`} onClick={onFavAdd}>
          {alreadyFav ? "⭐ 登録済" : "☆ お気に入り"}
        </button>
      </div>
    </div>
  );
}

// ── Skeleton コンポーネント ───────────────────────────
function Skeleton() {
  return (
    <div className="skeleton-proposals">
      {[0,1].map(i=>(
        <div key={i} className="skeleton-card">
          <div className="sk sk-line" style={{width:"60%"}} />
          <div className="sk sk-line" style={{width:"85%"}} />
          <div className="skeleton-colors">
            {[0,1,2,3,4].map(j=>(
              <div key={j} className="sk skeleton-color" />
            ))}
          </div>
          <div className="sk sk-line" style={{width:"70%"}} />
          <div className="sk sk-line" style={{width:"50%"}} />
        </div>
      ))}
    </div>
  );
}

// ── FavWorkspace コンポーネント ───────────────────────
function FavWorkspace({favState, favDispatch, purpose, showToast}) {
  const {colors, fonts, selColorId, selFontId} = favState;
  const selColor = colors.find(c=>c.id===selColorId);
  const selFont  = fonts.find(f=>f.id===selFontId);

  function handlePromptCopy() {
    if (!selColor || !selFont) return;
    const txt = buildDesignPrompt(selColor, selFont, purpose);
    copyText(txt);
    showToast("プロンプトをコピーしました");
  }

  if (colors.length===0 && fonts.length===0) {
    return (
      <div className="fav-workspace-empty">
        <p style={{fontSize:"2rem",marginBottom:12}}>☆</p>
        <p>まだお気に入りがありません。</p>
        <p>提案の詳細画面から配色・フォントを登録してください。</p>
      </div>
    );
  }

  return (
    <div className="fav-workspace">
      <div className="fav-columns">
        <div className="fav-col">
          <p className="fav-col-title">配色 ({colors.length})</p>
          {colors.length===0
            ? <div className="fav-col-empty">提案から配色を登録</div>
            : colors.map(c=>(
              <div key={c.id} className={`fav-item${c.id===selColorId?" selected":""}`}
                onClick={()=>favDispatch({type:"SELECT_COLOR",id:c.id})}>
                <div className="fav-item-radio">
                  <div className="fav-item-radio-dot" />
                </div>
                <div className="fav-item-info">
                  <p className="fav-item-name">{c.theme}</p>
                  <div className="fav-item-swatches">
                    {c.palette.slice(0,5).map(p=>(
                      <div key={p.role} className="fav-item-swatch" style={{background:p.hex}} title={p.name} />
                    ))}
                  </div>
                </div>
                <button className="fav-delete-btn"
                  onClick={e=>{e.stopPropagation();favDispatch({type:"REMOVE_COLOR",id:c.id});}}>
                  ✕
                </button>
              </div>
            ))
          }
        </div>
        <div className="fav-mix-arrow">×</div>
        <div className="fav-col">
          <p className="fav-col-title">フォント ({fonts.length})</p>
          {fonts.length===0
            ? <div className="fav-col-empty">提案からフォントを登録</div>
            : fonts.map(f=>(
              <div key={f.id} className={`fav-item${f.id===selFontId?" selected":""}`}
                onClick={()=>favDispatch({type:"SELECT_FONT",id:f.id})}>
                <div className="fav-item-radio">
                  <div className="fav-item-radio-dot" />
                </div>
                <div className="fav-item-info">
                  <p className="fav-item-name">{f.heading.family}</p>
                  <p className="fav-item-sub">{f.body.family}</p>
                </div>
                <button className="fav-delete-btn"
                  onClick={e=>{e.stopPropagation();favDispatch({type:"REMOVE_FONT",id:f.id});}}>
                  ✕
                </button>
              </div>
            ))
          }
        </div>
      </div>

      {(selColor || selFont) && (
        <>
          {selColor && selFont ? (
            <Preview
              palette={selColor.palette}
              fonts={selFont}
              purpose={purpose}
            />
          ) : (
            <div className="fav-col-empty">配色とフォントを1つずつ選択するとプレビューが表示されます</div>
          )}

          {selColor && selFont && (
            <div className="prompt-copy-area">
              <p className="prompt-copy-label">Canva / Gemini などへのプロンプト</p>
              <pre className="prompt-text">{buildDesignPrompt(selColor, selFont, purpose)}</pre>
              <button className="prompt-copy-btn" onClick={handlePromptCopy}>
                📋 プロンプトをコピー
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── App メインコンポーネント ──────────────────────────
function App() {
  // 入力 useState
  const [mainColor, setMainColor] = useState(null);
  const [tone, setTone] = useState({form:0,era:0,energy:0,class:0});
  const [purpose, setPurpose] = useState("digital");
  const [fontMode, setFontMode] = useState("split");
  const [langMode, setLangMode] = useState("bilingual");
  const [free, setFree] = useState("");

  // 生成 useReducer
  const [genState, genDispatch] = useReducer(genReducer, genInitial);

  // お気に入り useReducer
  const [favState, favDispatch] = useReducer(favReducer, favInitial);

  // タブ
  const [activeTab, setActiveTab] = useState("proposal");

  // トースト
  const {toast, showToast} = useToast();

  // localStorage hydrate（お気に入り）
  useEffect(()=>{
    try {
      const colors = JSON.parse(localStorage.getItem("iroha-fav-colors")||"[]");
      const fonts  = JSON.parse(localStorage.getItem("iroha-fav-fonts")||"[]");
      const selColorId = colors[0]?.id || null;
      const selFontId  = fonts[0]?.id  || null;
      favDispatch({type:"HYDRATE", payload:{colors,fonts,selColorId,selFontId}});
    } catch{}
  },[]);

  // localStorage 保存
  useEffect(()=>{
    localStorage.setItem("iroha-fav-colors", JSON.stringify(favState.colors));
  },[favState.colors]);
  useEffect(()=>{
    localStorage.setItem("iroha-fav-fonts", JSON.stringify(favState.fonts));
  },[favState.fonts]);

  // 選択中案のCSS変数適用
  useEffect(()=>{
    if (genState.selectedIndex !== null && genState.proposals[genState.selectedIndex]) {
      applyToCSS(genState.proposals[genState.selectedIndex].palette);
    }
  },[genState.selectedIndex, genState.proposals]);

  // 生成実行
  async function handleGenerate() {
    genDispatch({type:"GENERATE_START"});
    try {
      const proposals = await generate({mainColor,tone,purpose,fontMode,langMode,free});
      genDispatch({type:"GENERATE_SUCCESS", proposals});
      if (proposals[0]) applyToCSS(proposals[0].palette);
    } catch(e) {
      genDispatch({type:"GENERATE_ERROR", error:e.message||"生成に失敗しました"});
    }
  }

  const selectedProposal = genState.selectedIndex !== null ? genState.proposals[genState.selectedIndex] : null;
  const favColorIds = new Set(favState.colors.map(c=>c.id));
  const favFontIds  = new Set(favState.fonts.map(f=>f.id));

  return (
    <>
      {/* ── ヘッダ ── */}
      <header className="header">
        <div className="header-logo">
          <span className="logo-text">いろは</span>
          <div className="logo-dot" />
        </div>
        <span className="header-tagline">AI 配色 & タイポジェネレーター</span>
      </header>

      {/* ── メインレイアウト ── */}
      <div className="page">
        {/* ── サイドバー（操作系・ニューモーフィズム） ── */}
        <aside className="sidebar">
          <div className="neu-card">
            <p className="neu-card-title">AIに指示する</p>

            {/* メインカラー */}
            <div className="input-section">
              <label className="input-label">メインカラー</label>
              <div className="color-picker-grid">
                {MAIN_COLORS.map(c=>(
                  <button key={c.key}
                    className={`color-chip-btn${mainColor===c.key?" active":""}`}
                    onClick={()=>setMainColor(mainColor===c.key?null:c.key)}>
                    <span className="color-chip-dot" style={{background:c.hint}} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* トンマナ */}
            <div className="input-section">
              <label className="input-label">トンマナ</label>
              <div className="tone-sliders">
                {TONE_AXES.map(ax=>(
                  <ToneSlider key={ax.key} axis={ax} value={tone[ax.key]}
                    onChange={v=>setTone(t=>({...t,[ax.key]:v}))} />
                ))}
              </div>
            </div>

            {/* 用途トグル */}
            <div className="input-section">
              <label className="input-label">用途</label>
              <div className="purpose-toggle">
                <button className={`purpose-toggle-btn${purpose==="digital"?" active":""}`}
                  onClick={()=>setPurpose("digital")}>🌐 デジタル</button>
                <button className={`purpose-toggle-btn${purpose==="print"?" active":""}`}
                  onClick={()=>setPurpose("print")}>🖨 印刷</button>
              </div>
            </div>

            {/* フォント分け */}
            <div className="input-section">
              <label className="input-label">タイトルと本文のフォント提案</label>
              <div className="radio-group">
                <button className={`radio-btn${fontMode==="split"?" active":""}`}
                  onClick={()=>setFontMode("split")}>する</button>
                <button className={`radio-btn${fontMode==="single"?" active":""}`}
                  onClick={()=>setFontMode("single")}>しない</button>
              </div>
            </div>

            {/* 日英 */}
            <div className="input-section">
              <label className="input-label">フォントの和文/欧文の組み合わせ提案</label>
              <div className="radio-group">
                <button className={`radio-btn${langMode==="bilingual"?" active":""}`}
                  onClick={()=>setLangMode("bilingual")}>する</button>
                <button className={`radio-btn${langMode==="jp_only"?" active":""}`}
                  onClick={()=>setLangMode("jp_only")}>しない</button>
              </div>
            </div>

            {/* 自由記入 */}
            <div className="input-section">
              <label className="input-label">自由記入（最優先）</label>
              <textarea className="free-textarea"
                placeholder="例：老舗の和菓子屋のチラシを作りたい"
                value={free}
                onChange={e=>setFree(e.target.value)}
              />
            </div>

            {/* 生成ボタン */}
            <button className="generate-btn"
              onClick={handleGenerate}
              disabled={genState.status==="loading"}>
              {genState.status==="loading"
                ? <><span>生成中...</span></>
                : <><span className="generate-btn-icon">✦</span><span>配色とフォントを提案</span></>
              }
            </button>
          </div>

          {/* お気に入り件数 */}
          <div className="fav-summary">
            <span className="fav-summary-label">お気に入り</span>
            <span className="fav-summary-count">
              配色 {favState.colors.length} · フォント {favState.fonts.length}
            </span>
          </div>
        </aside>

        {/* ── コンテンツ（白地） ── */}
        <main className="content">
          {/* タブ */}
          <div className="content-tabs">
            <button className={`content-tab${activeTab==="proposal"?" active":""}`}
              onClick={()=>setActiveTab("proposal")}>提案</button>
            <button className={`content-tab${activeTab==="fav"?" active":""}`}
              onClick={()=>setActiveTab("fav")}>
              お気に入り {(favState.colors.length+favState.fonts.length)>0
                ? `(${favState.colors.length+favState.fonts.length})` : ""}
            </button>
          </div>

          <div className="content-body">
            {/* ── 提案タブ ── */}
            {activeTab==="proposal" && (
              <>
                {genState.status==="error" && (
                  <div className="err-banner">⚠️ {genState.error}</div>
                )}

                {genState.status==="loading" && <Skeleton />}

                {genState.status==="idle" && (
                  <div className="state-empty">
                    <span className="state-empty-icon">✦</span>
                    <p className="state-empty-title">配色とフォントを提案します</p>
                    <p className="state-empty-desc">
                      左のパネルで条件を選んで「配色とフォントを提案」を押してください。<br/>
                      全項目はオプションです。何も選ばずに押すと「おまかせ」で提案します。
                    </p>
                  </div>
                )}

                {genState.status==="ready" && genState.selectedIndex===null && (
                  <div className="proposals-list">
                    {genState.proposals.map((p,i)=>(
                      <div key={i} className="proposal-card"
                        onClick={()=>{genDispatch({type:"SELECT",index:i}); applyToCSS(p.palette);}}>
                        <p className="proposal-card-label">{["A","B"][i]}案</p>
                        <p className="proposal-card-theme">{p.theme}</p>
                        <div className="proposal-color-bar">
                          {p.palette.map(c=>(
                            <div key={c.role} className="proposal-color-swatch" style={{background:c.hex}} title={c.name} />
                          ))}
                        </div>
                        <div className="proposal-font-info">
                          <div className="proposal-font-row">
                            <span className="proposal-font-role">見出し</span>
                            <span className="proposal-font-name">{p.fontPairing.heading.family}</span>
                          </div>
                          <div className="proposal-font-row">
                            <span className="proposal-font-role">本文</span>
                            <span className="proposal-font-name">{p.fontPairing.body.family}</span>
                          </div>
                        </div>
                        <div className="proposal-view-btn">この案を見る →</div>
                      </div>
                    ))}
                  </div>
                )}

                {genState.status==="ready" && genState.selectedIndex!==null && selectedProposal && (
                  <div>
                    <button className="detail-back-btn"
                      onClick={()=>genDispatch({type:"SELECT",index:null})}>
                      ← 2案にもどる
                    </button>

                    {/* コンセプト帯 */}
                    <div className="concept-card">
                      <div className="concept-mark"
                        style={{background: selectedProposal.palette.find(p=>p.role==="primary")?.hex||"#888"}} />
                      <div>
                        <p className="concept-eyebrow">Concept</p>
                        <p className="concept-theme">{selectedProposal.theme}</p>
                        <p className="concept-reason">{selectedProposal.reason}</p>
                      </div>
                    </div>

                    {/* カラーパレット */}
                    <div className="detail-section">
                      <p className="detail-section-title">カラーパレット</p>
                      <PaletteResult
                        palette={selectedProposal.palette}
                        purpose={purpose}
                        alreadyFav={favColorIds.has(
                          selectedProposal.theme + "-" + genState.selectedIndex
                        )}
                        onFavAdd={()=>{
                          const id = selectedProposal.theme + "-" + genState.selectedIndex;
                          favDispatch({type:"ADD_COLOR", item:{
                            id,
                            theme: selectedProposal.theme,
                            palette: selectedProposal.palette,
                          }});
                          showToast("配色をお気に入りに追加しました");
                        }}
                        showToast={showToast}
                      />
                    </div>

                    {/* フォントペア */}
                    <div className="detail-section">
                      <p className="detail-section-title">フォントペア</p>
                      <p className="font-reason-text">💬 {selectedProposal.fontReason}</p>
                      <FontResult
                        fonts={selectedProposal.fontPairing}
                        fontMode={fontMode}
                        alreadyFav={favFontIds.has(
                          selectedProposal.fontPairing.heading.family + "-" + genState.selectedIndex
                        )}
                        onFavAdd={()=>{
                          const id = selectedProposal.fontPairing.heading.family + "-" + genState.selectedIndex;
                          favDispatch({type:"ADD_FONT", item:{
                            id,
                            fontReason: selectedProposal.fontReason,
                            heading: selectedProposal.fontPairing.heading,
                            body: selectedProposal.fontPairing.body,
                          }});
                          showToast("フォントをお気に入りに追加しました");
                        }}
                        showToast={showToast}
                      />
                    </div>

                    {/* プレビュー */}
                    <div className="detail-section">
                      <p className="detail-section-title">プレビュー</p>
                      <Preview
                        palette={selectedProposal.palette}
                        fonts={selectedProposal.fontPairing}
                        purpose={purpose}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── お気に入りタブ ── */}
            {activeTab==="fav" && (
              <FavWorkspace
                favState={favState}
                favDispatch={favDispatch}
                purpose={purpose}
                showToast={showToast}
              />
            )}
          </div>
        </main>
      </div>

      {/* ── トースト ── */}
      <div className={`toast${toast.show?"":" out"}`}>{toast.msg}</div>
    </>
  );
}

// ── マウント ──────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
