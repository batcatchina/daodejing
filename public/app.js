/* 道德经 · 炼化炉 —— 首页逻辑（炼化 + 入口） */

const state = { data: null };

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- 极简 markdown ---------- */
function md(text) {
  if (!text) return '';
  const lines = String(text).split('\n');
  let out = '', inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { if (inList) { out += '</ul>'; inList = false; } continue; }
    if (/^[-*]\s+/.test(line)) {
      if (!inList) { out += '<ul>'; inList = true; }
      out += `<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`;
      continue;
    }
    if (inList) { out += '</ul>'; inList = false; }
    out += `<p>${inline(line)}</p>`;
  }
  if (inList) out += '</ul>';
  return out;
}
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

/* ---------- 加载 ---------- */
async function load() {
  const res = await fetch('./data/index.json');
  state.data = await res.json();
  FURNACE.buildIndex(state.data.chapters);
  renderGateways();
  renderHomeAsk();
  initTrio();
  initFold();
  initPocket();
  initTopbar();

  // 带 ?ch=N 时自动投料
  const ch = new URLSearchParams(location.search).get('ch');
  if (ch) {
    const c = state.data.chapters.find((x) => x.id === Number(ch));
    if (c) {
      intake.lastSrc = `第 ${c.id} 章原文`;
      setMode('paste');
      $('#charge').value = c.original;
      setTimeout(forge, 300);
    }
  }
}

/* ---------- 入口卡片 ---------- */
function renderGateways() {
  const chs = state.data.chapters;
  const done = chs.filter((c) => c.status === 'refined');
  const todo = chs.filter((c) => c.status !== 'refined');

  $('#cntDone').textContent = done.length;
  $('#cntTodo').textContent = todo.length;

  const words = done.map((c) => c.danzi).filter(Boolean);
  $('#gwWords').textContent = words.length
    ? words.join(' · ')
    : '尚无金丹，可入炉试炼';
}

/* ============================================================
   投料口：四形态切换
   ============================================================ */
const intake = { mode: 'paste', lastSrc: '' };

function setMode(mode) {
  intake.mode = mode;
  document.querySelectorAll('.itab').forEach((b) =>
    b.classList.toggle('on', b.dataset.mode === mode));
  $('#panePaste').hidden = mode !== 'paste';
  $('#paneFile').hidden  = mode !== 'file';
  $('#paneUrl').hidden   = mode !== 'url';
  $('#paneAv').hidden    = mode !== 'av';
  if (mode === 'paste') $('#charge').focus();
}

/* 把料填入炉口，并顺手做一次料识 */
function fillCharge(text, srcLabel, extra) {
  $('#charge').value = text;
  intake.lastSrc = srcLabel || '';
  setMode('paste');

  const r = FURNACE.assay(text);
  const rec = INGEST.recognize(text, r);
  showIntakeStatus(rec, srcLabel, extra, text);
}

function showIntakeStatus(rec, srcLabel, extra, text) {
  const box = $('#intakeStatus');
  const bits = [];
  bits.push(`<span class="is-src">${esc(rec.label)}</span>`);
  bits.push(`<span class="is-note">${esc(rec.note)}</span>`);
  bits.push(`<span class="is-num">计 ${text.length} 字</span>`);
  if (srcLabel) bits.push(`<span class="is-from">来自：${esc(srcLabel)}</span>`);
  if (extra) bits.push(`<span class="is-extra">${esc(extra)}</span>`);

  // 道童接线：道童是门，先接住，再明写"转交丹师"
  const slot = ({ srt: 'srt', av: 'av', rich: 'av', thin: 'thin',
                  rootless: 'thin', empty: 'empty' })[rec.kind]
               || (text.length > 600 ? 'rich' : 'ok');
  const line = extra && extra.includes('时间轴') ? SPIRITS.say('tong', 'srt')
             : SPIRITS.say('tong', slot, '料已收下。');

  box.innerHTML = SPIRITS.handoff('forge', slot,
                    rec.kind === 'rootless' || rec.kind === 'empty' ? null : 'ready')
                + `<div class="is-meta">${bits.join('')}</div>`;
  box.hidden = false;
  box.className = 'intake-status s-' + rec.kind;
}

function showIntakeError(e) {
  const box = $('#intakeStatus');
  box.className = 'intake-status s-err';
  box.innerHTML = `
    <div class="is-errline"><b>${esc(e.msg || '投料未成')}</b></div>
    ${e.hint ? `<div class="is-errhint">${esc(e.hint)}</div>` : ''}`;
  box.hidden = false;
}

/* ---------------- 拖拽投料 ---------------- */
function initDrop() {
  const drop = $('#drop');
  const input = $('#fileInput');
  if (!drop) return;

  drop.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    if (input.files && input.files[0]) handleFile(input.files[0]);
    input.value = '';
  });

  ['dragenter', 'dragover'].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFile(f);
  });

  // 全局拖拽兜底：拖到页面任何地方都收下
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) { setMode('file'); handleFile(f); }
  });
}

async function handleFile(file) {
  try {
    const res = await INGEST.readFile(file);
    const extra = res.wasSrt && res.trimmed > 0
      ? `已剥去时间轴（省 ${res.trimmed} 字）`
      : null;
    fillCharge(res.text, res.name, extra);
  } catch (e) {
    showIntakeError(e);
  }
}

/* ---------------- 网址抓取 ---------------- */
function initUrl() {
  const btn = $('#fetchBtn');
  const input = $('#urlInput');
  if (!btn) return;

  const go = async () => {
    const url = input.value.trim();
    if (!url) { input.focus(); return; }
    btn.disabled = true;
    btn.textContent = '取 文 中';
    try {
      const r = await INGEST.fetchUrl(url);
      fillCharge(r.text, r.url, '已抓取网页正文');
    } catch (e) {
      showIntakeError(e);
    } finally {
      btn.disabled = false;
      btn.textContent = '取 文';
    }
  };
  btn.addEventListener('click', go);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}

/* ---------------- 入口签 ---------------- */
function initTabs() {
  document.querySelectorAll('.itab').forEach((b) =>
    b.addEventListener('click', () => setMode(b.dataset.mode)));
}

/* ============================================================
   炼化
   ============================================================ */
function forge() {
  const text = $('#charge').value.trim();
  if (!text) { setMode('paste'); $('#charge').focus(); return; }

  // 复位上一次的动画余留（炼化中途再点也应能立即响应）
  const fbtn = $('#forgeBtn');
  fbtn.disabled = false;
  fbtn.innerHTML = '<span class="btn-flame"></span>开 炉 炼 化';
  $('#furnace').classList.remove('forging');

  const r = FURNACE.assay(text);
  const box = $('#assay');

  // 料识
  const rec = INGEST.recognize(text, r);
  showIntakeStatus(rec, intake.lastSrc, null, text);

  box.hidden = false;
  box.className = 'assay ' + (r.ok ? 'ok' : 'deny');

  // 丹师接线：由丹师说出判词
  const shiSlot = r.ok
    ? (r.score >= 75 ? 'ready' : r.score >= 55 ? 'pass' : 'weak')
    : (r.chapters.length ? 'deny' : 'noroot');
  const shiLine = SPIRITS.say('shi', shiSlot, r.verdict);

  box.innerHTML = SPIRITS.strip('shi', shiLine, { tone: r.ok ? 'good' : 'bad' }) + `
    <div class="assay-head">
      <span class="assay-level">${esc(r.level)}</span>
      <span class="assay-score">火候 ${r.score} / 100</span>
      ${r.chapters.length ? `<span class="assay-score">所扣：第 ${r.chapters.join('、')} 章</span>` : ''}
      <span class="assay-score">${text.length} 字</span>
    </div>
    <div class="assay-verdict">${esc(r.verdict)}</div>
    ${principlesHtml(r)}
    ${r.reasons.length ? `<ul class="assay-list">${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${r.missing.length ? `<ul class="assay-list deny">${r.missing.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
  `;

  if (!r.ok) { showDeny(r); return; }

  const btn = $('#forgeBtn');
  const furnace = $('#furnace');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-flame"></span>炼 化 中';
  furnace.classList.add('forging');
  $('#danResult').hidden = true;

  setTimeout(() => {
    furnace.classList.remove('forging');
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-flame"></span>开 炉 炼 化';
    showDan(pickChapter(r.chapters), r);
    $('#danResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 1100);
}

/* 三问面板：显性为表 */
function principlesHtml(r) {
  if (!r.principles || !r.principles.length) return '';
  const marks = { 0: '✗', 1: '◐', 2: '✓', 3: '✓' };
  return `<div class="principles">
    <div class="pr-title">三 问</div>
    <div class="pr-rows">
      ${r.principles.map((p) => `
        <div class="pr-row pr-t${p.tier}">
          <span class="pr-mark">${marks[p.tier] || '◐'}</span>
          <span class="pr-name">${esc(p.name)}</span>
          <span class="pr-say">${esc(p.say)}</span>
        </div>`).join('')}
    </div>
  </div>`;
}

function pickChapter(chaps) {
  if (!chaps || !chaps.length) return null;
  const refined = chaps.filter((id) => state.data.detail[String(id)]);
  const pool = refined.length ? refined : chaps;
  return state.data.chapters.find((c) => c.id === pool[0]) || null;
}

function dimsOf() {
  return state.data.dimensions || [
    { key: 'rensheng', name: '人生·自主', en: 'SHENG' },
    { key: 'jiankang', name: '健康·养生', en: 'YANG' },
    { key: 'yuzhou',   name: '自然·宇宙', en: 'ZHOU' },
  ];
}

function showDan(chap, r) {
  const box = $('#danResult');
  box.hidden = false;

  if (!chap) { showDeny(r); return; }

  const d = state.data.detail[String(chap.id)];

  if (!d) {
    box.innerHTML = `
      <div class="dan-deny">
        <div class="deny-mark">◯</div>
        <h3>火候已至，此章尚未结丹</h3>
        <p>第 ${chap.id} 章「${esc(chap.title)}」的原文已扣定，然其金丹未炼。</p>
        <div style="margin-top:1.2rem;font-size:.92rem;line-height:2.05;color:var(--ink-2);text-align:justify">
          ${esc(chap.original)}
        </div>
        <p style="margin-top:1.3rem">
          <a class="dan-link" href="./vault.html?status=pending">入 藏 丹 阁 观 其 章 目 →</a>
        </p>
      </div>`;
    return;
  }

  const dims = dimsOf();

  box.innerHTML = `
    <div class="dan-card">
      <div class="dan-orb"><span>${esc(d.danzi)}</span></div>
      <div class="dan-jue">${esc(d.danjue)}</div>
      <div class="dan-meta">第 ${chap.id} 章 · ${esc(chap.title)}　｜　一字一重天</div>

      <section class="dan-sec">
        <h3>本意 <em>BENYI</em></h3>
        <div class="body">${md(d.benyi)}</div>
      </section>

      <section class="dan-sec">
        <h3>引申义 <em>YINSHEN</em></h3>
        <div class="body">${md(d.yinshen)}</div>
      </section>

      <section class="dan-sec">
        <h3>三维 <em>SAN WEI</em></h3>
        <div class="wei-grid">
          ${dims.map((dim) => `
            <div class="wei-item">
              <div class="wei-head">
                <span class="wei-name">${esc(dim.name)}</span>
                <span class="wei-en">${esc(dim.en)}</span>
              </div>
              <div class="wei-body">${md((d.wei || {})[dim.key] || '')}</div>
            </div>`).join('')}
        </div>
      </section>

      <div class="dan-foot">
        <span>火候：${esc((d.ferocity && d.ferocity.level) || '—')}</span>
        <a class="dan-link" href="./vault.html?status=refined">入 藏 丹 阁 览 其 全 章 →</a>
      </div>
    </div>`;
}

function showDeny(r) {
  const box = $('#danResult');
  box.hidden = false;
  box.innerHTML = `
    <div class="dan-deny">
      <div class="deny-mark">！</div>
      <h3>${esc(r.level)}</h3>
      <p>${esc(r.verdict)}</p>
      <p style="margin-top:1.1rem">请引原文章句，或就此章之义理申说。<br>
      金丹须有根——无原文之根者，炉火再旺亦炼不出。</p>
      <p style="margin-top:1.3rem">
        <a class="dan-link" href="./vault.html">往 藏 丹 阁 寻 章 句 →</a>
        <span style="margin:0 .8rem;color:var(--line)">｜</span>
        <span class="dan-link" data-sample="1">试 一 枚 样 例 →</span>
        <span style="margin:0 .8rem;color:var(--line)">｜</span>
        <span class="dan-link" data-mode="file">拖 入 文 件 →</span>
      </p>
    </div>`;
  const s = box.querySelector('[data-sample]');
  if (s) s.addEventListener('click', () => {
    fillCharge('上善若水，水善利万物而不争，处众人之所恶，故几于道。', '样例');
    forge();
  });
  const f = box.querySelector('[data-mode="file"]');
  if (f) f.addEventListener('click', () => { setMode('file'); $('#furnace').scrollIntoView({behavior:'smooth', block:'start'}); });
}

/* ---------- 事件 ---------- */
$('#forgeBtn').addEventListener('click', forge);
$('#clearBtn').addEventListener('click', () => {
  $('#charge').value = '';
  $('#assay').hidden = true;
  $('#danResult').hidden = true;
  $('#intakeStatus').hidden = true;
  $('#urlInput').value = '';
  intake.lastSrc = '';
  setMode('paste');
});

document.querySelectorAll('.sample').forEach((b) =>
  b.addEventListener('click', () => {
    fillCharge(b.dataset.t, '样例');
    forge();
  })
);

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' &&
      document.activeElement === $('#charge')) forge();
});

/* 粘贴转写稿时自动清理时间轴 */
$('#charge').addEventListener('paste', () => {
  setTimeout(() => {
    const v = $('#charge').value;
    if (!INGEST.looksLikeTranscript(v)) return;
    const { text, removed } = INGEST.tidyPasted(v);
    if (removed > 0) {
      $('#charge').value = text;
      const r = FURNACE.assay(text);
      showIntakeStatus(INGEST.recognize(text, r), '粘贴的转写稿', `已剥去时间轴（省 ${removed} 字）`, text);
    }
  }, 0);
});

initTabs();
initDrop();
initUrl();
load();


/* ============================================================
   问道（首页正门）
   ------------------------------------------------------------
   与 ask.html 共用 ask.js 的检索内核与答面渲染。
   首页只出答面、不做浏览，细则请往 ask.html。
   ============================================================ */

function renderHomeAsk() {
  const ss = ASK.samples(state.data, 6);
  const box = $('#homeSamples');
  if (!box) return;
  box.innerHTML = `<span class="samples-label">可试：</span>` +
    ss.map((s) => `<button class="sample" data-q="${esc(s.q)}" title="${esc(s.yili)}">${esc(s.q)}</button>`).join('');
  box.querySelectorAll('.sample').forEach((b) =>
    b.addEventListener('click', () => { $('#homeQ').value = b.dataset.q; homeAsk(); }));

  const ls = $('#lingStrip');
  if (ls) ls.innerHTML = SPIRITS.strip('ling', SPIRITS.ROLES.ling.intro);
}

/* ---------- 炉中三位 ---------- */
function initTrio() {
  const b = $('#trioBox');
  if (b) b.innerHTML = SPIRITS.trio();
}

/* ---------- 折叠：炉子 / 更多 ---------- */
function initFold() {
  const mBtn = $('#moreToggle');
  const mBody = $('#moreBody');
  if (mBtn && mBody) {
    mBtn.addEventListener('click', () => {
      const open = mBody.hidden;
      mBody.hidden = !open;
      mBtn.classList.toggle('on', open);
      const t = mBtn.querySelector('.mt-text');
      t.textContent = open ? '收 起' : '藏 丹 阁 · 炉 中 三 位';
    });
  }

  // 炉子在窄屏折叠（宽屏直接展示）
  const fBtn = $('#furnaceToggle');
  const fFold = $('#furnaceFold');
  if (fBtn && fFold) {
    // 记住用户手动开合过没有：手动开过，切换尺寸时不强行收回去
    let touched = false;
    const sync = () => {
      const narrow = window.matchMedia('(max-width: 760px)').matches;
      fBtn.hidden = !narrow;
      if (!narrow) {
        // 宽屏：炉子永远展开
        fFold.hidden = false;
        fBtn.textContent = '展 开 ⌄';
      } else if (!touched) {
        // 窄屏首屏：默认收起，避免一屏塞满
        fFold.hidden = true;
        fBtn.textContent = '投 料 入 炉 ⌄';
      }
    };
    fBtn.addEventListener('click', () => {
      const open = fFold.hidden;
      fFold.hidden = !open;
      touched = true;
      fBtn.textContent = open ? '收 起 ⌃' : '投 料 入 炉 ⌄';
    });
    window.addEventListener('resize', sync);
    sync();
  }
}

/* ============================================================
   随取炉 —— 挥之即来，用之即去
   ------------------------------------------------------------
   右下角一枚炉钮，随处可唤。唤出即用，收起即去。
   通路与正炉同：无论炼化问道，都先过道童这一关。
   ============================================================ */
/* ============================================================
   顶栏 · 三模块固化
   ------------------------------------------------------------
   问道 / 炼丹 / 藏丹阁 常驻顶上，一点就跳。
   页子长了也不怕找不着炉子在哪。
   ============================================================ */
function initTopbar() {
  const bar = $('#topbar');
  if (!bar) return;
  const tabs = Array.from(bar.querySelectorAll('.tb-tab[data-go]'));

  /* 点签即跳：跳到模块，并把该展开的先展开 */
  tabs.forEach((t) => {
    t.addEventListener('click', () => {
      const id = t.dataset.go;
      const sect = document.getElementById(id);
      if (!sect) return;

      // 炼丹在窄屏是折叠的，跳过去先把炉子打开
      if (id === 'furnace') {
        const fold = $('#furnaceFold');
        const fBtn = $('#furnaceToggle');
        if (fold && fold.hidden) {
          fold.hidden = false;
          if (fBtn) fBtn.textContent = '收 起 ⌃';
        }
      }
      // 问道：跳过去顺手聚焦提问框，省一次点击
      if (id === 'homeAsk') {
        setTimeout(() => { const q = $('#homeQ'); if (q) q.focus({ preventScroll: true }); }, 420);
      }

      const y = sect.getBoundingClientRect().top + window.scrollY - (bar.offsetHeight + 10);
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    });
  });

  /* 吸顶态：滚过抬头就点亮品牌与投影 */
  const onScroll = () => {
    bar.classList.toggle('stuck', window.scrollY > 120);
    spy();
  };

  /* 滚到哪一节，顶栏就亮哪一个 —— 人在哪，一目了然 */
  const sectOf = (id) => document.getElementById(id);
  const marks = [
    { id: 'homeAsk', tab: () => tabs.find((t) => t.dataset.go === 'homeAsk') },
    { id: 'furnace', tab: () => tabs.find((t) => t.dataset.go === 'furnace') },
    { id: 'vault',   tab: () => tabs.find((t) => t.dataset.go === 'vault') },
  ];
  function spy() {
    const line = window.scrollY + bar.offsetHeight + 96;
    let cur = 'homeAsk';
    for (const m of marks) {
      const el = sectOf(m.id);
      if (el && el.offsetTop <= line) cur = m.id;
    }
    marks.forEach((m) => {
      const t = m.tab();
      if (t) t.classList.toggle('on', m.id === cur);
    });
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', spy);
  onScroll();
}

function initPocket() {
  const pocket = $('#pocket');
  const btn = $('#pocketBtn');
  const sheet = $('#pocketSheet');
  const close = $('#pocketClose');
  if (!pocket || !btn || !sheet) return;

  const open = () => {
    pocket.classList.add('on');
    sheet.hidden = false;
    // 开了炉，先让道童应一声
    const tong = $('#pkTong');
    if (tong && !tong.innerHTML.trim()) {
      tong.innerHTML = SPIRITS.strip('tong', SPIRITS.ROLES.tong.intro);
      tong.hidden = false;
    }
    const first = sheet.querySelector('#pkCharge');
    if (first) setTimeout(() => first.focus(), 120);
  };
  const shut = () => {
    pocket.classList.remove('on');
    sheet.hidden = true;
  };

  btn.addEventListener('click', open);
  if (close) close.addEventListener('click', shut);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.hidden) shut();
  });

  /* ---- 投料 ---- */
  const pkForge = () => {
    const ta = $('#pkCharge');
    const text = (ta.value || '').trim();
    const tong = $('#pkTong');
    const out = $('#pkOut');

    if (!text) {
      tong.hidden = false;
      tong.innerHTML = SPIRITS.strip('tong', SPIRITS.say('tong', 'empty'), { tone: 'bad' });
      ta.focus();
      return;
    }

    const r = FURNACE.assay(text);
    const rec = INGEST.recognize(text, r);

    // 道童：接住，并明写转交丹师
    const slot = ({ srt: 'srt', av: 'av', rich: 'av', thin: 'thin',
                    rootless: 'thin', empty: 'empty' })[rec.kind]
                 || (text.length > 600 ? 'rich' : 'ok');
    tong.hidden = false;
    tong.innerHTML = SPIRITS.handoff('forge', slot,
      (rec.kind === 'rootless' || rec.kind === 'empty') ? null : 'ready');

    // 丹师：判丹
    const shiSlot = r.ok
      ? (r.score >= 75 ? 'ready' : r.score >= 55 ? 'pass' : 'weak')
      : (r.chapters.length ? 'deny' : 'noroot');
    const shiLine = SPIRITS.say('shi', shiSlot, r.verdict);

    out.hidden = false;
    out.innerHTML = SPIRITS.strip('shi', shiLine, { tone: r.ok ? 'good' : 'bad' }) + (r.ok
      ? (() => {
          const c = pickChapter(r.chapters);
          if (!c) return '<p class="pk-bad">丹师点了头，可我一时取不出那一枚。</p>';
          const d = state.data.detail && state.data.detail[String(c.id)];
          return `<p class="pk-title">第 ${c.id} 章 · 丹字「${esc(c.danzi || '')}」</p>
                  <p class="pk-orig">${esc(c.danjue || c.original || '')}</p>
                  ${d ? `<p>此章金丹已成。</p>
                         <a class="dan-link pk-more" href="./ask.html?q=${encodeURIComponent(text)}">看 它 全 貌 →</a>`
                      : `<p>此章金丹未炼——我只有原文，不替它编造。</p>
                         <a class="dan-link pk-more" href="./?ch=${c.id}">入 正 炉 炼 此 章 →</a>`}`;
        })()
      : `<p class="pk-bad">${esc(r.verdict)}</p>
         <p>${r.missing.length ? esc(r.missing.join('　')) : ''}</p>`);
  };

  const pkClear = () => {
    $('#pkCharge').value = '';
    const tong = $('#pkTong'); tong.innerHTML = ''; tong.hidden = true;
    const out = $('#pkOut'); out.innerHTML = ''; out.hidden = true;
  };

  /* ---- 问道 ---- */
  const pkAsk = () => {
    const inp = $('#pkQ');
    const raw = (inp.value || '').trim();
    const tong = $('#pkTong');
    const out = $('#pkOut');

    if (!raw) {
      tong.hidden = false;
      tong.innerHTML = SPIRITS.strip('tong', SPIRITS.say('tong', 'askEmpty'), { tone: 'bad' });
      inp.focus();
      return;
    }

    const r = ASK.query(raw, state.data, 3);

    // 道童接问 → 转交炉灵
    const lingSlot = !r.hits.length ? 'none'
      : r.mode === 'quote' ? 'quote' : r.mode === 'theme' ? 'theme' : 'bridge';
    tong.hidden = false;
    tong.innerHTML = SPIRITS.handoff('ask', 'ask', lingSlot);

    out.hidden = false;
    if (!r.hits.length) {
      out.innerHTML = `<p class="pk-bad">炉中无丹可应此问。不装作有。</p>`;
      return;
    }
    out.innerHTML = `
      <p class="pk-title">取丹 ${r.hits.length} 枚</p>
      ${r.hits.map((h) => `
        <p class="pk-orig"><b>第 ${h.id} 章</b>　${esc(h.danjue || h.original || '')}</p>`).join('')}
      <a class="dan-link pk-more" href="./ask.html?q=${encodeURIComponent(raw)}">看 全 部 与 详 解 →</a>`;
  };

  const bind = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
  bind('#pkForge', pkForge);
  bind('#pkClear', pkClear);
  bind('#pkAsk', pkAsk);
  const q = $('#pkQ');
  if (q) q.addEventListener('keydown', (e) => { if (e.key === 'Enter') pkAsk(); });
}

function homeAsk() {
  const raw = $('#homeQ').value.trim();
  if (!raw) {
    // 道童接口：问空了他也要应一声，不能装作没听见
    const box = $('#homeAnswer');
    box.hidden = false;
    box.className = 'ask-answer home-answer';
    box.innerHTML = SPIRITS.strip('tong', SPIRITS.say('tong', 'askEmpty'), { tone: 'bad' });
    $('#homeQ').focus();
    return;
  }

  const r = ASK.query(raw, state.data, 3);
  const box = $('#homeAnswer');
  box.hidden = false;

  if (!r.hits.length) {
    box.innerHTML = `
      ${SPIRITS.handoff('ask', 'ask', 'none')}
      <div class="ans-none">
        <div class="ans-none-mark">◯</div>
        <h3>炉中无丹可应此问</h3>
        <p>${ansWhy(r.note)}</p>
        <p style="margin-top:1rem">
          <a class="dan-link" href="./ask.html?q=${encodeURIComponent(raw)}">往 问 道 页 细 看 →</a>
        </p>
      </div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const deepN = r.hits.filter((h) => h.deep).length;
  const shallowN = r.hits.length - deepN;

  const lingSlot = r.mode === 'quote' ? 'quote' : r.mode === 'theme' ? 'theme' : 'bridge';
  box.innerHTML = `
    ${SPIRITS.handoff('ask', 'ask', lingSlot)}
    <div class="ans-head">
      <div class="ans-path">
        <span class="ans-path-tag">${esc(ansPathName(r.mode))}</span>
        <span class="ans-path-note">${ansWhy(r.note)}</span>
      </div>
      <div class="ans-stat">
        取丹 <b>${r.hits.length}</b> 枚
        ${deepN ? `· 金丹已成 <b>${deepN}</b>` : ''}
        ${shallowN ? `· 金丹未炼 <b class="shallow">${shallowN}</b>` : ''}
      </div>
    </div>
    ${r.hits.map(ansCard).join('')}
    <div class="ans-foot">
      <p>炉子只指出<b>哪几章在回答你</b>，不替你想好答案。此处仅示其要。</p>
      <p class="ans-foot-minor">
        <a class="dan-link" href="./ask.html?q=${encodeURIComponent(raw)}">往 问 道 页 看 全 部 →</a>
        　·　<a class="dan-link" href="./vault.html">往 藏 丹 阁 →</a>
      </p>
    </div>`;

  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function ansPathName(mode) {
  return { bridge: '语 义 桥', quote: '直 引 原 文', theme: '主 题 参 证', empty: '空 问' }[mode] || mode;
}
function ansWhy(s) {
  return esc(s).replace(/&lt;b&gt;/g, '<b>').replace(/&lt;\/b&gt;/g, '</b>');
}

/* 答面用丹卡：compact=true 时深章只截首段 */
function ansCard(h, i) {
  const deep = h.deep;
  const d = h.detail;
  const head = `
    <div class="ans-card-head">
      <div class="ans-orb ${deep ? 'on' : 'off'}"><span>${esc(h.danzi || '·')}</span></div>
      <div class="ans-head-text">
        <div class="ans-chap">
          <span class="ans-num">第 ${h.id} 章</span>
          <span class="ans-title">${esc(h.title)}</span>
          <span class="ans-depth ${deep ? 'deep' : 'shallow'}">${deep ? '金丹已成' : '金丹未炼'}</span>
        </div>
        <div class="ans-jue">${esc(h.danjue)}</div>
      </div>
      <div class="ans-order">${i + 1}</div>
    </div>`;
  const why = `<div class="ans-why"><span class="ans-why-tag">何以应你</span>${ansWhy(h.why)}</div>`;

  if (!deep) {
    return `<article class="ans-card shallow">
      ${head}<div class="ans-why-wrap">${why}</div>
      <div class="ans-original"><span class="ans-orig-tag">原文</span>${esc(h.original)}</div>
      <div class="ans-shallow-note">
        此章<b>金丹未炼</b>——炉中只有它的原文。炉子不替它编造，故此处只有老子自己的话。<br>
        可先诵读；或引此章句入炉炼化。
        <div class="ans-shallow-acts">
          <a class="dan-link" href="./?ch=${h.id}">入 炉 炼 此 章 →</a>
          <a class="dan-link" href="./ask.html?q=${encodeURIComponent(h.danjue)}">往 问 道 页 细 看 →</a>
        </div>
      </div>
    </article>`;
  }

  // 深章：首页只出本意之首段，余往问道页
  const first = String(d.benyi || '').split('\n').find((l) => l.trim()) || '';
  return `<article class="ans-card deep">
    ${head}<div class="ans-why-wrap">${why}</div>
    <div class="ans-body">
      <section class="ans-sec">
        <h4>本意 <em>BENYI</em></h4>
        <div class="body">${md(first)}</div>
        <p class="ans-more"><a class="dan-link" href="./ask.html?q=${encodeURIComponent(h.danjue)}">读 其 全 丹（本意 · 引申 · 三维）→</a></p>
      </section>
    </div>
  </article>`;
}

/* 事件 */
if ($('#homeAskBtn')) {
  $('#homeAskBtn').addEventListener('click', homeAsk);
  $('#homeQ').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') homeAsk();
  });
}
