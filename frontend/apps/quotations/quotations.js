/** Quotation Management v1 */
window.Quotations = (function() {
  var quotations = [], customers = [], settings = {}, wrap;
  var currentView = 'list'; // list | form | preview
  var editingId   = null;
  var formData    = null;
  var filterStatus = '', filterQ = '', filterFrom = '', filterTo = '';
  var STATUSES = ['Draft','Sent','Approved','Rejected','Expired'];
  var STATUS_COLORS = {Draft:'#64748b',Sent:'#2abfbf',Approved:'#16a34a',Rejected:'#dc2626',Expired:'#f59e0b'};

  // ── API helpers ───────────────────────────────────────────────────────
  function qtReq(method, path, body) { return API.req(method, '/quotations' + path, body); }

  async function render(container) {
    wrap = container;
    wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:12px;color:var(--muted)"><span class="spinner"></span> Loading...</div>';
    try {
      var r = await Promise.all([qtReq('GET','/'), qtReq('GET','/customers'), qtReq('GET','/settings')]);
      quotations = r[0]||[]; customers = r[1]||[]; settings = r[2]||{};
    } catch(e) { quotations=[]; customers=[]; settings={}; }
    showList();
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────
  function showList() {
    currentView = 'list'; editingId = null;
    var filtered = quotations.filter(function(q) {
      if (filterStatus && q.status !== filterStatus) return false;
      if (filterQ) {
        var qs = filterQ.toLowerCase();
        var cname = (q.customer_snap && q.customer_snap.company_name) ? q.customer_snap.company_name.toLowerCase() : '';
        if (!q.quote_number.toLowerCase().includes(qs) && !cname.includes(qs)) return false;
      }
      if (filterFrom && q.quote_date < filterFrom) return false;
      if (filterTo   && q.quote_date > filterTo)   return false;
      return true;
    });

    // Stats
    var total     = quotations.length;
    var approved  = quotations.filter(function(q){return q.status==='Approved';}).length;
    var pending   = quotations.filter(function(q){return q.status==='Sent';}).length;
    var totalVal  = quotations.filter(function(q){return q.status==='Approved';}).reduce(function(s,q){return s+parseFloat(q.grand_total||0);},0);

    var html = '<div class="pg-hdr"><h2>&#128206; Quotations</h2>' +
      '<button onclick="Quotations.openForm()" class="act-btn" style="background:#1e2d4a;color:#fff;border:none">+ New Quotation</button></div>';

    html += '<div class="cards" style="margin-bottom:20px">' +
      '<div class="card"><div class="cl">Total Quotations</div><div class="cv" style="color:var(--teal)">'+total+'</div></div>' +
      '<div class="card grn"><div class="cl">Approved</div><div class="cv">'+approved+'</div></div>' +
      '<div class="card tel"><div class="cl">Sent / Pending</div><div class="cv">'+pending+'</div></div>' +
      '<div class="card"><div class="cl">Approved Value</div><div class="cv" style="color:var(--green)">SAR '+fmt(totalVal)+'</div></div>' +
    '</div>';

    // Filters
    html += '<div class="panel"><div class="ph dark" style="display:flex;justify-content:space-between;align-items:center">' +
      '<span>&#128203; All Quotations ('+filtered.length+')</span>' +
      '<button onclick="Quotations.openCustomers()" style="padding:4px 12px;border:1px solid rgba(255,255,255,.3);border-radius:4px;background:transparent;color:#fff;font-size:12px;cursor:pointer">&#128101; Customers</button>' +
    '</div>';
    html += '<div class="lctrl" style="flex-wrap:wrap;gap:8px">' +
      '<input class="srch" type="text" id="qt-srch" placeholder="Search number or customer..." value="'+filterQ+'" oninput="Quotations.setFilter(\'q\',this.value)" style="min-width:200px">' +
      '<select id="qt-fstatus" onchange="Quotations.setFilter(\'status\',this.value)" style="padding:5px 10px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--text);font-size:12px">' +
        '<option value="">All Statuses</option>' +
        STATUSES.map(function(s){return '<option value="'+s+'"'+(filterStatus===s?' selected':'')+'>'+s+'</option>';}).join('') +
      '</select>' +
      '<input type="date" id="qt-ffrom" value="'+filterFrom+'" onchange="Quotations.setFilter(\'from\',this.value)" style="padding:5px 8px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--text);font-size:12px">' +
      '<input type="date" id="qt-fto"   value="'+filterTo+'"   onchange="Quotations.setFilter(\'to\',this.value)"   style="padding:5px 8px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--text);font-size:12px">' +
      '<button onclick="Quotations.clearFilters()" style="padding:5px 10px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--muted);font-size:12px;cursor:pointer">Clear</button>' +
    '</div>';

    if (!filtered.length) {
      html += '<div class="empty" style="padding:40px">No quotations found. Click "+ New Quotation" to create one.</div>';
    } else {
      html += '<div class="sw"><table class="ltbl"><thead><tr>' +
        '<th>Quote #</th><th>Date</th><th>Expires</th><th>Customer</th>' +
        '<th style="text-align:right">Grand Total</th><th>Status</th><th>By</th><th>Actions</th>' +
      '</tr></thead><tbody>';
      filtered.forEach(function(q) {
        var cname = (q.customer_snap && q.customer_snap.company_name) ? q.customer_snap.company_name : '—';
        var sc    = STATUS_COLORS[q.status] || '#64748b';
        var today = new Date().toISOString().slice(0,10);
        var expired = q.expiry_date && q.expiry_date < today && q.status !== 'Approved';
        html += '<tr>' +
          '<td style="font-weight:700;color:var(--teal);cursor:pointer" onclick="Quotations.openPreview('+q.id+')">'+q.quote_number+'</td>' +
          '<td style="font-size:12px;color:var(--muted)">'+fmtD(q.quote_date)+'</td>' +
          '<td style="font-size:12px;color:'+(expired?'var(--red)':'var(--muted)')+'">'+( q.expiry_date?fmtD(q.expiry_date)+'':'—')+(expired?' ⚠':'')+'</td>' +
          '<td style="font-weight:500">'+cname+'</td>' +
          '<td style="text-align:right;font-weight:700">'+( settings.qt_currency||'SAR' )+' '+fmt(q.grand_total)+'</td>' +
          '<td><span style="font-size:10px;padding:3px 10px;border-radius:12px;font-weight:700;background:'+sc+'22;color:'+sc+'">'+q.status+'</span></td>' +
          '<td style="font-size:11px;color:var(--muted)">'+q.created_by+'</td>' +
          '<td><div style="display:flex;gap:4px">' +
            '<button onclick="Quotations.openPreview('+q.id+')" class="act-btn" style="font-size:10px;padding:3px 8px">View</button>' +
            '<button onclick="Quotations.openForm('+q.id+')" class="act-btn" style="font-size:10px;padding:3px 8px">Edit</button>' +
            '<button onclick="Quotations.duplicate('+q.id+')" class="act-btn" style="font-size:10px;padding:3px 8px">Copy</button>' +
            '<button onclick="Quotations.deleteQ('+q.id+')" class="del-btn">&#10005;</button>' +
          '</div></td>' +
        '</tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';
    wrap.innerHTML = html;
  }

  function setFilter(key, val) {
    if (key==='q')      filterQ      = val;
    if (key==='status') filterStatus = val;
    if (key==='from')   filterFrom   = val;
    if (key==='to')     filterTo     = val;
    showList();
  }
  function clearFilters() { filterQ=''; filterStatus=''; filterFrom=''; filterTo=''; showList(); }

  // ── FORM VIEW ─────────────────────────────────────────────────────────
  async function openForm(id) {
    currentView = 'form'; editingId = id || null;
    wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:12px;color:var(--muted)"><span class="spinner"></span> Loading...</div>';

    var q = null;
    if (id) {
      try { q = await qtReq('GET', '/'+id); } catch(e) {}
    }

    // Default from_snap from settings
    var fromSnap = (q && q.from_snap) ? q.from_snap : {
      company_name: settings.qt_company_name||'',
      address:      settings.qt_address||'',
      phone:        settings.qt_phone||'',
      email:        settings.qt_email||'',
      website:      settings.qt_website||'',
      vat_number:   settings.qt_vat_number||'',
    };
    var custSnap = (q && q.customer_snap) ? q.customer_snap : {};
    var items    = (q && q.items && q.items.length) ? q.items : [{description:'',quantity:1,unit_price:0,line_total:0}];
    var today    = new Date().toISOString().slice(0,10);
    var expiry   = q ? (q.expiry_date||'') : '';
    var vatPct   = q ? parseFloat(q.vat_pct||15) : parseFloat(settings.qt_vat_pct||15);
    var status   = q ? q.status : 'Draft';
    var notes    = q ? (q.notes||'') : '';
    var footer   = q ? (q.footer_text||(settings.qt_footer||'')) : (settings.qt_footer||'');
    var currency = q ? (q.currency||settings.qt_currency||'SAR') : (settings.qt_currency||'SAR');

    // Customer options
    var custOpts = '<option value="">-- Select or type to search --</option>' +
      customers.map(function(c){return '<option value="'+c.id+'">'+c.company_name+(c.contact_name?' | '+c.contact_name:'')+'</option>';}).join('');

    var statusOpts = STATUSES.map(function(s){return '<option value="'+s+'"'+(status===s?' selected':'')+'>'+s+'</option>';}).join('');

    var html = '<div class="pg-hdr">' +
      '<div style="display:flex;align-items:center;gap:12px">' +
        '<button onclick="Quotations.showList()" style="background:none;border:1px solid var(--bord);border-radius:6px;padding:6px 12px;color:var(--text);cursor:pointer;font-size:13px">&#8592; Back</button>' +
        '<h2>'+(id?'Edit Quotation':'New Quotation')+'</h2>' +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<select id="qf-status" style="padding:8px 12px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text)">'+statusOpts+'</select>' +
        '<button onclick="Quotations.saveForm()" class="act-btn" style="background:#1e2d4a;color:#fff;border:none">&#128190; Save</button>' +
        (id?'<button onclick="Quotations.openPreview('+id+')" class="act-btn" style="background:#2abfbf;color:#fff;border:none">&#128065; Preview</button>':'') +
      '</div>' +
    '</div>';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">';

    // FROM panel
    html += '<div class="panel"><div class="ph dark">From (Your Company)</div><div class="fb" style="gap:10px">' +
      '<div><label>Company Name</label><input id="qf-from-company" value="'+esc(fromSnap.company_name||'')+'" placeholder="Smart Success IT"></div>' +
      '<div><label>Address</label><textarea id="qf-from-addr" style="min-height:55px" placeholder="Company address">'+esc(fromSnap.address||'')+'</textarea></div>' +
      '<div class="mrow"><div><label>Phone</label><input id="qf-from-phone" value="'+esc(fromSnap.phone||'')+'" placeholder="+966..."></div>' +
        '<div><label>Email</label><input id="qf-from-email" value="'+esc(fromSnap.email||'')+'" placeholder="info@..."></div></div>' +
      '<div class="mrow"><div><label>Website</label><input id="qf-from-web" value="'+esc(fromSnap.website||'')+'" placeholder="www..."></div>' +
        '<div><label>VAT Number</label><input id="qf-from-vat" value="'+esc(fromSnap.vat_number||'')+'" placeholder="VAT#"></div></div>' +
    '</div></div>';

    // TO panel
    html += '<div class="panel"><div class="ph dark">To (Customer)</div><div class="fb" style="gap:10px">' +
      '<div><label>Select Customer</label>' +
        '<select id="qf-cust-sel" onchange="Quotations.fillCustomer(this.value)" style="padding:10px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:14px;width:100%">'+custOpts+'</select>' +
      '</div>' +
      '<div><label>Company Name *</label><input id="qf-to-company" value="'+esc(custSnap.company_name||'')+'" placeholder="Customer company"></div>' +
      '<div><label>Contact Person</label><input id="qf-to-contact" value="'+esc(custSnap.contact_name||'')+'" placeholder="Contact name"></div>' +
      '<div class="mrow"><div><label>Email</label><input id="qf-to-email" value="'+esc(custSnap.email||'')+'" placeholder="email@..."></div>' +
        '<div><label>Phone</label><input id="qf-to-phone" value="'+esc(custSnap.phone||'')+'" placeholder="+966..."></div></div>' +
      '<div><label>Address</label><textarea id="qf-to-addr" style="min-height:45px" placeholder="Customer address">'+esc(custSnap.address||'')+'</textarea></div>' +
      '<div class="mrow"><div><label>VAT Number</label><input id="qf-to-vat" value="'+esc(custSnap.vat_number||'')+'" placeholder="VAT#"></div>' +
        '<div style="text-align:right;padding-top:20px"><button onclick="Quotations.saveNewCustomer()" style="padding:8px 12px;border:1px solid var(--teal);border-radius:6px;background:transparent;color:var(--teal);cursor:pointer;font-size:12px">+ Save as Customer</button></div></div>' +
    '</div></div>';

    html += '</div>';

    // Quote details row
    html += '<div class="panel" style="margin-bottom:20px"><div class="ph dark">Quotation Details</div>' +
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px">' +
        '<div><label>Quote Date *</label><input type="date" id="qf-date" value="'+(q?q.quote_date:today)+'"></div>' +
        '<div><label>Expiry Date</label><input type="date" id="qf-expiry" value="'+expiry+'"></div>' +
        '<div><label>Currency</label><select id="qf-currency" style="padding:10px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);width:100%">'+
          ['SAR','USD','EUR','GBP','AED'].map(function(c){return '<option'+(currency===c?' selected':'')+'>'+c+'</option>';}).join('')+
        '</select></div>' +
        '<div><label>VAT %</label><input type="number" id="qf-vat" value="'+vatPct+'" step="0.01" min="0" max="100" oninput="Quotations.recalc()"></div>' +
      '</div>' +
    '</div>';

    // Items table
    html += '<div class="panel" style="margin-bottom:20px"><div class="ph dark" style="display:flex;justify-content:space-between;align-items:center">' +
      '<span>Line Items</span>' +
      '<button onclick="Quotations.addItemRow()" style="padding:4px 12px;border:1px solid rgba(255,255,255,.3);border-radius:4px;background:transparent;color:#fff;font-size:12px;cursor:pointer">+ Add Row</button>' +
    '</div>' +
    '<div style="overflow-x:auto"><table class="ltbl" id="qf-items-table">' +
      '<thead><tr>' +
        '<th style="min-width:300px">Description</th>' +
        '<th style="width:100px;text-align:right">Qty</th>' +
        '<th style="width:140px;text-align:right">Unit Price</th>' +
        '<th style="width:140px;text-align:right">Line Total</th>' +
        '<th style="width:40px"></th>' +
      '</tr></thead>' +
      '<tbody id="qf-items-body">';

    items.forEach(function(it, i) {
      html += itemRowHTML(i, it.description||'', it.quantity||1, it.unit_price||0, it.line_total||0);
    });
    html += '</tbody></table></div>';

    // Totals
    html += '<div style="display:flex;justify-content:flex-end;padding:16px"><div style="width:280px">' +
      '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bord)"><span style="color:var(--muted)">Subtotal</span><strong id="qf-subtotal">0.00</strong></div>' +
      '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bord)"><span style="color:var(--muted)">VAT (<span id="qf-vat-lbl">'+vatPct+'</span>%)</span><strong id="qf-vat-amt">0.00</strong></div>' +
      '<div style="display:flex;justify-content:space-between;padding:10px 0;font-size:18px"><span style="font-weight:700">Grand Total</span><strong id="qf-total" style="color:var(--teal)">0.00</strong></div>' +
    '</div></div></div>';

    // Notes & Footer
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">' +
      '<div class="panel"><div class="ph dark">Notes</div><div style="padding:12px"><textarea id="qf-notes" style="width:100%;min-height:80px;background:var(--surf2);border:1px solid var(--bord);border-radius:6px;color:var(--text);padding:10px;font-family:inherit" placeholder="Internal notes or special instructions...">'+esc(notes)+'</textarea></div></div>' +
      '<div class="panel"><div class="ph dark">Footer / Terms</div><div style="padding:12px"><textarea id="qf-footer" style="width:100%;min-height:80px;background:var(--surf2);border:1px solid var(--bord);border-radius:6px;color:var(--text);padding:10px;font-family:inherit" placeholder="Terms and conditions...">'+esc(footer)+'</textarea></div></div>' +
    '</div>';

    html += '<div style="display:flex;justify-content:flex-end;gap:10px;margin-bottom:40px">' +
      '<button onclick="Quotations.showList()" style="padding:12px 24px;border:1px solid var(--bord);border-radius:8px;background:var(--surf2);color:var(--text);cursor:pointer">Cancel</button>' +
      '<button onclick="Quotations.saveForm()" style="padding:12px 28px;border:none;border-radius:8px;background:#1e2d4a;color:#fff;font-size:15px;font-weight:700;cursor:pointer">&#128190; Save Quotation</button>' +
    '</div>';

    wrap.innerHTML = html;
    recalc();
    // Set customer select if editing
    if (q && q.customer_id) {
      var sel = el('qf-cust-sel'); if (sel) sel.value = q.customer_id;
    }
  }

  function itemRowHTML(i, desc, qty, price, total) {
    return '<tr id="qf-row-'+i+'">' +
      '<td><input type="text" value="'+esc(desc)+'" placeholder="Item description..." ' +
        'style="width:100%;background:var(--surf2);border:1px solid var(--bord);border-radius:4px;color:var(--text);padding:8px;font-family:inherit" ' +
        'oninput="Quotations.recalc()" class="qf-desc"></td>' +
      '<td><input type="number" value="'+qty+'" min="0" step="0.01" ' +
        'style="width:90px;background:var(--surf2);border:1px solid var(--bord);border-radius:4px;color:var(--text);padding:8px;text-align:right;font-family:inherit" ' +
        'oninput="Quotations.recalc()" class="qf-qty"></td>' +
      '<td><input type="number" value="'+price+'" min="0" step="0.01" ' +
        'style="width:130px;background:var(--surf2);border:1px solid var(--bord);border-radius:4px;color:var(--text);padding:8px;text-align:right;font-family:inherit" ' +
        'oninput="Quotations.recalc()" class="qf-price"></td>' +
      '<td style="text-align:right;font-weight:600;color:var(--text)" id="qf-lt-'+i+'">'+fmt(total)+'</td>' +
      '<td><button onclick="Quotations.removeRow('+i+')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;padding:4px 6px">&#10005;</button></td>' +
    '</tr>';
  }

  function addItemRow() {
    var tbody = el('qf-items-body'); if (!tbody) return;
    var i = tbody.rows.length;
    var tr = document.createElement('tr');
    tr.id = 'qf-row-'+i;
    tr.innerHTML = itemRowHTML(i,'',1,0,0).replace('<tr id="qf-row-'+i+'">','').replace('</tr>','');
    tbody.appendChild(tr);
  }

  function removeRow(i) {
    var row = el('qf-row-'+i); if (row) row.remove();
    recalc();
  }

  function recalc() {
    var tbody = el('qf-items-body'); if (!tbody) return;
    var rows  = tbody.querySelectorAll('tr');
    var sub   = 0;
    rows.forEach(function(row, i) {
      var qty   = parseFloat((row.querySelector('.qf-qty')   || {value:0}).value) || 0;
      var price = parseFloat((row.querySelector('.qf-price') || {value:0}).value) || 0;
      var lt    = Math.round(qty * price * 100) / 100;
      sub += lt;
      var ltEl = row.querySelector('[id^="qf-lt-"]');
      if (ltEl) ltEl.textContent = fmt(lt);
    });
    var vatPct = parseFloat((el('qf-vat')||{value:15}).value) || 0;
    var vatAmt = Math.round(sub * vatPct) / 100;
    var total  = sub + vatAmt;
    var vlbl = el('qf-vat-lbl'); if (vlbl) vlbl.textContent = vatPct;
    var sel = el('qf-subtotal'); if (sel) sel.textContent = fmt(sub);
    var vel = el('qf-vat-amt');  if (vel) vel.textContent = fmt(vatAmt);
    var tel = el('qf-total');    if (tel) tel.textContent = fmt(total);
  }

  function fillCustomer(id) {
    if (!id) return;
    var c = customers.find(function(x){return String(x.id)===String(id);}); if (!c) return;
    var sv = function(eid, val){ var e2=el(eid); if(e2)e2.value=val||''; };
    sv('qf-to-company', c.company_name);
    sv('qf-to-contact', c.contact_name);
    sv('qf-to-email',   c.email);
    sv('qf-to-phone',   c.phone);
    sv('qf-to-vat',     c.vat_number);
    var ta = el('qf-to-addr'); if(ta) ta.value = c.address||'';
  }

  async function saveNewCustomer() {
    var company = (el('qf-to-company')||{value:''}).value.trim();
    if (!company) return toast('Enter customer company name first', true);
    try {
      var c = await qtReq('POST','/customers',{
        company_name: company,
        contact_name: (el('qf-to-contact')||{value:''}).value,
        email:        (el('qf-to-email')||{value:''}).value,
        phone:        (el('qf-to-phone')||{value:''}).value,
        address:      (el('qf-to-addr')||{value:''}).value,
        vat_number:   (el('qf-to-vat')||{value:''}).value,
      });
      customers.push(c);
      // Add to dropdown
      var sel = el('qf-cust-sel');
      if (sel) {
        var opt = document.createElement('option');
        opt.value = c.id; opt.textContent = c.company_name; opt.selected = true;
        sel.appendChild(opt);
      }
      toast('Customer saved!');
    } catch(e) { toast(e.message, true); }
  }

  function collectFormData() {
    var tbody = el('qf-items-body');
    var rows  = tbody ? tbody.querySelectorAll('tr') : [];
    var items = [];
    var sub = 0;
    rows.forEach(function(row) {
      var desc  = (row.querySelector('.qf-desc') || {value:''}).value.trim();
      var qty   = parseFloat((row.querySelector('.qf-qty')  || {value:0}).value) || 0;
      var price = parseFloat((row.querySelector('.qf-price')|| {value:0}).value) || 0;
      var lt    = Math.round(qty * price * 100) / 100;
      sub += lt;
      if (desc || qty || price) items.push({description:desc, quantity:qty, unit_price:price, line_total:lt});
    });
    var vatPct = parseFloat((el('qf-vat')||{value:15}).value) || 0;
    var vatAmt = Math.round(sub * vatPct) / 100;
    var custId = (el('qf-cust-sel')||{value:''}).value;
    return {
      quote_date:    (el('qf-date')   ||{value:''}).value,
      expiry_date:   (el('qf-expiry') ||{value:''}).value || null,
      status:        (el('qf-status') ||{value:'Draft'}).value,
      customer_id:   custId ? parseInt(custId) : null,
      currency:      (el('qf-currency')||{value:'SAR'}).value,
      vat_pct:       vatPct,
      subtotal:      sub,
      vat_amount:    vatAmt,
      grand_total:   sub + vatAmt,
      notes:         (el('qf-notes')  ||{value:''}).value,
      footer_text:   (el('qf-footer') ||{value:''}).value,
      from_snap: {
        company_name: (el('qf-from-company')||{value:''}).value,
        address:      (el('qf-from-addr')   ||{value:''}).value,
        phone:        (el('qf-from-phone')  ||{value:''}).value,
        email:        (el('qf-from-email')  ||{value:''}).value,
        website:      (el('qf-from-web')    ||{value:''}).value,
        vat_number:   (el('qf-from-vat')    ||{value:''}).value,
      },
      customer_snap: {
        company_name: (el('qf-to-company')||{value:''}).value,
        contact_name: (el('qf-to-contact')||{value:''}).value,
        email:        (el('qf-to-email')  ||{value:''}).value,
        phone:        (el('qf-to-phone')  ||{value:''}).value,
        address:      (el('qf-to-addr')   ||{value:''}).value,
        vat_number:   (el('qf-to-vat')    ||{value:''}).value,
      },
      items: items,
    };
  }

  async function saveForm() {
    var data = collectFormData();
    if (!data.quote_date) return toast('Select a quotation date', true);
    if (!data.customer_snap.company_name) return toast('Enter customer company name', true);
    if (!data.items.length) return toast('Add at least one line item', true);
    try {
      var saved;
      if (editingId) {
        await qtReq('PUT', '/'+editingId, data);
        // Refresh local
        var updated = await qtReq('GET', '/'+editingId);
        var idx = quotations.findIndex(function(q){return q.id===editingId;});
        if (idx>=0) quotations[idx] = updated; else quotations.unshift(updated);
        toast('Quotation updated!');
        openPreview(editingId);
      } else {
        saved = await qtReq('POST', '/', data);
        quotations.unshift(saved);
        toast('Quotation created: '+saved.quote_number);
        openPreview(saved.id);
      }
    } catch(e) { toast(e.message, true); }
  }

  // ── PREVIEW / PDF ─────────────────────────────────────────────────────
  async function openPreview(id) {
    currentView = 'preview';
    wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:12px;color:var(--muted)"><span class="spinner"></span> Loading...</div>';
    var q;
    try { q = await qtReq('GET', '/'+id); } catch(e) { toast(e.message,true); showList(); return; }
    // Update local cache
    var idx = quotations.findIndex(function(x){return x.id===id;}); if(idx>=0) quotations[idx]=q;

    var cur  = q.currency || 'SAR';
    var sub  = parseFloat(q.subtotal||0);
    var vat  = parseFloat(q.vat_amount||0);
    var tot  = parseFloat(q.grand_total||0);
    var from = q.from_snap || {};
    var cust = q.customer_snap || {};
    var logo = settings.qt_logo_url||'';
    var sc   = STATUS_COLORS[q.status]||'#64748b';
    var today = new Date().toISOString().slice(0,10);
    var expired = q.expiry_date && q.expiry_date < today && q.status !== 'Approved';

    var html = '<div class="pg-hdr">' +
      '<div style="display:flex;align-items:center;gap:12px">' +
        '<button onclick="Quotations.showList()" style="background:none;border:1px solid var(--bord);border-radius:6px;padding:6px 12px;color:var(--text);cursor:pointer;font-size:13px">&#8592; Back</button>' +
        '<h2>'+q.quote_number+'</h2>' +
        '<span style="font-size:11px;padding:4px 12px;border-radius:12px;font-weight:700;background:'+sc+'22;color:'+sc+'">'+q.status+'</span>' +
        (expired?'<span style="font-size:11px;color:var(--red)">&#9888; Expired</span>':'') +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<select onchange="Quotations.changeStatus('+id+',this.value)" style="padding:6px 10px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:13px">' +
          STATUSES.map(function(s){return '<option'+(q.status===s?' selected':'')+'>'+s+'</option>';}).join('') +
        '</select>' +
        '<button onclick="Quotations.openForm('+id+')" class="act-btn" style="background:var(--surf2);color:var(--text);border:1px solid var(--bord)">Edit</button>' +
        '<button onclick="Quotations.duplicate('+id+')" class="act-btn" style="background:var(--surf2);color:var(--text);border:1px solid var(--bord)">Duplicate</button>' +
        '<button onclick="Quotations.printPDF('+id+')" class="act-btn" style="background:#1e2d4a;color:#fff;border:none">&#128196; PDF</button>' +
      '</div>' +
    '</div>';

    // Preview card
    html += '<div style="background:var(--surf);border:1px solid var(--bord);border-radius:12px;padding:40px;max-width:820px;margin:0 auto">';

    // Header row
    html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:3px solid #1e2d4a">';
    html += '<div>'+(logo?'<img src="'+logo+'" style="height:60px;margin-bottom:10px;display:block" alt="logo">':'')+'<div style="font-size:20px;font-weight:800;color:var(--text)">'+esc(from.company_name||'')+'</div>' +
      '<div style="font-size:12px;color:var(--muted);margin-top:6px;line-height:1.7">'+
        (from.address?'<div>'+esc(from.address)+'</div>':'')+
        (from.phone?'<div>Tel: '+esc(from.phone)+'</div>':'')+
        (from.email?'<div>'+esc(from.email)+'</div>':'')+
        (from.website?'<div>'+esc(from.website)+'</div>':'')+
        (from.vat_number?'<div>VAT: '+esc(from.vat_number)+'</div>':'')+
      '</div></div>';
    html += '<div style="text-align:right">' +
      '<div style="font-size:28px;font-weight:800;color:#1e2d4a;letter-spacing:-0.5px">QUOTATION</div>' +
      '<div style="font-size:15px;font-weight:700;color:#2abfbf;margin-top:4px">'+q.quote_number+'</div>' +
      '<div style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.8">'+
        '<div>Date: <strong>'+fmtD(q.quote_date)+'</strong></div>'+
        (q.expiry_date?'<div>Expires: <strong style="color:'+(expired?'var(--red)':'inherit')+'">'+fmtD(q.expiry_date)+'</strong></div>':'')+
        '<div>Currency: <strong>'+cur+'</strong></div>'+
      '</div></div>';
    html += '</div>';

    // Bill to
    html += '<div style="margin-bottom:28px"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:8px">Bill To</div>' +
      '<div style="font-size:16px;font-weight:700;color:var(--text)">'+esc(cust.company_name||'')+'</div>' +
      '<div style="font-size:13px;color:var(--muted);line-height:1.7;margin-top:4px">'+
        (cust.contact_name?'<div>Attn: '+esc(cust.contact_name)+'</div>':'')+
        (cust.address?'<div>'+esc(cust.address)+'</div>':'')+
        (cust.phone?'<div>'+esc(cust.phone)+'</div>':'')+
        (cust.email?'<div>'+esc(cust.email)+'</div>':'')+
        (cust.vat_number?'<div>VAT: '+esc(cust.vat_number)+'</div>':'')+
      '</div></div>';

    // Items table
    html += '<table style="width:100%;border-collapse:collapse;margin-bottom:24px">' +
      '<thead><tr style="background:#1e2d4a;color:#fff">' +
        '<th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600">#</th>' +
        '<th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600">Description</th>' +
        '<th style="padding:10px 14px;text-align:right;font-size:12px;font-weight:600">Qty</th>' +
        '<th style="padding:10px 14px;text-align:right;font-size:12px;font-weight:600">Unit Price</th>' +
        '<th style="padding:10px 14px;text-align:right;font-size:12px;font-weight:600">Total</th>' +
      '</tr></thead><tbody>';
    (q.items||[]).forEach(function(it, i) {
      html += '<tr style="background:'+(i%2===0?'transparent':'rgba(0,0,0,.02)')+';border-bottom:1px solid var(--bord)">' +
        '<td style="padding:10px 14px;font-size:12px;color:var(--muted)">'+(i+1)+'</td>' +
        '<td style="padding:10px 14px;font-size:13px">'+esc(it.description||'')+'</td>' +
        '<td style="padding:10px 14px;text-align:right;font-size:13px">'+parseFloat(it.quantity||0)+'</td>' +
        '<td style="padding:10px 14px;text-align:right;font-size:13px">'+cur+' '+fmt(it.unit_price||0)+'</td>' +
        '<td style="padding:10px 14px;text-align:right;font-size:13px;font-weight:600">'+cur+' '+fmt(it.line_total||0)+'</td>' +
      '</tr>';
    });
    html += '</tbody></table>';

    // Totals
    html += '<div style="display:flex;justify-content:flex-end;margin-bottom:24px"><div style="width:280px">' +
      '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--bord)"><span style="color:var(--muted)">Subtotal</span><span style="font-weight:600">'+cur+' '+fmt(sub)+'</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--bord)"><span style="color:var(--muted)">VAT ('+parseFloat(q.vat_pct||15)+'%)</span><span style="font-weight:600">'+cur+' '+fmt(vat)+'</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:12px 0;font-size:17px"><span style="font-weight:700">Grand Total</span><span style="font-weight:800;color:#2abfbf">'+cur+' '+fmt(tot)+'</span></div>' +
    '</div></div>';

    if (q.notes) html += '<div style="margin-bottom:16px;padding:14px;background:var(--surf2);border-radius:8px;border-left:4px solid var(--teal)"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:6px">Notes</div><div style="font-size:13px">'+esc(q.notes)+'</div></div>';
    if (q.footer_text) html += '<div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--bord);font-size:12px;color:var(--muted)">'+esc(q.footer_text)+'</div>';

    html += '</div>';
    wrap.innerHTML = html;
  }

  async function changeStatus(id, status) {
    try {
      await qtReq('PATCH', '/'+id+'/status', {status:status});
      var q = quotations.find(function(x){return x.id===id;}); if(q) q.status=status;
      openPreview(id);
      toast('Status updated to '+status);
    } catch(e){toast(e.message,true);}
  }

  async function duplicate(id) {
    try {
      var r = await qtReq('POST', '/'+id+'/duplicate', {});
      var fresh = await qtReq('GET', '/'+r.id);
      quotations.unshift(fresh);
      toast('Duplicated as '+r.quote_number);
      openPreview(r.id);
    } catch(e){toast(e.message,true);}
  }

  async function deleteQ(id) {
    if (!confirm('Delete this quotation?')) return;
    try {
      await qtReq('DELETE', '/'+id, {});
      quotations = quotations.filter(function(q){return q.id!==id;});
      showList(); toast('Deleted');
    } catch(e){toast(e.message,true);}
  }

  function printPDF(id) {
    var q = quotations.find(function(x){return x.id===id;});
    if (!q) { toast('Load the preview first',true); return; }
    // Get full data from current preview or fetch
    qtReq('GET','/'+id).then(function(full){
      openPDFWindow(full);
    }).catch(function(e){toast(e.message,true);});
  }

  function openPDFWindow(q) {
    var cur  = q.currency||'SAR';
    var sub  = parseFloat(q.subtotal||0);
    var vat  = parseFloat(q.vat_amount||0);
    var tot  = parseFloat(q.grand_total||0);
    var from = q.from_snap||{};
    var cust = q.customer_snap||{};
    var logo = settings.qt_logo_url||'';

    var itemRows = (q.items||[]).map(function(it,i){
      return '<tr style="background:'+(i%2===0?'#fff':'#f9fafb')+'">' +
        '<td style="padding:9px 12px;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6">'+(i+1)+'</td>' +
        '<td style="padding:9px 12px;font-size:13px;border-bottom:1px solid #f3f4f6">'+esc(it.description||'')+'</td>' +
        '<td style="padding:9px 12px;text-align:right;font-size:13px;border-bottom:1px solid #f3f4f6">'+parseFloat(it.quantity||0)+'</td>' +
        '<td style="padding:9px 12px;text-align:right;font-size:13px;border-bottom:1px solid #f3f4f6">'+cur+' '+fmt(it.unit_price||0)+'</td>' +
        '<td style="padding:9px 12px;text-align:right;font-size:13px;font-weight:600;border-bottom:1px solid #f3f4f6">'+cur+' '+fmt(it.line_total||0)+'</td>' +
      '</tr>';
    }).join('');

    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+q.quote_number+'</title>' +
    '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;color:#111;background:#fff}' +
    '.page{width:210mm;min-height:297mm;padding:20mm;margin:0 auto;background:#fff}' +
    '@media print{.no-print{display:none!important}.page{padding:15mm;width:100%}@page{size:A4;margin:0}}' +
    'table{width:100%;border-collapse:collapse}' +
    '</style></head><body>' +
    '<div class="no-print" style="background:#1e2d4a;padding:12px 20px;display:flex;align-items:center;justify-content:space-between">' +
      '<span style="color:#fff;font-weight:600">'+q.quote_number+'</span>' +
      '<button onclick="window.print()" style="padding:8px 20px;background:#2abfbf;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer">&#128424; Print / Save PDF</button>' +
    '</div>' +
    '<div class="page">' +

    // Header
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #1e2d4a">' +
    '<div>'+(logo?'<img src="'+logo+'" style="height:55px;margin-bottom:8px;display:block">':'')+
      '<div style="font-size:18px;font-weight:800;color:#1e2d4a">'+esc(from.company_name||'')+'</div>' +
      '<div style="font-size:11px;color:#6b7280;margin-top:5px;line-height:1.8">'+
        (from.address?from.address+'<br>':'')+
        (from.phone?'Tel: '+from.phone+'<br>':'')+
        (from.email?from.email+'<br>':'')+
        (from.vat_number?'VAT: '+from.vat_number:'')+
      '</div></div>' +
    '<div style="text-align:right">' +
      '<div style="font-size:26px;font-weight:800;color:#1e2d4a;letter-spacing:-0.5px">QUOTATION</div>' +
      '<div style="font-size:15px;font-weight:700;color:#2abfbf;margin-top:3px">'+q.quote_number+'</div>' +
      '<div style="font-size:11px;color:#6b7280;margin-top:8px;line-height:1.8">'+
        'Date: <strong>'+fmtD(q.quote_date)+'</strong><br>'+
        (q.expiry_date?'Expires: <strong>'+fmtD(q.expiry_date)+'</strong><br>':'')+
        'Currency: <strong>'+cur+'</strong>'+
      '</div></div>' +
    '</div>' +

    // Bill to
    '<div style="margin-bottom:24px;padding:14px;background:#f8fafc;border-radius:6px">' +
    '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:6px">Bill To</div>' +
    '<div style="font-size:15px;font-weight:700;color:#1e2d4a">'+esc(cust.company_name||'')+'</div>' +
    '<div style="font-size:12px;color:#6b7280;margin-top:4px;line-height:1.7">'+
      (cust.contact_name?'Attn: '+esc(cust.contact_name)+'<br>':'')+
      (cust.address?esc(cust.address)+'<br>':'')+
      (cust.phone?esc(cust.phone)+'<br>':'')+
      (cust.email?esc(cust.email)+'<br>':'')+
      (cust.vat_number?'VAT: '+esc(cust.vat_number):'')+
    '</div></div>' +

    // Items
    '<table style="margin-bottom:20px">' +
    '<thead><tr style="background:#1e2d4a;color:#fff">' +
      '<th style="padding:10px 12px;text-align:left;font-size:11px;width:30px">#</th>' +
      '<th style="padding:10px 12px;text-align:left;font-size:11px">Description</th>' +
      '<th style="padding:10px 12px;text-align:right;font-size:11px;width:60px">Qty</th>' +
      '<th style="padding:10px 12px;text-align:right;font-size:11px;width:120px">Unit Price</th>' +
      '<th style="padding:10px 12px;text-align:right;font-size:11px;width:120px">Total</th>' +
    '</tr></thead><tbody>'+itemRows+'</tbody></table>' +

    // Totals
    '<div style="display:flex;justify-content:flex-end;margin-bottom:20px">' +
    '<div style="width:260px">' +
      '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e5e7eb"><span style="color:#6b7280;font-size:12px">Subtotal</span><span style="font-weight:600;font-size:13px">'+cur+' '+fmt(sub)+'</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e5e7eb"><span style="color:#6b7280;font-size:12px">VAT ('+parseFloat(q.vat_pct||15)+'%)</span><span style="font-weight:600;font-size:13px">'+cur+' '+fmt(vat)+'</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:10px 0;background:#1e2d4a;color:#fff;margin-top:4px;padding:10px 12px;border-radius:4px"><span style="font-weight:700;font-size:14px">Grand Total</span><span style="font-weight:800;font-size:16px;color:#2abfbf">'+cur+' '+fmt(tot)+'</span></div>' +
    '</div></div>' +

    (q.notes?'<div style="margin-bottom:14px;padding:12px;background:#f8fafc;border-radius:6px;border-left:4px solid #2abfbf"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:5px">Notes</div><div style="font-size:12px">'+esc(q.notes)+'</div></div>':'')+

    // Footer
    '<div style="margin-top:auto;padding-top:20px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280">'+
      (q.footer_text?'<p style="margin-bottom:8px">'+esc(q.footer_text)+'</p>':'')+
      '<div style="display:flex;justify-content:space-between;margin-top:12px">' +
        '<span>'+esc(from.company_name||'')+'</span>' +
        '<span>'+q.quote_number+'</span>' +
      '</div>' +
    '</div>' +

    '</div></body></html>';

    var w = window.open('','_blank','width=900,height=700');
    w.document.write(html);
    w.document.close();
  }

  // ── CUSTOMERS MODAL ───────────────────────────────────────────────────
  function openCustomers() {
    var modal = el('qt-cust-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'overlay'; modal.id = 'qt-cust-modal';
      document.body.appendChild(modal);
    }
    renderCustomerModal(modal);
    openModal('qt-cust-modal');
  }

  function renderCustomerModal(modal) {
    modal.innerHTML = '<div class="modal" style="max-width:600px">' +
      '<h3>&#128101; Customer Records</h3>' +
      '<div style="margin:12px 0;display:flex;gap:8px">' +
        '<input type="text" id="qt-cust-srch" placeholder="Search customers..." oninput="Quotations.searchCust(this.value)" style="flex:1;padding:8px 12px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text)">' +
        '<button onclick="Quotations.addCustForm()" style="padding:8px 14px;border:none;border-radius:6px;background:#1e2d4a;color:#fff;cursor:pointer;white-space:nowrap">+ Add New</button>' +
      '</div>' +
      '<div id="qt-cust-list" style="max-height:400px;overflow-y:auto">' +
        renderCustList(customers) +
      '</div>' +
      '<div class="mact"><button class="btn-c" onclick="closeModal(\'qt-cust-modal\')">Close</button></div>' +
    '</div>';
  }

  function renderCustList(list) {
    if (!list.length) return '<div class="empty">No customers yet.</div>';
    return '<table class="ltbl"><thead><tr><th>Company</th><th>Contact</th><th>Email</th><th>Phone</th><th></th></tr></thead><tbody>' +
      list.map(function(c){
        return '<tr>' +
          '<td style="font-weight:600">'+esc(c.company_name)+'</td>' +
          '<td style="font-size:12px;color:var(--muted)">'+esc(c.contact_name||'')+'</td>' +
          '<td style="font-size:12px;color:var(--muted)">'+esc(c.email||'')+'</td>' +
          '<td style="font-size:12px;color:var(--muted)">'+esc(c.phone||'')+'</td>' +
          '<td><button onclick="Quotations.deleteCust('+c.id+')" class="del-btn">&#10005;</button></td>' +
        '</tr>';
      }).join('') +
    '</tbody></table>';
  }

  function searchCust(q) {
    var filtered = q ? customers.filter(function(c){
      return c.company_name.toLowerCase().includes(q.toLowerCase()) ||
             (c.contact_name||'').toLowerCase().includes(q.toLowerCase());
    }) : customers;
    var list = el('qt-cust-list'); if(list) list.innerHTML = renderCustList(filtered);
  }

  async function deleteCust(id) {
    if(!confirm('Delete this customer?'))return;
    try {
      await qtReq('DELETE','/customers/'+id,{});
      customers = customers.filter(function(c){return c.id!==id;});
      var modal = el('qt-cust-modal'); if(modal) renderCustomerModal(modal);
      toast('Customer deleted');
    } catch(e){toast(e.message,true);}
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function fmtD(d) {
    if (!d) return '';
    var dt = new Date(String(d).slice(0,10)+'T00:00:00');
    if (isNaN(dt)) return d;
    return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()]+' '+
           dt.getDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]+' '+dt.getFullYear();
  }

  return {
    render:          render,
    showList:        showList,
    openForm:        openForm,
    openPreview:     openPreview,
    openCustomers:   openCustomers,
    setFilter:       setFilter,
    clearFilters:    clearFilters,
    addItemRow:      addItemRow,
    removeRow:       removeRow,
    recalc:          recalc,
    fillCustomer:    fillCustomer,
    saveNewCustomer: saveNewCustomer,
    saveForm:        saveForm,
    changeStatus:    changeStatus,
    duplicate:       duplicate,
    deleteQ:         deleteQ,
    printPDF:        printPDF,
    searchCust:      searchCust,
    deleteCust:      deleteCust,
  };
})();
