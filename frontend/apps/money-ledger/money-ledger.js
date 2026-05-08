/** Money Ledger v3 — built 2026-05-03 00:05 — string concat version */
window.MoneyLedger = (function() {
  var entries = [], allUsers = [], wrap;
  var MANAGERS = ['Shahzaib','Riyad'];
  var TYPES = [
    { id:'salary',    label:'Salary',       color:'var(--green)', credit:true  },
    { id:'bonus',     label:'Bonus',        color:'var(--green)', credit:true  },
    { id:'profit',    label:'Profit Share', color:'#2abfbf',      credit:true  },
    { id:'loan',      label:'Loan Given',   color:'#f59e0b',      credit:false },
    { id:'loan_rep',  label:'Loan Repaid',  color:'var(--green)', credit:true  },
    { id:'advance',   label:'Advance',      color:'#6b21a8',      credit:false },
    { id:'deduction', label:'Deduction',    color:'var(--red)',   credit:false },
    { id:'expense',   label:'Expense',      color:'var(--red)',   credit:false },
    { id:'other_in',  label:'Other In',     color:'var(--green)', credit:true  },
    { id:'other_out', label:'Other Out',    color:'var(--red)',   credit:false }
  ];
  var filterPerson = 'all', filterType = 'all';

  function canSeeAll() { return MANAGERS.includes(APP.user.name); }

  function typeMap() {
    var m = {};
    TYPES.forEach(function(t){ m[t.id]=t; });
    return m;
  }

  async function render(container) {
    wrap = container;
    wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:12px;color:var(--muted)"><span class="spinner"></span> Loading...</div>';
    try {
      var r = await Promise.all([API.req('GET','/money-ledger'), API.getUsers()]);
      entries = r[0]||[]; allUsers = r[1]||[];
    } catch(e) { entries=[]; allUsers=[]; }
    if (!canSeeAll()) filterPerson = APP.user.name;
    buildUI();
  }

  function buildUI() {
    var tm = typeMap();
    var names = allUsers.map(function(u){ return u.name; });
    var summary = {};
    names.forEach(function(n){ summary[n]={credit:0,debit:0}; });
    entries.forEach(function(e) {
      if (!summary[e.person]) summary[e.person]={credit:0,debit:0};
      var tp=tm[e.type];
      if(tp){ if(tp.credit) summary[e.person].credit+=parseFloat(e.amount||0); else summary[e.person].debit+=parseFloat(e.amount||0); }
    });

    var html = '<div class="pg-hdr"><h2>&#128176; Money Ledger</h2></div>';

    // Summary cards (managers only)
    if (canSeeAll()) {
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;margin-bottom:20px">';
      html += '<div class="card" onclick="MoneyLedger.setPerson(\'all\')" style="cursor:pointer;border-color:' + (filterPerson==='all'?'var(--teal)':'var(--bord)') + '">';
      html += '<div class="cl">All Members</div><div class="cv" style="font-size:15px;color:var(--teal)">' + entries.length + ' entries</div></div>';
      names.forEach(function(n) {
        var s=summary[n]||{credit:0,debit:0}, net=s.credit-s.debit;
        html += '<div class="card" onclick="MoneyLedger.setPerson(\'' + n + '\')" style="cursor:pointer;border-color:' + (filterPerson===n?'var(--teal)':'var(--bord)') + '">';
        html += '<div class="cl">' + n + '</div>';
        html += '<div class="cv" style="font-size:15px;color:' + (net>=0?'var(--green)':'var(--red)') + '">SAR ' + fmt(net) + '</div>';
        html += '<div style="font-size:10px;color:var(--muted);margin-top:2px">In: ' + fmt(s.credit) + ' | Out: ' + fmt(s.debit) + '</div></div>';
      });
      html += '</div>';
    }

    html += '<div class="layout" style="grid-template-columns:360px 1fr">';

    // Left: entry form
    html += '<div class="panel"><div class="ph dark">+ New Entry</div><div class="fb">';
    if (canSeeAll()) {
      html += '<div><label>Team Member</label><select id="ml-person-sel" style="padding:10px 12px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:14px;width:100%">';
      names.forEach(function(n){ html += '<option value="' + n + '"' + (n===APP.user.name?' selected':'') + '>' + n + '</option>'; });
      html += '</select></div>';
    } else {
      html += '<div style="padding:8px 12px;background:var(--surf2);border-radius:6px;font-size:14px;color:var(--text);border:1px solid var(--bord)">&#128100; ' + APP.user.name + '</div>';
    }
    html += '<div><label>Transaction Type</label><select id="ml-type-sel" style="padding:10px 12px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:14px;width:100%">';
    TYPES.forEach(function(tp){ html += '<option value="' + tp.id + '">' + tp.label + ' (' + (tp.credit?'Credit':'Debit') + ')</option>'; });
    html += '</select></div>';
    html += '<div><label>Amount (SAR)</label><input type="number" id="ml-amt-inp" placeholder="0.00" step="0.01" min="0"></div>';
    html += '<div><label>Date</label><input type="date" id="ml-date-inp" value="' + toDateStr() + '"></div>';
    html += '<div><label>Note / Reference</label><input type="text" id="ml-note-inp" placeholder="Month, reference..."></div>';
    html += '<button class="sub-btn" onclick="MoneyLedger.addEntry()">+ Add Entry</button>';
    html += '</div></div>';

    // Right: ledger
    html += '<div class="panel">';
    html += '<div class="ph dark" style="display:flex;justify-content:space-between;align-items:center">';
    html += '<span id="ml-ledger-lbl">' + (filterPerson==='all'?'All Transactions':filterPerson+' \u2014 Account') + '</span>';
    html += '<button onclick="MoneyLedger.exportCSV()" class="exp-btn" style="color:#fff;border-color:rgba(255,255,255,.3)">CSV</button>';
    html += '</div>';
    html += '<div class="lctrl">';
    if (canSeeAll()) {
      html += '<select id="ml-filter-person" onchange="MoneyLedger.setPerson(this.value)" style="padding:5px 10px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--text);font-size:12px">';
      html += '<option value="all">All Members</option>';
      names.forEach(function(n){ html += '<option value="' + n + '"' + (filterPerson===n?' selected':'') + '>' + n + '</option>'; });
      html += '</select>';
    }
    html += '<button class="fbtn on" onclick="MoneyLedger.setTypeFilter(\'all\',this)">All</button>';
    html += '<button class="fbtn" onclick="MoneyLedger.setTypeFilter(\'credit\',this)">Credits</button>';
    html += '<button class="fbtn" onclick="MoneyLedger.setTypeFilter(\'debit\',this)">Debits</button>';
    html += '<input class="srch" type="text" id="ml-srch-inp" placeholder="Search..." oninput="MoneyLedger.renderList()">';
    html += '</div>';
    html += '<div class="sw"><table class="ltbl"><thead><tr><th>Date</th><th>Member</th><th>Type</th><th>Credit</th><th>Debit</th><th>Note</th><th></th></tr></thead><tbody id="ml-tbody"></tbody></table>';
    html += '<div class="empty" id="ml-empty" style="display:none">No entries.</div></div>';
    html += '<div id="ml-bal-bar" style="padding:10px 18px;border-top:1px solid var(--bord);display:flex;gap:16px;flex-wrap:wrap;font-size:12px"></div>';
    html += '</div></div>';

    // Edit modal
    html += '<div class="overlay" id="ml-edit-modal"><div class="modal">';
    html += '<h3>Edit Entry</h3><div class="mf">';
    html += '<div><label>Team Member</label><select id="ml-em-person">';
    names.forEach(function(n){ html += '<option value="'+n+'">'+n+'</option>'; });
    html += '</select></div>';
    html += '<div><label>Transaction Type</label><select id="ml-em-type">';
    TYPES.forEach(function(tp){ html += '<option value="'+tp.id+'">'+tp.label+'</option>'; });
    html += '</select></div>';
    html += '<div><label>Amount (SAR)</label><input type="number" id="ml-em-amt" step="0.01" min="0"></div>';
    html += '<div><label>Date</label><input type="date" id="ml-em-date"></div>';
    html += '<div><label>Note</label><input type="text" id="ml-em-note"></div>';
    html += '</div><div class="mact">';
    html += '<button class="btn-c" onclick="closeModal(\'ml-edit-modal\')">Cancel</button>';
    html += '<button class="btn-s" onclick="MoneyLedger.saveEdit()">Save Changes</button>';
    html += '</div></div></div>';

    wrap.innerHTML = html;
    renderList();
  }

  function setPerson(name) {
    filterPerson = name;
    var lbl = el('ml-ledger-lbl');
    if (lbl) lbl.textContent = name==='all' ? 'All Transactions' : name + ' \u2014 Account';
    var sel = el('ml-filter-person');
    if (sel) sel.value = name;
    document.querySelectorAll('[onclick*="MoneyLedger.setPerson"]').forEach(function(c) {
      var m = c.getAttribute('onclick').match(/'([^']+)'/);
      if (m) c.style.borderColor = m[1]===name ? 'var(--teal)' : 'var(--bord)';
    });
    renderList();
  }

  function setTypeFilter(f, btn) {
    filterType = f;
    document.querySelectorAll('.lctrl .fbtn').forEach(function(b){ b.classList.remove('on'); });
    btn.classList.add('on');
    renderList();
  }

  async function addEntry() {
    var person = canSeeAll() ? ((el('ml-person-sel')||{value:APP.user.name}).value||APP.user.name) : APP.user.name;
    var type   = (el('ml-type-sel') ||{value:'salary'}).value;
    var amt    = parseFloat((el('ml-amt-inp') ||{value:0}).value);
    var date   = (el('ml-date-inp') ||{value:toDateStr()}).value;
    var note   = (el('ml-note-inp') ||{value:''}).value.trim();
    if (!person)      return toast('Select a team member',true);
    if (!amt||amt<=0) return toast('Enter a valid amount',true);
    try {
      var entry = await API.req('POST','/money-ledger',{type:type,person:person,amount:amt,entry_date:date,note:note,settled:0,entered_by:APP.user.name});
      entries.unshift(entry);
      var ae=el('ml-amt-inp'); if(ae)ae.value='';
      var ne=el('ml-note-inp'); if(ne)ne.value='';
      // Rebuild summary cards only
      var names = allUsers.map(function(u){return u.name;});
      var tm = typeMap(), summary = {};
      names.forEach(function(n){summary[n]={credit:0,debit:0};});
      entries.forEach(function(e){
        if(!summary[e.person])summary[e.person]={credit:0,debit:0};
        var tp=tm[e.type]; if(tp){if(tp.credit)summary[e.person].credit+=parseFloat(e.amount||0);else summary[e.person].debit+=parseFloat(e.amount||0);}
      });
      renderList();
      toast('Entry added');
    } catch(e){toast(e.message,true);}
  }

  async function deleteEntry(id) {
    if(!confirm('Delete this entry?'))return;
    try{
      await API.req('DELETE','/money-ledger/'+id);
      entries=entries.filter(function(x){return x.id!==id;});
      renderList(); toast('Deleted');
    }catch(e){toast(e.message,true);}
  }

  function renderList() {
    var q=((el('ml-srch-inp')||{value:''}).value||'').toLowerCase();
    var tm=typeMap();
    var list=entries.slice();
    if(!canSeeAll()) list=list.filter(function(e){return e.person===APP.user.name;});
    else if(filterPerson!=='all') list=list.filter(function(e){return e.person===filterPerson;});
    if(filterType==='credit') list=list.filter(function(e){return tm[e.type]&&tm[e.type].credit;});
    if(filterType==='debit')  list=list.filter(function(e){return tm[e.type]&&!tm[e.type].credit;});
    if(q) list=list.filter(function(e){return e.person.toLowerCase().includes(q)||(e.note||'').toLowerCase().includes(q);});
    list.sort(function(a,b){return (b.entry_date||'').localeCompare(a.entry_date||'');});

    var tbody=el('ml-tbody'), emp=el('ml-empty');
    if(!tbody)return;
    if(!list.length){tbody.innerHTML='';if(emp)emp.style.display='block';renderBalance([]);return;}
    if(emp)emp.style.display='none';

    var rows='';
    list.forEach(function(e){
      var tp=tm[e.type]||TYPES[0];
      rows+='<tr>'+
        '<td style="font-size:12px;color:var(--muted);white-space:nowrap">'+(e.entry_date||'')+'</td>'+
        '<td style="font-weight:600">'+e.person+'</td>'+
        '<td><span style="font-size:10px;padding:2px 8px;border-radius:3px;background:rgba(0,0,0,.06);color:'+tp.color+';white-space:nowrap">'+tp.label+'</span></td>'+
        '<td class="ain">'+(tp.credit?'SAR '+fmt(e.amount):'&mdash;')+'</td>'+
        '<td class="aout">'+(!tp.credit?'SAR '+fmt(e.amount):'&mdash;')+'</td>'+
        '<td style="font-size:11px;color:var(--muted)">'+(e.note||'')+'</td>'+
        '<td>'+(canSeeAll()?
          '<div style="display:flex;gap:4px">'+
          '<button class="act-btn" onclick="MoneyLedger.editEntry('+e.id+')" style="font-size:10px;padding:3px 8px">Edit</button>'+
          '<button class="del-btn" onclick="MoneyLedger.deleteEntry('+e.id+')">&#10005;</button>'+
          '</div>':'')+
        '</td>'+
        '</tr>';
    });
    tbody.innerHTML=rows;
    renderBalance(list);
  }

  function renderBalance(list) {
    var bar=el('ml-bal-bar'); if(!bar)return;
    var tm=typeMap();
    var tc=list.filter(function(e){return tm[e.type]&&tm[e.type].credit;}).reduce(function(s,e){return s+parseFloat(e.amount||0);},0);
    var td=list.filter(function(e){return tm[e.type]&&!tm[e.type].credit;}).reduce(function(s,e){return s+parseFloat(e.amount||0);},0);
    var net=tc-td;
    bar.innerHTML='<span style="color:var(--green)">Credits: <strong>SAR '+fmt(tc)+'</strong></span>'+
      '<span style="color:var(--muted)">|</span>'+
      '<span style="color:var(--red)">Debits: <strong>SAR '+fmt(td)+'</strong></span>'+
      '<span style="color:var(--muted)">|</span>'+
      '<span style="color:'+(net>=0?'var(--green)':'var(--red)')+'">Net: <strong>SAR '+fmt(net)+'</strong></span>'+
      '<span style="color:var(--muted)">| '+list.length+' entries</span>';
  }

  function exportCSV() {
    var tm=typeMap();
    var list=canSeeAll()?(filterPerson==='all'?entries:entries.filter(function(e){return e.person===filterPerson;})):entries.filter(function(e){return e.person===APP.user.name;});
    if(!list.length)return toast('No data',true);
    var h=['Date','Member','Type','Credit (SAR)','Debit (SAR)','Note','Entered By'];
    var data=list.slice().sort(function(a,b){return (a.entry_date||'').localeCompare(b.entry_date||'');}).map(function(e){
      var tp=tm[e.type]||TYPES[0];
      return[e.entry_date||'',e.person,tp.label,tp.credit?fmt(e.amount):'',!tp.credit?fmt(e.amount):'',e.note||'',e.entered_by||''];
    });
    var csv='\uFEFF'+[h].concat(data).map(function(r){return r.map(function(v){return '"'+v+'"';}).join(',');}).join('\n');
    var a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    a.download='MoneyLedger_'+toDateStr()+'.csv'; a.click(); toast('Exported');
  }

  var editingId = null;

  function editEntry(id) {
    var e = entries.find(function(x){return x.id===id;});
    if (!e) return;
    editingId = id;
    var ep = el('ml-em-person'); if(ep) ep.value = e.person;
    var et = el('ml-em-type');   if(et) et.value = e.type;
    var ea = el('ml-em-amt');    if(ea) ea.value = parseFloat(e.amount||0).toFixed(2);
    var ed = el('ml-em-date');   if(ed) ed.value = e.entry_date||'';
    var en2= el('ml-em-note');   if(en2) en2.value = e.note||'';
    openModal('ml-edit-modal');
  }

  async function saveEdit() {
    var person = (el('ml-em-person')||{value:''}).value;
    var type   = (el('ml-em-type')  ||{value:''}).value;
    var amt    = parseFloat((el('ml-em-amt') ||{value:0}).value);
    var date   = (el('ml-em-date')  ||{value:''}).value;
    var note   = (el('ml-em-note')  ||{value:''}).value.trim();
    if(!person) return toast('Select a team member', true);
    if(!amt||amt<=0) return toast('Enter a valid amount', true);
    try {
      await API.req('PUT', '/money-ledger/'+editingId, {type:type,person:person,amount:amt,entry_date:date,note:note});
      var e = entries.find(function(x){return x.id===editingId;});
      if(e){ e.type=type; e.person=person; e.amount=amt; e.entry_date=date; e.note=note; }
      closeModal('ml-edit-modal');
      renderList();
      toast('Entry updated');
    } catch(e2){ toast(e2.message, true); }
  }

  return{render:render,setPerson:setPerson,setTypeFilter:setTypeFilter,addEntry:addEntry,editEntry:editEntry,saveEdit:saveEdit,deleteEntry:deleteEntry,renderList:renderList,exportCSV:exportCSV};
})();
