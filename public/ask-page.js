/* ============================================================
   问道 · 页面逻辑
   ------------------------------------------------------------
   答面分两级（不隐其深浅）：
     深章（金丹已成）—— 丹字 · 丹诀 · 本意 · 引申 · 三维全出
     浅章（金丹未炼）—— 丹字 · 丹诀 · 原文，并标明"此章金丹未炼"，给炼化路径
   ============================================================ */

const state = { data: null, view: 'theme', lastResult: null };

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
/* why 字段允许内嵌 <b>，但其余须转义 —— 先转义再放回标记 */
function whyHtml(s) {
  return esc(s).replace(/&lt;b&gt;/g, '<b>').replace(/&lt;\/b&gt;/g, '</b>');
}

function dimsOf() {
  return state.data.dimensions || [
    { key: 'rensheng', name: '人生·自主', en: 'SHENG' },
    { key: 'jiankang', name: '健康·养生', en: 'YANG' },
    { key: 'yuzhou',   name: '自然·宇宙', en: 'ZHOU' },
  ];
}

/* ---------- 加载 ---------- */
async function load() {
  const res = await fetch('./data/index.json');
  state.data = await res.json();
  FURNACE.buildIndex(state.data.chapters);

  const deep = ASK.sampleDan(state.data).length;
  $('#askSub').innerHTML = `炉 中 已 有 <b style="color:var(--cinnabar)">${deep}</b> 枚 金 丹 · 八 十 一 章 待 取`;

  renderSamples();
  renderBrowse();
  $('#browse').hidden = false;

  const q = new URLSearchParams(location.search).get('q');
  if (q) { $('#q').value = q; ask(); }
}

/* ---------- 可试之问 ---------- */
function renderSamples() {
  const ss = ASK.samples(state.data, 8);
  $('#askSamples').innerHTML =
    `<span class="samples-label">可试：</span>` +
    ss.map((s) => `<button class="sample" data-q="${esc(s.q)}" title="${esc(s.yili)}">${esc(s.q)}</button>`).join('');
  $('#askSamples').querySelectorAll('.sample').forEach((b) =>
    b.addEventListener('click', () => { $('#q').value = b.dataset.q; ask(); }));
}

/* ============================================================
   问道
   ============================================================ */
function ask() {
  const raw = $('#q').value.trim();
  if (!raw) { $('#q').focus(); return; }

  if (raw !== state.lastResult?.raw) {
    history.replaceState(null, '', `?q=${encodeURIComponent(raw)}`);
  }

  const r = ASK.query(raw, state.data, 4);
  state.lastResult = r;

  const box = $('#answer');
  box.hidden = false;

  if (!r.hits.length) {
    box.innerHTML = `
      ${SPIRITS.strip('ling', SPIRITS.say('ling', 'none'), { tone: 'bad' })}
      <div class="ans-none">
        <div class="ans-none-mark">◯</div>
        <h3>炉中无丹可应此问</h3>
        <p>${whyHtml(r.note)}</p>
      </div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const deepN = r.hits.filter((h) => h.deep).length;
  const shallowN = r.hits.length - deepN;

  const lingSlot = r.mode === 'quote' ? 'quote' : r.mode === 'theme' ? 'theme' : 'bridge';
  box.innerHTML = `
    ${SPIRITS.strip('ling', SPIRITS.say('ling', lingSlot), { tone: r.mode === 'theme' ? 'idle' : 'good' })}
    <div class="ans-head">
      <div class="ans-path">
        <span class="ans-path-tag">${esc(pathName(r.mode))}</span>
        <span class="ans-path-note">${whyHtml(r.note)}</span>
      </div>
      <div class="ans-stat">
        取丹 <b>${r.hits.length}</b> 枚
        ${deepN ? `· 金丹已成 <b>${deepN}</b>` : ''}
        ${shallowN ? `· 金丹未炼 <b class="shallow">${shallowN}</b>` : ''}
      </div>
    </div>
    ${r.hits.map((h, i) => danCard(h, i)).join('')}
    <div class="ans-foot">
      <p>炉子给出的是<b>哪几章在回答你</b>，不是替你想好的答案。原文自有其力，读它。</p>
      <p class="ans-foot-minor">
        <a class="dan-link" href="./">入 炉 炼 化 →</a>
        　·　<a class="dan-link" href="./vault.html">往 藏 丹 阁 览 全 部 八 十 一 章 →</a>
      </p>
    </div>`;

  box.querySelectorAll('[data-open]').forEach((el) =>
    el.addEventListener('click', () => openSheet(Number(el.dataset.open))));

  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function pathName(mode) {
  return { bridge: '语 义 桥', quote: '直 引 原 文', theme: '主 题 参 证', empty: '空 问' }[mode] || mode;
}

/* ============================================================
   丹药卡（分级）
   ============================================================ */
function danCard(h, i) {
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

  const why = `<div class="ans-why"><span class="ans-why-tag">何以应你</span>${whyHtml(h.why)}</div>`;

  const tags = (h.themes || []).length
    ? `<div class="ans-tags">${h.themes.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : '';

  if (!deep) {
    return `<article class="ans-card shallow">
      ${head}
      <div class="ans-why-wrap">${why}${tags}</div>
      <div class="ans-original"><span class="ans-orig-tag">原文</span>${esc(h.original)}</div>
      <div class="ans-shallow-note">
        <b>炉灵：</b>此章<b>金丹未炼</b>——我只有它的原文，未及本意、引申与三维。<br>
        炉子不替它编造，所以此处只有老子自己的话。<br>
        可先诵读；或引此章句入炉炼化，它便有了自己的丹。
        <div class="ans-shallow-acts">
          <a class="dan-link" href="./?ch=${h.id}">入 炉 炼 此 章 →</a>
          <span class="dan-link" data-open="${h.id}">观 其 原 文 →</span>
        </div>
      </div>
    </article>`;
  }

  const dims = dimsOf();
  return `<article class="ans-card deep">
    ${head}
    <div class="ans-why-wrap">${why}${tags}</div>
    <div class="ans-body">
      <section class="ans-sec">
        <h4>本意 <em>BENYI</em></h4>
        <div class="body">${md(d.benyi)}</div>
      </section>
      <section class="ans-sec">
        <h4>引申义 <em>YINSHEN</em></h4>
        <div class="body">${md(d.yinshen)}</div>
      </section>
      <section class="ans-sec">
        <h4>三维 <em>SAN WEI</em></h4>
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
    </div>
  </article>`;
}

/* ============================================================
   浏览：按主题 / 按丹字 / 已炼化
   ============================================================ */
function renderBrowse() {
  const body = $('#browseBody');
  const hint = $('#browseHint');
  const D = state.data;

  if (state.view === 'theme') {
    const idx = ASK.themeIndex(D);
    body.innerHTML = `<div class="browse-themes">${idx.map((t) => `
      <div class="bt-item" data-theme="${esc(t.name)}">
        <div class="bt-head"><span class="bt-name">${esc(t.name)}</span><span class="bt-n">${t.n}</span></div>
        <div class="bt-words">${t.ids.slice(0, 8).map((id) => {
          const c = D.chapters.find((x) => x.id === id);
          return `<span class="bt-w${ASK.isDeep(D, id) ? ' deep' : ''}">${esc(c ? c.danzi : '')}</span>`;
        }).join('')}</div>
      </div>`).join('')}</div>`;
    hint.textContent = '点一主题，看此路义理下有哪些章（金字为已成丹）。';
  } else if (state.view === 'danzi') {
    const idx = ASK.danziIndex(D);
    body.innerHTML = `<div class="browse-danzi">${idx.map((z) => `
      <button class="dz-chip${z.deep ? ' deep' : ''}" data-danzi="${esc(z.zi)}">
        <span class="dz-zi">${esc(z.zi)}</span>
        <span class="dz-ids">${z.ids.length > 1 ? z.ids.length + ' 章' : '第 ' + z.ids[0]}</span>
      </button>`).join('')}</div>`;
    hint.textContent = `全库 ${idx.length} 个丹字 · 点一字，看它落于哪几章（金字为已成丹）。`;
  } else {
    const list = ASK.sampleDan(D);
    body.innerHTML = `<div class="browse-deep">${list.map((c) => {
      const d = D.detail[String(c.id)];
      return `<button class="bd-card" data-open="${c.id}">
        <span class="bd-orb">${esc(d.danzi)}</span>
        <span class="bd-title">第 ${c.id} 章 · ${esc(c.title)}</span>
        <span class="bd-jue">${esc(d.danjue)}</span>
      </button>`;
    }).join('')}</div>`;
    hint.textContent = `已炼化 ${list.length} 章 · 点开可见本意、引申与三维全貌。`;
  }

  body.querySelectorAll('[data-theme]').forEach((el) =>
    el.addEventListener('click', () => { $('#q').value = el.dataset.theme; ask(); }));
  body.querySelectorAll('[data-danzi]').forEach((el) =>
    el.addEventListener('click', () => { $('#q').value = el.dataset.danzi; ask(); }));
  body.querySelectorAll('[data-open]').forEach((el) =>
    el.addEventListener('click', () => openSheet(Number(el.dataset.open))));
}

function initTabs() {
  $('#browseTabs').querySelectorAll('.btab').forEach((b) => {
    b.classList.toggle('on', b.dataset.view === state.view);
    b.addEventListener('click', () => {
      state.view = b.dataset.view;
      $('#browseTabs').querySelectorAll('.btab').forEach((x) =>
        x.classList.toggle('on', x.dataset.view === state.view));
      renderBrowse();
    });
  });
}

/* ============================================================
   章节详情（modal）
   ============================================================ */
function openSheet(id) {
  const c = state.data.chapters.find((x) => x.id === id);
  if (!c) return;
  const d = state.data.detail[String(id)];
  const dims = dimsOf();

  let content;
  if (!d) {
    content = `<div class="pending">
      本章尚未结丹。<br>
      引其章句投入炉中试火，即可炼出「一字 / 一句 / 本意引申 / 三维」。
      <br><br>原文已就位，可先诵读。
    </div>`;
  } else {
    content =
      `<section class="sec"><h3>丹诀 <em>DANJUE</em></h3><div class="body"><p>「${esc(d.danjue)}」</p></div></section>` +
      `<section class="sec"><h3>本意 <em>BENYI</em></h3><div class="body">${md(d.benyi)}</div></section>` +
      `<section class="sec"><h3>引申义 <em>YINSHEN</em></h3><div class="body">${md(d.yinshen)}</div></section>` +
      dims.map((dim) => `
        <section class="sec">
          <h3>${esc(dim.name)} <em>${esc(dim.en)}</em></h3>
          <div class="body">${md((d.wei || {})[dim.key] || '')}</div>
        </section>`).join('');
  }

  $('#detail').innerHTML = `
    <div class="d-head">
      <div class="d-num">第 ${c.id} 章</div>
      ${d ? `<div class="d-danzi">${esc(d.danzi)}</div>` : ''}
      <h2 class="d-title">${esc(c.title)}</h2>
      <div class="d-original">${esc(c.original)}</div>
      <div class="d-tags">${(c.themes || []).map((t) => `<span>${esc(t)}</span>`).join('')}</div>
    </div>
    ${content}
    <div class="d-foot">
      ${d ? '' : `<a class="dan-link" href="./?ch=${c.id}">投入炼化炉试火 →</a>　·　`}
      道德经 · 炼化炉
    </div>`;

  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeSheet() {
  $('#modal').hidden = true;
  document.body.style.overflow = '';
}

/* ---------- 事件 ---------- */
$('#askBtn').addEventListener('click', ask);
$('#clearBtn').addEventListener('click', () => {
  $('#q').value = '';
  $('#answer').hidden = true;
  $('#browse').hidden = false;
  state.lastResult = null;
  history.replaceState(null, '', location.pathname);
  $('#q').focus();
});
$('#q').addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') ask();
});
document.addEventListener('click', (e) => {
  if (e.target.dataset && e.target.dataset.close !== undefined) closeSheet();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

initTabs();
load();
