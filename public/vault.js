/* 藏丹阁 —— 二级页面逻辑 */

const state = { data: null, keyword: '', theme: '全部', status: 'all' };

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

async function load() {
  // 支持 ?status=refined / pending / all 直达
  const q = new URLSearchParams(location.search).get('status');
  if (['refined', 'pending', 'all'].includes(q)) state.status = q;

  const res = await fetch('./data/index.json');
  state.data = await res.json();
  renderProgress();
  renderTabs();
  renderFilters();
  render();
}

function renderProgress() {
  const { refined, total } = state.data;
  $('#pbar').style.width = (total ? (refined / total) * 100 : 0) + '%';
  $('#ptext').textContent = `已结丹 ${refined} / ${total} 章`;

  const todo = total - refined;
  $('#tabDone').textContent = refined;
  $('#tabTodo').textContent = todo;
  const names = state.data.chapters.filter((c) => c.status === 'refined').map((c) => c.danzi).filter(Boolean);
  $('#vaultSub').innerHTML = names.length
    ? `已 结 丹 <b style="color:var(--cinnabar)">${refined}</b> 章　·　${names.join(' · ')}`
    : '八 十 一 章';
}

function renderTabs() {
  $('#tabs').querySelectorAll('.tab').forEach((b) => {
    b.classList.toggle('on', b.dataset.status === state.status);
    b.onclick = () => {
      state.status = b.dataset.status;
      history.replaceState(null, '', `?status=${state.status}`);
      renderTabs();
      render();
    };
  });
}

function renderFilters() {
  const themes = new Set();
  state.data.chapters.forEach((c) => (c.themes || []).forEach((t) => themes.add(t)));
  const list = ['全部', ...themes];
  $('#filters').innerHTML = list
    .map((t) => `<button class="chip${t === state.theme ? ' on' : ''}" data-theme="${esc(t)}">${esc(t)}</button>`)
    .join('');
  $('#filters').querySelectorAll('.chip').forEach((b) =>
    b.addEventListener('click', () => { state.theme = b.dataset.theme; renderFilters(); render(); })
  );
}

function match(c) {
  if (state.status === 'refined' && c.status !== 'refined') return false;
  if (state.status === 'pending' && c.status === 'refined') return false;
  if (state.theme !== '全部' && !(c.themes || []).includes(state.theme)) return false;
  const k = state.keyword.trim();
  if (!k) return true;
  const hay = [c.title, c.original, c.danzi, c.danjue,
               (c.keywords || []).join(''), (c.themes || []).join('')].join(' ');
  return hay.includes(k);
}

function render() {
  const list = state.data.chapters.filter(match);
  $('#empty').hidden = list.length > 0;

  // 已炼化置顶
  list.sort((a, b) => {
    const ra = a.status === 'refined' ? 0 : 1;
    const rb = b.status === 'refined' ? 0 : 1;
    return ra - rb || a.id - b.id;
  });

  // 分组渲染
  const done = list.filter((c) => c.status === 'refined');
  const todo = list.filter((c) => c.status !== 'refined');
  let html = '';
  if (done.length) {
    html += `<div class="group-head"><span>金 丹 已 成</span><em>${done.length} 章</em></div>`;
    html += `<div class="grid">${done.map(card).join('')}</div>`;
  }
  if (todo.length) {
    html += `<div class="group-head group-raw"><span>原 文 待 炼</span><em>${todo.length} 章</em></div>`;
    html += `<div class="grid">${todo.map(card).join('')}</div>`;
  }
  $('#grid').innerHTML = html;
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

function dimsOf() {
  return state.data.dimensions || [
    { key: 'rensheng', name: '人生·自主', en: 'SHENG' },
    { key: 'jiankang', name: '健康·养生', en: 'YANG' },
    { key: 'yuzhou',   name: '自然·宇宙', en: 'ZHOU' },
  ];
}

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
    <div class="d-foot">
      ${d ? '' : `<a class="dan-link" href="./?ch=${c.id}">投入炼化炉试火 →</a>　·　`}
      道德经 · 炼化炉
    </div>`;

  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function close() {
  $('#modal').hidden = true;
  document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
  if (e.target.dataset.close !== undefined) close();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

let timer;
$('#search').addEventListener('input', (e) => {
  clearTimeout(timer);
  timer = setTimeout(() => { state.keyword = e.target.value; render(); }, 180);
});

load();
