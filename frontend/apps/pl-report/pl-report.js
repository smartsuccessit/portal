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
            '<button class="tbtn ti" id="pl-btn-inc" onclick="PLReport.setType(\"income\")">&#8593; Income</button>' +
            '<button class="tbtn"    id="pl-btn-exp" onclick="PLReport.setType(\"expense\")">&#8595; Expense</button>' +
          '</div>' +
          '<div><label>Month</label><select id="pl-month" style="padding:9px 12px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:14px;width:100%">' + monthOpts + '</select></div>' +
          '<div><label>Category</label><select id="pl-cat">' + getCatOptions('income') + '</select></div>' +
          '<div><label>Description</label><input type="text" id="pl-desc" placeholder="What is this for?"></div>' +
          '<div><label>Amount (SAR)</label><input type="number" id="pl-amt" placeholder="0.00" step="0.01" min="0"></div>' +
          '<div><label>Reference / Note</label><input type="text" id="pl-note" placeholder="Invoice #, receipt..."></div>' +
          '<button class="sub-btn" onclick="PLReport.addEntry()">+ Add Entry</button>' +
        '</div></div>' +
        '<div style="display:flex;flex-direction:column;gap:16px">' +
          '<div class="panel"><div class="ph dark">&#128202; Monthly Breakdown <button onclick="PLReport.exportCSV()" class="exp-btn" style="color:#fff;border-color:rgba(255,255,255,.3)">CSV</button></div>' +
          '<div class="sw"><table class="ltbl"><thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net Profit</th><th>Margin</th></tr></thead><tbody id="pl-tbody"></tbody></table></div></div>' +
          '<div class="panel"><div class="ph dark">Entries' +
            '<div style="display:flex;gap:6px">' +
              '<button class="fbtn on" style="color:#fff;border-color:rgba(255,255,255,.3)" onclick="PLReport.filterType(\"all\",this)">All</button>' +
              '<button class="fbtn" style="color:rgba(255,255,255,.6)" onclick="PLReport.filterType(\"income\",this)">Income</button>' +
              '<button class="fbtn" style="color:rgba(255,255,255,.6)" onclick="PLReport.filterType(\"expense\",this)">Expense</button>' +
              '<select id="pl-filter-month" onchange="PLReport.renderEntries()" style="margin-left:auto;padding:4px 8px;border:1px solid rgba(255,255,255,.3);border-radius:4px;background:rgba(255,255,255,.1);color:#fff;font-size:11px">' + filterMonthOpts + '</select>' +
            '</div>' +
          '</div>' +
          '<div class="sw"><table class="ltbl"><thead><tr><th>Month</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th><th>Note</th><th></th></tr></thead><tbody id="pl-entries-tbody"></tbody></table>' +
          '<div class="empty" id="pl-empty" style="display:none">No entries yet.</div></div></div>' +
        '</div>' +
      '</div>';

    renderSummary();
    renderEntries();
  }

  function setType(t) {
    currentType = t;
    var btnI = el('pl-btn-inc'), btnE = el('pl-btn-exp');
    if(btnI) btnI.className = 'tbtn' + (t==='income'?' ti':'');
    if(btnE) btnE.className = 'tbtn' + (t==='expense'?' to':'');
    var cat = el('pl-cat');
    if (cat) cat.innerHTML = getCatOptions(t);
  }

  function filterType(t, btn) {
    typeFilter = t;
    document.querySelectorAll('.lctrl .fbtn').forEach(function(b){b.classList.remove('on');});
    btn.classList.add('on');
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
        '<td><button class="del-btn" onclick="PLReport.deleteEntry('+e.id+')">&#10005;</button></td>'+
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

  return{render:render,setType:setType,filterType:filterType,addEntry:addEntry,deleteEntry:deleteEntry,refresh:refresh,renderEntries:renderEntries,exportCSV:exportCSV};
})();
