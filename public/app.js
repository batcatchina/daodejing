/* 道德经 · 炼化 —— 前端渲染 */

const state = { data: null, keyword: '', theme: '全部' };

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** 极简 markdown：段落 / 列表 / 加粗 / 斜体 */
function md(text) {
  if (!text) return '';
  const lines = text.split('\n');
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
  const res = await fetch('./data/index.json');
  state.data = await res.json();
  renderProgress();
  renderFilters();
  render();
}

function renderProgress() {
  const { refined, total } = state.data;
  const pct = total ? (refined / total) * 100 : 0;
  $('#pbar').style.width = pct + '%';
  $('#ptext').textContent = `已炼化 ${refined} / ${total} 章`;
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
  const k = state.keyword.trim();
  if (state.theme !== '全部' && !(c.themes || []).includes(state.theme)) return false;
  if (!k) return true;
  const hay = [c.title, c.original, (c.keywords || []).join(''), (c.themes || []).join('')].join(' ');
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
  return `<div class="card${done ? ' done' : ''}" data-id="${c.id}">
    <div class="num"><span>第 ${c.id} 章</span><span class="dot"></span></div>
    <div class="title">${esc(c.title)}</div>
    <div class="excerpt">${esc(c.original)}</div>
    <div class="tags">${(c.themes || []).slice(0, 2).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
  </div>`;
}

function open(id) {
  const c = state.data.chapters.find((x) => x.id === id);
  const d = state.data.detail[String(id)];
  const pending = !d;

  const sec = (label, en, body) => `
    <section class="sec">
      <h3>${label} <em>${en}</em></h3>
      <div class="body">${body}</div>
    </section>`;

  const content = pending
    ? `<div class="pending">
         本章尚未炼化。<br>
          炼化管道就绪后，导入课程文字稿或视频转写即可自动生成「本意 / 引申义 / 启迪」三层解读。<br>
          <br>原文已就位，可先行诵读。
       </div>`
    : sec('本意', 'BENYI', md(d.benyi)) +
      sec('引申义', 'YINSHEN', md(d.yinshen)) +
      sec('启迪', 'QIDI', md(d.qidi));

  $('#detail').innerHTML = `
    <div class="d-head">
      <div class="d-num">第 ${c.id} 章</div>
      <h2 class="d-title">${esc(c.title)}</h2>
      <div class="d-original">${esc(c.original)}</div>
      <div class="d-tags">${(c.themes || []).map((t) => `<span>${esc(t)}</span>`).join('')}</div>
    </div>
    ${content}
    <div class="d-foot">道德经 · 炼化 —— 本意 / 引申义 / 启迪</div>`;

  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function close() {
  $('#modal').hidden = true;
  document.body.style.overflow = '';
}

document.addEventListener('click', (e) => { if (e.target.dataset.close !== undefined) close(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

let timer;
$('#search').addEventListener('input', (e) => {
  clearTimeout(timer);
  timer = setTimeout(() => { state.keyword = e.target.value; render(); }, 180);
});

load();
