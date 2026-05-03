/**
 * Daily Report App Module
 */
window.DailyReport = (() => {
  const TZ = window.TZ || 'Asia/Riyadh';
  const DR_MEMBERS = ['Azzam','Hussam','Shahdat'];
  let drDate = '', drData = {cust:[],purch:[],exp:[],quot:0};
  let wrap;

  async function render(container) {
    wrap = container;
    drDate = new Date().toLocaleDateString('en-CA', {timeZone:TZ});
    try {
      const r = await API.getDay(drDate);
      drData = {
        cust:  r.entries.filter(e=>e.section==='cust'),
        purch: r.entries.filter(e=>e.section==='purch'),
        exp:   r.entries.filter(e=>e.section==='exp'),
        quot:  r.quotations || 0,
      };
    } catch(e) {
      drData = {cust:[],purch:[],exp:[],quot:0};
    }
    buildUI();
  }

  function buildUI() {
    const ms = DR_MEMBERS.map(m=>`<option>${m}</option>`).join('');
    wrap.innerHTML = `
    <div class="pg-hdr">
      <h2>&#128202; ${t('appDR')}</h2>
      <div style="display:flex;align-items:center;gap:10px">
        <label style="font-size:10px;color:var(--muted);text-transform:uppercase;margin:0">${t('drDateLbl')}</label>
        <input type="date" id="dr-date" style="width:auto" value="${drDate}" onchange="DailyReport.changeDate()">
      </div>
    </div>
    <div class="cards">
      <div class="card"><div class="cl">${t('drCustomers')}</div><div class="cv" id="dr-sc-cust" style="color:#6b21a8">0</div></div>
      <div class="card tel"><div class="cl">${t('drSalesTotal')}</div><div class="cv" id="dr-sc-sales">SAR 0.00</div></div>
      <div class="card"><div class="cl">${t('drPurch')}</div><div class="cv" id="dr-sc-purch" style="color:#1d4ed8">SAR 0.00</div></div>
      <div class="card"><div class="cl">${t('drExp')}</div><div class="cv" id="dr-sc-exp" style="color:var(--green)">SAR 0.00</div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px">
      ${secHTML('cust','#6b21a8',t('drCust'),ms,t('drAddCust'))}
      ${secHTML('purch','#1d4ed8',t('drPurch'),ms,t('drAddPurch'))}
      ${secHTML('exp','#16a34a',t('drExp'),ms,t('drAddExp'))}
    </div>
    <div class="panel" style="margin-bottom:16px;overflow-x:auto">
      <div class="ph">${t('drMemberBreakdown')}</div>
      <table class="ltbl" style="min-width:700px">
        <thead><tr>
          <th>${t('drDateLbl')}</th><th>${t('drMember')}</th>
          <th>${t('drNoCust')}</th><th>${t('drAmtCash')}</th><th>${t('drAmtCard')}</th><th style="font-weight:700">${t('drTotal')}</th>
          <th>${t('drNoPurch')}</th><th>${t('drAmtCash')}</th><th>${t('drAmtCard')}</th><th style="font-weight:700">${t('drTotal')}</th>
          <th>${t('drNoExp')}</th><th>${t('drAmtCash')}</th><th>${t('drAmtCard')}</th><th style="font-weight:700">${t('drTotal')}</th>
        </tr></thead>
        <tbody id="dr-bdy"></tbody>
      </table>
    </div>
    <div style="background:var(--navy);color:#fff;border-radius:10px;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div><div style="font-size:10px;opacity:.6;text-transform:uppercase;letter-spacing:1px">${t('drTodayTotal')}</div><div style="font-size:24px;font-weight:500" id="dr-tt">SAR 0.00</div></div>
      <div style="display:flex;gap:18px">
        <div style="text-align:center"><div style="font-size:13px;font-weight:500" id="dr-tt-cash">0.00</div><div style="font-size:10px;opacity:.6">${t('drCashIn')}</div></div>
        <div style="text-align:center"><div style="font-size:13px;font-weight:500" id="dr-tt-card">0.00</div><div style="font-size:10px;opacity:.6">${t('drCardIn')}</div></div>
        <div style="text-align:center"><div style="font-size:13px;font-weight:500" id="dr-tt-spent">0.00</div><div style="font-size:10px;opacity:.6">${t('drSpent')}</div></div>
      </div>
    </div>
    <div class="panel" style="margin-bottom:16px">
      <div class="ph">${t('drQuot')}</div>
      <div style="padding:14px;display:flex;align-items:center;gap:14px">
        <div style="display:flex;flex-direction:column;gap:6px">
          <button onclick="DailyReport.chgQuot(1)" style="width:32px;height:32px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);font-size:18px;cursor:pointer;font-weight:700">+</button>
          <button onclick="DailyReport.chgQuot(-1)" style="width:32px;height:32px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);font-size:20px;cursor:pointer;font-weight:700">&#8722;</button>
        </div>
        <div style="font-size:42px;font-weight:500;color:var(--teal)" id="dr-quot">${drData.quot||0}</div>
        <div style="font-size:12px;color:var(--muted)">${t('drQuotNote')}</div>
      </div>
    </div>
    <div style="background:var(--surf);border:1px solid var(--bord);border-radius:10px;padding:18px;box-shadow:var(--shad)">
      <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Download Report</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <select id="dr-period" style="padding:9px 12px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:13px">
          <option value="daily">Daily</option><option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
        </select>
        <button onclick="DailyReport.exportCSV()" style="padding:10px 22px;background:var(--teal);color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer">&#8659; CSV</button>
        <button onclick="DailyReport.exportPDF()" style="padding:10px 22px;background:#6b21a8;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer">&#128438; PDF</button>
      </div>
    </div>`;

    renderAll();
  }

  function secHTML(key, col, title, ms, btnTxt) {
    const icon = key==='cust'?'&#128100;':key==='purch'?'&#128722;':'&#128184;';
    const payOpts = `<option value="cash">${t('drCash')}</option><option value="card">${t('drCard')}</option>`;
    return `<div class="panel" style="display:flex;flex-direction:column">
      <div class="ph"><div style="width:26px;height:26px;border-radius:6px;background:${col}22;display:inline-flex;align-items:center;justify-content:center;margin-right:6px;font-size:13px">${icon}</div>${title}
        <span class="badge" style="margin-left:auto" id="dr-cnt-${key}">0</span></div>
      <div style="padding:12px;background:var(--surf2);border-bottom:1px solid var(--bord);display:flex;flex-direction:column;gap:8px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div><label>${t('drMember')}</label><select id="dr-mem-${key}">${ms}</select></div>
          <div><label>${t('drPayment')}</label><select id="dr-pay-${key}">${payOpts}</select></div>
        </div>
        <div><label>${t('drAmt')}</label><input type="number" id="dr-amt-${key}" placeholder="0.00" step="0.01" min="0"></div>
        <div><label>${t('drNote')}</label><input type="text" id="dr-note-${key}"></div>
        <button data-key="${key}" onclick="DailyReport.addEntry(this.dataset.key)"
          style="padding:8px;border:none;border-radius:6px;background:${col};color:#fff;font-weight:700;cursor:pointer">${btnTxt}</button>
      </div>
      <div style="flex:1;overflow-y:auto;max-height:200px" id="dr-list-${key}"></div>
      <div style="padding:8px 14px;background:#f4b183;font-weight:700;font-size:12px;display:flex;justify-content:space-between">
        <span>${t('drTotal')}</span><span id="dr-tot-${key}">${t('drCash')}: 0.00 | ${t('drCard')}: 0.00</span>
      </div>
    </div>`;
  }

  async function addEntry(key) {
    const amt    = parseFloat((el('dr-amt-'+key)||{}).value);
    const member = (el('dr-mem-'+key)||{}).value;
    const method = (el('dr-pay-'+key)||{}).value;
    const note   = ((el('dr-note-'+key)||{}).value||'').trim();
    if (!amt||amt<=0) return toast(t('drEAmt'), true);
    try {
      const entry = await API.addDailyEntry({ report_date:drDate, section:key, member, amount:amt, method, note });
      drData[key].push({...entry, amt:parseFloat(entry.amount||0)});
      el('dr-amt-'+key).value  = '';
      el('dr-note-'+key).value = '';
      renderAll();
      toast(t('drEntryAdded'));
    } catch(e) { toast(e.message, true); }
  }

  async function delEntry(key, id) {
    try {
      await API.deleteDailyEntry(id);
      drData[key] = drData[key].filter(e=>e.id!==id);
      renderAll();
      toast(t('drDeleted'));
    } catch(e) { toast(e.message, true); }
  }

  async function chgQuot(delta) {
    drData.quot = Math.max(0, (drData.quot||0) + delta);
    const qEl = el('dr-quot');
    if (qEl) qEl.textContent = drData.quot;
    try { await API.saveQuotations(drDate, drData.quot); } catch(e) {}
  }

  async function changeDate() {
    drDate = (el('dr-date')||{}).value || drDate;
    try {
      const r = await API.getDay(drDate);
      drData = {
        cust:  r.entries.filter(e=>e.section==='cust').map(e=>({...e,amt:parseFloat(e.amount||0)})),
        purch: r.entries.filter(e=>e.section==='purch').map(e=>({...e,amt:parseFloat(e.amount||0)})),
        exp:   r.entries.filter(e=>e.section==='exp').map(e=>({...e,amt:parseFloat(e.amount||0)})),
        quot:  r.quotations || 0,
      };
    } catch(e) {
      drData = {cust:[],purch:[],exp:[],quot:0};
    }
    const qEl = el('dr-quot');
    if (qEl) qEl.textContent = drData.quot;
    renderAll();
  }

  function renderSec(key) {
    const list = drData[key]||[];
    const cntEl = el('dr-cnt-'+key);
    if (cntEl) cntEl.textContent = list.length;
    const listEl = el('dr-list-'+key);
    if (!listEl) return;
    if (!list.length) {
      listEl.innerHTML = `<div style="padding:16px;text-align:center;color:var(--muted);font-size:12px">${t('drNoEntriesYet')}</div>`;
      const totEl = el('dr-tot-'+key);
      if (totEl) totEl.textContent = t('drCash')+': 0.00 | '+t('drCard')+': 0.00';
      return;
    }
    const cash = list.filter(e=>e.method==='cash').reduce((s,e)=>s+(e.amt||e.amount),0);
    const card = list.filter(e=>e.method==='card').reduce((s,e)=>s+(e.amt||e.amount),0);
    listEl.innerHTML = list.map(e => {
      const a = e.amt || e.amount;
      const bg = e.method==='cash'?'#dcfce7':'#dbeafe';
      const fc = e.method==='cash'?'#16803c':'#1d4ed8';
      const ml = APP.lang==='ar'?'margin-right:4px':'margin-left:4px';
      return `<div style="display:grid;grid-template-columns:1fr auto auto auto;align-items:center;padding:8px 14px;border-bottom:1px solid var(--bord);gap:6px;font-size:13px">
        <div><div style="font-weight:600">${e.member}</div>${e.note?`<div style="font-size:11px;color:var(--muted)">${e.note}</div>`:''}</div>
        <span style="font-size:10px;padding:2px 6px;border-radius:3px;background:${bg};color:${fc}">${e.method==='cash'?t('drCash'):t('drCard')}</span>
        <span style="font-size:12px;font-weight:500">SAR ${fmt(a)}</span>
        <button class="del-btn" data-key="${key}" data-id="${e.id}" onclick="DailyReport.delEntry(this.dataset.key,Number(this.dataset.id))">&#10005;</button>
      </div>`;
    }).join('');
    const totEl = el('dr-tot-'+key);
    if (totEl) totEl.textContent = t('drCash')+': '+fmt(cash)+' | '+t('drCard')+': '+fmt(card);
  }

  function renderBreakdown() {
    const tbody = el('dr-bdy'); if(!tbody) return;
    const rows = DR_MEMBERS.map(m => {
      const c  = (drData.cust||[]).filter(e=>e.member===m);
      const p  = (drData.purch||[]).filter(e=>e.member===m);
      const ex = (drData.exp||[]).filter(e=>e.member===m);
      const s  = (arr,mt) => arr.filter(e=>e.method===mt).reduce((s,e)=>s+(e.amt||e.amount),0);
      const sca=s(c,'cash'),scd=s(c,'card'),pca=s(p,'cash'),pcd=s(p,'card'),eca=s(ex,'cash'),ecd=s(ex,'card');
      return {name:m,cc:c.length,sca,scd,stot:sca+scd,pc:p.length,pca,pcd,ptot:pca+pcd,ec:ex.length,eca,ecd,etot:eca+ecd};
    });
    const tot = rows.reduce((t,r)=>({cc:t.cc+r.cc,sca:t.sca+r.sca,scd:t.scd+r.scd,stot:t.stot+r.stot,pc:t.pc+r.pc,pca:t.pca+r.pca,pcd:t.pcd+r.pcd,ptot:t.ptot+r.ptot,ec:t.ec+r.ec,eca:t.eca+r.eca,ecd:t.ecd+r.ecd,etot:t.etot+r.etot}),{cc:0,sca:0,scd:0,stot:0,pc:0,pca:0,pcd:0,ptot:0,ec:0,eca:0,ecd:0,etot:0});
    const tr = r => `<td>${r.cc}</td><td>${fmt(r.sca)}</td><td>${fmt(r.scd)}</td><td style="font-weight:700">${fmt(r.stot)}</td><td>${r.pc}</td><td>${fmt(r.pca)}</td><td>${fmt(r.pcd)}</td><td style="font-weight:700">${fmt(r.ptot)}</td><td>${r.ec}</td><td>${fmt(r.eca)}</td><td>${fmt(r.ecd)}</td><td style="font-weight:700">${fmt(r.etot)}</td>`;
    tbody.innerHTML = rows.map(r=>`<tr><td style="color:var(--muted);font-size:11px">${drDate}</td><td style="font-weight:600">${r.name}</td>${tr(r)}</tr>`).join('')
      + `<tr style="background:#f4b183;font-weight:700"><td colspan="2">${t('drTotal')}</td>${tr(tot)}</tr>`;
  }

  function renderTotals() {
    const c = drData.cust||[], sp=(drData.purch||[]).concat(drData.exp||[]);
    const cash=c.filter(e=>e.method==='cash').reduce((s,e)=>s+(e.amt||e.amount),0);
    const card=c.filter(e=>e.method==='card').reduce((s,e)=>s+(e.amt||e.amount),0);
    const spent=sp.reduce((s,e)=>s+(e.amt||e.amount),0);
    const sv=(id,v)=>{const e=el(id);if(e)e.textContent=v;};
    sv('dr-tt','SAR '+fmt(cash+card)); sv('dr-tt-cash',fmt(cash)); sv('dr-tt-card',fmt(card)); sv('dr-tt-spent',fmt(spent));
    sv('dr-sc-cust',(drData.cust||[]).length);
    sv('dr-sc-sales','SAR '+fmt(cash+card));
    sv('dr-sc-purch','SAR '+fmt((drData.purch||[]).reduce((s,e)=>s+(e.amt||e.amount),0)));
    sv('dr-sc-exp','SAR '+fmt((drData.exp||[]).reduce((s,e)=>s+(e.amt||e.amount),0)));
  }

  function renderAll() { ['cust','purch','exp'].forEach(k=>renderSec(k)); renderBreakdown(); renderTotals(); }

  async function getDateRange() {
    const period = (el('dr-period')||{value:'daily'}).value;
    const base   = new Date((el('dr-date')||{}).value || drDate);
    const dates  = [];
    if (period==='daily') {
      dates.push((el('dr-date')||{}).value || drDate);
    } else if (period==='weekly') {
      const day = base.getDay(), mon=new Date(base);
      mon.setDate(base.getDate()-(day===0?6:day-1));
      for(let i=0;i<7;i++){const d=new Date(mon);d.setDate(mon.getDate()+i);dates.push(d.toLocaleDateString('en-CA'));}
    } else if (period==='monthly') {
      const y=base.getFullYear(),m=base.getMonth(),days=new Date(y,m+1,0).getDate();
      for(let i=1;i<=days;i++) dates.push(`${y}-${String(m+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`);
    } else if (period==='quarterly') {
      const y=base.getFullYear(),q=Math.floor(base.getMonth()/3),sm=q*3;
      for(let mi=0;mi<3;mi++){const days2=new Date(y,sm+mi+1,0).getDate();for(let i=1;i<=days2;i++)dates.push(`${y}-${String(sm+mi+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`);}
    } else if (period==='yearly') {
      const y=base.getFullYear();
      for(let mi=0;mi<12;mi++){const days3=new Date(y,mi+1,0).getDate();for(let i=1;i<=days3;i++)dates.push(`${y}-${String(mi+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`);}
    }
    return dates;
  }

  async function collectRows() {
    const dates   = await getDateRange();
    if (!dates.length) return [];
    const start   = dates[0], end = dates[dates.length-1];
    const allRows = [];
    try {
      const r = await API.getRange(start, end);
      dates.forEach(d => {
        const dayEntries = r.entries.filter(e=>e.report_date===d);
        DR_MEMBERS.forEach(m => {
          const c  = dayEntries.filter(e=>e.section==='cust'&&e.member===m);
          const p  = dayEntries.filter(e=>e.section==='purch'&&e.member===m);
          const ex = dayEntries.filter(e=>e.section==='exp'&&e.member===m);
          if (!c.length&&!p.length&&!ex.length) return;
          const s=(arr,mt)=>arr.filter(e=>e.method===mt).reduce((s,e)=>s+parseFloat(e.amount||0),0);
          const sca=s(c,'cash'),scd=s(c,'card'),pca=s(p,'cash'),pcd=s(p,'card'),eca=s(ex,'cash'),ecd=s(ex,'card');
          allRows.push([d,m,c.length,sca,scd,sca+scd,p.length,pca,pcd,pca+pcd,ex.length,eca,ecd,eca+ecd]);
        });
      });
    } catch(e) {}
    return allRows;
  }

  async function exportCSV() {
    const rows = await collectRows();
    if (!rows.length) return toast(t('drNoData'), true);
    const h = [t('drDateLbl'),t('drMember'),t('drNoCust'),t('drAmtCash'),t('drAmtCard'),t('drTotal'),t('drNoPurch'),t('drAmtCash'),t('drAmtCard'),t('drTotal'),t('drNoExp'),t('drAmtCash'),t('drAmtCard'),t('drTotal')];
    const tot = [t('drTotal'),''].concat([2,3,4,5,6,7,8,9,10,11,12,13].map(c=>rows.reduce((s,r)=>s+(r[c]||0),0)));
    const csv = '\uFEFF'+[h].concat(rows).concat([tot]).map(function(r){return r.map(function(v){return '"'+(typeof v==='number'?v.toFixed(2):v)+'"';}).join(',');}).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    a.download = `SmartSuccess_${(el('dr-period')||{value:'daily'}).value}_${drDate}.csv`;
    a.click(); toast(t('drDownloadedDaily'));
  }

  async function exportPDF() {
    const rows   = await collectRows();
    const period = (el('dr-period')||{value:'daily'}).value;
    const h = [t('drDateLbl'),t('drMember'),t('drNoCustShort'),t('drCash'),t('drCard'),t('drTotal'),t('drNoPurchShort'),t('drCash'),t('drCard'),t('drTotal'),t('drNoExpShort'),t('drCash'),t('drCard'),t('drTotal')];
    const tot = [t('drTotal'),''].concat([2,3,4,5,6,7,8,9,10,11,12,13].map(c=>rows.reduce((s,r)=>s+(r[c]||0),0)));
    const isAr = APP.lang==='ar', dir=isAr?'rtl':'ltr';
    const trRow = (r,isTot) => '<tr>'+ r.map((v,i)=>`<td style="padding:5px 8px;border:1px solid #ccc;font-size:10px;${isTot?'background:#f4b183;font-weight:700;':''} ${(i===5||i===9||i===13)?'font-weight:700;':''}">${typeof v==='number'?v.toFixed(2):v}</td>`).join('') +'</tr>';
    const bodyRows = rows.map(r=>trRow(r,false)).join('') + (rows.length?trRow(tot,true):'<tr><td colspan="14" style="padding:20px;text-align:center;color:#999">No data</td></tr>');
    const html2 = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="UTF-8"><title>${period} Report ${drDate}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:${isAr?'Tahoma,':''}Arial,sans-serif;padding:16px;color:#1e2d4a;font-size:11px;direction:${dir}}
    table{border-collapse:collapse;width:100%}th{background:#7030A0;color:#fff;padding:6px 8px;text-align:left;border:1px solid #7030A0;white-space:nowrap}
    .hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    @media print{@page{size:A4 landscape;margin:8mm}.no-print{display:none}}</style></head>
    <body><div class="hdr"><div><h2 style="font-size:14px">Smart Success — ${period} Report</h2><div style="font-size:10px;color:#888">Period: ${drDate} | ${new Date().toLocaleString('en-GB',{timeZone:TZ})}</div></div>
    <button class="no-print" onclick="window.print()" style="padding:7px 16px;background:#7030A0;color:#fff;border:none;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer">Print / Save PDF</button></div>
    <table><thead><tr>${h.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;
    const w = window.open('about:blank','_blank');
    if(w){w.document.open();w.document.write(html2);w.document.close();}
    else {
      const ov=document.createElement('div');
      ov.style.cssText='position:fixed;inset:0;background:#fff;z-index:99999;overflow:auto;padding:20px';
      ov.innerHTML=`<button onclick="this.parentNode.remove()" class="no-print" style="position:fixed;top:12px;right:12px;padding:7px 14px;background:#e05a2b;color:#fff;border:none;border-radius:5px;cursor:pointer">&#10005; Close</button>`+html2;
      document.body.appendChild(ov);
      setTimeout(()=>window.print(),400);
    }
  }

  return { render, addEntry, delEntry, chgQuot, changeDate, renderAll, exportCSV, exportPDF };
})();
