/* ============================================================
   炼化过程 · 品质分级 · 本地丹库
   ------------------------------------------------------------
   三件事收在一处：
     ① 炼化六阶段 —— 把原来 1.1 秒的黑盒拆成看得见的进度
     ② 五级品质   —— 极品 / 上品 / 中品 / 下品 / 未成
     ③ 本地丹库   —— 炼好的丹存浏览器，藏丹阁可见
   ============================================================ */
const PROGRESS = (() => {

  /* ---------- ① 炼化六阶段 ---------- */
  const STAGES = [
    { key: 'take', name: '接 料', who: 'tong', note: '道童接住你投的料' },
    { key: 'know', name: '辨 料', who: 'tong', note: '认出是原文、转写稿，还是心得' },
    { key: 'lock', name: '扣 章', who: 'shi',  note: '在八十一章里扣定是哪一章' },
    { key: 'fire', name: '试 火', who: 'shi',  note: '丹师起火，测其火候' },
    { key: 'judge',name: '判 丹', who: 'shi',  note: '定其品质，判能不能成丹' },
    { key: 'born', name: '成 丹', who: 'ling', note: '炉灵收丹入阁' },
  ];

  /* ---------- ② 五级品质 ---------- */
  const GRADES = [
    { key: '极品', min: 95, cls: 'g-top',  mark: '✦', note: '火候纯青，一字一重天' },
    { key: '上品', min: 85, cls: 'g-up',   mark: '◆', note: '火候已足，可结金丹' },
    { key: '中品', min: 70, cls: 'g-mid',  mark: '◈', note: '丹已成，尚需精炼' },
    { key: '下品', min: 55, cls: 'g-low',  mark: '◇', note: '丹形粗具，其光未圆' },
    { key: '未成', min: 0,  cls: 'g-none', mark: '○', note: '火候未到，炼不出丹' },
  ];

  function grade(score) {
    const s = Math.max(0, Math.min(100, Number(score) || 0));
    return GRADES.find((g) => s >= g.min) || GRADES[GRADES.length - 1];
  }

  /* ---------- ③ 本地丹库 ---------- */
  const KEY = 'daodejing_dans_v1';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function save(dan) {
    if (!dan || dan.id == null) return;
    const all = load();
    all[String(dan.id)] = Object.assign({}, all[String(dan.id)], dan, {
      at: Date.now(),
    });
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch (e) {
      /* 隐私模式下 localStorage 可能不可写，静默降级：本次仍能看到，刷新不保留 */
    }
  }

  function get(id) {
    return load()[String(id)] || null;
  }

  function all() {
    const m = load();
    return Object.keys(m).map((k) => m[k]).sort((a, b) => (b.at || 0) - (a.at || 0));
  }

  function count() {
    return Object.keys(load()).length;
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) { /* noop */ }
  }

  /* ---------- 过程条渲染 ---------- */
  /* steps: 已完成的阶段数（0 ~ STAGES.length）
     active: 正在进行的阶段下标（-1 表示无） */
  function barHtml(steps, active) {
    const cells = STAGES.map((s, i) => {
      const done = i < steps;
      const on = i === active;
      const cls = done ? 'pw-done' : on ? 'pw-on' : 'pw-wait';
      const mark = done ? '✓' : on ? '<i class="pw-spin"></i>' : (i + 1);
      return `<span class="ps-cell ${cls}">
        <span class="ps-dot">${mark}</span>
        <span class="ps-name">${s.name}</span>
      </span>`;
    }).join('<span class="ps-link"></span>');

    const pct = Math.round((steps / STAGES.length) * 100);
    return `<div class="prog">
      <div class="prog-bar"><span class="prog-fill" style="width:${pct}%"></span></div>
      <div class="prog-cells">${cells}</div>
      <div class="prog-note">${active >= 0 && STAGES[active]
        ? escHtml(STAGES[active].note)
        : steps >= STAGES.length ? '炼化完毕' : ''}</div>
    </div>`;
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* 逐步推进：每步之间留出可感知的间隔，让人看见"正在炼"
     onStep(i) 在每一步开始时回调，返回 Promise 或直接返回 */
  function run(onStep, stepMs) {
    const gap = stepMs == null ? 420 : stepMs;
    return new Promise((resolve) => {
      let i = 0;
      const tick = () => {
        if (i >= STAGES.length) { resolve(); return; }
        try { if (onStep) onStep(i, STAGES[i]); } catch (e) { /* 单步出错不阻断整体 */ }
        i += 1;
        setTimeout(tick, gap);
      };
      tick();
    });
  }

  return { STAGES, GRADES, grade, load, save, get, all, count, clear, barHtml, run };
})();
