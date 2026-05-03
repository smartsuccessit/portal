/**
 * Reimbursements — Pocket payments with team dropdowns and payment methods
 */
window.Reimbursements = (() => {
  let entries = [], allUsers = [], wrap;
  const MANAGERS = ['Shahzaib','Riyad'];
  const PAY_METHODS = ['Cash','Hala Account','Al Rajhi Account','Team Member','Bank Transfer','Other'];

  function canApprove() { return MANAGERS.includes(APP.user.name); }

  async function render(container) {
    wrap = container;
    wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:12px;color:var(--muted)"><span class="spinner"></span> Loading...</div>';
    let rbCats = [];
    try {
      [entries, allUsers, rbCats] = await Promise.all([
        API.req('GET','/reimbursements'),
        API.getUsers(),
        API.req('GET','/rb-categories')
      ]);
      entries  = entries  || [];
      allUsers = allUsers || [];
      rbCats   = rbCats   || [];
    } catch(e) { entries=[]; allUsers=[]; rbCats=[]; }
    window._rbCats = rbCats;
    buildUI();
  }

  let currentFilter = 'all', repayingId = null;

  function buildUI() {
    const userNames = allUsers.map(u => u.name);
    const pending  = entries.filter(e=>!e.repaid);
    const repaid   = entries.filter(e=> e.repaid);
    const totPend  = pending.reduce((s,e)=>s+parseFloat(e.amount||0),0);
    const totRepaid= repaid.reduce((s,e)=>s+parseFloat(e.amount||0),0);

    wrap.innerHTML = `
    <div class="pg-hdr"><h2>&#128179; Reimbursements</h2></div>
    <div class="cards">
      <div class="card red"><div class="cl">Pending Repayment</div><div class="cv">SAR ${fmt(totPend)}</div></div>
      <div class="card grn"><div class="cl">Total Repaid</div><div class="cv">SAR ${fmt(totRepaid)}</div></div>
      <div class="card"><div class="cl">Open Claims</div><div class="cv" style="color:var(--red)">${pending.length}</div></div>
      <div class="card tel"><div class="cl">Total Claims</div><div class="cv">${entries.length}</div></div>
    </div>

    <div class="layout" style="grid-template-columns:380px 1fr">
      <div class="panel">
        <div class="ph dark">+ New Claim</div>
        <div class="fb">
          <div><label>Paid By (team member)</label>
            <select id="rb-paidby" style="padding:10px 12px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:14px;width:100%">
              ${userNames.map(n=>`<option ${n===APP.user.name?'selected':''}>${n}</option>`).join('')}
            </select>
          </div>
          <div><label>Amount (SAR)</label><input type="number" id="rb-amt" placeholder="0.00" step="0.01" min="0"></div>
          <div><label>Category</label>
            <select id="rb-cat">
              ${(window._rbCats||[]).length
                ? (window._rbCats||[]).map(c=>`<option value="${c.name_en}">${APP.lang==='ar'&&c.name_ar?c.name_ar:c.name_en}</option>`).join('')
                : '<option>Office Supplies</option><option>Transport</option><option>Meals</option><option>Equipment</option><option>Repairs</option><option>Utilities</option><option>Client Entertainment</option><option>Other</option>'
              }
            </select>
          </div>
          <div><label>Description</label><input type="text" id="rb-desc" placeholder="What was bought / paid for?"></div>
          <div><label>Date Paid</label><input type="date" id="rb-date" value="${toDateStr()}"></div>
          <div><label>Receipt / Reference</label><input type="text" id="rb-ref" placeholder="Receipt #, photo ref..."></div>
          <button class="sub-btn" onclick="Reimbursements.addEntry()">+ Submit Claim</button>
        </div>
      </div>

      <div class="panel">
        <div class="ph dark" style="display:flex;justify-content:space-between;align-items:center">
          <span>Claims</span>
          <div style="display:flex;gap:6px">
            <button class="fbtn on" style="color:#fff;border-color:rgba(255,255,255,.3)" onclick="Reimbursements.filter('all',this)">All</button>
            <button class="fbtn" style="color:rgba(255,255,255,.6);border-color:rgba(255,255,255,.2)" onclick="Reimbursements.filter('pending',this)">Pending</button>
            <button class="fbtn" style="color:rgba(255,255,255,.6);border-color:rgba(255,255,255,.2)" onclick="Reimbursements.filter('repaid',this)">Repaid</button>
          </div>
        </div>
        <div class="sw"><table class="ltbl">
          <thead><tr><th>Date</th><th>Paid By</th><th>Category</th><th>Description</th><th>Amount</th><th>Ref</th><th>Status</th><th>Repaid Details</th><th></th></tr></thead>
          <tbody id="rb-tbody"></tbody>
        </table>
        <div class="empty" id="rb-empty" style="display:none">No claims yet.</div></div>
      </div>
    </div>

    <!-- Repay Modal -->
    <div class="overlay" id="rb-repay-modal"><div class="modal">
      <h3>Mark as Repaid</h3>
      <div class="mf">
        <div><label>Received By</label>
          <select id="rb-repay-to" style="padding:10px 12px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:14px;width:100%">
            ${userNames.map(n=>`<option>${n}</option>`).join('')}
          </select>
        </div>
        <div><label>Amount Repaid (SAR)</label><input type="number" id="rb-repay-amt" placeholder="0.00"></div>
        <div><label>Payment Method</label>
          <select id="rb-repay-method" style="padding:10px 12px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:14px;width:100%">
            ${PAY_METHODS.map(m=>`<option>${m}</option>`).join('')}
          </select>
        </div>
        <div id="rb-via-member-wrap" style="display:none"><label>Via Team Member</label>
          <select id="rb-via-member" style="padding:10px 12px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:14px;width:100%">
            ${userNames.map(n=>`<option>${n}</option>`).join('')}
          </select>
        </div>
        <div><label>Repayment Date</label><input type="date" id="rb-repay-date" value="${toDateStr()}"></div>
        <div><label>Note</label><input type="text" id="rb-repay-note" placeholder="Any notes..."></div>
      </div>
      <div class="mact">
        <button class="btn-c" onclick="closeModal('rb-repay-modal')">Cancel</button>
        <button class="btn-s" onclick="Reimbursements.confirmRepay()">Mark Repaid</button>
      </div>
    </div></div>`;

    // Show/hide via-member field when method = Team Member
    const methodSel = el('rb-repay-method');
    if (methodSel) {
      methodSel.onchange = function() {
        const vw = el('rb-via-member-wrap');
        if (vw) vw.style.display = this.value==='Team Member' ? 'block' : 'none';
      };
    }

    renderList();
  }

  function filter(f, btn) {
    currentFilter = f;
    document.querySelectorAll('.ph.dark .fbtn').forEach(b=>{b.classList.remove('on');b.style.color='rgba(255,255,255,.6)';});
    btn.classList.add('on'); btn.style.color='#fff';
    renderList();
  }

  async function addEntry() {
    const paidBy=(el('rb-paidby')||{value:''}).value;
    const amt   =parseFloat((el('rb-amt')||{value:0}).value);
    const cat   =(el('rb-cat')||{value:''}).value;
    const desc  =(el('rb-desc')||{value:''}).value.trim();
    const date  =(el('rb-date')||{value:toDateStr()}).value;
    const ref   =(el('rb-ref')||{value:''}).value.trim();
    if(!paidBy)     return toast('Select who paid',true);
    if(!amt||amt<=0)return toast('Enter a valid amount',true);
    if(!desc)       return toast('Add a description',true);
    try {
      const e=await API.req('POST','/reimbursements',{paid_by:paidBy,amount:amt,category:cat,description:desc,paid_date:date,reference:ref,entered_by:APP.user.name,repaid:0});
      entries.unshift(e);
      ['rb-amt','rb-desc','rb-ref'].forEach(id=>{const e2=el(id);if(e2)e2.value='';});
      buildUI(); toast('Claim submitted');
    } catch(e){toast(e.message,true);}
  }

  async function requestApproval(id) {
    try {
      await API.req('PUT',`/reimbursements/${id}`,{pending_approval:1,req_by:APP.user.name});
      const e=entries.find(x=>x.id===id);if(e){e.pending_approval=1;e.req_by=APP.user.name;}
      renderList(); toast('Repayment request sent to manager');
    } catch(e){toast(e.message,true);}
  }

  function openRepay(id) {
    repayingId=id;
    const entry=entries.find(x=>x.id===id);
    if(entry){
      const ae=el('rb-repay-amt');if(ae)ae.value=entry.amount;
      const te=el('rb-repay-to');
      if(te){const idx=Array.from(te.options).findIndex(o=>o.value===entry.paid_by);if(idx>=0)te.selectedIndex=idx;}
    }
    openModal('rb-repay-modal');
  }

  async function confirmRepay() {
    const to    =(el('rb-repay-to')    ||{value:''}).value;
    const amt   =parseFloat((el('rb-repay-amt')||{value:0}).value);
    const method=(el('rb-repay-method')||{value:'Cash'}).value;
    const via   =(el('rb-via-member')  ||{value:''}).value;
    const date  =(el('rb-repay-date')  ||{value:toDateStr()}).value;
    const note  =(el('rb-repay-note')  ||{value:''}).value.trim();
    if(!amt||amt<=0)return toast('Enter repaid amount',true);
    const methodLabel = method==='Team Member' ? `Team Member (${via})` : method;
    try {
      await API.req('PUT',`/reimbursements/${repayingId}`,{repaid:1,repaid_amount:amt,repaid_method:methodLabel,repaid_date:date,repaid_note:note,repaid_by:APP.user.name});
      const e=entries.find(x=>x.id===repayingId);
      if(e){e.repaid=1;e.repaid_amount=amt;e.repaid_method=methodLabel;e.repaid_date=date;e.repaid_note=note;e.repaid_by=APP.user.name;}
      closeModal('rb-repay-modal'); buildUI(); toast('Marked as repaid');
    } catch(e){toast(e.message,true);}
  }

  async function deleteEntry(id) {
    if(!confirm('Delete this claim?'))return;
    try{await API.req('DELETE',`/reimbursements/${id}`);entries=entries.filter(x=>x.id!==id);buildUI();toast('Deleted');}
    catch(e){toast(e.message,true);}
  }

  function renderList() {
    let list=[...entries];
    if(currentFilter==='pending')list=list.filter(e=>!e.repaid);
    if(currentFilter==='repaid') list=list.filter(e=> e.repaid);
    const tbody=el('rb-tbody'),emp=el('rb-empty');
    if(!tbody)return;
    if(!list.length){tbody.innerHTML='';emp.style.display='block';return;}
    emp.style.display='none';
    tbody.innerHTML=list.map(e=>`<tr>
      <td style="font-size:12px;color:var(--muted)">${e.paid_date||''}</td>
      <td style="font-weight:600">${e.paid_by}</td>
      <td style="font-size:12px;color:var(--muted)">${e.category||''}</td>
      <td>${e.description}</td>
      <td style="font-weight:700;color:${e.repaid?'var(--green)':'var(--red)'}">SAR ${fmt(e.amount)}</td>
      <td style="font-size:11px;color:var(--muted)">${e.reference||''}</td>
      <td>${e.repaid
        ? '<span style="font-size:10px;color:var(--green);font-weight:700">&#10003; Repaid</span>'
        : e.pending_approval
          ? canApprove()
            ? `<button onclick="Reimbursements.openRepay(${e.id})" class="app-btn" style="background:rgba(42,191,191,.1)">Approve &amp; Repay</button>`
            : `<span style="font-size:10px;color:var(--teal)">&#9679; Requested by ${e.req_by||''}</span>`
          : canApprove()
            ? `<button onclick="Reimbursements.openRepay(${e.id})" class="app-btn">Mark Repaid</button>`
            : `<button onclick="Reimbursements.requestApproval(${e.id})" style="padding:3px 10px;border:1px solid var(--teal);border-radius:4px;background:transparent;color:var(--teal);font-size:10px;cursor:pointer">Request</button>`
      }</td>
      <td style="font-size:11px;color:var(--muted)">${e.repaid?`${e.repaid_method||''} \u00B7 ${e.repaid_date||''} \u00B7 SAR ${fmt(e.repaid_amount||0)}`:'—'}</td>
      <td><button class="del-btn" onclick="Reimbursements.deleteEntry(${e.id})">&#10005;</button></td>
    </tr>`).join('');
  }

  return{render,filter,addEntry,requestApproval,openRepay,confirmRepay,deleteEntry,renderList};
})();
