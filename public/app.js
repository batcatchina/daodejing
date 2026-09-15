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

  // 带 ?ch=N 时自动投料
  const ch = new URLSearchParams(location.search).get('ch');
  if (ch) {
    const c = state.data.chapters.find((x) => x.id === Number(ch));
    if (c) {
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
   炼化
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
  $('#danResult').hidden = true;

  setTimeout(() => {
    furnace.classList.remove('forging');
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-flame"></span>开 炉 炼 化';
    showDan(pickChapter(r.chapters), r);
    $('#danResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 1100);
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
      <p style="margin-top:.9rem">请引原文章句，或就此章之义理申说。<br>
      金丹须有根——无原文之根者，炉火再旺亦炼不出。</p>
      <p style="margin-top:1.3rem">
        <a class="dan-link" href="./vault.html">往 藏 丹 阁 寻 章 句 →</a>
        <span style="margin:0 .8rem;color:var(--line)">｜</span>
        <span class="dan-link" data-sample="1">试 一 枚 样 例 →</span>
      </p>
    </div>`;
  const s = box.querySelector('[data-sample]');
  if (s) s.addEventListener('click', () => {
    $('#charge').value = '上善若水，水善利万物而不争，处众人之所恶，故几于道。';
    $('#charge').focus();
    forge();
  });
}

/* ---------- 事件 ---------- */
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

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' &&
      document.activeElement === $('#charge')) forge();
});

load();
