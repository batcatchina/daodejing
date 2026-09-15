/* ============================================================
   炼化炉 · 投料入炉（多形态智能炉口）
   ------------------------------------------------------------
   负责把各种形态的"料"归一成可炼的文本：
     ① 粘贴文本      —— 直接走 textarea
     ② 拖拽/选取文件 —— .txt .md .srt .vtt（前端剥离时间轴）
     ③ 粘贴转写稿    —— 自动识别并清理时间轴
     ④ 网址抓取      —— fetch + 正文粗提取（CORS 受限时如实降级）
     ⑤ 音视频转写    —— 浏览器做不到，给引导（不伪装成功）

   三条《道德经》原则亦体现在此层：
     道法自然 —— 尽量保留料的本来面目，只做必要清理，不改写内容
     非恒道   —— 抓取失败就如实说，不假装成功
     六度周全 —— 多形态、多来源，但归一到同一口炉
   ============================================================ */

const INGEST = (() => {

  /* ---------------- 常量 ---------------- */

  // 允许前端直接读的文本类文件
  const TEXT_EXT = ['txt', 'md', 'markdown', 'srt', 'vtt', 'text', 'log', 'csv'];

  // 明确告知"浏览器做不到"的类型
  const AV_EXT = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg',
                  'mp4', 'mov', 'mkv', 'avi', 'webm', 'flv', 'wmv'];

  // 需要外部库才能解析的类型
  const RICH_EXT = ['docx', 'doc', 'pdf', 'xlsx', 'xls', 'pptx', 'ppt'];

  const extOf = (name) => {
    const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : '';
  };

  /* ---------------- 清理与归一 ---------------- */

  // 压缩多余空行与空格（对应 refine.py 的 clean_text）
  function cleanText(t) {
    let s = String(t || '').replace(/\r\n?/g, '\n');
    s = s.replace(/[ \t]{2,}/g, ' ');
    s = s.replace(/\n{3,}/g, '\n\n');
    return s.trim();
  }

  // 剥离 srt/vtt 时间轴（对应 refine.py 的 strip_srt，同源同逻辑）
  function stripSrt(t) {
    let s = String(t || '');
    s = s.replace(/^\d{1,4}\s*$/gm, '');                                    // 纯序号行
    s = s.replace(/\d{2}:\d{2}:\d{2}[.,]\d{1,3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{1,3}.*$/gm, ''); // 时间行
    s = s.replace(/^WEBVTT.*$/gm, '');                                      // vtt 头
    s = s.replace(/<[^>]+>/g, '');                                          // 内联标签
    // 视频平台常见的 [00:12] / (00:12) 行内时间戳
    s = s.replace(/[\[\(]\d{1,2}:\d{2}(?::\d{2})?[\]\)]/g, '');
    return cleanText(s);
  }

  // 是否像转写稿（用于料识）
  function looksLikeTranscript(t) {
    return /-->/.test(t) || /^\s*WEBVTT/m.test(t) ||
           /[\[\(]\d{1,2}:\d{2}(?::\d{2})?[\]\)]/.test(t) ||
           /^\s*\d{1,4}\s*$/m.test(t) && /\d{2}:\d{2}/.test(t);
  }

  /* ---------------- 料识：判断这是什么料 ---------------- */

  // 返回 {kind, label, note}
  function recognize(text, r) {
    const t = String(text || '').trim();
    const n = t.length;

    if (!n) return { kind: 'empty', label: '空', note: '炉中无一物' };

    // 有 assay 结果时，以其判别为准（更可信）
    if (r && !r.ok) {
      if (!r.chapters.length) return { kind: 'rootless', label: '无根', note: '未扣原文，炼不出丹' };
      return { kind: 'thin', label: '料薄', note: '根浅，恐难成大丹' };
    }

    if (r && r.chapters.length && n < 120) return { kind: 'quote', label: '章句', note: '原文直引，其来有自' };
    if (r && r.chapters.length)            return { kind: 'exegesis', label: '义疏', note: '引章而申说' };
    if (n < 40)                            return { kind: 'memo', label: '短言', note: '尚简，可再充实' };
    return { kind: 'note', label: '文稿', note: '待扣章句' };
  }

  /* ---------------- 文件读取 ---------------- */

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const ext = extOf(file.name);

      if (AV_EXT.includes(ext)) {
        reject({
          code: 'av',
          msg: `「${file.name}」是音视频，浏览器炼不了。`,
          hint: '把文件交给 WorkBuddy（对话里发它即可），在沙箱端转写后投料——路径见下方说明。',
        });
        return;
      }
      if (RICH_EXT.includes(ext)) {
        reject({
          code: 'rich',
          msg: `「${file.name}」是 ${ext.toUpperCase()}，前端不解析这类格式。`,
          hint: '在 Word/PDF 里全选复制，直接粘贴到上方炉口即可（保留原文更利结丹）。',
        });
        return;
      }
      if (!TEXT_EXT.includes(ext)) {
        reject({
          code: 'unknown',
          msg: `不认识 .${ext || '未知'} 这种格式。`,
          hint: `可直接读：${TEXT_EXT.join(' / ')}。其他格式请先转成纯文本。`,
        });
        return;
      }

      const fr = new FileReader();
      fr.onerror = () => reject({ code: 'read', msg: `读取「${file.name}」失败。`, hint: '文件可能已损坏或被占用。' });
      fr.onload = () => {
        const raw = String(fr.result || '');
        const wasSrt = ext === 'srt' || ext === 'vtt';
        const text = wasSrt ? stripSrt(raw) : cleanText(raw);
        resolve({
          name: file.name,
          size: file.size,
          ext,
          wasSrt,
          raw,
          text,
          trimmed: raw.length - text.length,
        });
      };
      fr.readAsText(file, 'utf-8');
    });
  }

  /* ---------------- 网址抓取 ---------------- */

  function extractMain(html) {
    let s = String(html || '');
    // 去掉不可见区
    s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ');
    s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
    s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
    s = s.replace(/<!--[\s\S]*?-->/g, ' ');

    // 优先取正文容器
    const m = s.match(/<(article|main)[^>]*>([\s\S]*?)<\/\1>/i);
    if (m) s = m[2];

    // 块级标签转换行
    s = s.replace(/<\/(p|div|section|br|li|h[1-6]|tr|blockquote)>/gi, '\n');
    s = s.replace(/<br\s*\/?>/gi, '\n');
    s = s.replace(/<[^>]+>/g, ' ');
    // 实体
    s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
         .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
         .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    return cleanText(s);
  }

  async function fetchUrl(url) {
    let u = String(url || '').trim();
    if (!u) throw { code: 'empty', msg: '未填网址。', hint: '粘贴一个含正文的网页链接。' };
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;

    let res;
    try {
      res = await fetch(u, { mode: 'cors', credentials: 'omit' });
    } catch (e) {
      // CORS / 网络 —— 如实告知，不伪装成功（非恒道）
      throw {
        code: 'cors',
        msg: '这个站点不允许跨域抓取，炉子够不着它。',
        hint: '请在浏览器里打开该页，全选复制正文，粘贴到上方炉口——一样能炼。',
      };
    }
    if (!res.ok) {
      throw { code: 'http', msg: `站点返回 ${res.status}，取不到正文。`, hint: '检查链接是否有效、是否需登录。' };
    }
    const html = await res.text();
    const text = extractMain(html);
    if (text.length < 30) {
      throw { code: 'short', msg: '抓到的正文太短，多半是动态渲染的页面。', hint: '请手动复制正文粘贴。' };
    }
    return { url: u, text };
  }

  /* ---------------- 时间轴清理（粘贴稿） ---------------- */

  function tidyPasted(text) {
    const t = String(text || '');
    if (!looksLikeTranscript(t)) return { text: cleanText(t), cleaned: false, removed: 0 };
    const out = stripSrt(t);
    return { text: out, cleaned: true, removed: t.length - out.length };
  }

  return {
    TEXT_EXT, AV_EXT, RICH_EXT, extOf,
    cleanText, stripSrt, looksLikeTranscript, recognize,
    readFile, fetchUrl, extractMain, tidyPasted,
  };
})();
