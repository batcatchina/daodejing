/* ============================================================
   炼化炉 · 火候判定与结丹
   纯浏览器端实现，与 scripts/goldwords.py 同源同逻辑
   ============================================================ */

const FURNACE = (() => {

  // ---------- 义理词库（有这些，说明在谈"道"的层面）----------
  const YILI = new Set(`道 德 无 有 虚 静 柔 弱 朴 素 反 复 归 自然 无为 不争 知足 知止 谦 谷 水 玄 同
阴阳 和 气 生 化 损 益 盈 缺 曲 全 刚 强 微 明 隐 显 母 根 本 末 厚 薄 实 华
天地 万物 宇宙 法则 规律 循环 周行 恒 常 变 应 势 因 顺 时 位 度 中 守
心 性 命 神 形 精 气 志 欲 情 念 主 自 己 身 人 内 外
治 政 民 国 天下 兵 战 争 让 与 取 得 失 成 败 祸 福 利 害`.split(/\s+/).filter(Boolean));

  // ---------- 空话/鸡汤特征 ----------
  const EMPTY_PATTERNS = [
    [/加油|努力|坚持就是胜利|相信自己|你是最棒/, '口号式激励'],
    [/心态决定|格局|认知升级|底层逻辑|降维打击|顶层设计|破圈|赋能/, '流行话术'],
    [/一定要|必须成功|绝对|百分百|必然/, '绝对化断言'],
    [/^[^。！？]{0,12}[！？]{1,}$/, '纯情绪短句'],
  ];

  const PUNCT = /[，。；：、！？（）「」『』《》〈〉·…—\s]/g;
  const depunct = (s) => String(s || '').replace(PUNCT, '');

  // ---------- 章句索引：在浏览器端建 ----------
  let CHAP_INDEX = null;   // [{id, flat, orig}]

  function buildIndex(chapters) {
    CHAP_INDEX = chapters.map((c) => ({
      id: c.id,
      orig: c.original,
      flat: depunct(c.original),
    }));
  }

  function matchChapters(text) {
    if (!CHAP_INDEX) return [];
    const flat = depunct(text);
    const hits = [];
    for (const c of CHAP_INDEX) {
      for (const n of [12, 9, 6]) {
        let found = false;
        for (let i = 0; i <= c.flat.length - n; i++) {
          if (flat.includes(c.flat.slice(i, i + n))) {
            hits.push({ id: c.id, n, frag: c.orig.slice(i, i + n) });
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
    // 显式章号
    const CN = { 一:1, 二:2, 三:3, 四:4, 五:5, 六:6, 七:7, 八:8, 九:9 };
    for (const m of text.matchAll(/第\s*([0-9一二三四五六七八九十]+)\s*章/g)) {
      const raw = m[1];
      let cid = 0;
      if (/^\d+$/.test(raw)) cid = +raw;
      else if (CN[raw]) cid = CN[raw];
      else if (raw.includes('十')) {
        const [a, b] = raw.split('十');
        cid = (a ? (CN[a] || 1) : 1) * 10 + (b ? (CN[b] || 0) : 0);
      }
      if (cid >= 1 && cid <= 81) hits.push({ id: cid, n: 99, frag: `第${cid}章` });
    }
    return hits;
  }

  // ---------- 火候判定（宽进严出）----------
  function assay(text) {
    text = String(text || '').trim();
    const reasons = [], missing = [];
    let score = 0;

    // 一、是否扣原文（根）
    const hits = matchChapters(text);
    const chaps = [...new Set(hits.map((h) => h.id))].sort((a, b) => a - b);
    if (chaps.length) {
      const best = Math.max(...hits.map((h) => h.n));
      if (best >= 12)      { score += 45; reasons.push(`直引原文，扣第 ${chaps.slice(0,5).join('、')} 章（${best} 字连续命中）`); }
      else if (best >= 9)  { score += 35; reasons.push(`近引原文章句，扣第 ${chaps.slice(0,5).join('、')} 章`); }
      else if (best >= 6)  { score += 25; reasons.push(`含原文片段，关联第 ${chaps.slice(0,5).join('、')} 章`); }
      else                 { score += 15; reasons.push(`显式提及第 ${chaps.slice(0,5).join('、')} 章`); }
    } else {
      missing.push('未扣住任何原文章句——无根之木，炼不出丹');
    }

    // 二、是否有实质（料）
    const L = text.length;
    if (L < 8)       missing.push('篇幅过短，不足成丹');
    else if (L < 30) { score += 8;  reasons.push('有实义，然尚简'); }
    else if (L < 300){ score += 20; reasons.push(`篇幅适中（${L} 字），可炼`); }
    else             { score += 18; reasons.push(`料足（${L} 字），需先剔芜存菁`); }

    // 三、是否合义理（向）
    const yili = [...YILI].filter((w) => text.includes(w));
    if (yili.length >= 5)      { score += 25; reasons.push(`义理词密集（${yili.slice(0,6).join('、')}），在道上`); }
    else if (yili.length >= 2) { score += 15; reasons.push(`涉义理（${yili.slice(0,5).join('、')}）`); }
    else if (yili.length === 1){ score += 6;  reasons.push(`仅触及「${yili[0]}」一隅，未成体系`); }
    else                       { missing.push('未涉道之语汇，恐非《道德经》所能答'); }

    // 四、扣分项
    for (const [re, label] of EMPTY_PATTERNS) {
      if (re.test(text)) {
        score -= 22;
        missing.push(`见「${label}」之弊，非道之实`);
        break;
      }
    }

    score = Math.max(0, Math.min(100, score));

    let level, verdict, ok;
    if (score >= 75)      { level = '上品·可炼'; verdict = '火候已足，可结金丹。'; ok = true; }
    else if (score >= 55) { level = '中品·可炼'; verdict = '火候尚可，可结丹，然需精炼。'; ok = true; }
    else if (score >= 35) { level = '下品·勉炼'; verdict = '料薄根浅，可试炼，恐难成大丹。'; ok = true; }
    else                  { level = '火候未到'; verdict = '此物入炉，炼不出丹。'; ok = false; }

    // 无根者一律不结丹（宽进严出的底线）
    if (!chaps.length) {
      ok = false;
      level = '火候未到';
      verdict = '无原文之根，不成金丹。';
    }

    return { score, level, verdict, reasons, missing, chapters: chaps, ok };
  }

  return { buildIndex, assay, matchChapters, depunct };
})();
