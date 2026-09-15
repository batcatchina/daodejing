/* ============================================================
   问道 —— 取丹入口
   ------------------------------------------------------------
   炼化是炉子的内务。对外的正门是这里：
   人来提一个真问题，炉子从八十一章金丹里，取出最应得上的几枚。

   三层检索（纯本地，不调 LLM）：
     ① 语义桥 —— 现代问法 → 古典义理 → 指向章节
                 解决「我最近很焦虑」与「致虚极，守静笃」零字面重叠
     ② 语料直检 —— 问句里若直引原文，走 FURNACE.matchChapters
     ③ 主题降级 —— 两皆不中，按主题推荐，并如实告知

   三条原则落在此层：
     道法自然 —— 命中自有其根，不硬凑
     非恒道   —— 检索不到就说检索不到，绝不假装
     六度周全 —— 多面覆盖，深章浅章分级作答，不隐其深浅
   ============================================================ */

const ASK = (() => {

  /* ============================================================
     第一层 · 语义桥
     每组：现代问法触发词 → 义理 → 指向章节（首章最正）
     ============================================================ */

  const BRIDGE = [
    {
      key: '虚静',
      yili: '虚静守笃',
      say: '心不静，不是你不够努力，是里面太满。',
      trig: ['焦虑', '烦', '烦躁', '心烦', '静不下', '静不下来', '心乱', '不安', '躁', '坐不住',
             '睡不着', '内耗', '胡思乱想', '定不下', '太吵', '杂念', '走神', '心浮', '急'],
      yiliWords: ['静', '虚', '守', '笃', '归根', '清静'],
      ids: [16, 45, 5, 26, 15],   // 致虚极 / 清静为天下正 / 守中 / 静为躁君 / 不欲盈
      themes: ['宇宙论', '修身'],
    },
    {
      key: '柔弱',
      yili: '柔弱处上',
      say: '硬撑才累。柔软的东西活得久。',
      trig: ['太累', '好累', '撑不住', '想放弃', '扛不住', '疲惫', '累垮', '顶不住', '坚持不',
             '熬不住', '极限', '透支', '硬撑', '卷不动'],
      yiliWords: ['柔', '弱', '水', '处下', '不争'],
      ids: [76, 8, 43, 78, 52],   // 柔弱者生之徒 / 上善若水 / 至柔驰骋 / 弱胜强 / 守柔曰强
      themes: ['处世', '辩证'],
    },
    {
      key: '不争',
      yili: '不争之德',
      say: '争，是因为还没站到那个位置。',
      trig: ['争不过', '抢功', '被抢', '不公平', '憋屈', '委屈', '被人算计', '看不惯', '较劲',
             '争不来', '斗不过', '被排挤', '吃亏'],
      yiliWords: ['不争', '善下', '曲', '全', '让'],
      ids: [8, 22, 66, 68, 81],
      themes: ['处世', '治国'],
    },
    {
      key: '知足',
      yili: '知足知止',
      say: '不够的从来不是拥有的，是"还想要"。',
      trig: ['不知足', '想要更多', '不满足', '贪', '不够', '眼红', '羡慕', '攀比', '欲望',
             '停不下来', '还想要', '总嫌少', '永远不够'],
      yiliWords: ['知足', '知止', '足', '止', '俭', '啬'],
      ids: [44, 46, 33, 9, 32],   // 知足不辱 / 祸莫大于不知足 / 自知者明 / 功遂身退 / 知止不殆
      themes: ['通论', '修身'],
    },
    {
      key: '无为',
      yili: '无为顺时',
      say: '不知道该怎么动的时候，不动往往也是动。',
      trig: ['迷茫', '不知道', '怎么办', '该不该', '纠结', '选哪', '没方向', '卡住', '无力',
             '顺其自然', '随缘', '放手', '算了'],
      yiliWords: ['无为', '自然', '顺', '时', '因', '势'],
      ids: [37, 48, 64, 23, 17],  // 道常无为 / 为道日损 / 慎终如始 / 希言自然 / 我自然
      themes: ['无为', '宇宙论'],
    },
    {
      key: '豫慎',
      yili: '慎终如始',
      say: '多数翻车，发生在"快成了"的前夜。',
      trig: ['急躁', '急', '想快', '来不及', '赶进度', '粗心', '马虎', '出错', '翻车', '功亏',
             '差一点', '快成了', '松懈', '浮躁'],
      yiliWords: ['慎', '细', '豫', '始', '几', '微'],
      ids: [64, 63, 15, 24, 41],  // 慎终如始 / 天下大事必作于细 / 豫兮若冬涉川 / 企者不立 / 大器晚成
      themes: ['宇宙论', '治国'],
    },
    {
      key: '养生',
      yili: '含德之厚',
      say: '养生的关键不在加，在少耗。',
      trig: ['身体', '健康', '养生', '失眠', '生病', '疲惫', '气血', '虚了', '调理', '亚健康',
             '熬夜', '元气', '精力', '恢复', '病'],
      yiliWords: ['和', '气', '生', '养', '啬', '柔'],
      ids: [55, 8, 42, 59, 50],   // 知和曰常 / 上善若水 / 冲气以为和 / 莫若啬 / 善摄生者
      themes: ['修身', '宇宙论'],
    },
    {
      key: '观妙',
      yili: '观妙观徼',
      say: '看得见的，从来不是全部。',
      trig: ['本质', '真相', '看清', '看透', '规律', '为什么', '底层', '核心', '根本', '实在',
             '道理', '究竟', '什么叫', '是什么'],
      yiliWords: ['观', '妙', '徼', '玄', '明', '反'],
      ids: [1, 16, 21, 14, 40],   // 众妙之门 / 归根曰静 / 其中有信 / 复归于无物 / 反者道之动
      themes: ['宇宙论'],
    },
    {
      key: '处下',
      yili: '善下为谷',
      say: '想让人跟着你，先站到比他们低的地方。',
      trig: ['领导', '管理', '带团队', '下属', '同事', '相处', '人际关系', '管人', '威信',
             '服人', '上位', '老板', '团队', '合作'],
      yiliWords: ['下', '善下', '江', '谷', '后', '不争'],
      ids: [66, 17, 8, 61, 68],   // 江海善下 / 太上不知有之 / 上善若水 / 大邦者下流 / 善用人为之下
      themes: ['治国', '处世'],
    },
    {
      key: '祸福',
      yili: '祸福相倚',
      say: '眼前的好事坏事，都还没到下结论的时候。',
      trig: ['得失', '成败', '倒霉', '好运', '失败', '挫折', '不顺', '失去', '错过了', '后悔',
             '运气', '起伏', '反转', '亏了'],
      yiliWords: ['祸', '福', '反', '复', '倚', '伏', '成败', '得失'],
      ids: [58, 2, 40, 64, 22],   // 祸兮福所倚 / 有无相生 / 反者道之动 / 慎终如始 / 曲则全
      themes: ['辩证', '宇宙论'],
    },
    {
      key: '损益',
      yili: '损之又损',
      say: '加法做到头，就该做减法了。',
      trig: ['放不下', '执念', '极致', '完美', '越多越好', '堆砌', '复杂', '负担', '舍不得',
             '断舍离', '精简', '减法', '包袱', '舍不得'],
      yiliWords: ['损', '益', '盈', '虚', '朴', '素'],
      ids: [48, 9, 15, 19, 11],   // 为道日损 / 持而盈之 / 不欲盈 / 见素抱朴 / 无之以为用
      themes: ['宇宙论', '辩证'],
    },
    {
      key: '天道',
      yili: '天道循环',
      say: '万物有自己的节律，人不是例外。',
      trig: ['自然', '天地', '宇宙', '规律', '循环', '周期', '四季', '天人', '万物', '天道',
             '法则', '运行', '变化'],
      yiliWords: ['自然', '天', '道', '循环', '周行', '反'],
      ids: [25, 40, 77, 42, 51],   // 道法自然 / 反者道之动 / 天之道损有余 / 冲气以为和 / 道生之
      themes: ['宇宙论'],
    },
    {
      key: '自知',
      yili: '自知者明',
      say: '看清自己，比看清别人有用得多。',
      trig: ['认识自己', '了解自己', '自我', '看不清自己', '自省', '反省', '我是谁', '定位',
             '价值', '意义', '自卑', '自信'],
      yiliWords: ['自知', '明', '己', '身', '自', '知人'],
      ids: [33, 72, 13, 71, 10],  // 自知者明 / 自知不自见 / 吾有大患为吾有身 / 知不知尚矣 / 载营魄抱一
      themes: ['修身'],
    },
    {
      key: '用兵',
      yili: '不得已而用之',
      say: '能不用的力量，才是真正的力量。',
      trig: ['冲突', '对抗', '竞争', '打仗', '撕破脸', '敌人', '开战', '反击', '攻击', '博弈',
             '斗争', '硬碰硬'],
      yiliWords: ['兵', '战', '争', '哀', '慈'],
      ids: [31, 69, 30, 36, 67],  // 兵者不祥之器 / 哀者胜矣 / 物壮则老 / 柔弱胜刚强 / 三宝
      themes: ['治国'],
    },
    {
      key: '幼柔',
      yili: '复归于婴儿',
      say: '回到最初那种柔软，不是退化，是回到源头。',
      trig: ['初心', '孩子', '童年', '单纯', '纯粹', '回到', '本真', '赤子', '变复杂了'],
      yiliWords: ['婴儿', '赤子', '朴', '素', '复归'],
      ids: [28, 55, 10, 20, 19],
      themes: ['修身', '宇宙论'],
    },
    {
      key: '知止',
      yili: '知止不殆',
      say: '知道在哪停，比知道往哪冲更值钱。',
      trig: ['停', '停下来', '该不该继续', '放弃', '退', '收手', '见好就收', '到底了'],
      yiliWords: ['止', '退', '已', '身退', '不殆'],
      ids: [9, 32, 44, 46, 77],
      themes: ['通论'],
    },
  ];

  /* ============================================================
     权重
     ============================================================ */

  const W = {
    trig: 10,      // 触发词命中（最强信号：用户在说这件事）
    yiliTop: 8,    // 义理词命中
    kw: 2,         // 题面字与章节 keywords 重合（每字）
    theme: 3,      // 章节 themes 与簇主题吻合
    order: 6,      // 桥内排序：首章最正，逐位递减
    orderStep: 1.2,
    refined: 1.5,  // 已炼化章加成（答得深）
  };

  /* ============================================================
     辅助
     ============================================================ */

  const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

  function cleanQ(q) {
    return String(q || '')
      .replace(/[，。；：、！？（）「」『』《》〈〉·…—\s]/g, '')
      .toLowerCase();
  }

  function chapterOf(data, id) {
    return data.chapters.find((c) => c.id === id) || null;
  }

  function isDeep(data, id) {
    return Boolean(data.detail && data.detail[String(id)]);
  }

  function themesOf(data, id) {
    const c = chapterOf(data, id);
    return (c && c.themes) || [];
  }

  function keywordsOf(data, id) {
    const c = chapterOf(data, id);
    return (c && c.keywords) || [];
  }

  /* 找出问题命中的语义簇 */
  function bridgesOf(q) {
    const hit = [];
    for (const b of BRIDGE) {
      const trigs = b.trig.filter((t) => q.includes(t));
      if (trigs.length) hit.push({ b, trigs });
    }
    return hit;
  }

  /* ============================================================
     三层检索 · 主入口
     返回 { mode, hits[], bridges[], note }
       mode: 'bridge' 语义桥 | 'quote' 语料直检 | 'theme' 主题降级
     ============================================================ */

  function query(text, data, opt) {
    // opt 可传数字（视为 limit）或 {limit}
    if (typeof opt === 'number') opt = { limit: opt };
    opt = opt || {};
    const raw = String(text || '').trim();
    const q = cleanQ(raw);

    if (!raw) {
      return { mode: 'empty', hits: [], bridges: [], note: '尚未提问。' };
    }

    const Qmax = clampInt(opt.limit, 2, 5, 4);

    /* ---------- 第二层先跑：语料直检（用户直引原文，最准）---------- */
    const mh = FURNACE.matchChapters(raw);
    /* ---------- 第一层：语义桥 ---------- */
    const bridges = bridgesOf(q);

    if (mh.length) {
      return quoteAnswer(raw, mh, data, Qmax, bridges);
    }
    if (bridges.length) {
      return bridgeAnswer(raw, q, bridges, data, Qmax);
    }
    /* ---------- 第三层：主题降级 ---------- */
    return themeAnswer(raw, q, data, Qmax);
  }

  /* ---------- ② 语料直检作答 ---------- */

  function quoteAnswer(raw, mh, data, Qmax, bridges) {
    // 命中按 n 降序（n=99 为显式章号，优先级最高）
    const best = {};
    for (const h of mh) {
      if (!best[h.id] || h.n > best[h.id].n) best[h.id] = h;
    }
    const ids = Object.keys(best).map(Number)
      .sort((a, b) => (best[b].n - best[a].n) || (a - b))
      .slice(0, Qmax);

    const hits = ids.map((id, i) => {
      const why = best[id].n >= 99
        ? '你在问句里点明了此章'
        : `问句里引到了此章原文（「${best[id].frag}」）`;
      return makeHit(data, id, {
        score: 100 - i * 5,
        why,
        via: '直引原文',
      });
    }).filter(Boolean);

    const note = hits.length === 1
      ? '问句里引到了原章句，此章正应你。'
      : '问句里引到了原章句，以下数章正应你。';

    return { mode: 'quote', hits, bridges, note, raw };
  }

  /* ---------- ① 语义桥作答 ---------- */

  function bridgeAnswer(raw, q, bridges, data, Qmax) {
    const score = {};   // id -> {score, why[], via[]}

    for (const { b, trigs } of bridges) {
      b.ids.forEach((id, idx) => {
        if (!score[id]) score[id] = { score: 0, why: [], via: [] };
        const s = score[id];
        s.score += W.order - idx * W.orderStep;   // 桥内排序
        s.why.push(b.yili);
        s.via.push(b.key);
        // 簇主题吻合
        const ct = themesOf(data, id);
        if (b.themes.some((t) => ct.includes(t))) s.score += W.theme;
      });

      // 触发词命中：直接加权（用户说的就是这件事）
      const tk = trigs[0];
      const boost = W.trig * Math.min(trigs.length, 2);
      // 触发词归到本簇指向的首章
      const first = b.ids[0];
      if (!score[first]) score[first] = { score: 0, why: [], via: [] };
      score[first].score += boost;
      score[first].trig = trigs;
      score[first].bridgeYili = b.yili;
      score[first].bridgeSay = b.say;

      // 义理词命中（问题里带古义理词）
      const yh = (b.yiliWords || []).filter((w) => q.includes(w));
      if (yh.length) {
        score[b.ids[0]].score += W.yiliTop * Math.min(yh.length, 2);
        score[b.ids[0]].yiliHit = yh;
      }
    }

    // 题面字与章节 keywords 重合
    if (q.length >= 2) {
      for (const id of Object.keys(score)) {
        const kws = keywordsOf(data, Number(id));
        let n = 0;
        for (const k of kws) if (k && q.includes(k)) n++;
        score[id].score += Math.min(n, 4) * W.kw;
      }
    }

    // 已炼化加成
    for (const id of Object.keys(score)) {
      if (isDeep(data, Number(id))) score[id].score *= W.refined;
    }

    const ranked = Object.keys(score)
      .map((k) => ({ id: Number(k), ...score[k] }))
      .sort((a, b) => b.score - a.score || a.id - b.id)
      .slice(0, Qmax);

    const hits = ranked.map((r) => {
      const b0 = bridges.find((x) => x.b.ids.includes(r.id));
      const why = r.trig && r.bridgeYili
        ? `你问「${r.trig.slice(0, 3).join('、')}」，此章讲的是<b>${r.bridgeYili}</b>——${b0 ? b0.b.say : ''}`
        : `此章与「<b>${r.why[0] || ''}</b>」之义相扣`;
      return makeHit(data, r.id, { score: r.score, why, via: r.via.join(' · ') });
    }).filter(Boolean);

    const prime = bridges[0].b;
    const note = hits.length === 1
      ? `此问落于「<b>${prime.yili}</b>」一义，炉中恰有此丹。`
      : `此问落于「<b>${prime.yili}</b>」一义，取丹 ${hits.length} 枚，自近及远。`;

    return { mode: 'bridge', hits, bridges, note, raw };
  }

  /* ---------- ③ 主题降级作答 ---------- */

  function themeAnswer(raw, q, data, Qmax) {
    // 从题面提取可用字，匹配 keywords
    const T = new Set(data.chapters.flatMap((c) => c.keywords || []));
    const qs = [...new Set(q.split(''))].filter((c) => T.has(c));

    const score = {};
    if (qs.length) {
      for (const c of data.chapters) {
        let n = 0;
        for (const k of c.keywords || []) if (qs.includes(k)) n++;
        if (n) score[c.id] = { score: n * W.kw * 2, why: [`题面之字「${qs.slice(0, 4).join('、')}」与此章相应`], via: ['字检'] };
      }
    }

    // keywords 匹配不足时，按主题分布给广谱推荐（如实告知）
    if (!Object.keys(score).length) {
      for (const c of data.chapters) {
        score[c.id] = { score: 0, why: ['未在题面找到直接对应，此章或可相参'], via: ['泛览'] };
      }
    }

    for (const id of Object.keys(score)) {
      if (isDeep(data, Number(id))) score[id].score *= W.refined;
      score[id].score += Math.max(0, 88 - Number(id)) * 0.02;   // 轻微偏向约前部名章
    }

    const ranked = Object.keys(score)
      .map((k) => ({ id: Number(k), ...score[k] }))
      .sort((a, b) => b.score - a.score || a.id - b.id)
      .slice(0, Qmax);

    const hits = ranked.map((r) =>
      makeHit(data, r.id, { score: r.score, why: r.why[0], via: r.via.join('') })
    ).filter(Boolean);

    const note = qs.length
      ? '未落于某一路义理，只在字面上有此相应，<b>权作参证</b>。'
      : '此问未在炉中找到直接对应。<b>如实相告</b>——以下数章姑且相参，或可自其中另生一问。';

    return { mode: 'theme', hits, bridges: [], note, raw };
  }

  /* ---------- 组装一枚"丹"（分级）---------- */

  function makeHit(data, id, extra) {
    const c = chapterOf(data, id);
    if (!c) return null;
    const d = deepOf(data, id);

    return Object.assign({
      id,
      title: c.title,
      original: c.original,
      danzi: c.danzi || (d && d.danzi) || '',
      danjue: c.danjue || (d && d.danjue) || '',
      themes: c.themes || [],
      deep: Boolean(d),
      detail: d,
    }, extra);
  }

  function deepOf(data, id) {
    return (data.detail && data.detail[String(id)]) || null;
  }

  function clampInt(v, lo, hi, dflt) {
    const n = Number(v);
    if (!Number.isFinite(n)) return dflt;
    return Math.max(lo, Math.min(hi, Math.round(n)));
  }

  /* ============================================================
     索引：主题 / 丹字（供问道专页浏览用）
     ============================================================ */

  function themeIndex(data) {
    const m = new Map();
    for (const c of data.chapters) {
      for (const t of c.themes || []) {
        if (!m.has(t)) m.set(t, []);
        m.get(t).push(c.id);
      }
    }
    return [...m.entries()].map(([name, ids]) => ({ name, ids, n: ids.length }))
      .sort((a, b) => b.n - a.n);
  }

  function danziIndex(data) {
    const m = new Map();
    for (const c of data.chapters) {
      const z = c.danzi;
      if (!z) continue;
      if (!m.has(z)) m.set(z, []);
      m.get(z).push(c.id);
    }
    return [...m.entries()]
      .map(([zi, ids]) => ({ zi, ids, deep: ids.some((i) => isDeep(data, i)) }))
      .sort((a, b) => (b.deep - a.deep) || (b.ids.length - a.ids.length) || a.zi.localeCompare(b.zi));
  }

  /* 随机取一枚已炼化金丹（首页示范"取用"）*/
  function sampleDan(data, n) {
    const deep = data.chapters.filter((c) => isDeep(data, c.id));
    const sorted = deep.slice().sort((a, b) => a.id - b.id);
    return typeof n === 'number' ? sorted.slice(0, n) : sorted;
  }

  /* 可试之问（取自语义桥，保证必中）*/
  function samples(data, n) {
    const out = BRIDGE.slice(0, n || 8).map((b) => ({
      q: b.trig[0],
      yili: b.yili,
    }));
    return out;
  }

  return {
    BRIDGE, W,
    query, bridgesOf,
    themeIndex, danziIndex, sampleDan, samples,
    cleanQ, isDeep,
  };
})();
