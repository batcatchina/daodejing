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

  // ---------- 绝对化词（违「道可道，非恒道」）----------
  const ABSOLUTE = /一定|必然|绝对|百分百|百分之百|必须|永远|唯一|完全|彻底|所有|任何|绝不|毫无|无可/;
  // ---------- 余地词（合「非恒道」）----------
  const HEDGE = /或许|也许|大概|似乎|可能|未必|不一定|未必|或|似|若|如|譬|犹|象|仿佛|近乎|几于|往往|常常|大抵|大体|多半|或多或少/;

  // ---------- 维度探针 ----------
  const DIM_PROBE = {
    人生: /人生|为人|处世|修身|自省|知己|做主|自主|选择|取舍|进退|得失|成败|荣辱|命运|志向|心性/,
    健康: /健康|养生|身体|身心|息|气|呼吸|静坐|睡眠|饮食|调和|病|养|康|安|寿|长久/,
    自然: /自然|天地|万物|四时|阴阳|宇宙|规律|循环|周期|水流|山川|草木|风雨|生长|消长|周行/,
  };

  // ---------- 义理簇（判断覆盖是否多面）----------
  const YILI_CLUSTERS = [
    /无|虚|空|静|朴|素|淡|简|寡/,                     // 虚无淡泊
    /柔|弱|水|谷|下|谦|卑|退|让|不争/,                 // 柔弱处下
    /反|复|归|循环|周行|往返|转化|转|还|重/,            // 往复循环
    /自然|天地|万物|宇宙|道|法则|规律/,                // 天道自然
    /生|化|养|长|蓄|育|成|损|益|盈|虚/,                 // 生化损益
    /心|性|命|身|神|形|精|气|欲|情|念|己/,              // 身心性命
    /治|政|民|国|天下|兵|战|争|与|取|守/,               // 治世用兵
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

    // ── 短引优先：用户常只引半句（「上善若水」「知足不辱」），
    //    4~5 字连续命中即足以定章，先收，免得被别的信号抢走。
    for (const c of CHAP_INDEX) {
      for (const n of [5, 4]) {
        if (c.flat.length < n) continue;
        let found = false;
        for (let i = 0; i <= c.flat.length - n; i++) {
          if (flat.includes(c.flat.slice(i, i + n))) {
            hits.push({ id: c.id, n: n + 1, frag: c.orig.slice(i, i + n) }); // 记 5/6，高于「显式提及」
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
    if (hits.length) return hits;   // 短引已定章，不再走长匹配

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
  // 四条判据，对应《道德经》三原则 + 多维度：
  //   道法自然（根）· 道可道非恒道（余地）· 六度周全（多面）· 多维度（三维）
  function assay(text) {
    text = String(text || '').trim();
    const reasons = [], missing = [];
    let score = 0;

    /* ── 一、道法自然：料是否"本来如此"（原文之根最上） ── */
    const hits = matchChapters(text);
    const chaps = [...new Set(hits.map((h) => h.id))].sort((a, b) => a - b);
    let rootTier = 0;   // 3=直引 2=近引 1=关联 0=无根
    if (chaps.length) {
      const best = Math.max(...hits.map((h) => h.n));
      if (best >= 12)      { score += 45; rootTier = 3; reasons.push(`直引原文，扣第 ${chaps.slice(0,5).join('、')} 章（${best} 字连续命中）`); }
      else if (best >= 9)  { score += 35; rootTier = 2; reasons.push(`近引原文章句，扣第 ${chaps.slice(0,5).join('、')} 章`); }
      else if (best >= 6)  { score += 25; rootTier = 1; reasons.push(`含原文片段，关联第 ${chaps.slice(0,5).join('、')} 章`); }
      else                 { score += 15; rootTier = 1; reasons.push(`显式提及第 ${chaps.slice(0,5).join('、')} 章`); }
    } else {
      missing.push('未扣住任何原文章句——无根之木，炼不出丹');
    }

    /* ── 二、道可道，非恒道：是否留有余地（非断言） ── */
    const isAbs = ABSOLUTE.test(text);
    const hedges = (text.match(new RegExp(HEDGE.source, 'g')) || []).length;
    let hengTier = 0;   // 2=有余地 1=中性 0=绝对化
    if (isAbs && hedges === 0) {
      score -= 14;
      hengTier = 0;
      missing.push('语多断然（一定／必然／绝对），失「非恒道」之圆转');
    } else if (hedges >= 2 || (!isAbs && hedges >= 1)) {
      score += 12;
      hengTier = 2;
      reasons.push('语留余地，合「道可道，非恒道」之圆转');
    } else {
      hengTier = 1;
    }

    /* ── 三、六度周全（第二章）：是否多面切入 ── */
    const clusters = YILI_CLUSTERS.filter((re) => re.test(text)).length;
    let zhouTier = 0;   // 2=周全 1=单面 0=未涉
    if (clusters >= 2 || chaps.length >= 2) {
      score += 10;
      zhouTier = 2;
      reasons.push(clusters >= 2
        ? `义理跨 ${clusters} 面（多章相证或数义并举），见周全之度`
        : `扣 ${chaps.length} 章，可相参证`);
    } else if (clusters === 1 || chaps.length === 1) {
      zhouTier = 1;
    }

    /* ── 四、多维度：是否触及人生／健康／自然 ── */
    const dims = Object.keys(DIM_PROBE).filter((k) => DIM_PROBE[k].test(text));
    if (dims.length >= 2) {
      score += 6;
      reasons.push(`兼涉 ${dims.join('、')} 数维，可作三层启迪`);
    }

    /* ── 五、实质（料） ── */
    const L = text.length;
    if (L < 8)       missing.push('篇幅过短，不足成丹');
    else if (L < 30) { score += 8;  reasons.push('有实义，然尚简'); }
    else if (L < 300){ score += 20; reasons.push(`篇幅适中（${L} 字），可炼`); }
    else             { score += 18; reasons.push(`料足（${L} 字），需先剔芜存菁`); }

    /* ── 六、是否合义理（向） ── */
    const yili = [...YILI].filter((w) => text.includes(w));
    if (yili.length >= 5)      { score += 25; reasons.push(`义理词密集（${yili.slice(0,6).join('、')}），在道上`); }
    else if (yili.length >= 2) { score += 15; reasons.push(`涉义理（${yili.slice(0,5).join('、')}）`); }
    else if (yili.length === 1){ score += 6;  reasons.push(`仅触及「${yili[0]}」一隅，未成体系`); }
    else                       { missing.push('未涉道之语汇，恐非《道德经》所能答'); }

    /* ── 七、扣分项 ── */
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

    /* ── 三问：显性为表，让用户看见炉子在怎么想 ── */
    const Q = [
      {
        key: '自然',
        name: '道法自然',
        tier: rootTier,
        say: rootTier === 3 ? '直引原文，不假雕琢'
           : rootTier === 2 ? '近引章句，其来有自'
           : rootTier === 1 ? '仅沾原文之迹，根尚浅'
           : '无原文之根——道法自然，非强作可成',
      },
      {
        key: '恒道',
        name: '非恒道',
        tier: hengTier,
        say: hengTier === 2 ? '留有回旋，非断言'
           : hengTier === 1 ? '语尚平实，可更圆转'
           : '语多断然，失圆转之妙',
      },
      {
        key: '周全',
        name: '六度周全',
        tier: zhouTier,
        say: zhouTier === 2 ? (clusters >= 2 ? `义理跨 ${clusters} 面，见周全之度` : `扣 ${chaps.length} 章，可相参证`)
           : zhouTier === 1 ? '仅扣一章一面——可再引他章相证'
           : '未涉义理，无从周全',
      },
    ];
    if (dims.length) Q.push({ key: '三维', name: '多维度', tier: 2, say: `兼涉 ${dims.join('、')}` });

    return { score, level, verdict, reasons, missing, chapters: chaps, ok, principles: Q, dims };
  }

  return { buildIndex, assay, matchChapters, depunct };
})();
