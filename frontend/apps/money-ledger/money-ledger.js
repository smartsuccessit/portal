/** Money Ledger v4 — Credit/Debit toggle, dynamic categories */
window.MoneyLedger = (function() {
  var entries = [], allUsers = [], mlCats = [], wrap;
  var MANAGERS = ['Shahzaib','Riyad'];
  var filterPerson = 'all', filterDir = 'all';
  var currentDir = 'credit';
  var editingId = null;

  function canSeeAll() { return MANAGERS.includes(APP.user.name); }

  function getCatOptions(dir) {
    var list = mlCats.filter(function(c){ return c.direction === dir; });
    if (!list.length) {
      if (dir === 'credit') list = [{name_en:'Salary',name_ar:''},{name_en:'Bonus',name_ar:''},{name_en:'Other In',name_ar:''}];
      else                  list = [{name_en:'Loan Given',name_ar:''},{name_en:'Deduction',name_ar:''},{name_en:'Other Out',name_ar:''}];
    }
    return list.map(function(c) {
      var en = c.name_en||''; var ar = c.name_ar||en;
      var label = (APP.lang==='ar' && ar) ? ar : en;
      return '<option value="' + en + '">' + label + '</option>';
    }).join('');
  }

  async function render(container) {
    wrap = container;
    wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:12px;color:var(--muted)"><span class="spinner"></span> Loading...</div>';
    try {
      var r = await Promise.all([API.req('GET','/money-ledger'), API.getUsers(), API.req('GET','/ml-categories')]);
      entries = r[0]||[]; allUsers = r[1]||[]; mlCats = r[2]||[];
      // Normalize entries - fix date format and parse pipe-encoded type
      entries = entries.map(function(e) {
        // Fix date display
        if (e.entry_date) e.entry_date = e.entry_date.slice(0,10);
        // Parse pipe-encoded direction if not already parsed by backend
        if (!e.direction && e.type && e.type.includes('|')) {
          e.direction = e.type.split('|')[0];
          e.type      = e.type.split('|')[1];
        }
        return e;
      });
    } catch(e) { entries=[]; allUsers=[]; mlCats=[]; }
    if (!canSeeAll()) filterPerson = APP.user.name;
    buildUI();
  }

  function buildUI() {
    var names = allUsers.map(function(u){ return u.name; });

    // Per-person summary
    var summary = {};
    names.forEach(function(n){ summary[n]={credit:0,debit:0}; });
    entries.forEach(function(e) {
      if (!summary[e.person]) summary[e.person]={credit:0,debit:0};
      var dir = e.direction || (e.type==='salary'||e.type==='bonus'||e.type==='profit'||e.type==='loan_rep'||e.type==='other_in'||e.type==='received' ? 'credit' : 'debit');
      if (dir==='credit') summary[e.person].credit += parseFloat(e.amount||0);
      else                summary[e.person].debit  += parseFloat(e.amount||0);
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

    // Entry form
    html += '<div class="panel"><div class="ph dark">+ New Entry</div><div class="fb">';

    // Credit / Debit toggle
    html += '<div><div class="ttype">';
    html += '<button id="ml-btn-credit" class="tbtn pl-inc" onclick="MoneyLedger.setDir(\'credit\')">&#8593; Credit</button>';
    html += '<button id="ml-btn-debit"  class="tbtn"        onclick="MoneyLedger.setDir(\'debit\')">&#8595; Debit</button>';
    html += '</div></div>';

    // Person dropdown
    if (canSeeAll()) {
      html += '<div><label>Team Member</label><select id="ml-person-sel" style="padding:10px 12px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:14px;width:100%">';
      names.forEach(function(n){ html += '<option value="' + n + '"' + (n===APP.user.name?' selected':'') + '>' + n + '</option>'; });
      html += '</select></div>';
    } else {
      html += '<div style="padding:8px 12px;background:var(--surf2);border-radius:6px;font-size:14px;color:var(--text);border:1px solid var(--bord)">&#128100; ' + APP.user.name + '</div>';
    }

    // Category dropdown
    html += '<div><label>Category</label><select id="ml-cat-sel" style="padding:10px 12px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:14px;width:100%">';
    html += getCatOptions('credit');
    html += '</select></div>';

    html += '<div><label>Amount (SAR)</label><input type="number" id="ml-amt-inp" placeholder="0.00" step="0.01" min="0"></div>';
    html += '<div><label>Date</label><input type="date" id="ml-date-inp" value="' + toDateStr() + '"></div>';
    html += '<div><label>Note / Reference</label><input type="text" id="ml-note-inp" placeholder="Month, reference..."></div>';
    html += '<button class="sub-btn" onclick="MoneyLedger.addEntry()">+ Add Entry</button>';
    html += '</div></div>';

    // Ledger panel
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
    html += '<button class="fbtn on" onclick="MoneyLedger.setDirFilter(\'all\',this)">All</button>';
    html += '<button class="fbtn" onclick="MoneyLedger.setDirFilter(\'credit\',this)">&#8593; Credits</button>';
    html += '<button class="fbtn" onclick="MoneyLedger.setDirFilter(\'debit\',this)">&#8595; Debits</button>';
    html += '<input class="srch" type="text" id="ml-srch-inp" placeholder="Search..." oninput="MoneyLedger.renderList()">';
    html += '</div>';
    html += '<div class="sw"><table class="ltbl"><thead><tr><th>Date</th><th>Member</th><th>Category</th><th>Credit</th><th>Debit</th><th>Note</th><th></th></tr></thead><tbody id="ml-tbody"></tbody></table>';
    html += '<div class="empty" id="ml-empty" style="display:none">No entries.</div></div>';
    html += '<div id="ml-bal-bar" style="padding:10px 18px;border-top:1px solid var(--bord);display:flex;gap:16px;flex-wrap:wrap;font-size:12px"></div>';
    html += '</div></div>';

    // Edit modal
    html += '<div class="overlay" id="ml-edit-modal"><div class="modal"><h3>Edit Entry</h3><div class="mf">';
    if (canSeeAll()) {
      html += '<div><label>Team Member</label><select id="ml-em-person">';
      names.forEach(function(n){ html += '<option value="'+n+'">'+n+'</option>'; });
      html += '</select></div>';
    }
    html += '<div><div class="ttype">';
    html += '<button id="ml-em-btn-credit" class="tbtn pl-inc" onclick="MoneyLedger.setEditDir(\'credit\')">&#8593; Credit</button>';
    html += '<button id="ml-em-btn-debit"  class="tbtn"        onclick="MoneyLedger.setEditDir(\'debit\')">&#8595; Debit</button>';
    html += '</div></div>';
    html += '<div><label>Category</label><select id="ml-em-cat"></select></div>';
    html += '<div><label>Amount (SAR)</label><input type="number" id="ml-em-amt" step="0.01" min="0"></div>';
    html += '<div><label>Date</label><input type="date" id="ml-em-date"></div>';
    html += '<div><label>Note</label><input type="text" id="ml-em-note"></div>';
    html += '</div><div class="mact">';
    html += '<button class="btn-c" onclick="closeModal(\'ml-edit-modal\')">Cancel</button>';
    html += '<button class="btn-s" onclick="MoneyLedger.saveEdit()">Save Changes</button>';
    html += '</div></div></div>';

    wrap.innerHTML = html;
    // Re-apply current direction state to buttons
    var bc = el('ml-btn-credit'), bd = el('ml-btn-debit');
    if(bc) bc.className = 'tbtn' + (currentDir==='credit'?' pl-inc':'');
    if(bd) bd.className = 'tbtn' + (currentDir==='debit'?' pl-exp':'');
    // Re-populate category dropdown
    var cat = el('ml-cat-sel');
    if(cat) cat.innerHTML = getCatOptions(currentDir);
    renderList();
  }

  function setDir(dir) {
    currentDir = dir;
    var bc = el('ml-btn-credit'), bd = el('ml-btn-debit');
    if(bc) bc.className = 'tbtn' + (dir==='credit'?' pl-inc':'');
    if(bd) bd.className = 'tbtn' + (dir==='debit'?' pl-exp':'');
    var cat = el('ml-cat-sel');
    if(cat) cat.innerHTML = getCatOptions(dir);
  }

  function setEditDir(dir) {
    var bc = el('ml-em-btn-credit'), bd = el('ml-em-btn-debit');
    if(bc) bc.className = 'tbtn' + (dir==='credit'?' pl-inc':'');
    if(bd) bd.className = 'tbtn' + (dir==='debit'?' pl-exp':'');
    var cat = el('ml-em-cat');
    if(cat) cat.innerHTML = getCatOptions(dir);
    if(cat) cat.dataset.dir = dir;
  }

  function setPerson(name) {
    filterPerson = name;
    var lbl = el('ml-ledger-lbl');
    if(lbl) lbl.textContent = name==='all' ? 'All Transactions' : name + ' \u2014 Account';
    var sel = el('ml-filter-person'); if(sel) sel.value = name;
    document.querySelectorAll('[onclick*="MoneyLedger.setPerson"]').forEach(function(c) {
      var m = c.getAttribute('onclick').match(/'([^']+)'/);
      if(m) c.style.borderColor = m[1]===name ? 'var(--teal)' : 'var(--bord)';
    });
    renderList();
  }

  function setDirFilter(f, btn) {
    filterDir = f;
    document.querySelectorAll('.lctrl .fbtn').forEach(function(b){ b.classList.remove('on'); });
    btn.classList.add('on');
    renderList();
  }

  function getDir(e) {
    if (e.direction) return e.direction;
    // Parse from pipe-encoded type field
    if (e.type && e.type.includes('|')) return e.type.split('|')[0];
    // Legacy fallback
    var oldCredit = ['salary','bonus','profit','loan_rep','other_in','received','Salary','Bonus','Profit Share','Loan Repaid','Other In'];
    return oldCredit.includes(e.type) ? 'credit' : 'debit';
  }

  function getTypeName(e) {
    if (e.type && e.type.includes('|')) return e.type.split('|')[1];
    return e.type || '';
  }

  async function addEntry() {
    var person = canSeeAll() ? ((el('ml-person-sel')||{value:APP.user.name}).value||APP.user.name) : APP.user.name;
    var catEl  = el('ml-cat-sel');
    var cat    = catEl ? catEl.value : '';
    // Debug: show what we're reading
    // If category empty, repopulate and use first option
    if (!cat && catEl) {
      catEl.innerHTML = getCatOptions(currentDir);
      cat = catEl.value;
    }
    var amt    = parseFloat((el('ml-amt-inp')||{value:0}).value);
    var date   = ((el('ml-date-inp')||{value:toDateStr()}).value||toDateStr()).slice(0,10);
    var note   = (el('ml-note-inp')||{value:''}).value.trim();
    if(!person)       return toast('Select a team member',true);
    if(!cat)          return toast('Select a category',true);
    if(!amt||amt<=0)  return toast('Enter a valid amount',true);
    try {
      var entry = await API.req('POST','/money-ledger',{type:cat,direction:currentDir,person:person,amount:amt,entry_date:date,note:note,settled:0,entered_by:APP.user.name});
      // Build entry from known local values - reliable regardless of backend response format
      var newEntry = { id: entry ? entry.id : Date.now(), direction: currentDir, type: cat, person: person, amount: amt, entry_date: date, note: note, entered_by: APP.user.name };
      entries.unshift(newEntry);
      // Clear inputs without rebuilding whole UI (preserves Credit/Debit state)
      var ae=el('ml-amt-inp'); if(ae)ae.value='';
      var ne=el('ml-note-inp'); if(ne)ne.value='';
      // Update summary cards
      updateSummaryCards();
      renderList();
      toast('Entry added');
    } catch(e){toast(e.message,true);}
  }

  function editEntry(id) {
    var e = entries.find(function(x){return x.id===id;}); if(!e)return;
    editingId = id;
    var dir = getDir(e);
    var ep = el('ml-em-person'); if(ep) ep.value = e.person;
    setEditDir(dir);
    var ec = el('ml-em-cat'); if(ec){ ec.innerHTML=getCatOptions(dir); ec.value=e.type; }
    var ea = el('ml-em-amt');  if(ea) ea.value=parseFloat(e.amount||0).toFixed(2);
    var ed = el('ml-em-date'); if(ed) ed.value=e.entry_date||'';
    var en2= el('ml-em-note'); if(en2)en2.value=e.note||'';
    openModal('ml-edit-modal');
  }

  async function saveEdit() {
    var person = canSeeAll() ? ((el('ml-em-person')||{value:APP.user.name}).value) : APP.user.name;
    var catEl  = el('ml-em-cat');
    var dir    = catEl ? (catEl.dataset.dir||'credit') : 'credit';
    var cat    = (catEl||{value:''}).value;
    var amt    = parseFloat((el('ml-em-amt')||{value:0}).value);
    var date   = ((el('ml-em-date')||{value:''}).value||'').slice(0,10);
    var note   = (el('ml-em-note')||{value:''}).value.trim();
    if(!person)      return toast('Select a team member',true);
    if(!amt||amt<=0) return toast('Enter a valid amount',true);
    try {
      await API.req('PUT','/money-ledger/'+editingId,{type:cat,direction:dir,person:person,amount:amt,entry_date:date,note:note});
      var e=entries.find(function(x){return x.id===editingId;});
      if(e){e.type=cat;e.direction=dir;e.person=person;e.amount=amt;e.entry_date=date;e.note=note;}
      closeModal('ml-edit-modal'); buildUI(); toast('Entry updated');
    } catch(e2){toast(e2.message,true);}
  }

  async function deleteEntry(id) {
    if(!confirm('Delete this entry?'))return;
    try{
      await API.req('DELETE','/money-ledger/'+id);
      entries=entries.filter(function(x){return x.id!==id;});
      buildUI();
      toast('Deleted');
    }catch(e){toast(e.message,true);}
  }

  function renderList() {
    var q=((el('ml-srch-inp')||{value:''}).value||'').toLowerCase();
    var list=entries.slice();
    if(!canSeeAll()) list=list.filter(function(e){return e.person===APP.user.name;});
    else if(filterPerson!=='all') list=list.filter(function(e){return e.person===filterPerson;});
    if(filterDir==='credit') list=list.filter(function(e){return getDir(e)==='credit';});
    if(filterDir==='debit')  list=list.filter(function(e){return getDir(e)==='debit';});
    if(q) list=list.filter(function(e){return e.person.toLowerCase().includes(q)||(e.note||'').toLowerCase().includes(q)||(e.type||'').toLowerCase().includes(q);});
    list.sort(function(a,b){return (b.entry_date||'').localeCompare(a.entry_date||'');});

    var tbody=el('ml-tbody'), emp=el('ml-empty');
    if(!tbody)return;
    if(!list.length){tbody.innerHTML='';if(emp)emp.style.display='block';renderBalance([]);return;}
    if(emp)emp.style.display='none';

    var rows='';
    list.forEach(function(e){
      var dir=getDir(e), isCredit=dir==='credit';
      var color=isCredit?'var(--green)':'var(--red)';
      rows+='<tr>'+
        '<td style="font-size:12px;color:var(--muted);white-space:nowrap">'+((e.entry_date||'').slice(0,10))+'</td>'+
        '<td style="font-weight:600">'+e.person+'</td>'+
        '<td><span style="font-size:10px;padding:2px 8px;border-radius:3px;background:rgba(0,0,0,.06);color:'+color+';white-space:nowrap">'+getTypeName(e)+'</span></td>'+
        '<td class="ain">'+(isCredit?'SAR '+fmt(e.amount):'&mdash;')+'</td>'+
        '<td class="aout">'+(!isCredit?'SAR '+fmt(e.amount):'&mdash;')+'</td>'+
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
    var tc=list.filter(function(e){return getDir(e)==='credit';}).reduce(function(s,e){return s+parseFloat(e.amount||0);},0);
    var td=list.filter(function(e){return getDir(e)==='debit';}).reduce(function(s,e){return s+parseFloat(e.amount||0);},0);
    var net=tc-td;
    bar.innerHTML='<span style="color:var(--green)">Credits: <strong>SAR '+fmt(tc)+'</strong></span>'+
      '<span style="color:var(--muted)">|</span>'+
      '<span style="color:var(--red)">Debits: <strong>SAR '+fmt(td)+'</strong></span>'+
      '<span style="color:var(--muted)">|</span>'+
      '<span style="color:'+(net>=0?'var(--green)':'var(--red)')+'">Net: <strong>SAR '+fmt(net)+'</strong></span>'+
      '<span style="color:var(--muted)">| '+list.length+' entries</span>';
  }

  function exportCSV() {
    var list=canSeeAll()?(filterPerson==='all'?entries:entries.filter(function(e){return e.person===filterPerson;})):entries.filter(function(e){return e.person===APP.user.name;});
    if(!list.length)return toast('No data',true);
    var h=['Date','Member','Direction','Category','Credit (SAR)','Debit (SAR)','Note','Entered By'];
    var data=list.slice().sort(function(a,b){return (a.entry_date||'').localeCompare(b.entry_date||'');}).map(function(e){
      var isCredit=getDir(e)==='credit';
      return[e.entry_date||'',e.person,isCredit?'Credit':'Debit',e.type||'',isCredit?fmt(e.amount):'',!isCredit?fmt(e.amount):'',e.note||'',e.entered_by||''];
    });
    var csv='\uFEFF'+[h].concat(data).map(function(r){return r.map(function(v){return '"'+v+'"';}).join(',');}).join('\n');
    var a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    a.download='MoneyLedger_'+toDateStr()+'.csv'; a.click(); toast('Exported');
  }

  function updateSummaryCards() {
    if (!canSeeAll()) return;
    var names = allUsers.map(function(u){return u.name;});
    var summary = {};
    names.forEach(function(n){summary[n]={credit:0,debit:0};});
    entries.forEach(function(e){
      if(!summary[e.person])summary[e.person]={credit:0,debit:0};
      var dir=getDir(e);
      if(dir==='credit')summary[e.person].credit+=parseFloat(e.amount||0);
      else              summary[e.person].debit +=parseFloat(e.amount||0);
    });
    // All Members card
    var allCard = document.querySelector('[data-ml-card="all"]');
    if(allCard){var cv=allCard.querySelector('.cv');if(cv)cv.textContent=entries.length+' entries';}
    // Person cards
    names.forEach(function(n){
      var card=document.querySelector('[data-ml-card="'+n+'"]');
      if(!card)return;
      var s=summary[n]||{credit:0,debit:0},net=s.credit-s.debit;
      var cv=card.querySelector('.cv');
      if(cv){cv.textContent='SAR '+fmt(net);cv.style.color=net>=0?'var(--green)':'var(--red)';}
      var sub=card.querySelector('[data-sub]');
      if(sub)sub.textContent='In: '+fmt(s.credit)+' | Out: '+fmt(s.debit);
    });
  }

  return{render:render,setDir:setDir,setEditDir:setEditDir,setPerson:setPerson,setDirFilter:setDirFilter,addEntry:addEntry,editEntry:editEntry,saveEdit:saveEdit,deleteEntry:deleteEntry,renderList:renderList,exportCSV:exportCSV};
})();
