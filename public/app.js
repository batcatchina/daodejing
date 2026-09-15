/* 道德经 · 炼化炉 —— 前端主逻辑 */

const state = { data: null, keyword: '', theme: '全部', lastDan: null };

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
  renderProgress();
  renderFilters();
  render();
}

function renderProgress() {
  const { refined, total } = state.data;
  $('#pbar').style.width = (total ? (refined / total) * 100 : 0) + '%';
  $('#ptext').textContent = `已结丹 ${refined} / ${total} 章`;
}

function renderFilters() {
  const themes = new Set();
  state.data.chapters.forEach((c) => (c.themes || []).forEach((t) => themes.add(t)));
  const list = ['全部', '已结丹', ...themes];
  $('#filters').innerHTML = list
    .map((t) => `<button class="chip${t === state.theme ? ' on' : ''}" data-theme="${esc(t)}">${esc(t)}</button>`)
    .join('');
  $('#filters').querySelectorAll('.chip').forEach((b) =>
    b.addEventListener('click', () => { state.theme = b.dataset.theme; renderFilters(); render(); })
  );
}

function match(c) {
  const k = state.keyword.trim();
  if (state.theme === '已结丹' && c.status !== 'refined') return false;
  if (state.theme !== '全部' && state.theme !== '已结丹' && !(c.themes || []).includes(state.theme)) return false;
  if (!k) return true;
  const hay = [c.title, c.original, c.danzi, c.danjue,
               (c.keywords || []).join(''), (c.themes || []).join('')].join(' ');
  return hay.includes(k);
}

function render() {
  const list = state.data.chapters.filter(match);
  $('#empty').hidden = list.length > 0;
  $('#grid').innerHTML = list.map(card).join('');
  $('#grid').querySelectorAll('.card').forEach((el) =>
    el.addEventListener('click', () => open(Number(el.dataset.id)))
  );
}

function card(c) {
  const done = c.status === 'refined';
  return `<div class="card${done ? ' done' : ' raw'}" data-id="${c.id}">
    <div class="num">
      <span>第 ${c.id} 章</span>
      ${done ? `<span class="dz">${esc(c.danzi)}</span>` : ''}
      <span class="dot"></span>
    </div>
    <div class="title">${esc(c.title)}</div>
    <div class="excerpt">${esc(c.original)}</div>
    ${done && c.danjue ? `<div class="jue">${esc(c.danjue)}</div>` : ''}
    <div class="tags">${(c.themes || []).slice(0, 2).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
  </div>`;
}

/* ============================================================
   炼化炉
   ============================================================ */
function forge() {
  const text = $('#charge').value.trim();
  if (!text) { $('#charge').focus(); return; }

  const r = FURNACE.assay(text);
  const box = $('#assay');

  box.hidden = false;
  box.className = 'assay ' + (r.ok ? 'ok' : 'deny');
  box.innerHTML = `
    <div class="assay-head">
      <span class="assay-level">${esc(r.level)}</span>
      <span class="assay-score">火候 ${r.score} / 100</span>
      ${r.chapters.length ? `<span class="assay-score">所扣：第 ${r.chapters.join('、')} 章</span>` : ''}
    </div>
    <div class="assay-verdict">${esc(r.verdict)}</div>
    ${r.reasons.length ? `<ul class="assay-list">${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${r.missing.length ? `<ul class="assay-list deny">${r.missing.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
  `;

  if (!r.ok) { showDeny(r); return; }

  const btn = $('#forgeBtn');
  const furnace = $('#furnace');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-flame"></span>炼 化 中';
  furnace.classList.add('forging');
  $('#flame').classList.add('on');
  $('#danResult').hidden = true;

  setTimeout(() => {
    furnace.classList.remove('forging');
    $('#flame').classList.remove('on');
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-flame"></span>开 炉 炼 化';
    showDan(pickChapter(r.chapters), text, r);
    $('#danResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 1100);
}

/** 从所扣章节中挑一颗丹——优先已结丹的 */
function pickChapter(chaps) {
  if (!chaps || !chaps.length) return null;
  const refined = chaps.filter((id) => state.data.detail[String(id)]);
  const pool = refined.length ? refined : chaps;
  return state.data.chapters.find((c) => c.id === pool[0]) || null;
}

function showDan(chap, input, r) {
  const box = $('#danResult');
  box.hidden = false;

  if (!chap) { showDeny(r); return; }

  const d = state.data.detail[String(chap.id)];
  state.lastDan = chap.id;

  if (!d) {
    box.innerHTML = `
      <div class="dan-deny">
        <div class="deny-mark">◯</div>
        <h3>火候已至，此章尚未结丹</h3>
        <p>第 ${chap.id} 章「${esc(chap.title)}」的原文已扣定，然其金丹未炼。</p>
        <div style="margin-top:1.2rem;font-size:.92rem;line-height:2.05;color:var(--ink-2);text-align:justify">
          ${esc(chap.original)}
        </div>
        <p style="margin-top:1.2rem"><span class="dan-link" data-open="${chap.id}">观其章目 →</span></p>
      </div>`;
    bindDanLinks();
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
        <span class="dan-link" data-open="${chap.id}">展开全章 →</span>
      </div>
    </div>`;
  bindDanLinks();
}

function dimsOf() {
  return state.data.dimensions || [
    { key: 'rensheng', name: '人生·自主', en: 'SHENG' },
    { key: 'jiankang', name: '健康·养生', en: 'YANG' },
    { key: 'yuzhou',   name: '自然·宇宙', en: 'ZHOU' },
  ];
}

function showDeny(r) {
  const box = $('#danResult');
  box.hidden = false;
  box.innerHTML = `
    <div class="dan-deny">
      <div class="deny-mark">！</div>
      <h3>${esc(r.level)}</h3>
      <p>${esc(r.verdict)}</p>
      <p style="margin-top:.9rem">请引原文章句，或就此章之义理申说。<br>
      金丹须有根——无原文之根者，炉火再旺亦炼不出。</p>
      <p style="margin-top:1.1rem"><span class="dan-link" data-sample="1">试一枚样例 →</span></p>
    </div>`;
  bindDanLinks();
}

function bindDanLinks() {
  $('#danResult').querySelectorAll('[data-open]').forEach((el) =>
    el.addEventListener('click', () => open(Number(el.dataset.open)))
  );
  const s = $('#danResult').querySelector('[data-sample]');
  if (s) s.addEventListener('click', () => {
    $('#charge').value = '上善若水，水善利万物而不争，处众人之所恶，故几于道。';
    $('#charge').focus();
    forge();
  });
}

/* ============================================================
   详情弹窗
   ============================================================ */
function open(id) {
  const c = state.data.chapters.find((x) => x.id === id);
  if (!c) return;
  const d = state.data.detail[String(id)];
  const dims = dimsOf();

  let content;
  if (!d) {
    content = `<div class="pending">
      本章尚未结丹。<br>
      引其章句投入炉中试火，或导入课程文字稿与视频转写，即可炼出「一字 / 一句 / 本意引申 / 三维」。
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
    <div class="d-foot">道德经 · 炼化炉 —— 一字 / 一句 / 本意引申 / 三维</div>`;

  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function close() {
  $('#modal').hidden = true;
  document.body.style.overflow = '';
}

/* ============================================================
   事件
   ============================================================ */
document.addEventListener('click', (e) => {
  if (e.target.dataset.close !== undefined) close();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') close();
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' &&
      document.activeElement === $('#charge')) forge();
});

$('#forgeBtn').addEventListener('click', forge);
$('#clearBtn').addEventListener('click', () => {
  $('#charge').value = '';
  $('#assay').hidden = true;
  $('#danResult').hidden = true;
  $('#charge').focus();
});

document.querySelectorAll('.sample').forEach((b) =>
  b.addEventListener('click', () => {
    $('#charge').value = b.dataset.t;
    forge();
  })
);

let timer;
$('#search').addEventListener('input', (e) => {
  clearTimeout(timer);
  timer = setTimeout(() => { state.keyword = e.target.value; render(); }, 180);
});

load();
