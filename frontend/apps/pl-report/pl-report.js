/** P&L Report v3 — built 2026-05-03 00:05 */
window.PLReport = (function() {
  var entries = [], wrap;
  var CATS = { income: [], expense: [] };
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var currentType = 'income', typeFilter = 'all';

  async function render(container) {
    wrap = container;
    wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:12px;color:var(--muted)"><span class="spinner"></span> Loading...</div>';
    try {
      var results = await Promise.all([
        API.req('GET', '/pl-entries'),
        API.req('GET', '/pl-categories')
      ]);
      entries = results[0] || [];
      var cats = results[1] || [];
      CATS.income  = cats.filter(function(c){return c.type==='income';});
      CATS.expense = cats.filter(function(c){return c.type==='expense';});
      if (!CATS.income.length)  CATS.income  = [{name_en:'Product Sales',name_ar:''},{name_en:'Service Revenue',name_ar:''},{name_en:'Other Income',name_ar:''}];
      if (!CATS.expense.length) CATS.expense = [{name_en:'Cost of Goods',name_ar:''},{name_en:'Rent',name_ar:''},{name_en:'Salaries',name_ar:''},{name_en:'Other Expense',name_ar:''}];
    } catch(e) { entries=[]; }
    buildUI();
  }

  function getCatOptions(type) {
    var list = CATS[type] || [];
    return list.map(function(c) {
      var en = c.name_en || c.en || c;
      var ar = c.name_ar || c.ar || en;
      var label = (APP.lang==='ar' && ar) ? ar : en;
      return '<option value="' + en + '">' + label + '</option>';
    }).join('');
  }

  function buildUI() {
    var now = new Date();
    var curYear  = now.getFullYear();
    var curMonth = now.getMonth() + 1;

    var yearOpts = [curYear-1, curYear, curYear+1].map(function(y) {
      return '<option value="' + y + '"' + (y===curYear?' selected':'') + '>' + y + '</option>';
    }).join('');

    var monthOpts = MONTHS.map(function(m, i) {
      return '<option value="' + (i+1) + '"' + (i+1===curMonth?' selected':'') + '>' + m + '</option>';
    }).join('');

    var filterMonthOpts = '<option value="">All Months</option>' + MONTHS.map(function(m,i) {
      return '<option value="' + (i+1) + '">' + m + '</option>';
    }).join('');

    wrap.innerHTML =
      '<div class="pg-hdr"><h2>&#128200; Profit &amp; Loss</h2>' +
      '<select id="pl-year" onchange="PLReport.refresh()" style="padding:8px 12px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:13px">' + yearOpts + '</select></div>' +
      '<div class="cards">' +
        '<div class="card grn"><div class="cl">Total Income</div><div class="cv" id="pl-v-inc">0.00</div></div>' +
        '<div class="card red"><div class="cl">Total Expenses</div><div class="cv" id="pl-v-exp">0.00</div></div>' +
        '<div class="card grn"><div class="cl">Net Profit</div><div class="cv" id="pl-v-net">0.00</div></div>' +
        '<div class="card tel"><div class="cl">Margin</div><div class="cv" id="pl-v-mrg">0.0%</div></div>' +
      '</div>' +
      '<div class="layout" style="grid-template-columns:360px 1fr">' +
        '<div class="panel"><div class="ph dark">+ New Entry</div><div class="fb">' +
          '<div class="ttype">' +
            '<button class="tbtn pl-inc" id="pl-btn-inc" onclick="PLReport.setType(this,\'income\')">&#8593; Income</button>' +
            '<button class="tbtn" id="pl-btn-exp" onclick="PLReport.setType(this,\'expense\')">&#8595; Expense</button>' +
          '</div>' +
          '<div><label>Month</label><select id="pl-month" style="padding:9px 12px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:14px;width:100%">' + monthOpts + '</select></div>' +
          '<div><label>Category</label><select id="pl-cat">' + getCatOptions('income') + '</select></div>' +
          '<div><label>Description</label><input type="text" id="pl-desc" placeholder="What is this for?"></div>' +
          '<div><label>Amount (SAR)</label><input type="number" id="pl-amt" placeholder="0.00" step="0.01" min="0"></div>' +
          '<div><label>Reference / Note</label><input type="text" id="pl-note" placeholder="Invoice #, receipt..."></div>' +
          '<button class="sub-btn" onclick="PLReport.addEntry()">+ Add Entry</button>' +
        '</div></div>' +
        '<div style="display:flex;flex-direction:column;gap:16px">' +
          '<div class="panel"><div class="ph dark" style="display:flex;justify-content:space-between;align-items:center"><span>&#128202; Monthly Breakdown</span><div style="display:flex;gap:6px"><button onclick="PLReport.exportCSV()" class="exp-btn" style="color:#fff;border-color:rgba(255,255,255,.3)">CSV</button><button onclick="PLReport.exportPDF()" class="exp-btn" style="color:#fff;border-color:rgba(255,255,255,.3)">&#128196; PDF</button></div></div>' +
          '<div class="sw"><table class="ltbl"><thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net Profit</th><th>Margin</th></tr></thead><tbody id="pl-tbody"></tbody></table></div></div>' +
          '<div class="panel"><div class="ph dark">Entries' +
            '<div style="display:flex;gap:6px">' +
              '<button class="fbtn on" style="color:#fff;border-color:rgba(255,255,255,.3)" onclick="PLReport.filterType(this,\'all\')">All</button>' +
              '<button class="fbtn" style="color:rgba(255,255,255,.6)" onclick="PLReport.filterType(this,\'income\')">Income</button>' +
              '<button class="fbtn" style="color:rgba(255,255,255,.6)" onclick="PLReport.filterType(this,\'expense\')">Expense</button>' +
              '<select id="pl-filter-month" onchange="PLReport.renderEntries()" style="margin-left:auto;padding:4px 8px;border:1px solid rgba(255,255,255,.3);border-radius:4px;background:rgba(255,255,255,.1);color:#fff;font-size:11px">' + filterMonthOpts + '</select>' +
            '</div>' +
          '</div>' +
          '<div class="sw"><table class="ltbl"><thead><tr><th>Month</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th><th>Note</th><th></th></tr></thead><tbody id="pl-entries-tbody"></tbody></table>' +
          '<div class="empty" id="pl-empty" style="display:none">No entries yet.</div></div></div>' +
      '<div class="overlay" id="pl-edit-modal"><div class="modal">' +
        '<h3>Edit Entry</h3>' +
        '<div class="mf">' +
          '<div class="mrow">' +
            '<div><label>Month</label><select id="pl-em-month">' + MONTHS.map(function(m,i){return '<option value="'+(i+1)+'">'+m+'</option>';}).join('') + '</select></div>' +
            '<div><label>Year</label><select id="pl-em-year">' + [now.getFullYear()-1,now.getFullYear(),now.getFullYear()+1].map(function(y){return '<option value="'+y+'">'+y+'</option>';}).join('') + '</select></div>' +
          '</div>' +
          '<div class="mrow">' +
            '<div><label>Type</label><select id="pl-em-type"><option value="income">Income</option><option value="expense">Expense</option></select></div>' +
            '<div><label>Category</label><select id="pl-em-cat"></select></div>' +
          '</div>' +
          '<div><label>Description</label><input type="text" id="pl-em-desc"></div>' +
          '<div><label>Amount (SAR)</label><input type="number" id="pl-em-amt" step="0.01" min="0"></div>' +
          '<div><label>Note</label><input type="text" id="pl-em-note"></div>' +
        '</div>' +
        '<div class="mact">' +
          '<button class="btn-c" onclick="closeModal(\'pl-edit-modal\')">Cancel</button>' +
          '<button class="btn-s" onclick="PLReport.saveEdit()">Save Changes</button>' +
        '</div>' +
      '</div></div>' +
        '</div>' +
      '</div>';

    renderSummary();
    renderEntries();
  }

  function setType(btnOrType, type) {
    // handle both setType('income') and setType(this, 'income')
    var t = (type !== undefined) ? type : btnOrType;
    currentType = t;
    var btnI = el('pl-btn-inc'), btnE = el('pl-btn-exp');
    if(btnI) btnI.className = 'tbtn' + (t==='income'?' pl-inc':'');
    if(btnE) btnE.className = 'tbtn' + (t==='expense'?' pl-exp':'');
    var cat = el('pl-cat');
    if (cat) cat.innerHTML = getCatOptions(t);
  }

  function filterType(btnOrType, type) {
    var t = (type !== undefined) ? type : btnOrType;
    var btn = (type !== undefined) ? btnOrType : null;
    typeFilter = t;
    document.querySelectorAll('.lctrl .fbtn').forEach(function(b){b.classList.remove('on');});
    if(btn) btn.classList.add('on');
    renderEntries();
  }

  function getYear() { return parseInt((el('pl-year')||{value:new Date().getFullYear()}).value); }

  function refresh() { renderSummary(); renderEntries(); }

  async function addEntry() {
    var month  = parseInt((el('pl-month')||{value:1}).value);
    var year   = getYear();
    var cat    = (el('pl-cat')||{value:''}).value;
    var desc   = (el('pl-desc')||{value:''}).value.trim();
    var amt    = parseFloat((el('pl-amt')||{value:0}).value);
    var note   = (el('pl-note')||{value:''}).value.trim();
    if (!desc)         return toast('Add a description', true);
    if (!amt || amt<=0) return toast('Enter a valid amount', true);
    if (!cat)           return toast('Select a category', true);
    try {
      var entry = await API.req('POST', '/pl-entries', {
        type: currentType, month: month, year: year,
        category: cat, description: desc, amount: amt, note: note, entered_by: APP.user.name
      });
      entries.unshift(entry);
      ['pl-desc','pl-amt','pl-note'].forEach(function(id){var e=el(id);if(e)e.value='';});
      renderSummary(); renderEntries();
      toast(currentType==='income'?'Income added':'Expense added');
    } catch(e) { toast(e.message, true); }
  }

  async function deleteEntry(id) {
    if (!confirm('Delete this entry?')) return;
    try {
      await API.req('DELETE', '/pl-entries/' + id);
      entries = entries.filter(function(x){return x.id!==id;});
      renderSummary(); renderEntries();
      toast('Deleted');
    } catch(e) { toast(e.message, true); }
  }

  function renderSummary() {
    var year = getYear();
    var ye   = entries.filter(function(e){return parseInt(e.year)===year;});
    var ti   = ye.filter(function(e){return e.type==='income'; }).reduce(function(s,e){return s+parseFloat(e.amount||0);},0);
    var tx   = ye.filter(function(e){return e.type==='expense';}).reduce(function(s,e){return s+parseFloat(e.amount||0);},0);
    var net  = ti - tx;
    var mg   = ti > 0 ? (net/ti*100).toFixed(1) : '0.0';
    function sv(id,v){var e=el(id);if(e)e.textContent=v;}
    sv('pl-v-inc','SAR '+fmt(ti)); sv('pl-v-exp','SAR '+fmt(tx));
    sv('pl-v-net','SAR '+fmt(net)); sv('pl-v-mrg',mg+'%');
    var tbody = el('pl-tbody'); if(!tbody)return;
    var rows = MONTHS.map(function(m,i){
      var mi = i+1;
      var me = ye.filter(function(e){return parseInt(e.month)===mi;});
      var inc = me.filter(function(e){return e.type==='income'; }).reduce(function(s,e){return s+parseFloat(e.amount||0);},0);
      var exp = me.filter(function(e){return e.type==='expense';}).reduce(function(s,e){return s+parseFloat(e.amount||0);},0);
      var n=inc-exp;
      if(inc===0&&exp===0)return '';
      return '<tr><td style="font-weight:600">'+m+' '+year+'</td><td class="ain">+'+fmt(inc)+'</td><td class="aout">-'+fmt(exp)+'</td>'+
        '<td style="font-weight:700;color:' +(n>=0?'var(--green)':'var(--red)')+'">' +(n>=0?'+':'')+ fmt(n)+'</td>'+
        '<td style="color:var(--muted)">' +(inc>0?(n/inc*100).toFixed(1)+'%':'—')+'</td></tr>';
    }).join('');
    tbody.innerHTML = rows || '<tr><td colspan="5" class="empty">No data for '+year+'</td></tr>';
  }

  function renderEntries() {
    var year = getYear();
    var fmth = parseInt((el('pl-filter-month')||{value:''}).value||0);
    var list = entries.filter(function(e){return parseInt(e.year)===year;});
    if (typeFilter!=='all') list=list.filter(function(e){return e.type===typeFilter;});
    if (fmth) list=list.filter(function(e){return parseInt(e.month)===fmth;});
    var tbody=el('pl-entries-tbody'), emp=el('pl-empty');
    if(!tbody)return;
    if(!list.length){tbody.innerHTML='';if(emp)emp.style.display='block';return;}
    if(emp)emp.style.display='none';
    tbody.innerHTML = list.map(function(e){
      var isInc=e.type==='income';
      return '<tr>'+
        '<td style="font-size:12px;color:var(--muted)">'+MONTHS[parseInt(e.month)-1]+' '+e.year+'</td>'+
        '<td><span style="font-size:10px;padding:2px 7px;border-radius:3px;background:' +(isInc?'rgba(22,163,74,.12)':'rgba(224,90,43,.12)')+';color:' +(isInc?'var(--green)':'var(--red)')+'">' +(isInc?'Income':'Expense')+'</span></td>'+
        '<td style="color:var(--muted);font-size:12px">'+e.category+'</td>'+
        '<td style="font-weight:500">'+e.description+'</td>'+
        '<td class="' +(isInc?'ain':'aout')+ '">' +(isInc?'+':'-')+fmt(e.amount)+'</td>'+
        '<td style="font-size:11px;color:var(--muted)">' +(e.note||'')+'</td>'+
        '<td style="display:flex;gap:4px">' +
        '<button class="act-btn" onclick="PLReport.editEntry('+e.id+')" style="font-size:10px;padding:3px 8px">Edit</button>' +
        '<button class="del-btn" onclick="PLReport.deleteEntry('+e.id+')">&#10005;</button>' +
        '</td>'+
        '</tr>';
    }).join('');
  }

  function exportCSV() {
    var year=getYear(), list=entries.filter(function(e){return parseInt(e.year)===year;});
    if(!list.length)return toast('No data',true);
    var h=['Month','Year','Type','Category','Description','Amount (SAR)','Note','Entered By'];
    var data=list.map(function(e){return[MONTHS[parseInt(e.month)-1],e.year,e.type,e.category,e.description,fmt(e.amount),e.note||'',e.entered_by||''];});
    var csv='\uFEFF'+[h].concat(data).map(function(r){return r.map(function(v){return '"'+v+'"';}).join(',');}).join('\n');
    var a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    a.download='PL_'+year+'.csv';a.click();toast('Exported');
  }

  var editingId = null;

  function editEntry(id) {
    var e = entries.find(function(x){return x.id===id;});
    if (!e) return;
    editingId = id;
    var em = el('pl-em-month'); if(em) em.value = e.month;
    var ey = el('pl-em-year');  if(ey) ey.value = e.year;
    var et = el('pl-em-type');  if(et) { et.value = e.type; updateEditCats(e.type, e.category); }
    var ed = el('pl-em-desc');  if(ed) ed.value = e.description;
    var ea = el('pl-em-amt');   if(ea) ea.value = parseFloat(e.amount||0).toFixed(2);
    var en2= el('pl-em-note');  if(en2) en2.value = e.note||'';
    var et2= el('pl-em-type');
    if(et2) et2.onchange = function(){ updateEditCats(this.value, ''); };
    openModal('pl-edit-modal');
  }

  function updateEditCats(type, selected) {
    var cat = el('pl-em-cat'); if(!cat) return;
    cat.innerHTML = getCatOptions(type);
    if(selected) cat.value = selected;
  }

  async function saveEdit() {
    var month = parseInt((el('pl-em-month')||{value:1}).value);
    var year  = parseInt((el('pl-em-year') ||{value:new Date().getFullYear()}).value);
    var type  = (el('pl-em-type')||{value:'income'}).value;
    var cat   = (el('pl-em-cat') ||{value:''}).value;
    var desc  = (el('pl-em-desc')||{value:''}).value.trim();
    var amt   = parseFloat((el('pl-em-amt')||{value:0}).value);
    var note  = (el('pl-em-note')||{value:''}).value.trim();
    if(!desc) return toast('Add a description', true);
    if(!amt||amt<=0) return toast('Enter a valid amount', true);
    try {
      await API.req('PUT', '/pl-entries/'+editingId, {month:month,year:year,type:type,category:cat,description:desc,amount:amt,note:note});
      var e = entries.find(function(x){return x.id===editingId;});
      if(e){ e.month=month; e.year=year; e.type=type; e.category=cat; e.description=desc; e.amount=amt; e.note=note; }
      closeModal('pl-edit-modal');
      renderSummary(); renderEntries();
      toast('Entry updated');
    } catch(e2){ toast(e2.message, true); }
  }

  function exportPDF() {
    var year   = getYear();
    var fmth   = parseInt((el('pl-filter-month')||{value:''}).value||0);
    var yearEntries = entries.filter(function(e){return parseInt(e.year)===year;});
    var list = yearEntries.slice();
    if (typeFilter!=='all') list = list.filter(function(e){return e.type===typeFilter;});
    if (fmth) list = list.filter(function(e){return parseInt(e.month)===fmth;});
    if (!list.length) return toast('No data to export', true);

    var now = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    var filterLabel = typeFilter==='all' ? 'All Entries' : typeFilter==='income' ? 'Income Only' : 'Expenses Only';
    var monthLabel  = fmth ? MONTHS[fmth-1] + ' ' + year : 'Full Year ' + year;

    // Summary totals
    var ti = list.filter(function(e){return e.type==='income'; }).reduce(function(s,e){return s+parseFloat(e.amount||0);},0);
    var tx = list.filter(function(e){return e.type==='expense';}).reduce(function(s,e){return s+parseFloat(e.amount||0);},0);
    var net = ti - tx;
    var margin = ti > 0 ? (net/ti*100).toFixed(1) : '0.0';

    // Monthly breakdown rows
    var monthRows = MONTHS.map(function(m,i){
      var mi = i+1;
      var me = yearEntries.filter(function(e){return parseInt(e.month)===mi;});
      var inc = me.filter(function(e){return e.type==='income'; }).reduce(function(s,e){return s+parseFloat(e.amount||0);},0);
      var exp = me.filter(function(e){return e.type==='expense';}).reduce(function(s,e){return s+parseFloat(e.amount||0);},0);
      var n = inc - exp;
      if (inc===0 && exp===0) return '';
      return '<tr style="background:'+(i%2===0?'#f9fafb':'#fff')+'">' +
        '<td style="font-weight:600">'+m+' '+year+'</td>' +
        '<td style="color:#16a34a;text-align:right">SAR '+fmt(inc)+'</td>' +
        '<td style="color:#dc2626;text-align:right">SAR '+fmt(exp)+'</td>' +
        '<td style="font-weight:700;color:'+(n>=0?'#16a34a':'#dc2626')+';text-align:right">'+(n>=0?'+':'')+'SAR '+fmt(n)+'</td>' +
        '<td style="color:#6b7280;text-align:right">'+(inc>0?(n/inc*100).toFixed(1)+'%':'—')+'</td>' +
        '</tr>';
    }).join('');

    // Entry rows
    var entryRows = list.map(function(e,i){
      var isInc = e.type==='income';
      return '<tr style="background:'+(i%2===0?'#f9fafb':'#fff')+'">' +
        '<td>'+MONTHS[parseInt(e.month)-1]+' '+e.year+'</td>' +
        '<td><span style="padding:2px 8px;border-radius:3px;font-size:11px;background:'+(isInc?'rgba(22,163,74,.1)':'rgba(220,38,38,.1)')+';color:'+(isInc?'#16a34a':'#dc2626')+'">'+(isInc?'Income':'Expense')+'</span></td>' +
        '<td style="color:#6b7280;font-size:12px">'+e.category+'</td>' +
        '<td style="font-weight:500">'+e.description+'</td>' +
        '<td style="color:'+(isInc?'#16a34a':'#dc2626')+';text-align:right;font-weight:600">'+(isInc?'+':'-')+'SAR '+fmt(e.amount)+'</td>' +
        '<td style="color:#6b7280;font-size:12px">'+(e.note||'')+'</td>' +
        '</tr>';
    }).join('');

    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>P&L Report '+year+'</title>' +
    '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:30px}' +
    'h1{font-size:22px;color:#1e2d4a;margin-bottom:4px}.sub{color:#6b7280;font-size:13px;margin-bottom:24px}' +
    '.meta{display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap}.meta-item{background:#f3f4f6;border-radius:8px;padding:10px 16px;min-width:130px}' +
    '.meta-item .label{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px}.meta-item .value{font-size:18px;font-weight:700;margin-top:2px}' +
    'h2{font-size:14px;font-weight:700;color:#1e2d4a;margin:20px 0 8px;border-bottom:2px solid #e5e7eb;padding-bottom:4px}' +
    'table{width:100%;border-collapse:collapse;margin-bottom:16px}th{background:#1e2d4a;color:#fff;padding:8px 10px;text-align:left;font-size:12px}' +
    'td{padding:7px 10px;border-bottom:1px solid #f3f4f6;font-size:12px}' +
    '.footer{margin-top:30px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;display:flex;justify-content:space-between}' +
    '@media print{button{display:none}}</style></head><body>' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">' +
    '<div><h1>&#128200; Profit &amp; Loss Report</h1>' +
    '<div class="sub">'+monthLabel+' &nbsp;|&nbsp; '+filterLabel+'</div></div>' +
    '<div style="text-align:right;font-size:12px;color:#6b7280">Generated: '+now+'<br>Smart Success Portal</div></div>' +
    '<div class="meta">' +
    '<div class="meta-item"><div class="label">Total Income</div><div class="value" style="color:#16a34a">SAR '+fmt(ti)+'</div></div>' +
    '<div class="meta-item"><div class="label">Total Expenses</div><div class="value" style="color:#dc2626">SAR '+fmt(tx)+'</div></div>' +
    '<div class="meta-item"><div class="label">Net Profit</div><div class="value" style="color:'+(net>=0?'#16a34a':'#dc2626')+'">'+(net>=0?'+':'')+'SAR '+fmt(net)+'</div></div>' +
    '<div class="meta-item"><div class="label">Margin</div><div class="value" style="color:#2abfbf">'+margin+'%</div></div>' +
    '<div class="meta-item"><div class="label">Entries</div><div class="value" style="color:#1e2d4a">'+list.length+'</div></div>' +
    '</div>' +
    (!fmth ? '<h2>Monthly Breakdown</h2><table><thead><tr><th>Month</th><th style="text-align:right">Income</th><th style="text-align:right">Expenses</th><th style="text-align:right">Net Profit</th><th style="text-align:right">Margin</th></tr></thead><tbody>'+monthRows+'</tbody></table>' : '') +
    '<h2>Entry Details</h2>' +
    '<table><thead><tr><th>Month</th><th>Type</th><th>Category</th><th>Description</th><th style="text-align:right">Amount (SAR)</th><th>Note</th></tr></thead><tbody>'+entryRows+'</tbody></table>' +
    '<div class="footer"><span>Smart Success IT — P&amp;L Report</span><span>'+list.length+' entries &nbsp;|&nbsp; Net: '+(net>=0?'+':'')+'SAR '+fmt(net)+'</span></div>' +
    '<br><button onclick="window.print()" style="padding:10px 24px;background:#1e2d4a;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;margin-top:8px">&#128424; Print / Save as PDF</button>' +
    '</body></html>';

    var w = window.open('','_blank','width=900,height=700');
    w.document.write(html);
    w.document.close();
  }

  return{render:render,setType:setType,filterType:filterType,addEntry:addEntry,editEntry:editEntry,saveEdit:saveEdit,deleteEntry:deleteEntry,refresh:refresh,renderEntries:renderEntries,exportCSV:exportCSV};
})();
