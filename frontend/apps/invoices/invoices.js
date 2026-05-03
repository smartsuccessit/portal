/**
 * Invoice Tracker — with full installment payment history per invoice
 */
window.InvoiceTracker = (() => {
  let invoices = [], wrap;
  const MANAGERS = ['Shahzaib','Riyad'];
  function canApprove() { return MANAGERS.includes(APP.user.name); }

  async function render(container) {
    wrap = container;
    wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:12px;color:var(--muted)"><span class="spinner"></span> Loading...</div>';
    try { invoices = await API.req('GET','/invoices') || []; }
    catch(e) { invoices=[]; }
    buildUI();
  }

  let currentFilter='all', editId=null, payingId=null, expandedId=null;

  function isOverdue(e) {
    if(!e.due_date) return false;
    return (parseFloat(e.total_amount||0)-parseFloat(e.paid_amount||0))>0.001 && new Date(e.due_date)<new Date();
  }

  function buildUI() {
    const totalOut  = invoices.filter(e=>e.direction==='outgoing').reduce((s,e)=>s+parseFloat(e.total_amount||0),0);
    const totalIn   = invoices.filter(e=>e.direction==='incoming').reduce((s,e)=>s+parseFloat(e.total_amount||0),0);
    const paidOut   = invoices.filter(e=>e.direction==='outgoing').reduce((s,e)=>s+parseFloat(e.paid_amount||0),0);
    const paidIn    = invoices.filter(e=>e.direction==='incoming').reduce((s,e)=>s+parseFloat(e.paid_amount||0),0);

    wrap.innerHTML = `
    <div class="pg-hdr">
      <h2>&#128466; Invoice Tracker</h2>
      <button onclick="InvoiceTracker.openInvModal()" class="act-btn grn">+ New Invoice</button>
    </div>
    <div class="cards">
      <div class="card red"><div class="cl">We Owe (Vendors)</div><div class="cv">SAR ${fmt(totalOut-paidOut)}</div></div>
      <div class="card grn"><div class="cl">Owed to Us (Customers)</div><div class="cv">SAR ${fmt(totalIn-paidIn)}</div></div>
      <div class="card"><div class="cl">Total Invoices</div><div class="cv" style="color:var(--teal)">${invoices.length}</div></div>
      <div class="card"><div class="cl">Overdue</div><div class="cv" style="color:var(--red)">${invoices.filter(e=>isOverdue(e)).length}</div></div>
    </div>
    <div class="panel">
      <div class="ph dark" style="display:flex;justify-content:space-between;align-items:center">
        <span>All Invoices</span>
        <div style="display:flex;gap:6px">
          <button class="fbtn on" style="color:#fff;border-color:rgba(255,255,255,.3)" onclick="InvoiceTracker.filter('all',this)">All</button>
          <button class="fbtn" style="color:rgba(255,255,255,.6);border-color:rgba(255,255,255,.2)" onclick="InvoiceTracker.filter('outgoing',this)">We Owe</button>
          <button class="fbtn" style="color:rgba(255,255,255,.6);border-color:rgba(255,255,255,.2)" onclick="InvoiceTracker.filter('incoming',this)">Owed to Us</button>
          <button class="fbtn" style="color:rgba(255,255,255,.6);border-color:rgba(255,255,255,.2)" onclick="InvoiceTracker.filter('overdue',this)">Overdue</button>
        </div>
      </div>
      <div class="lctrl">
        <input class="srch" type="text" id="inv-srch" placeholder="Search vendor, invoice #..." oninput="InvoiceTracker.renderList()">
      </div>
      <div id="inv-list"></div>
    </div>

    <!-- Invoice Modal -->
    <div class="overlay" id="inv-inv-modal">
      <div class="modal" style="max-width:520px">
        <h3 id="inv-modal-title">New Invoice</h3>
        <div class="mf">
          <div class="mrow">
            <div><label>Direction</label>
              <select id="inv-dir">
                <option value="outgoing">We Owe (Vendor/Supplier)</option>
                <option value="incoming">Owed to Us (Customer)</option>
              </select>
            </div>
            <div><label>Invoice #</label><input type="text" id="inv-num" placeholder="INV-001"></div>
          </div>
          <div class="mrow">
            <div><label>Vendor / Customer</label><input type="text" id="inv-party" placeholder="Name"></div>
            <div><label>Total Amount (SAR)</label><input type="number" id="inv-total" placeholder="0.00" step="0.01"></div>
          </div>
          <div class="mrow">
            <div><label>Issue Date</label><input type="date" id="inv-issue" value="${toDateStr()}"></div>
            <div><label>Due Date</label><input type="date" id="inv-due"></div>
          </div>
          <div><label>Notes</label><textarea id="inv-notes" style="min-height:55px" placeholder="What this invoice is for..."></textarea></div>
        </div>
        <div class="mact">
          <button class="btn-c" onclick="closeModal('inv-inv-modal')">Cancel</button>
          <button class="btn-d" id="inv-del-btn" style="display:none" onclick="InvoiceTracker.deleteInvoice()">Delete</button>
          <button class="btn-s" onclick="InvoiceTracker.saveInvoice()">Save Invoice</button>
        </div>
      </div>
    </div>

    <!-- Payment Modal -->
    <div class="overlay" id="inv-pay-modal">
      <div class="modal">
        <h3>Record Payment</h3>
        <div id="inv-pay-summary" style="background:var(--surf2);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:13px;line-height:1.6"></div>
        <div class="mf">
          <div class="mrow">
            <div><label>Payment Amount (SAR)</label><input type="number" id="inv-pay-amt" placeholder="0.00" step="0.01"></div>
            <div><label>Payment Date</label><input type="date" id="inv-pay-date" value="${toDateStr()}"></div>
          </div>
          <div class="mrow">
            <div><label>Payment Method</label>
              <select id="inv-pay-method">
                <option>Bank Transfer</option><option>Cash</option><option>Card</option><option>Cheque</option><option>Other</option>
              </select>
            </div>
            <div><label>Reference</label><input type="text" id="inv-pay-ref" placeholder="Transfer ref, receipt..."></div>
          </div>
        </div>
        <div class="mact">
          <button class="btn-c" onclick="closeModal('inv-pay-modal')">Cancel</button>
          <button class="btn-s" onclick="InvoiceTracker.confirmPayment()">Record Payment</button>
        </div>
      </div>
    </div>`;

    renderList();
  }

  function filter(f,btn) {
    currentFilter=f;
    document.querySelectorAll('.ph.dark .fbtn').forEach(b=>{b.classList.remove('on');b.style.color='rgba(255,255,255,.6)';});
    btn.classList.add('on');btn.style.color='#fff';
    renderList();
  }

  function openInvModal(id) {
    editId = id||null;
    const db2=el('inv-del-btn');if(db2)db2.style.display=id?'inline-block':'none';
    const tt=el('inv-modal-title');if(tt)tt.textContent=id?'Edit Invoice':'New Invoice';
    if(id){
      const inv=invoices.find(x=>x.id===id);
      if(inv){
        const sv=(eid,val)=>{const e2=el(eid);if(e2)e2.value=val||'';};
        sv('inv-dir',inv.direction);sv('inv-num',inv.invoice_number);
        sv('inv-party',inv.party_name);sv('inv-total',inv.total_amount);
        sv('inv-issue',inv.issue_date);sv('inv-due',inv.due_date||'');sv('inv-notes',inv.notes||'');
      }
    } else {
      ['inv-num','inv-party','inv-total','inv-notes'].forEach(id2=>{const e2=el(id2);if(e2)e2.value='';});
      const ie=el('inv-issue');if(ie)ie.value=toDateStr();
      const de=el('inv-due');if(de)de.value='';
    }
    openModal('inv-inv-modal');
  }

  async function saveInvoice() {
    const data={
      direction:     (el('inv-dir')   ||{value:'outgoing'}).value,
      invoice_number:(el('inv-num')   ||{value:''}).value.trim(),
      party_name:    (el('inv-party') ||{value:''}).value.trim(),
      total_amount:  parseFloat((el('inv-total')||{value:0}).value)||0,
      paid_amount:   0,
      issue_date:    (el('inv-issue') ||{value:toDateStr()}).value,
      due_date:      (el('inv-due')   ||{value:''}).value||null,
      notes:         (el('inv-notes') ||{value:''}).value.trim(),
      entered_by:    APP.user.name,
    };
    if(!data.party_name)  return toast('Enter vendor/customer name',true);
    if(!data.total_amount)return toast('Enter invoice total amount',true);
    try {
      if(editId){
        await API.req('PUT',`/invoices/${editId}`,data);
        const idx=invoices.findIndex(x=>x.id===editId);
        if(idx>=0)invoices[idx]={...invoices[idx],...data};
      } else {
        const inv=await API.req('POST','/invoices',data);
        invoices.unshift(inv);
      }
      closeModal('inv-inv-modal');buildUI();
      toast(editId?'Invoice updated':'Invoice added');
    } catch(e){toast(e.message,true);}
  }

  function openPayment(id) {
    payingId=id;
    const inv=invoices.find(x=>x.id===id);if(!inv)return;
    const total=parseFloat(inv.total_amount||0),paid=parseFloat(inv.paid_amount||0),bal=total-paid;
    const sumEl=el('inv-pay-summary');
    if(sumEl) sumEl.innerHTML=`<strong>${inv.invoice_number||'Invoice'}</strong> &mdash; ${inv.party_name}<br>
      Total: <strong>SAR ${fmt(total)}</strong> &nbsp;|&nbsp;
      Already Paid: <strong style="color:var(--green)">SAR ${fmt(paid)}</strong> &nbsp;|&nbsp;
      <strong style="color:var(--red)">Remaining: SAR ${fmt(bal)}</strong>`;
    const ae=el('inv-pay-amt');if(ae)ae.value=fmt(Math.max(0,bal));
    openModal('inv-pay-modal');
  }

  async function confirmPayment() {
    const amt   =parseFloat((el('inv-pay-amt')||{value:0}).value)||0;
    const method=(el('inv-pay-method')||{value:'Bank Transfer'}).value;
    const date  =(el('inv-pay-date')  ||{value:toDateStr()}).value;
    const ref   =(el('inv-pay-ref')   ||{value:''}).value.trim();
    if(!amt||amt<=0)return toast('Enter payment amount',true);
    try {
      await API.req('POST',`/invoices/${payingId}/payments`,{amount:amt,payment_method:method,payment_date:date,reference:ref});
      // Reload the invoice to get updated paid_amount
      const updated = await API.req('GET','/invoices');
      const inv = (updated||[]).find(x=>x.id===payingId);
      if(inv){const idx=invoices.findIndex(x=>x.id===payingId);if(idx>=0)invoices[idx]=inv;}
      closeModal('inv-pay-modal');
      // Re-expand if it was expanded
      if(expandedId===payingId) loadPayments(payingId);
      else buildUI();
      toast('Payment recorded');
    } catch(e){toast(e.message,true);}
  }

  async function loadPayments(invId) {
    expandedId = invId;
    const row = document.getElementById(`inv-detail-${invId}`);
    if(!row){buildUI();return;}
    row.innerHTML = '<td colspan="11" style="padding:12px 20px;text-align:center;color:var(--muted)"><span class="spinner" style="display:inline-block"></span> Loading payments...</td>';
    try {
      const payments = await API.req('GET',`/invoices/${invId}/payments`);
      const inv = invoices.find(x=>x.id===invId);
      if(!inv)return;
      const total=parseFloat(inv.total_amount||0),paid=parseFloat(inv.paid_amount||0),bal=total-paid;
      row.innerHTML = `<td colspan="11" style="padding:0">
        <div style="background:var(--surf2);border-top:2px solid var(--teal);padding:16px 20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <span style="font-size:13px;font-weight:700;color:var(--teal)">&#128203; Payment History — ${inv.invoice_number||inv.party_name}</span>
            <div style="display:flex;gap:8px;align-items:center">
              <span style="font-size:12px;color:var(--muted)">Total: SAR ${fmt(total)} | Paid: <span style="color:var(--green);font-weight:700">SAR ${fmt(paid)}</span> | Balance: <span style="color:${bal>0?'var(--red)':'var(--green)'};font-weight:700">SAR ${fmt(bal)}</span></span>
              ${!canApprove()&&bal>0?`<button onclick="InvoiceTracker.requestPayment(${invId})" class="act-btn" style="font-size:11px;padding:4px 10px">Request Pay</button>`:''}
              ${canApprove()&&bal>0?`<button onclick="InvoiceTracker.openPayment(${invId})" class="act-btn grn" style="font-size:11px;padding:4px 10px">+ Add Payment</button>`:''}
              <button onclick="InvoiceTracker.collapsePayments()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px">&#10005;</button>
            </div>
          </div>
          ${payments.length===0
            ? '<div style="text-align:center;color:var(--muted);font-size:13px;padding:12px">No payments recorded yet.</div>'
            : `<table class="ltbl" style="background:var(--surf)">
              <thead><tr><th>#</th><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Recorded By</th><th></th></tr></thead>
              <tbody>${payments.map((p,i)=>`<tr>
                <td style="color:var(--muted);font-size:11px">${i+1}</td>
                <td style="font-size:12px">${p.payment_date||''}</td>
                <td style="font-weight:700;color:var(--green)">SAR ${fmt(p.amount)}</td>
                <td style="font-size:12px;color:var(--muted)">${p.payment_method||''}</td>
                <td style="font-size:11px;color:var(--muted)">${p.reference||''}</td>
                <td style="font-size:11px;color:var(--muted)">${p.recorded_by||''}</td>
                <td>${canApprove()?`<button class="del-btn" onclick="InvoiceTracker.deletePayment(${p.id},${invId})">&#10005;</button>`:''}</td>
              </tr>`).join('')}</tbody>
            </table>`
          }
          <!-- Progress bar -->
          <div style="margin-top:12px;background:var(--bord);border-radius:4px;height:6px">
            <div style="height:6px;background:${bal<=0?'var(--green)':'var(--teal)'};border-radius:4px;width:${Math.min(100,total>0?(paid/total)*100:0)}%;transition:width .4s"></div>
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px;text-align:right">${total>0?(paid/total*100).toFixed(1):0}% paid</div>
        </div>
      </td>`;
    } catch(e) {
      const row2=document.getElementById(`inv-detail-${invId}`);
      if(row2)row2.innerHTML=`<td colspan="11" style="padding:12px;text-align:center;color:var(--red)">${e.message}</td>`;
    }
  }

  function collapsePayments() {
    expandedId = null;
    renderList();
  }

  async function deletePayment(payId, invId) {
    if(!confirm('Delete this payment?'))return;
    try {
      const r=await API.req('DELETE',`/invoice-payments/${payId}`);
      const inv=invoices.find(x=>x.id===invId);
      if(inv&&r.new_paid!==undefined)inv.paid_amount=r.new_paid;
      loadPayments(invId);
      toast('Payment deleted');
    } catch(e){toast(e.message,true);}
  }

  async function deleteInvoice() {
    if(!editId||!confirm('Delete this invoice?'))return;
    try {
      await API.req('DELETE',`/invoices/${editId}`);
      invoices=invoices.filter(x=>x.id!==editId);
      closeModal('inv-inv-modal');buildUI();toast('Deleted');
    } catch(e){toast(e.message,true);}
  }

  async function requestPayment(id) {
    try {
      await API.req('PUT',`/invoices/${id}`,{payment_requested:1,req_by:APP.user.name});
      const inv=invoices.find(x=>x.id===id);if(inv){inv.payment_requested=1;inv.req_by=APP.user.name;}
      renderList();toast('Payment request sent');
    } catch(e){toast(e.message,true);}
  }

  function renderList() {
    const q=((el('inv-srch')||{value:''}).value||'').toLowerCase();
    let list=[...invoices];
    if(currentFilter==='outgoing')list=list.filter(e=>e.direction==='outgoing');
    if(currentFilter==='incoming')list=list.filter(e=>e.direction==='incoming');
    if(currentFilter==='overdue') list=list.filter(e=>isOverdue(e));
    if(q)list=list.filter(e=>(e.party_name||'').toLowerCase().includes(q)||(e.invoice_number||'').toLowerCase().includes(q));

    const container=el('inv-list');if(!container)return;
    if(!list.length){container.innerHTML='<div class="empty">No invoices yet.</div>';return;}

    container.innerHTML=`<table class="ltbl">
      <thead><tr>
        <th>Invoice #</th><th>Direction</th><th>Vendor/Customer</th>
        <th>Issue</th><th>Due</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Notes</th><th>Actions</th>
      </tr></thead>
      <tbody id="inv-tbody"></tbody>
    </table>`;

    const tbody=el('inv-tbody');if(!tbody)return;
    let rows='';
    list.forEach(e=>{
      const total=parseFloat(e.total_amount||0),paid=parseFloat(e.paid_amount||0);
      const bal=total-paid,pct=total>0?Math.min(100,(paid/total)*100):0;
      const overdue=isOverdue(e),fullyPaid=bal<=0.001;
      const isExpanded=expandedId===e.id;
      rows+=`<tr style="${overdue?'background:rgba(224,90,43,.04)':''}" class="${isExpanded?'expanded-inv':''}">
        <td>
          <button onclick="InvoiceTracker.${isExpanded?'collapsePayments':'loadPayments'}(${e.id})"
            style="background:none;border:none;cursor:pointer;color:var(--teal);font-weight:700;font-size:13px;padding:0;text-align:left">
            ${isExpanded?'&#9660;':'&#9658;'} ${e.invoice_number||'—'}
          </button>
        </td>
        <td><span style="font-size:10px;padding:2px 8px;border-radius:3px;background:${e.direction==='outgoing'?'rgba(224,90,43,.1)':'rgba(22,163,74,.1)'};color:${e.direction==='outgoing'?'var(--red)':'var(--green)'}">
          ${e.direction==='outgoing'?'We Owe':'Owed to Us'}</span></td>
        <td style="font-weight:600">${e.party_name||''}</td>
        <td style="font-size:12px;color:var(--muted)">${e.issue_date||''}</td>
        <td style="font-size:12px;color:${overdue?'var(--red)':'var(--muted)'};font-weight:${overdue?700:400}">${e.due_date||'—'}${overdue?' \u26A0':''}</td>
        <td style="font-weight:600">SAR ${fmt(total)}</td>
        <td style="color:var(--green)">SAR ${fmt(paid)}</td>
        <td style="font-weight:700">
          ${fullyPaid
            ? '<span style="color:var(--green)">&#10003; Paid</span>'
            : `<span style="color:var(--red)">SAR ${fmt(bal)}</span>
               <div style="height:3px;background:var(--surf2);border-radius:2px;margin-top:3px;min-width:60px">
                 <div style="height:3px;background:var(--green);border-radius:2px;width:${pct}%"></div></div>`
          }
        </td>
        <td><span style="font-size:10px;padding:2px 8px;border-radius:3px;font-weight:700;background:${fullyPaid?'rgba(22,163,74,.12)':overdue?'rgba(224,90,43,.12)':'rgba(42,191,191,.12)'};color:${fullyPaid?'var(--green)':overdue?'var(--red)':'var(--teal)'}">
          ${fullyPaid?'PAID':overdue?'OVERDUE':'PENDING'}</span></td>
        <td style="font-size:11px;color:var(--muted);max-width:100px">${(e.notes||'').slice(0,40)}</td>
        <td style="display:flex;gap:4px;flex-wrap:wrap">
          ${!fullyPaid
            ? canApprove()
              ? `<button class="act-btn grn" onclick="InvoiceTracker.openPayment(${e.id})" style="font-size:10px;padding:3px 8px">+ Pay</button>`
              : e.payment_requested
                ? `<span style="font-size:10px;color:var(--teal)">&#9679; Requested</span>`
                : `<button class="act-btn" onclick="InvoiceTracker.requestPayment(${e.id})" style="font-size:10px;padding:3px 8px">Req Pay</button>`
            : ''}
          <button class="act-btn" onclick="InvoiceTracker.openInvModal(${e.id})" style="font-size:10px;padding:3px 8px">Edit</button>
        </td>
      </tr>
      <tr id="inv-detail-${e.id}" style="${isExpanded?'':'display:none'}">
        <td colspan="11"></td>
      </tr>`;
    });
    tbody.innerHTML=rows;
    // Reload expanded row if any
    if(expandedId && list.find(e=>e.id===expandedId)){
      const detailRow=document.getElementById(`inv-detail-${expandedId}`);
      if(detailRow)detailRow.style.display='';
      loadPayments(expandedId);
    }
  }

  return{render,filter,openInvModal,saveInvoice,openPayment,confirmPayment,loadPayments,collapsePayments,deletePayment,deleteInvoice,requestPayment,renderList};
})();
