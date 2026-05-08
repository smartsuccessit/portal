/**
 * Control Panel — Admin only
 * Fixed: all users in access list, P&L categories editor
 */
window.ControlPanel = (() => {
  let users = [], settings = {}, cats = [], plCats = [], rbCats = [], mlCats = [];
  const ALL_APPS = ['petty-cash','daily-report','tasks','roles','profile','pl-report','money-ledger','reimbursements','invoices'];
  let rmUserId = null, pinUserId = null;

  async function render(wrap) {
    if (!APP.user.is_admin) { showLauncher(); return; }
    try {
      [users, settings, cats] = await Promise.all([API.getUsers(), API.getSettings(), API.getCategories()]);
      try { plCats = await API.req('GET', '/pl-categories'); } catch(e) { plCats = []; }
      try { rbCats = await API.req('GET', '/rb-categories'); } catch(e) { rbCats = []; }
      try { mlCats = await API.req('GET', '/ml-categories'); } catch(e) { mlCats = []; }
    } catch(e) { wrap.innerHTML = `<div class="empty">Error: ${e.message}</div>`; return; }
    buildUI(wrap);
  }

  function buildUI(wrap) {
    wrap.innerHTML = `
    <div class="pg-hdr">
      <h2>${t('cpH')}</h2>
      <span style="font-family:monospace;font-size:11px;color:var(--teal);background:rgba(42,191,191,.1);border:1px solid var(--teal);padding:3px 12px;border-radius:4px">ADMIN ONLY</span>
    </div>
    <div class="cp-grid">
      <div class="cps"><div class="cph"><span>&#128101;</span><h3>${t('cpUsers')}</h3></div><div class="cpb" id="cp-users"></div></div>
      <div class="cps"><div class="cph"><span>&#128274;</span><h3>${t('cpAccess')}</h3></div><div class="cpb"><div style="font-size:12px;color:var(--muted);margin-bottom:12px">Toggle which apps each user can see.</div><div id="cp-access"></div></div></div>
      <div class="cps"><div class="cph"><span>&#128273;</span><h3>${t('cpPins')}</h3></div><div class="cpb"><div style="font-size:12px;color:var(--muted);margin-bottom:12px">Reset any user PIN.</div><div id="cp-pins"></div></div></div>
      <div class="cps"><div class="cph"><span>&#9881;</span><h3>${t('cpPerms')}</h3></div><div class="cpb"><div style="font-size:12px;color:var(--muted);margin-bottom:12px">Set approvers for petty cash.</div><div id="cp-perms"></div></div></div>
      <div class="cps" style="grid-column:span 2"><div class="cph"><span>&#128176;</span><h3>${t('cpCats')} — Petty Cash</h3></div><div class="cpb" id="cp-cats"></div></div>
      <div class="cps" style="grid-column:span 2"><div class="cph"><span>&#128200;</span><h3>P&amp;L Report Categories</h3></div><div class="cpb" id="cp-pl-cats"></div></div>
      <div class="cps" style="grid-column:span 2"><div class="cph"><span>&#128179;</span><h3>Reimbursement Categories</h3></div><div class="cpb" id="cp-rb-cats"></div></div>
      <div class="cps" style="grid-column:span 2"><div class="cph"><span>&#128176;</span><h3>Money Ledger Categories</h3></div><div class="cpb" id="cp-ml-cats"></div></div>
    </div>
    <div class="overlay" id="cp-pin-modal"><div class="modal"><h3>Reset PIN</h3><div class="mf">
      <div><label>User</label><input type="text" id="pm-user" readonly style="opacity:.6"></div>
      <div><label>New PIN (4 digits)</label><input type="text" id="pm-pin" maxlength="4" placeholder="Enter 4 digits" oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,4);document.getElementById('pm-prev').textContent=this.value.padEnd(4,String.fromCharCode(183))"></div>
      <div class="pin-disp" id="pm-prev">&#183;&#183;&#183;&#183;</div>
    </div><div class="mact"><button class="btn-c" onclick="closeModal('cp-pin-modal')">Cancel</button><button class="btn-s" onclick="ControlPanel.savePin()">Save PIN</button></div></div></div>
    <div class="overlay" id="cp-rm-modal"><div class="modal"><h3>${t('rmTitle')}</h3>
      <p id="cp-rm-msg" style="color:var(--muted);font-size:14px;margin-bottom:4px"></p>
      <div class="mact"><button class="btn-c" onclick="closeModal('cp-rm-modal')">Cancel</button><button class="btn-d" onclick="ControlPanel.confirmRemove()">Remove</button></div>
    </div></div>`;
    renderUsers(); renderAccess(); renderPins(); renderPerms(); renderCats(); renderPLCats(); renderRBCats(); renderMLCats();
  }

  function renderUsers() {
    const el2 = el('cp-users'); if(!el2) return;
    el2.innerHTML = users.map(u => `<div class="ur">
      <div class="uav" style="background:${u.color};color:#fff">${u.initials}</div>
      <div class="ui"><div class="un">${u.name}${u.is_admin?'<span class="badge-adm">ADMIN</span>':''}${u.is_approver?'<span class="badge-apr">APR</span>':''}</div><div class="uro">${u.role}</div></div>
      <div class="ua">${u.is_admin?'<span style="font-size:10px;color:var(--muted)">Protected</span>':'<button class="cpbtn danger" data-id="'+u.id+'" data-name="'+u.name+'" onclick="ControlPanel.askRemove(Number(this.dataset.id),this.dataset.name)">Remove</button>'}</div>
    </div>`).join('') +
    `<hr class="cp-hr"><div class="cp-lbl">${t('cpAddLbl')}</div>
    <div class="cp-form">
      <div class="cp-row"><input id="nu-name" placeholder="Full name"><input id="nu-initials" placeholder="Initials" maxlength="3"></div>
      <div class="cp-row"><input id="nu-role" placeholder="Role / Title"><input id="nu-pin" placeholder="4-digit PIN" maxlength="4"></div>
      <div class="cp-row">
        <select id="nu-color">
          <option value="#1e2d4a">Navy</option><option value="#2abfbf">Teal</option><option value="#2c5f8a">Blue</option>
          <option value="#1a5c3a">Green</option><option value="#7a3a1a">Brown</option><option value="#5a2a7a">Purple</option><option value="#c0392b">Red</option>
        </select>
        <button class="cpbtn teal" onclick="ControlPanel.addUser()">${t('cpAddBtn')}</button>
      </div>
    </div>`;
  }

  async function addUser() {
    const name=el('nu-name').value.trim(), initials=el('nu-initials').value.trim().toUpperCase();
    const role=el('nu-role').value.trim(), pin=el('nu-pin').value.trim(), color=el('nu-color').value;
    if(!name||!initials||!role||pin.length!==4) return toast('Fill all fields. PIN must be 4 digits.',true);
    try {
      const u = await API.addUser({name,initials,color,role,pin});
      users.push(u);
      ['nu-name','nu-initials','nu-role','nu-pin'].forEach(id=>{const e=el(id);if(e)e.value='';});
      renderUsers(); renderAccess(); renderPins(); toast(t('tUserAdded'));
    } catch(e) { toast(e.message,true); }
  }

  function askRemove(id,name) { rmUserId=id; const m=el('cp-rm-msg');if(m)m.textContent=t('rmMsg',name); openModal('cp-rm-modal'); }
  async function confirmRemove() {
    if(!rmUserId)return;
    try { await API.deleteUser(rmUserId); users=users.filter(u=>u.id!==rmUserId); closeModal('cp-rm-modal'); rmUserId=null; renderUsers();renderAccess();renderPins(); toast(t('tUserRemoved')); }
    catch(e){toast(e.message,true);}
  }

  // ALL users shown — including admin (Shahzaib)
  function renderAccess() {
    const el2 = el('cp-access'); if(!el2) return;
    const appLabels = {
      'petty-cash':    '&#128176; Petty Cash',
      'daily-report':  '&#128202; Daily Report',
      'tasks':         '&#9989; Tasks',
      'roles':         '&#128101; Roles',
      'profile':       '&#128100; My Profile',
      'pl-report':     '&#128200; P&L Report',
      'money-ledger':  '&#128176; Money Ledger',
      'reimbursements':'&#128179; Reimbursements',
      'invoices':      '&#128466; Invoices',
    };
    el2.innerHTML = Object.entries(appLabels).map(([appId, label]) =>
      `<div style="margin-bottom:14px">
        <div class="cp-lbl">${label}</div>
        <div class="chip-row">
          ${users.map(u => {
            const has = (u.apps||[]).includes(appId);
            return `<button class="chip ${has?'on':''}" data-uid="${u.id}" data-app="${appId}" onclick="ControlPanel.toggleAccess(this)">${u.name}${u.is_admin?' &#9881;':''}</button>`;
          }).join('')}
        </div>
      </div>`
    ).join('');
  }

  async function toggleAccess(btn) {
    const uid=Number(btn.dataset.uid), appId=btn.dataset.app;
    const u=users.find(x=>x.id===uid); if(!u)return;
    const has=(u.apps||[]).includes(appId);
    if(has) u.apps=u.apps.filter(a=>a!==appId); else u.apps=[...(u.apps||[]),appId];
    btn.classList.toggle('on',!has);
    try { await API.updateUser(uid,{apps:u.apps}); toast(t('tAccess')); }
    catch(e){toast(e.message,true);}
  }

  function renderPins() {
    const el2=el('cp-pins'); if(!el2)return;
    el2.innerHTML=users.map(u=>`<div class="ur">
      <div class="uav" style="background:${u.color};color:#fff">${u.initials}</div>
      <div class="ui"><div class="un">${u.name}</div><div class="uro" style="letter-spacing:3px">&#183;&#183;&#183;&#183;</div></div>
      <button class="cpbtn" data-id="${u.id}" data-name="${u.name}" onclick="ControlPanel.openPin(Number(this.dataset.id),this.dataset.name)">Reset</button>
    </div>`).join('');
  }

  function openPin(id,name) {
    pinUserId=id;
    const pmu=el('pm-user');if(pmu)pmu.value=name;
    const pmp=el('pm-pin');if(pmp)pmp.value='';
    const prv=el('pm-prev');if(prv)prv.innerHTML='&#183;&#183;&#183;&#183;';
    openModal('cp-pin-modal');
  }

  async function savePin() {
    const pin=(el('pm-pin')||{value:''}).value.trim();
    if(!/^\d{4}$/.test(pin)) return toast('PIN must be exactly 4 digits.',true);
    try { await API.changePin(pinUserId,{new_pin:pin}); closeModal('cp-pin-modal'); toast(t('tPin')); }
    catch(e){toast(e.message,true);}
  }

  function renderPerms() {
    const el2=el('cp-perms'); if(!el2)return;
    const names=users.map(u=>u.name);
    el2.innerHTML=`
      <div class="perm-lbl">Cash Out Approver</div>
      <div class="chip-row">${names.map(n=>`<button class="chip ${settings.approver===n?'on':''}" data-name="${n}" onclick="ControlPanel.setApprover(this)">${n}</button>`).join('')}</div>
      <hr class="cp-hr">
      <div class="perm-lbl">Delete Approver</div>
      <div class="chip-row">${names.map(n=>`<button class="chip ${settings.deleter===n?'on':''}" data-name="${n}" onclick="ControlPanel.setDeleter(this)">${n}</button>`).join('')}</div>`;
  }

  async function setApprover(btn) {
    settings.approver=btn.dataset.name;
    try{await API.saveSettings({approver:settings.approver});renderPerms();toast(t('tPerms'));}catch(e){toast(e.message,true);}
  }
  async function setDeleter(btn) {
    settings.deleter=btn.dataset.name;
    try{await API.saveSettings({deleter:settings.deleter});renderPerms();toast(t('tPerms'));}catch(e){toast(e.message,true);}
  }

  // ── PETTY CASH CATEGORIES ──────────────────────────────────────────────
  function catGrid(list, type, onChangeFn, onDeleteFn, onAddFn, enId, arId) {
    return `<div style="flex:1;min-width:280px">
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:4px;font-size:10px;color:var(--muted);margin-bottom:6px;padding-bottom:6px;border-bottom:2px solid var(--bord)">
        <span>English</span><span style="text-align:right">&#1593;&#1585;&#1576;&#1610;</span><span></span>
      </div>
      ${list.map(c=>`<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px;align-items:center;padding:5px 0;border-bottom:1px solid var(--bord)">
        <input value="${(c.name_en||'').replace(/"/g,'&quot;')}" data-id="${c.id}" data-field="name_en" onchange="${onChangeFn}(this)" style="padding:5px 8px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--text);font-size:12px;width:100%">
        <input value="${(c.name_ar||'').replace(/"/g,'&quot;')}" data-id="${c.id}" data-field="name_ar" onchange="${onChangeFn}(this)" dir="rtl" style="padding:5px 8px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--text);font-size:12px;text-align:right;width:100%">
        <button data-id="${c.id}" onclick="${onDeleteFn}(Number(this.dataset.id))" style="padding:4px 8px;border:1px solid var(--red);border-radius:4px;background:transparent;color:var(--red);cursor:pointer;font-size:11px">Remove</button>
      </div>`).join('')}
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px;align-items:center;margin-top:8px">
        <input id="${enId}" placeholder="English name" style="padding:6px 8px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--text);font-size:12px;width:100%">
        <input id="${arId}" placeholder="&#1575;&#1604;&#1575;&#1587;&#1605; &#1576;&#1575;&#1604;&#1593;&#1585;&#1576;&#1610;&#1577;" dir="rtl" style="padding:6px 8px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--text);font-size:12px;text-align:right;width:100%">
        <button data-type="${type}" onclick="${onAddFn}(this.dataset.type)" style="padding:6px 10px;border:none;border-radius:4px;background:var(--teal);color:#fff;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">+ Add</button>
      </div>
    </div>`;
  }

  function renderCats() {
    const el2=el('cp-cats');if(!el2)return;
    el2.innerHTML=`<div style="display:flex;gap:32px;flex-wrap:wrap">
      <div style="flex:1;min-width:280px"><div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">${t('cpCatsIn')}</div>
        ${catGrid(cats.filter(c=>c.type==='in'),'in','ControlPanel.updateCat','ControlPanel.deleteCat','ControlPanel.addCat','cat-en-in','cat-ar-in')}</div>
      <div style="flex:1;min-width:280px"><div style="font-size:11px;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">${t('cpCatsOut')}</div>
        ${catGrid(cats.filter(c=>c.type==='out'),'out','ControlPanel.updateCat','ControlPanel.deleteCat','ControlPanel.addCat','cat-en-out','cat-ar-out')}</div>
    </div>`;
  }

  async function updateCat(input) {
    const id=Number(input.dataset.id),field=input.dataset.field,cat=cats.find(c=>c.id===id);if(!cat)return;
    cat[field]=input.value.trim();
    try{await API.updateCategory(id,{name_en:cat.name_en,name_ar:cat.name_ar});toast(t('cpCatsSaved'));}catch(e){toast(e.message,true);}
  }
  async function addCat(type) {
    const en=(el('cat-en-'+type)||{value:''}).value.trim(),ar=(el('cat-ar-'+type)||{value:''}).value.trim();
    if(!en||!ar)return toast('Enter both English and Arabic names.',true);
    try{const c=await API.addCategory({type,name_en:en,name_ar:ar});cats.push(c);renderCats();toast(t('cpCatsSaved'));}catch(e){toast(e.message,true);}
  }
  async function deleteCat(id) {
    try{await API.deleteCategory(id);cats=cats.filter(c=>c.id!==id);renderCats();toast(t('cpCatsSaved'));}catch(e){toast(e.message,true);}
  }

  // ── P&L CATEGORIES ─────────────────────────────────────────────────────
  function renderPLCats() {
    const el2=el('cp-pl-cats');if(!el2)return;
    el2.innerHTML=`<div style="display:flex;gap:32px;flex-wrap:wrap">
      <div style="flex:1;min-width:280px"><div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">&#8593; Income Categories</div>
        ${catGrid(plCats.filter(c=>c.type==='income'),'income','ControlPanel.updatePLCat','ControlPanel.deletePLCat','ControlPanel.addPLCat','plcat-en-income','plcat-ar-income')}</div>
      <div style="flex:1;min-width:280px"><div style="font-size:11px;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">&#8595; Expense Categories</div>
        ${catGrid(plCats.filter(c=>c.type==='expense'),'expense','ControlPanel.updatePLCat','ControlPanel.deletePLCat','ControlPanel.addPLCat','plcat-en-expense','plcat-ar-expense')}</div>
    </div>`;
  }

  async function updatePLCat(input) {
    const id=Number(input.dataset.id),field=input.dataset.field,cat=plCats.find(c=>c.id===id);if(!cat)return;
    cat[field]=input.value.trim();
    try{await API.req('PUT',`/pl-categories/${id}`,{name_en:cat.name_en,name_ar:cat.name_ar});toast('P&L category saved');}catch(e){toast(e.message,true);}
  }
  async function addPLCat(type) {
    const en=(el('plcat-en-'+type)||{value:''}).value.trim(),ar=(el('plcat-ar-'+type)||{value:''}).value.trim();
    if(!en)return toast('Enter English name.',true);
    try{const c=await API.req('POST','/pl-categories',{type,name_en:en,name_ar:ar||en});plCats.push(c);renderPLCats();toast('Category added');}catch(e){toast(e.message,true);}
  }
  async function deletePLCat(id) {
    try{await API.req('DELETE',`/pl-categories/${id}`);plCats=plCats.filter(c=>c.id!==id);renderPLCats();toast('Category removed');}catch(e){toast(e.message,true);}
  }

  function renderRBCats() {
    const el2=el('cp-rb-cats');if(!el2)return;
    el2.innerHTML=`<div style="max-width:500px">
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:4px;font-size:10px;color:var(--muted);margin-bottom:6px;padding-bottom:6px;border-bottom:2px solid var(--bord)">
        <span>English</span><span style="text-align:right">&#1593;&#1585;&#1576;&#1610;</span><span></span>
      </div>
      ${rbCats.map(c=>`<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px;align-items:center;padding:5px 0;border-bottom:1px solid var(--bord)">
        <input value="${(c.name_en||'').replace(/"/g,'&quot;')}" data-id="${c.id}" data-field="name_en"
          onchange="ControlPanel.updateRBCat(this)"
          style="padding:5px 8px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--text);font-size:12px;width:100%">
        <input value="${(c.name_ar||'').replace(/"/g,'&quot;')}" data-id="${c.id}" data-field="name_ar"
          onchange="ControlPanel.updateRBCat(this)" dir="rtl"
          style="padding:5px 8px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--text);font-size:12px;text-align:right;width:100%">
        <button data-id="${c.id}" onclick="ControlPanel.deleteRBCat(Number(this.dataset.id))"
          style="padding:4px 8px;border:1px solid var(--red);border-radius:4px;background:transparent;color:var(--red);cursor:pointer;font-size:11px">Remove</button>
      </div>`).join('')}
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px;align-items:center;margin-top:8px">
        <input id="rbcat-en" placeholder="English name" style="padding:6px 8px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--text);font-size:12px;width:100%">
        <input id="rbcat-ar" placeholder="&#1575;&#1604;&#1575;&#1587;&#1605; &#1576;&#1575;&#1604;&#1593;&#1585;&#1576;&#1610;&#1577;" dir="rtl"
          style="padding:6px 8px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--text);font-size:12px;text-align:right;width:100%">
        <button onclick="ControlPanel.addRBCat()"
          style="padding:6px 10px;border:none;border-radius:4px;background:var(--teal);color:#fff;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">+ Add</button>
      </div>
    </div>`;
  }
  async function updateRBCat(input) {
    const id=Number(input.dataset.id),field=input.dataset.field,cat=rbCats.find(c=>c.id===id);if(!cat)return;
    cat[field]=input.value.trim();
    try{await API.req('PUT',`/rb-categories/${id}`,{name_en:cat.name_en,name_ar:cat.name_ar});toast('Category saved');}catch(e){toast(e.message,true);}
  }
  async function addRBCat() {
    const en=(el('rbcat-en')||{value:''}).value.trim(),ar=(el('rbcat-ar')||{value:''}).value.trim();
    if(!en)return toast('Enter English name.',true);
    try{const c=await API.req('POST','/rb-categories',{name_en:en,name_ar:ar||en});rbCats.push(c);renderRBCats();toast('Category added');}catch(e){toast(e.message,true);}
  }
  async function deleteRBCat(id) {
    try{await API.req('DELETE',`/rb-categories/${id}`);rbCats=rbCats.filter(c=>c.id!==id);renderRBCats();toast('Category removed');}catch(e){toast(e.message,true);}
  }

  function renderMLCats() {
    var el2=el('cp-ml-cats'); if(!el2)return;
    function mlSection(dir, label, color) {
      var list = mlCats.filter(function(c){return c.direction===dir;});
      return '<div style="flex:1;min-width:280px">' +
        '<div style="font-size:11px;font-weight:700;color:'+color+';text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">'+label+'</div>' +
        catGrid(list, dir, 'ControlPanel.updateMLCat','ControlPanel.deleteMLCat','ControlPanel.addMLCat','mlcat-en-'+dir,'mlcat-ar-'+dir) +
        '</div>';
    }
    el2.innerHTML = '<div style="display:flex;gap:32px;flex-wrap:wrap">' +
      mlSection('credit','&#8593; Credit Categories','var(--green)') +
      mlSection('debit', '&#8595; Debit Categories', 'var(--red)') +
      '</div>';
  }
  async function updateMLCat(input) {
    var id=Number(input.dataset.id),field=input.dataset.field,cat=mlCats.find(function(c){return c.id===id;});if(!cat)return;
    cat[field]=input.value.trim();
    try{await API.req('PUT','/ml-categories/'+id,{name_en:cat.name_en,name_ar:cat.name_ar});toast('Category saved');}catch(e){toast(e.message,true);}
  }
  async function addMLCat(type) {
    var en=(el('mlcat-en-'+type)||{value:''}).value.trim(),ar=(el('mlcat-ar-'+type)||{value:''}).value.trim();
    if(!en)return toast('Enter English name.',true);
    try{var c=await API.req('POST','/ml-categories',{direction:type,name_en:en,name_ar:ar||en});mlCats.push(c);renderMLCats();toast('Category added');}catch(e){toast(e.message,true);}
  }
  async function deleteMLCat(id) {
    try{await API.req('DELETE','/ml-categories/'+id);mlCats=mlCats.filter(function(c){return c.id!==id;});renderMLCats();toast('Category removed');}catch(e){toast(e.message,true);}
  }

  return {render,addUser,askRemove,confirmRemove,toggleAccess,openPin,savePin,setApprover,setDeleter,updateCat,addCat,deleteCat,updatePLCat,addPLCat,deletePLCat,renderRBCats,updateRBCat,addRBCat,deleteRBCat,renderMLCats,updateMLCat,addMLCat,deleteMLCat};
})();
