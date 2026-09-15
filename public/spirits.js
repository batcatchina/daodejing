/* ============================================================
   炉中三位 · AI 角色
   ------------------------------------------------------------
   炼化炉是 AI 炉子。炉中无闲人，做事的三位都是 AI：

     道童 · TONG  —— 接料、识料、送料入炉
     丹师 · SHI   —— 试火候、判成丹、说其所以然
     炉灵 · LING  —— 守八十一章金丹，替人取丹

   三位各有口吻：道童恭谨利落，丹师简断有据，炉灵平和不居功。
   页面上明写其名其职，让人看得见炉中有人、且是 AI 人。

   此模块只负责"说话"与"落款"，不做判断——
   判断在 furnace.js（火候）与 ask.js（取丹），此处不重复实现。
   ============================================================ */

const SPIRITS = (() => {

  const ROLES = {
    tong: {
      key: 'tong',
      zi: '童',
      name: '道 童',
      en: 'TONG',
      duty: '接 料 · 识 料',
      // 自我介绍：用在角色条
      intro: '炉中接料的道童。料不分贵贱，我照单全收；能不能成丹，得问丹师。',
      says: {
        empty:  '炉里空着，请先投料。',
        ok:     '料已收下，这就送进炉膛。',
        thin:   '料薄了些，我仍替你送进去——丹师自有话说。',
        rich:   '这份料厚，我先替你去芜存菁。',
        srt:    '这是转写稿，我先把时间轴剥了再送。',
        av:     '音视频我接不住——那不是我这双手能办的，容我如实相告。',
        file:   '文件已读过，原样送炉，不改一字。',
        url:    '网页取到了，正文在此。',
      },
    },

    shi: {
      key: 'shi',
      zi: '师',
      name: '丹 师',
      en: 'SHI',
      duty: '试 火 · 判 丹',
      intro: '炉中试火的丹师。我只问一句：此料扣得住原文么？扣不住，火再旺也不成丹。',
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
      duty: '守 丹 · 取 丹',
      intro: '守丹的炉灵。八十一章金丹在此，你要问什么，我指给你哪几章答得上。',
      says: {
        bridge: '你这一问，落在一路义理上。我取几枚来。',
        quote:  '你引了原文，那便直取此章。',
        theme:  '题面未扣住义理，我只在字面上找出相近的。权作参证。',
        deep:   '此章金丹已成，全貌在此。',
        shallow:'此章金丹未炼——我只有它的原文，不替它编造。',
        none:   '炉中无丹可应此问。我不装作有。',
      },
    },
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

  return { ROLES, strip, say, trio };
})();
