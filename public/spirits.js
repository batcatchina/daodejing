/* ============================================================
   炉中三位 · AI 角色
   ------------------------------------------------------------
   炼化炉是 AI 炉子。炉中无闲人，做事的三位都是 AI：

     道童 · TONG  —— 唯一入口。接料、接问、转交
     丹师 · SHI   —— 试火候、判成丹、说其所以然（炼化线）
     炉灵 · LING  —— 守八十一章金丹，替人取丹（问道线）

   通路是个闭环，且只有一个门：

                 ┌─ 炼化 → 道童转交 → 丹师试火 → 成丹 / 否丹
     有人来 ─→ 道童 ┤
                 └─ 问道 → 道童转交 → 炉灵取丹 → 金丹 / 解惑

   无论炼化还是问道，都先过道童这一关——他是门。
   道童不判、不取，只负责"接住"与"转交"。
   判断在 furnace.js（火候）与 ask.js（取丹），此处只说话与落款。

   三位各有口吻：道童恭谨利落，丹师简断有据，炉灵平和不居功。
   ============================================================ */

const SPIRITS = (() => {

  const ROLES = {
    tong: {
      key: 'tong',
      zi: '童',
      name: '道 童',
      en: 'TONG',
      duty: '接 料 · 接 问 · 转 交',
      // 自我介绍：用在角色条
      intro: '炉门口接料的道童。你要炼化，我把料送丹师；你要问道，我把问送炉灵。料与问，我都照单全收。',
      says: {
        empty:  '炉里空着，请先投料。',
        ok:     '料已收下，这就转交丹师。',
        thin:   '料薄了些，我仍替你送进去——丹师自有话说。',
        rich:   '这份料厚，我先替你去芜存菁，再转丹师。',
        srt:    '这是转写稿，我先把时间轴剥了再转丹师。',
        av:     '音视频我接不住——那不是我这双手能办的，容我如实相告。',
        file:   '文件已读过，原样转丹师，不改一字。',
        url:    '网页取到了，正文在此，转丹师。',
        // ── 问道线：道童接问 ──
        ask:    '此问已接，我这就转炉灵——取丹是他的本事。',
        askEmpty:'问什么？你说，我替你去叩炉灵。',
        askThin: '这一问还虚，我先照转；要不要再添两句，你自己掂量。',
      },
    },

    shi: {
      key: 'shi',
      zi: '师',
      name: '丹 师',
      en: 'SHI',
      duty: '试 火 · 判 丹',
      intro: '道童转来的料，由我试火。我只问一句：此料扣得住原文么？扣不住，火再旺也不成丹。',
      says: {
        ready:  '火候已足，可以结丹。',
        pass:   '火候尚可，成丹，但需精炼。',
        weak:   '料薄根浅，勉可为丹，恐不大。',
        deny:   '此料炼不出丹。我不说好听话。',
        noroot: '无原文之根——这是炼不出丹的根本缘故。',
      },
    },

    ling: {
      key: 'ling',
      zi: '灵',
      name: '炉 灵',
      en: 'LING',
      duty: '守 丹 · 取 丹 · 解 惑',
      intro: '守丹的炉灵。道童把问转来，我从八十一章里指给你哪几章答得上。',
      says: {
        bridge: '道童转来的问，落在一路义理上。我取几枚来。',
        quote:  '你引了原文，那便直取此章。',
        theme:  '题面未扣住义理，我只在字面上找出相近的。权作参证。',
        deep:   '此章金丹已成，全貌在此。',
        shallow:'此章金丹未炼——我只有它的原文，不替它编造。',
        none:   '炉中无丹可应此问。我不装作有。',
      },
    },
  };

  /* 谁把话转给谁 —— 通路写在数据里，不散在调用处 */
  const LINE = {
    forge: ['tong', 'shi'],   // 炼化：道童 → 丹师
    ask:   ['tong', 'ling'],  // 问道：道童 → 炉灵
  };

  /* 角色条：在关键节点亮出"谁在做这件事" */
  function strip(key, line, opt) {
    opt = opt || {};
    const r = ROLES[key];
    if (!r) return '';
    const tone = opt.tone || 'idle';
    return `<div class="spirit sp-${r.key} sp-${tone}">
      <span class="sp-seal">${esc(r.zi)}</span>
      <span class="sp-name">${esc(r.name)}</span>
      <span class="sp-duty">${esc(r.duty)}</span>
      ${line ? `<span class="sp-say">${esc(line)}</span>` : ''}
      <span class="sp-ai">AI</span>
    </div>`;
  }

  /* 只说一句，不带名字（用在已有的判词块里） */
  function say(key, slot, fallback) {
    const r = ROLES[key];
    if (!r || !r.says[slot]) return fallback || '';
    return r.says[slot];
  }

  /* 转交条：明写"谁把事交给谁"。line 为 forge / ask */
  function handoff(line, fromSlot, toSlot) {
    const pair = LINE[line] || [];
    const a = ROLES[pair[0]];
    const b = ROLES[pair[1]];
    if (!a || !b) return '';
    const from = fromSlot ? say(a.key, fromSlot) : '';
    const to = toSlot ? say(b.key, toSlot) : '';
    return `<div class="handoff">
      <span class="ho-who">
        <span class="ho-seal">${esc(a.zi)}</span><span class="ho-name">${esc(a.name)}</span>
      </span>
      ${from ? `<span class="ho-say">${esc(from)}</span>` : ''}
      <span class="ho-arrow">转 交</span>
      <span class="ho-who">
        <span class="ho-seal">${esc(b.zi)}</span><span class="ho-name">${esc(b.name)}</span>
      </span>
      ${to ? `<span class="ho-say">${esc(to)}</span>` : ''}
      <span class="sp-ai">AI</span>
    </div>`;
  }

  /* 三位合影：首页/关于处一次说清 */
  function trio() {
    return `<div class="trio">
      ${Object.values(ROLES).map((r) => `
        <div class="trio-item">
          <span class="trio-seal">${esc(r.zi)}</span>
          <div class="trio-text">
            <div class="trio-head">
              <span class="trio-name">${esc(r.name)}</span>
              <span class="trio-en">${esc(r.en)}</span>
              <span class="trio-ai">AI</span>
            </div>
            <div class="trio-duty">${esc(r.duty)}</div>
            <p class="trio-intro">${esc(r.intro)}</p>
          </div>
        </div>`).join('')}
    </div>`;
  }

  return { ROLES, LINE, strip, say, handoff, trio };
})();
