// AWS CCP Static Quiz — v4+mixed (no ListBucket; simple + robust)
(() => {
  'use strict';

  // Elements
  const els = {
    quiz: document.getElementById('quiz'),
    qCount: document.getElementById('qCount'),
    score: document.getElementById('score'),
    answered: document.getElementById('answered'),
    elapsed: document.getElementById('elapsed'),
    quizMeta: document.getElementById('quizMeta'),

    mdUrl: document.getElementById('mdUrl'),
    loadBtn: document.getElementById('loadBtn'),
    sampleBtn: document.getElementById('sampleBtn'),
    resetBtn: document.getElementById('resetBtn'),
    mdPaste: document.getElementById('mdPaste'),
    parsePasteBtn: document.getElementById('parsePasteBtn'),
    revealAllBtn: document.getElementById('revealAllBtn'),
    shuffleBtn: document.getElementById('shuffleBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    assetSelect: document.getElementById('assetSelect'),
    loadLocalBtn: document.getElementById('loadLocalBtn'),

    // Mixed quiz controls
    qCountInput: document.getElementById('qCountInput'),
    startMixedBtn: document.getElementById('startMixedBtn'),
    poolStatus: document.getElementById('poolStatus'),
  };

  const state = {
    questions: [],
    answered: 0,
    score: 0,
    startTs: null,
    idx: 0,
    mode: 'grid',           // 'grid' or 'single'
    pool: [],
    poolLoaded: false,
  };
  let timerId = null;

  // Timer
  function startTimer() {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      if (!state.startTs) return;
      const s = Math.floor((Date.now() - state.startTs) / 1000);
      if (els.elapsed) els.elapsed.textContent = `${s}s`;
    }, 1000);
  }

  function resetUI() {
    els.quiz.innerHTML = '';
    els.quizMeta.classList.add('hidden');
    state.questions = [];
    state.answered = 0;
    state.score = 0;
    state.startTs = null;
    state.idx = 0;
    state.mode = 'grid';
    if (timerId) clearInterval(timerId);
    if (els.qCount) els.qCount.textContent = 0;
    if (els.answered) els.answered.textContent = 0;
    if (els.score) els.score.textContent = 0;
    if (els.elapsed) els.elapsed.textContent = '0s';
  }

  // Parser
  function parseMarkdown(md) {
    md = md.replace(/\r\n/g, '\n');
    const lines = md.split('\n');
    const blocks = []; let cur = [];
    const push = () => { if (cur.length) { blocks.push(cur.join('\n').trim()); cur = []; } };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*(Q?\d+)\./i.test(line) && cur.length) push();
      cur.push(line);
    }
    push();

    const questions = [];
    const optA = /^\s*([A-Da-d])[\)\.]\s+(.*)$/;            // "A. text" / "A) text"
    const optB = /^\s*[-*]\s+([A-Da-d])\.\s+(.*)$/;        // "- A. text"
    const ansRx = [
      /correct\s*answer\s*:\s*([A-D](?:\s*,\s*[A-D])*)/i,
      /answer\s*[:\-]\s*([A-D](?:\s*,\s*[A-D])*)/i
    ];

    for (const block of blocks) {
      const ls = block.split('\n').map(l => l.trim()).filter(Boolean);
      const qIdx = ls.findIndex(l => /^\s*(Q?\d+)\./i.test(l));
      if (qIdx === -1) continue;
      const qText = ls[qIdx].replace(/^\s*(Q?\d+)\.\s*/, '').trim();
      const options = []; let answers = [];

      for (let i = qIdx + 1; i < ls.length; i++) {
        const raw = ls[i].replace(/<[^>]+>/g, ' ');
        for (const rx of ansRx) {
          const m = raw.match(rx);
          if (m) answers = m[1].split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        }
        let m = ls[i].match(optA); if (!m) m = ls[i].match(optB);
        if (m) options.push({ key: m[1].toUpperCase(), text: m[2].trim() });
      }

      if (qText && options.length >= 2 && answers.length) {
        questions.push({ q: qText, options, answers });
      }
    }
    return questions;
  }

  // Render grid (legacy)
  function renderQuiz(questions) {
    state.mode = 'grid';
    state.questions = questions; state.answered = 0; state.score = 0; state.startTs = Date.now();
    els.quiz.innerHTML = ''; els.quizMeta.classList.toggle('hidden', questions.length === 0);
    els.qCount.textContent = questions.length; els.answered.textContent = 0; els.score.textContent = 0;

    questions.forEach((q, idx) => {
      const card = document.createElement('div'); card.className = 'qcard';
      const qtext = document.createElement('div'); qtext.className = 'qtext'; qtext.textContent = `${idx + 1}. ${q.q}`; card.appendChild(qtext);
      const meta = document.createElement('div'); meta.className = 'meta';
      const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = 'Answer: hidden'; badge.dataset.answer = (q.answers||[]).join(','); meta.appendChild(badge); card.appendChild(meta);
      const opts = document.createElement('div'); opts.className = 'options';
      q.options.forEach(opt => { const b = document.createElement('button'); b.className = 'option'; b.textContent = `${opt.key}. ${opt.text}`; b.addEventListener('click', () => onAnswer(card, b, opt.key, q.answers)); opts.appendChild(b); });
      card.appendChild(opts); els.quiz.appendChild(card);
    });
    startTimer();
  }

  function onAnswer(card, btn, chosen, answers) {
    const correct = new Set((answers||[]).map(x => x.toUpperCase()));
    const buttons = Array.from(card.querySelectorAll('.option'));
    if (buttons.some(b => b.classList.contains('correct') || b.classList.contains('incorrect'))) return;
    buttons.forEach(b => b.disabled = true);
    const isCorrect = correct.has(chosen); btn.classList.add(isCorrect ? 'correct' : 'incorrect');
    buttons.forEach(b => { const k = b.textContent.trim().charAt(0).toUpperCase(); if (correct.has(k)) b.classList.add('correct'); });
    state.answered += 1; if (isCorrect) state.score += 1; els.answered.textContent = state.answered; els.score.textContent = state.score;
    const badge = card.querySelector('.badge'); if (badge) badge.textContent = `Answer: ${[...correct].join(', ')}`;
  }

  async function loadUrl(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const md = await res.text();
      const qs = parseMarkdown(md);
      if (!qs.length) throw new Error('Parsed 0 questions. Check the format.');
      // If user used loaders, keep grid mode
      renderQuiz(qs);
    } catch (e) { alert('Failed to fetch/parse. ' + e.message); }
  }

  // --- Mixed pool: discover + build ---
  async function discoverAssets() {
    const names = ['sample.md'];
    for (let i = 1; i <= 30; i++) names.push(`practice-exam-${i}.md`);
    names.push('practice-exam-2-2.md');

    const found = [];
    for (const n of names) {
      try {
        const r = await fetch(`assets/${n}`, { cache: 'no-store' });
        if (r.ok) found.push(n);
      } catch (_) {}
    }
    return [...new Set(found)].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  }

  async function buildQuestionPool() {
    if (state.poolLoaded) return state.pool;
    if (els.poolStatus) els.poolStatus.textContent = 'Building question pool…';

    const files = await discoverAssets();
    const all = [];
    for (const fname of files) {
      try {
        const res = await fetch(`assets/${fname}`, { cache: 'no-store' });
        if (!res.ok) continue;
        const md = await res.text();
        const qs = parseMarkdown(md);
        all.push(...qs);
      } catch(_) {}
    }
    state.pool = all;
    state.poolLoaded = true;
    if (els.poolStatus) els.poolStatus.textContent = `Pool: ${all.length} questions from ${files.length} files`;
    return all;
  }

  function sampleArray(arr, n) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, Math.max(0, Math.min(n, a.length)));
  }

  // --- Single-question flow ---
  function renderSingle(questions) {
    state.mode = 'single';
    state.questions = questions;
    state.answered = 0;
    state.score = 0;
    state.idx = 0;
    state.startTs = Date.now();

    els.quizMeta.classList.remove('hidden');
    updateSingleView();
    startTimer();
  }

  function updateSingleView() {
    const q = state.questions[state.idx];
    els.quiz.innerHTML = '';
    els.qCount.textContent = state.questions.length;
    els.answered.textContent = state.answered;
    els.score.textContent = state.score;
  
    const container = document.createElement('div');
    container.className = 'qcard';
  
    const title = document.createElement('div');
    title.className = 'qtext';
    title.textContent = `Question ${state.idx + 1} of ${state.questions.length}`;
    container.appendChild(title);
  
    const stem = document.createElement('div');
    stem.textContent = q.q;
    container.appendChild(stem);
  
    const correctSet = new Set((q.answers || []).map(x => x.toUpperCase()));
    const isMulti = correctSet.size > 1;
  
    if (isMulti) {
      const helper = document.createElement('div');
      helper.className = 'helper';
      helper.textContent = `Select all that apply (${correctSet.size} total), then press Submit.`;
      container.appendChild(helper);
    }
  
    const opts = document.createElement('div');
    opts.className = 'options';
    container.appendChild(opts);
  
    let submitted = false;
    let submitBtn = null;
  
    // Build options
    q.options.forEach(opt => {
      const b = document.createElement('button');
      b.className = 'option';
      b.textContent = `${opt.key}. ${opt.text}`;
      b.addEventListener('click', () => {
        if (submitted) return;
  
        if (isMulti) {
          // toggle selection for multi-answer
          b.classList.toggle('selected');
          if (submitBtn) {
            submitBtn.disabled = opts.querySelectorAll('.option.selected').length === 0;
          }
        } else {
          // single-answer: evaluate immediately
          submitted = true;
          const chosen = opt.key.toUpperCase();
          const isCorrect = correctSet.has(chosen);
  
          Array.from(opts.querySelectorAll('.option')).forEach(btn => {
            const k = btn.textContent.trim().charAt(0).toUpperCase();
            if (correctSet.has(k)) btn.classList.add('correct'); else btn.classList.add('incorrect');
            btn.disabled = true;
          });
  
          state.answered += 1;
          if (isCorrect) state.score += 1;
          els.answered.textContent = state.answered;
          els.score.textContent = state.score;
          nextBtn.disabled = false;
        }
      });
      opts.appendChild(b);
    });
  
    // Nav / actions
    const nav = document.createElement('div');
    nav.style.display = 'flex';
    nav.style.gap = '8px';
    nav.style.marginTop = '10px';
  
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Prev';
    prevBtn.disabled = state.idx === 0;
    prevBtn.addEventListener('click', () => {
      state.idx = Math.max(0, state.idx - 1);
      updateSingleView();
    });
  
    const nextBtn = document.createElement('button');
    nextBtn.textContent = state.idx === state.questions.length - 1 ? 'Finish' : 'Next';
    nextBtn.disabled = true;
    nextBtn.addEventListener('click', () => {
      if (state.idx >= state.questions.length - 1) {
        return renderResults();
      }
      state.idx += 1;
      updateSingleView();
    });
  
    // Multi-select submit
    if (isMulti) {
      submitBtn = document.createElement('button');
      submitBtn.textContent = 'Submit';
      submitBtn.disabled = true;
      submitBtn.addEventListener('click', () => {
        if (submitted) return;
        submitted = true;
  
        const selectedKeys = Array.from(opts.querySelectorAll('.option.selected'))
          .map(btn => btn.textContent.trim().charAt(0).toUpperCase());
  
        const selSet = new Set(selectedKeys);
        const keysEqual = selSet.size === correctSet.size && [...selSet].every(k => correctSet.has(k));
  
        Array.from(opts.querySelectorAll('.option')).forEach(btn => {
          const k = btn.textContent.trim().charAt(0).toUpperCase();
          if (correctSet.has(k)) btn.classList.add('correct'); else btn.classList.add('incorrect');
          btn.disabled = true;
        });
  
        state.answered += 1;
        if (keysEqual) state.score += 1;
        els.answered.textContent = state.answered;
        els.score.textContent = state.score;
  
        nextBtn.disabled = false;
        submitBtn.disabled = true;
      });
    }
  
    nav.appendChild(prevBtn);
    if (isMulti && submitBtn) nav.appendChild(submitBtn);
    nav.appendChild(nextBtn);
  
    container.appendChild(nav);
    els.quiz.appendChild(container);
  }

  function renderResults() {
    const elapsedSec = Math.floor((Date.now() - state.startTs) / 1000);
    const pct = state.questions.length ? Math.round((state.score / state.questions.length) * 100) : 0;

    els.quiz.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'qcard';

    const h = document.createElement('h2');
    h.textContent = 'Quiz complete!';
    card.appendChild(h);

    const p = document.createElement('div');
    p.innerHTML = `
      <p><strong>Score:</strong> ${state.score} / ${state.questions.length} (${pct}%)</p>
      <p><strong>Answered:</strong> ${state.answered}</p>
      <p><strong>Elapsed:</strong> ${elapsedSec}s</p>
    `;
    card.appendChild(p);

    const actions = document.createElement('div');
    actions.style.display = 'flex'; actions.style.gap = '8px';

    const restart = document.createElement('button');
    restart.textContent = 'Restart';
    restart.addEventListener('click', () => {
      resetUI();
      populateDropdown(); // keep legacy controls in sync
    });

    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export results (CSV)';
    exportBtn.addEventListener('click', () => els.exportCsvBtn.click());

    actions.appendChild(restart);
    actions.appendChild(exportBtn);
    card.appendChild(actions);

    els.quiz.appendChild(card);
  }

  // --- Legacy dropdown: discover specific filenames and add options
  async function populateDropdown() {
    // Optional manifest for ordering
    try {
      const r = await fetch('assets/exams.json', { cache: 'no-store' });
      if (r.ok) {
        const list = await r.json();
        if (Array.isArray(list) && list.length) return fillSelect(list.map(p => p.split('/').pop()));
      }
    } catch(_) {}

    const names = ['sample.md']; for (let i=1;i<=30;i++) names.push(`practice-exam-${i}.md`); names.push('practice-exam-2-2.md');
    const found = [];
    for (const n of names) { try { const r = await fetch(`assets/${n}`, { cache:'no-store' }); if (r.ok) found.push(n); } catch(_){} }
    fillSelect(found.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})));
  }
  function fillSelect(files) {
    if (!els.assetSelect) return;
    els.assetSelect.innerHTML = '<option value="">-- Select local exam --</option>';
    if (!files.length) { const o=document.createElement('option'); o.value=''; o.textContent='No exams found in /assets'; els.assetSelect.appendChild(o); return; }
    files.forEach(fn => { const o=document.createElement('option'); o.value=fn; o.textContent=fn; els.assetSelect.appendChild(o); });
  }

  // Events
  if (els.loadBtn) els.loadBtn.addEventListener('click', () => { const u = (els.mdUrl.value||'').trim(); if (!u) return alert('Paste a RAW markdown URL'); loadUrl(u); });
  if (els.loadLocalBtn) els.loadLocalBtn.addEventListener('click', () => { const sel = els.assetSelect.value; if (!sel) return alert('Please select a local exam.'); loadUrl(`assets/${sel}`); });
  if (els.sampleBtn) els.sampleBtn.addEventListener('click', () => loadUrl('assets/sample.md'));
  if (els.resetBtn) els.resetBtn.addEventListener('click', () => { resetUI(); if (els.mdUrl) els.mdUrl.value=''; if (els.mdPaste) els.mdPaste.value=''; });
  if (els.parsePasteBtn) els.parsePasteBtn.addEventListener('click', () => { const md=(els.mdPaste.value||'').trim(); if(!md) return alert('Paste markdown first.'); const qs=parseMarkdown(md); if(!qs.length) return alert('Parsed 0 questions. Check the format.'); renderQuiz(qs); });
  if (els.revealAllBtn) els.revealAllBtn.addEventListener('click', () => { if (state.mode !== 'grid') return; document.querySelectorAll('.qcard').forEach(card => { const set=new Set((card.querySelector('.badge')?.dataset.answer||'').split(',').map(s=>s.trim().toUpperCase()).filter(Boolean)); const btns=Array.from(card.querySelectorAll('.option')); btns.forEach(b=>{const k=b.textContent.trim().charAt(0).toUpperCase(); if(set.has(k)) b.classList.add('correct'); else b.classList.add('incorrect'); b.disabled=true;}); const badge=card.querySelector('.badge'); if(badge) badge.textContent=`Answer: ${[...set].join(', ')}`; }); });
  if (els.shuffleBtn) els.shuffleBtn.addEventListener('click', () => { if (state.mode !== 'grid') return; const qs=state.questions.slice(); for(let i=qs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [qs[i],qs[j]]=[qs[j],qs[i]];} renderQuiz(qs); });
  if (els.exportCsvBtn) els.exportCsvBtn.addEventListener('click', () => { const rows=[['#','question','answer']]; state.questions.forEach((q,i)=>rows.push([i+1,q.q.replace(/"/g,'""'),(q.answers||[]).join(',')])); const csv=rows.map(r=>r.map(x=>`"${x}"`).join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='aws_quiz_export.csv'; a.click(); });

  // Mixed: start button
  if (els.startMixedBtn) els.startMixedBtn.addEventListener('click', async () => {
    const pool = await buildQuestionPool();
    if (!pool.length) return alert('No questions found in /assets.');
    let n = parseInt(els.qCountInput?.value, 10);
    if (isNaN(n) || n <= 0) n = 20;
    const picked = sampleArray(pool, n);
    renderSingle(picked);
  });

  // Init
  populateDropdown();
  buildQuestionPool().catch(()=>{});
})();