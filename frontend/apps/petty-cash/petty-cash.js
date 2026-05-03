/**
 * Petty Cash App Module
 */
window.PettyCash = (() => {
  let entries  = [];
  let cats     = [];
  let settings = {};
  let pcType   = 'in';
  let pcFilter = 'all';
  let wrap;

  async function render(container) {
    wrap = container;
    wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:12px;color:var(--muted)"><div class="spinner"></div> Loading...</div>';
    try {
      [entries, cats, settings] = await Promise.all([
        API.getEntries(),
        API.getCategories(),
        API.getSettings(),
      ]);
      buildUI();
    } catch(e) {
      wrap.innerHTML = `<div class="empty">Failed to load data: ${e.message}</div>`;
    }
  }

  function buildUI() {
    wrap.innerHTML = `
    <div class="dbar">
      <button class="act-btn grn" onclick="PettyCash.exportCSV()">&#8659; ${t('dbExp')}</button>
      <span style="font-size:11px;color:var(--muted)" id="pc-count"></span>
    </div>
    <div class="cards">
      <div class="card grn"><div class="cl">${t('cIn')}</div><div class="cv" id="v-in">0.00</div></div>
      <div class="card red"><div class="cl">${t('cOut')}</div><div class="cv" id="v-out">0.00</div></div>
      <div class="card tel"><div class="cl">${t('cBal')}</div><div class="cv" id="v-bal">0.00</div></div>
      <div class="card">   <div class="cl">${t('cPend')}</div><div class="cv" id="v-pnd">0</div></div>
    </div>
    <div class="layout">
      <div>
        <div class="panel">
          <div class="ph"><span>${t('fNew')}</span><span class="badge">${t('fLog')}</span></div>
          <div class="fb">
            <div><label>${t('fType')}</label>
              <div class="ttype">
                <button class="tbtn ti" id="btn-in"  onclick="PettyCash.setType('in')">${t('cashIn')}</button>
                <button class="tbtn"    id="btn-out" onclick="PettyCash.setType('out')">${t('cashOut')}</button>
              </div>
            </div>
            <div><label>${t('fAmt')}</label><input type="number" id="pc-amt" placeholder="0.00" step="0.01" min="0"></div>
            <div><label>${t('fCat')}</label><select id="pc-cat"></select></div>
            <div><label>${t('fDesc')}</label><input type="text" id="pc-desc" placeholder="${t('fDescPh')}"></div>
            <div><label>${t('fNote')}</label><textarea id="pc-note" placeholder="${t('fNotePh')}"></textarea></div>
            <div><label>${t('fDate')}</label><input type="datetime-local" id="pc-date"></div>
            <button class="sub-btn" onclick="PettyCash.addEntry()">${t('fSubmit')}</button>
          </div>
        </div>
      </div>
      <div>
        <div class="panel">
          <div class="ph"><span>${t('ledger')}</span>
            <button class="exp-btn" onclick="PettyCash.exportCSV()">${t('csvBtn')}</button>
          </div>
          <div class="lctrl">
            <button class="fbtn on" onclick="PettyCash.setFilter('all',this)">${t('fAll')}</button>
            <button class="fbtn"   onclick="PettyCash.setFilter('in',this)">${t('fCashIn')}</button>
            <button class="fbtn"   onclick="PettyCash.setFilter('out',this)">${t('fCashOut')}</button>
            <button class="fbtn"   onclick="PettyCash.setFilter('pend',this)">${t('fPend')}</button>
            <input class="srch" type="text" placeholder="${t('srchPh')}" id="pc-srch" oninput="PettyCash.renderLedger()">
          </div>
          <div class="sw">
            <table class="ltbl">
              <thead><tr>
                <th>${t('thDate')}</th><th>${t('thDesc')}</th><th>${t('thCat')}</th>
                <th>${t('thIn')}</th><th>${t('thOut')}</th><th>${t('thBal')}</th>
                <th>${t('thSt')}</th><th></th>
              </tr></thead>
              <tbody id="ltbody"></tbody>
            </table>
            <div class="empty" id="lempty" style="display:none">${t('empty')}</div>
          </div>
        </div>
      </div>
    </div>`;

    el('pc-date').value = toInput();
    buildCats();
    renderLedger();
    updateSummary();
  }

  function buildCats() {
    const sel = el('pc-cat');
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = `<option value="">${t('selCat')}</option>`;
    cats.filter(c => c.type === pcType).forEach(c => {
      const o = document.createElement('option');
      o.value = c.name_en;
      o.textContent = APP.lang === 'ar' ? c.name_ar : c.name_en;
      sel.appendChild(o);
    });
    sel.value = prev;
  }

  function setType(tp) {
    pcType = tp;
    el('btn-in').className  = 'tbtn' + (tp === 'in'  ? ' ti' : '');
    el('btn-out').className = 'tbtn' + (tp === 'out' ? ' to' : '');
    buildCats();
  }

  function setFilter(f, btn) {
    pcFilter = f;
    document.querySelectorAll('.fbtn').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    renderLedger();
  }

  async function addEntry() {
    const amt  = parseFloat(el('pc-amt').value);
    const cat  = el('pc-cat').value;
    const desc = el('pc-desc').value.trim();
    const note = el('pc-note').value.trim();
    const date = el('pc-date').value;
    if (!amt || amt <= 0)  return toast(t('eAmt'), true);
    if (!cat)              return toast(t('eCat'), true);
    if (!desc)             return toast(t('eDesc'), true);
    if (!date)             return toast(t('eDate'), true);
    try {
      const entry = await API.addEntry({ type:pcType, amount:amt, category:cat, description:desc, note, entry_date:date });
      entries.unshift(entry);
      ['pc-amt','pc-cat','pc-desc','pc-note'].forEach(id => { const e = el(id); if(e) e.value = ''; });
      el('pc-date').value = toInput();
      buildCats(); renderLedger(); updateSummary();
      toast(pcType === 'in' ? t('tIn') : t('tOut', settings.approver || 'Riyad'));
    } catch(e) { toast(e.message, true); }
  }

  async function approveEntry(id) {
    try {
      await API.approveEntry(id);
      const e = entries.find(x => x.id === id);
      if (e) { e.approved = 1; e.approved_by = APP.user.name; }
      renderLedger(); updateSummary();
      toast(t('tAppr', APP.user.name));
    } catch(e) { toast(e.message, true); }
  }

  async function reqDel(id) {
    if (!confirm(t('confirmDel'))) return;
    try {
      await API.requestDelete(id);
      // Reload from server for accurate balances
      entries = await API.getEntries();
      renderLedger(); updateSummary();
      toast(t('tDelDone'));
    } catch(e) { toast(e.message, true); }
  }

  async function approveDel(id) {
    try {
      await API.approveDelete(id);
      entries = await API.getEntries();
      renderLedger(); updateSummary();
      toast(t('tDelDone'));
    } catch(e) { toast(e.message, true); }
  }

  function runBal() {
    // Sort by id ascending (reliable chronological order from DB)
    const sorted = [...entries].sort((a,b) => a.id - b.id);
    let bal = 0; const m = {};
    sorted.forEach(e => { bal += e.type === 'in' ? parseFloat(e.amount) : -parseFloat(e.amount); m[e.id] = bal; });
    return m;
  }

  function updateSummary() {
    const ti   = entries.filter(e => e.type === 'in').reduce((s,e) => s+parseFloat(e.amount), 0);
    const to   = entries.filter(e => e.type === 'out').reduce((s,e) => s+parseFloat(e.amount), 0);
    const pend = entries.filter(e => !e.approved || e.pend_delete).length;
    const set  = (id,v) => { const el2 = el(id); if(el2) el2.textContent = v; };
    set('v-in', fmt(ti)); set('v-out', fmt(to)); set('v-bal', fmt(ti-to)); set('v-pnd', pend);
    const fv = el('float-val'); if(fv) fv.textContent = 'SAR ' + fmt(ti-to);
    const pc = el('pc-count'); if(pc) pc.textContent = entries.length + ' entries';
  }

  function renderLedger() {
    const srch    = (el('pc-srch') || {}).value || '';
    const q       = srch.toLowerCase();
    const bm      = runBal();
    const canApp  = APP.user.is_admin || APP.user.name === (settings.approver || 'Riyad');
    const filtered = entries.filter(e => {
      if (pcFilter === 'in'   && e.type !== 'in')  return false;
      if (pcFilter === 'out'  && e.type !== 'out') return false;
      if (pcFilter === 'pend' && e.approved && !e.pend_delete) return false;
      if (q && !(e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || e.entered_by.toLowerCase().includes(q))) return false;
      return true;
    });

    const tbody = el('ltbody'), emp = el('lempty');
    if (!tbody) return;
    if (!filtered.length) { tbody.innerHTML = ''; emp.style.display = 'block'; emp.textContent = t('empty'); return; }
    emp.style.display = 'none';

    tbody.innerHTML = filtered.map(e => {
      const bal = bm[e.id] || 0;
      const ds  = fmtDt(e.entry_date);
      let sc = '';
      if (e.pend_delete) {
        sc = canApp
          ? `<span class="rdot"></span><button class="del-app-btn" onclick="PettyCash.approveDel(${e.id})">${t('appDel')}</button>`
          : `<span class="rdot"></span><span style="font-size:10px;color:var(--red)">${t('pendDel')}</span>`;
      } else if (e.type === 'out' && !e.approved) {
        sc = canApp
          ? `<span class="pdot"></span><button class="app-btn" onclick="PettyCash.approveEntry(${e.id})">${t('approve')}</button>`
          : `<span class="pdot"></span><span style="font-size:10px;color:var(--teal)">${t('pend')}</span>`;
      } else {
        sc = `<span class="gdot"></span><span class="ok-lbl">${t('okLbl')}${e.approved_by ? ' · ' + e.approved_by : ''}</span>`;
      }
      return `<tr>
        <td><div class="ent">${ds}</div><div class="enw">${e.entered_by}</div></td>
        <td><div class="enm">${e.description}</div>${e.note ? `<div class="ent">${e.note}</div>` : ''}</td>
        <td><span style="font-size:12px;color:var(--muted)">${e.category}</span></td>
        <td>${e.type==='in' ? `<span class="ain">+${fmt(e.amount)}</span>` : '<span style="color:var(--bord)">—</span>'}</td>
        <td>${e.type==='out'? `<span class="aout">-${fmt(e.amount)}</span>`: '<span style="color:var(--bord)">—</span>'}</td>
        <td><span class="bc">${fmt(bal)}</span></td>
        <td>${sc}</td>
        <td>${!e.pend_delete ? `<button class="del-btn" onclick="PettyCash.reqDel(${e.id})">&#10005;</button>` : ''}</td>
      </tr>`;
    }).join('');
  }

  async function exportCSV() {
    if (!APP.user.is_admin) return toast(t('eExport'), true);
    try {
      const data = await API.exportEntries();
      if (!data.length) return toast(t('eNoData'), true);
      const bm = {};
      let bal = 0;
      [...data].sort((a,b) => a.entry_date.localeCompare(b.entry_date)).forEach(e => {
        bal += e.type === 'in' ? e.amount : -e.amount;
        bm[e.id] = bal;
      });
      const h = ['Date','By','Type','Category','Description','Note','In (SAR)','Out (SAR)','Balance (SAR)','Approved','By'];
      const rows = [...data].sort((a,b) => a.entry_date.localeCompare(b.entry_date)).map(e => [
        fmtDt(e.entry_date), e.entered_by, e.type.toUpperCase(), e.category,
        e.description, e.note||'',
        e.type==='in' ? fmt(e.amount) : '', e.type==='out' ? fmt(e.amount) : '',
        fmt(bm[e.id]||0), e.approved?'YES':'PENDING', e.approved_by||''
      ].map(v => `"${v}"`).join(','));
      const a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent([h.join(','), ...rows].join('\n'));
      a.download = `petty_cash_${toDateStr()}.csv`;
      a.click();
      toast(t('tExported'));
    } catch(e) { toast(e.message, true); }
  }

  return { render, setType, setFilter, addEntry, approveEntry, reqDel, approveDel, renderLedger, exportCSV };
})();
