/* ============================================================
 * 元音演变实验室 · UI 层（渲染 + IPA 元音图 + i18n + 弹窗）
 * 命名空间：VL.ui（事件与计时循环在 main.js）
 * ============================================================ */
(function (g) {
  'use strict';

  const D = g.VL.DATA;
  const core = g.VL.core;

  const $ = (id) => document.getElementById(id);

  const ui = {
    lang: 'zh',
    _advanceTimer: null,
    _tickTimer: null,
    _modalOpen: false
  };

  /* ---------- i18n ---------- */
  ui.t = function (key, vars) {
    const entry = D.I18N[key];
    let s = entry ? entry[ui.lang] || entry.zh : key;
    if (vars) {
      for (const k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
    }
    return s;
  };

  ui.setLang = function (lang) {
    ui.lang = lang;
    try { localStorage.setItem('vl-lang', lang); } catch (e) { /* ignore */ }
    ui.applyI18n();
    $('lang-btn').textContent = lang === 'zh' ? 'EN' : '中文';
  };

  ui.applyI18n = function () {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = ui.t(el.getAttribute('data-i18n'));
    });
    document.title = ui.t('app.title') + ' · Vowel Change Lab';
  };

  /* ---------- 通用 ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  const typeName = (id) => {
    const t = core.typeById(id);
    return t ? t[ui.lang] : id;
  };
  const tierName = (id) => {
    const t = core.tierById(id);
    return t ? t[ui.lang] : id;
  };

  function envLabel(rule) {
    const env = rule.env;
    if (!env) return ui.t('q.env.none');
    const map = {
      unstressed: ui.lang === 'zh' ? '非重读' : 'unstressed',
      long: ui.lang === 'zh' ? '长元音' : 'long vowel',
      'stressed-next-a': ui.lang === 'zh' ? '重读且后接 a' : 'stressed before a',
      'before-i': ui.lang === 'zh' ? '后接 i' : 'before i'
    };
    return map[env.kind] || env.kind;
  }

  function ruleName(rule) {
    return rule.name[ui.lang];
  }

  /* ---------- IPA 元音图 ---------- */
  const IPA_FONT = "'Segoe UI','DejaVu Sans','Charis SIL','Gentium Plus','Arial Unicode MS',sans-serif";

  function yF(h) {
    if (h === 4) return 0.13;
    if (h === 3) return 0.32;
    if (h === 2) return 0.51;
    if (h === 0) return 0.88;
    return 0.415; // ə（央、中）
  }

  function xF(back, h) {
    const openX = [0.16, 0.5, 0.84][back];
    const closeX = [0.3, 0.5, 0.7][back];
    return openX + (closeX - openX) * (h / 4);
  }

  function dotPos(v) {
    const base = core.resolveVowel(v);
    if (!base) return null;
    return { x: xF(base.back, base.height), y: yF(base.height) };
  }

  ui.renderChart = function (pair) {
    const el = $('chart');
    if (!el) return;
    const W = 360, H = 230;
    const px = (fx) => (fx * W).toFixed(1);
    const py = (fy) => (fy * H).toFixed(1);
    const P = (fx, fy) => px(fx) + ',' + py(fy);

    let s = '';
    s += '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(ui.t('chart.title')) + '">';
    s += '<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#c0392b"/></marker></defs>';

    // 梯形与网格
    s += '<polygon points="' + P(0.3, 0.13) + ' ' + P(0.7, 0.13) + ' ' + P(0.84, 0.88) + ' ' + P(0.16, 0.88) + '" fill="#f4f7fb" stroke="#9db3d3" stroke-width="1.5"/>';
    [4, 3, 2, 0].forEach((h) => {
      s += '<line x1="' + px(xF(0, h)) + '" y1="' + py(yF(h)) + '" x2="' + px(xF(2, h)) + '" y2="' + py(yF(h)) + '" stroke="#c9d6ea" stroke-width="1"/>';
    });
    s += '<line x1="' + px(xF(1, 4)) + '" y1="' + py(yF(4)) + '" x2="' + px(xF(1, 0)) + '" y2="' + py(yF(0)) + '" stroke="#c9d6ea" stroke-width="1" stroke-dasharray="3 3"/>';

    // 单元音点
    for (const k in D.MONOPHTHONGS) {
      const m = D.MONOPHTHONGS[k];
      const x = px(xF(m.back, m.height)), y = py(yF(m.height));
      s += '<circle cx="' + x + '" cy="' + y + '" r="4" fill="' + (m.round ? '#8e44ad' : '#2d3436') + '"/>';
      s += '<text x="' + px(xF(m.back, m.height) + 0.02) + '" y="' + py(yF(m.height) + 0.015) + '" font-size="12.5" font-family="' + IPA_FONT + '" fill="#333">' + k + '</text>';
    }
    // 复元音（按起点定位，浅色标注）
    for (const k in D.DIPHTHONGS) {
      const d = D.DIPHTHONGS[k];
      const base = D.MONOPHTHONGS[d.start];
      const x = px(xF(base.back, base.height) + 0.045), y = py(yF(base.height) - 0.045);
      s += '<text x="' + x + '" y="' + y + '" font-size="11.5" font-style="italic" font-family="' + IPA_FONT + '" fill="#7f8c8d">' + k + '</text>';
    }

    // 高亮 A → B
    if (pair) {
      const a = dotPos(pair.a), b = dotPos(pair.b);
      if (a && b) {
        s += '<line x1="' + px(a.x) + '" y1="' + py(a.y) + '" x2="' + px(b.x) + '" y2="' + py(b.y) + '" stroke="#c0392b" stroke-width="2" marker-end="url(#arr)"/>';
        s += '<circle cx="' + px(a.x) + '" cy="' + py(a.y) + '" r="8" fill="rgba(75,108,183,0.18)" stroke="#4b6cb7" stroke-width="2.5"/>';
        s += '<circle cx="' + px(b.x) + '" cy="' + py(b.y) + '" r="8" fill="rgba(231,76,60,0.18)" stroke="#e74c3c" stroke-width="2.5"/>';
      }
    }
    s += '</svg>';
    el.innerHTML = s;
  };

  /* ---------- 题目渲染 ---------- */
  function wordBox(cls, label, text) {
    return '<div class="word-box ' + cls + '"><h3>' + esc(label) + '</h3><div class="word">' + esc(text) + '</div></div>';
  }

  function renderPair(q) {
    return wordBox('a', 'A', core.wordText(q.wordA)) +
      '<div class="arrow">→</div>' +
      wordBox('b', 'B', core.wordText(q.wordB));
  }

  function renderPrompt(q) {
    if (q.kind === 'type') return ui.t('q.type.prompt');
    if (q.kind === 'freq') return ui.t('q.freq.prompt');
    return ui.t('q.system.prompt', { rule: ruleName(q.rule) });
  }

  function envChip(q) {
    return '<div class="fb-line"><strong>' + esc(ui.t('q.env')) + '：</strong>' + esc(envLabel(q.rule)) + '</div>';
  }

  function renderOptions(q, phase, sel) {
    const disabled = phase !== 'playing';
    sel = sel || new Set();
    let html = '';
    if (q.kind === 'type') {
      D.TYPES.forEach((t) => {
        html += '<button class="opt-btn" data-action="opt" data-value="' + t.id + '"' + (disabled ? ' disabled' : '') + '>' + esc(t[ui.lang]) + '</button>';
      });
    } else if (q.kind === 'freq') {
      D.TIERS.forEach((t) => {
        html += '<button class="opt-btn" data-action="opt" data-value="' + t.id + '"' + (disabled ? ' disabled' : '') + '>' + esc(t[ui.lang]) + '</button>';
      });
    } else {
      q.words.forEach((w, i) => {
        html += '<button class="opt-btn sys-word' + (sel.has(i) ? ' selected' : '') + '" data-action="toggle-word" data-index="' + i + '"' + (disabled ? ' disabled' : '') + '>' + esc(core.wordText(w)) + '</button>';
      });
      html += '<button class="btn start" data-action="submit-system"' + (disabled ? ' disabled' : '') + '>' + esc(ui.t('btn.submit')) + '</button>';
    }
    return html;
  }

  ui.updateOptions = function (state, sel) {
    $('options').innerHTML = renderOptions(state.question, state.phase, sel);
  };

  /* ---------- 反馈 ---------- */
  function exampleCard(rule) {
    const ex = rule.examples[0];
    if (!ex) return '';
    return '<div class="example-card"><div class="ex-text">' + esc(ex.text) + '</div>' +
      '<div class="ex-src">' + esc(ui.lang === 'zh' ? ex.srcZh : ex.srcEn) + '</div></div>';
  }

  function tierBadge(tier) {
    return '<span class="tier-badge tier-' + tier + '">' + esc(tierName(tier)) + '</span>';
  }

  function revealCard(rule) {
    let h = '<div class="fb-line"><strong>' + esc(ui.t('fb.type')) + '：</strong>' + esc(typeName(rule.type)) +
      '（' + esc(ruleName(rule)) + '）' + tierBadge(rule.tier) + '</div>';
    h += '<div class="fb-line"><strong>' + esc(ui.t('fb.desc')) + '：</strong>' + esc(rule.desc[ui.lang]) + '</div>';
    h += '<div class="fb-line"><strong>' + esc(ui.t('fb.example')) + '：</strong></div>' + exampleCard(rule);
    return h;
  }

  function renderFeedback(state) {
    const el = $('feedback');
    const lr = state.lastResult;
    if (!lr) {
      el.className = 'feedback';
      el.textContent = '';
      return;
    }
    const q = state.question;
    let html = '';
    if (lr.ok) {
      el.className = 'feedback ok';
      html += '<div class="fb-line"><strong>' + esc(ui.t('fb.correct')) + '</strong> ' + esc(ui.t('fb.answer') + '：' + (q.kind === 'type' ? typeName(q.answer) : q.kind === 'freq' ? tierName(q.answer) : '[' + q.answer.join(', ') + ']')) + '</div>';
      html += revealCard(q.rule);
      if (q.kind === 'system') html += systemReveal(q);
      html += envChip(q);
    } else {
      el.className = 'feedback bad';
      html += '<div class="fb-line"><strong>' + esc(ui.t('fb.wrong')) + '</strong></div>';
      if (q.kind !== 'system') html += envChip(q);
    }
    el.innerHTML = html;
  }

  function systemReveal(q) {
    let h = '';
    const changed = new Set(q.answer);
    q.words.forEach((w, i) => {
      const tag = changed.has(i) ? ui.t('fb.changed') : ui.t('fb.unchanged');
      const detail = changed.has(i) ? core.changedText(q.rule, w).join('；') : core.wordText(w);
      h += '<div class="fb-line">· ' + esc(tag) + '：' + esc(detail) + '</div>';
    });
    return h;
  }

  /* ---------- 统计 ---------- */
  function renderStats(state) {
    const s = state.stats;
    const box = (key, val) =>
      '<div class="stat"><span class="stat-label">' + esc(ui.t(key)) + '</span><span class="stat-value">' + val + '</span></div>';
    $('stats').innerHTML =
      box('stat.correct', s.correct) +
      box('stat.incorrect', s.incorrect) +
      box('stat.total', s.total) +
      box('stat.streak', s.streak);
  }

  /* ---------- 主渲染 ---------- */
  ui.render = function (state, sel) {
    ui.applyI18n();
    const q = state.question;
    const playing = state.phase === 'playing' || state.phase === 'answered';

    $('prompt').textContent = q ? renderPrompt(q) : '';
    $('words').innerHTML = q ? (q.kind === 'system' ? '' : renderPair(q)) : '';
    $('options').innerHTML = q ? renderOptions(q, state.phase, sel) : '';

    if (q && q.kind !== 'system') {
      ui.renderChart({ a: q.wordA.v[q.pos], b: q.wordB.v[q.pos] });
      $('chart').parentElement.style.display = '';
    } else {
      ui.renderChart(null);
      $('chart').parentElement.style.display = q ? '' : 'none';
    }

    renderFeedback(state);
    renderStats(state);

    // 计时显示
    const timed = VL.state.isTimed(state);
    $('timer-box').hidden = !timed;
    if (timed) {
      const secs = Math.ceil(VL.state.leftMs(state, Date.now()) / 1000);
      $('timer-display').textContent = Math.max(0, secs);
    }

    // 按钮状态
    $('start-btn').disabled = state.phase === 'playing' || state.phase === 'answered';
    $('reset-btn').disabled = false;
  };

  /* ---------- 速查表 ---------- */
  ui.renderCheatsheet = function () {
    const el = $('cheatsheet');
    if (!el) return;
    let h = '<table class="cheatsheet"><thead><tr>' +
      '<th>' + esc(ui.t('fb.type')) + '</th><th>示例 · Examples</th>' +
      '<th>' + esc(ui.t('q.env')) + '</th><th>' + esc(ui.t('fb.tier')) + '</th>' +
      '</tr></thead><tbody>';
    D.TYPES.forEach((t) => {
      const rules = D.RULES.filter((r) => r.type === t.id);
      const ex = rules.map((r) => r.examples.map((e) => e.text).join('、')).join('；') || '—';
      const env = rules.map(envLabel).join(' / ') || '—';
      const tier = rules[0] ? rules[0].tier : '—';
      h += '<tr><td>' + esc(t[ui.lang]) + '</td><td>' + esc(ex) + '</td><td>' + esc(env) + '</td>' +
        '<td>' + (rules[0] ? tierBadge(tier) : '—') + '</td></tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
  };

  /* ---------- 结算弹窗 ---------- */
  ui.openModal = function (state) {
    const s = state.stats;
    $('final-stats').innerHTML =
      '<p>' + esc(ui.t('stat.correct')) + '：<span>' + s.correct + '</span></p>' +
      '<p>' + esc(ui.t('stat.incorrect')) + '：<span>' + s.incorrect + '</span></p>' +
      '<p>' + esc(ui.t('stat.total')) + '：<span>' + s.total + '</span></p>' +
      '<p>' + esc(ui.t('stat.streak')) + '（最高 <span>' + s.bestStreak + '</span>）</p>';

    let mh = '';
    if (state.mistakes.length === 0) {
      mh = '<div class="no-mistakes">' + esc(ui.t('end.none')) + '</div>';
    } else {
      state.mistakes.slice(-10).reverse().forEach((m) => {
        const q = m.q;
        let line;
        if (q.kind === 'type') {
          line = core.wordText(q.wordA) + ' → ' + core.wordText(q.wordB) +
            '（' + esc(ui.t('fb.your')) + '：' + esc(typeName(m.chosen)) + '；' + esc(ui.t('fb.answer')) + '：' + esc(typeName(q.answer)) + '）';
        } else if (q.kind === 'freq') {
          line = core.wordText(q.wordA) + ' → ' + core.wordText(q.wordB) +
            '（' + esc(ui.t('fb.your')) + '：' + esc(tierName(m.chosen)) + '；' + esc(ui.t('fb.answer')) + '：' + esc(tierName(q.answer)) + '）';
        } else {
          line = '[' + m.chosen.join(', ') + '] / [' + q.answer.join(', ') + ']';
        }
        mh += '<div class="mistake-item"><span class="m-rule">' + esc(ruleName(q.rule)) + '</span>：' + esc(line) + '</div>';
      });
    }
    $('mistake-list').innerHTML = mh;

    const modal = $('game-over-modal');
    modal.hidden = false;
    ui._modalOpen = true;
    const closeBtn = $('close-modal');
    closeBtn.focus();
  };

  ui.closeModal = function () {
    $('game-over-modal').hidden = true;
    ui._modalOpen = false;
  };

  ui.disposeTimers = function () {
    if (ui._advanceTimer) { clearTimeout(ui._advanceTimer); ui._advanceTimer = null; }
  };

  g.VL.ui = ui;
})(typeof window !== 'undefined' ? window : globalThis);
