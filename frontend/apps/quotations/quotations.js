/** Quotation Management v2 — Bilingual, QR Code, Multi-Company */
window.Quotations = (function() {
  var quotations = [], customers = [], companies = [], settings = {}, wrap;
  var currentView = 'list';
  var editingId   = null;
  var filterStatus = '', filterQ = '', filterFrom = '', filterTo = '';
  var STATUSES = ['Draft','Sent','Approved','Rejected','Expired'];
  var STATUS_COLORS = {Draft:'#64748b',Sent:'#2abfbf',Approved:'#16a34a',Rejected:'#dc2626',Expired:'#f59e0b'};

  function qtReq(method, path, body) { return API.req(method, '/quotations' + path, body); }

  async function render(container) {
    wrap = container;
    wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:12px;color:var(--muted)"><span class="spinner"></span> Loading...</div>';
    try {
      var r = await Promise.all([qtReq('GET','/'), qtReq('GET','/customers'), qtReq('GET','/settings'), qtReq('GET','/companies')]);
      quotations = r[0]||[]; customers = r[1]||[]; settings = r[2]||{}; companies = r[3]||[];
    } catch(e) { quotations=[]; customers=[]; settings={}; companies=[]; }
    showList();
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────
  function showList() {
    currentView = 'list'; editingId = null;
    var filtered = quotations.filter(function(q) {
      if (filterStatus && q.status !== filterStatus) return false;
      if (filterQ) {
        var qs = filterQ.toLowerCase();
        var cn = (q.customer_snap && q.customer_snap.company_name) ? q.customer_snap.company_name.toLowerCase() : '';
        if (!q.quote_number.toLowerCase().includes(qs) && !cn.includes(qs)) return false;
      }
      if (filterFrom && q.quote_date < filterFrom) return false;
      if (filterTo   && q.quote_date > filterTo)   return false;
      return true;
    });

    var approved = quotations.filter(function(q){return q.status==='Approved';});
    var totalVal = approved.reduce(function(s,q){return s+parseFloat(q.grand_total||0);},0);

    var html = '<div class="pg-hdr"><h2>&#128206; Quotations</h2>' +
      '<div style="display:flex;gap:8px">' +
        '<button onclick="Quotations.openCompanies()" style="padding:8px 14px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);cursor:pointer;font-size:13px">&#127970; Companies</button>' +
        '<button onclick="Quotations.openCustomers()" style="padding:8px 14px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);cursor:pointer;font-size:13px">&#128101; Customers</button>' +
        '<button onclick="Quotations.openForm()" style="padding:8px 16px;border:none;border-radius:6px;background:#1e2d4a;color:#fff;cursor:pointer;font-size:13px;font-weight:700">+ New Quotation</button>' +
      '</div></div>';

    html += '<div class="cards" style="margin-bottom:20px">' +
      '<div class="card"><div class="cl">Total</div><div class="cv" style="color:var(--teal)">'+quotations.length+'</div></div>' +
      '<div class="card grn"><div class="cl">Approved</div><div class="cv">'+approved.length+'</div></div>' +
      '<div class="card tel"><div class="cl">Sent</div><div class="cv">'+quotations.filter(function(q){return q.status==='Sent';}).length+'</div></div>' +
      '<div class="card"><div class="cl">Approved Value</div><div class="cv" style="color:var(--green)">SAR '+fmt(totalVal)+'</div></div>' +
    '</div>';

    html += '<div class="panel">' +
      '<div class="ph dark" style="display:flex;justify-content:space-between;align-items:center"><span>All Quotations ('+filtered.length+')</span></div>' +
      '<div class="lctrl" style="flex-wrap:wrap;gap:8px">' +
        '<input class="srch" type="text" id="qt-srch" placeholder="Search number or customer..." value="'+filterQ+'" oninput="Quotations.setFilter(\'q\',this.value)">' +
        '<select onchange="Quotations.setFilter(\'status\',this.value)" style="padding:5px 10px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--text);font-size:12px">' +
          '<option value="">All Statuses</option>' +
          STATUSES.map(function(s){return '<option value="'+s+'"'+(filterStatus===s?' selected':'')+'>'+s+'</option>';}).join('') +
        '</select>' +
        '<input type="date" value="'+filterFrom+'" onchange="Quotations.setFilter(\'from\',this.value)" style="padding:5px 8px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--text);font-size:12px">' +
        '<input type="date" value="'+filterTo+'"   onchange="Quotations.setFilter(\'to\',this.value)"   style="padding:5px 8px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--text);font-size:12px">' +
        '<button onclick="Quotations.clearFilters()" style="padding:5px 10px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--muted);font-size:12px;cursor:pointer">Clear</button>' +
      '</div>';

    if (!filtered.length) {
      html += '<div class="empty" style="padding:40px">No quotations found.</div>';
    } else {
      html += '<div class="sw"><table class="ltbl"><thead><tr>' +
        '<th>Quote #</th><th>Date</th><th>Expires</th><th>Customer</th><th style="text-align:right">Total</th><th>Status</th><th>By</th><th>Actions</th></tr></thead><tbody>';
      filtered.forEach(function(q) {
        var cn = (q.customer_snap && q.customer_snap.company_name) ? q.customer_snap.company_name : '—';
        var sc = STATUS_COLORS[q.status]||'#64748b';
        var today = new Date().toISOString().slice(0,10);
        var exp   = q.expiry_date && q.expiry_date < today && q.status !== 'Approved';
        html += '<tr>' +
          '<td style="font-weight:700;color:var(--teal);cursor:pointer" onclick="Quotations.openPreview('+q.id+')">'+q.quote_number+'</td>' +
          '<td style="font-size:12px;color:var(--muted)">'+fmtD(q.quote_date)+'</td>' +
          '<td style="font-size:12px;color:'+(exp?'var(--red)':'var(--muted)')+'">'+( q.expiry_date?fmtD(q.expiry_date)+(exp?' ⚠':''):'—')+'</td>' +
          '<td style="font-weight:500">'+cn+'</td>' +
          '<td style="text-align:right;font-weight:700">'+(settings.qt_currency||'SAR')+' '+fmt(q.grand_total)+'</td>' +
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
    if(key==='q')filterQ=val; if(key==='status')filterStatus=val;
    if(key==='from')filterFrom=val; if(key==='to')filterTo=val;
    showList();
  }
  function clearFilters(){ filterQ=''; filterStatus=''; filterFrom=''; filterTo=''; showList(); }

  // ── FORM VIEW ─────────────────────────────────────────────────────────
  async function openForm(id) {
    currentView='form'; editingId=id||null;
    wrap.innerHTML='<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:12px;color:var(--muted)"><span class="spinner"></span> Loading...</div>';
    var q = null;
    if (id) { try { q = await qtReq('GET','/'+id); } catch(e){} }

    var defaultComp = companies.find(function(c){return c.is_default;})||companies[0]||{};
    var fromSnap = (q&&q.from_snap) ? q.from_snap : {
      company_id:'', name:defaultComp.name||'', name_ar:defaultComp.name_ar||'',
      address:defaultComp.address||'', address_ar:defaultComp.address_ar||'',
      phone:defaultComp.phone||'', email:defaultComp.email||'',
      website:defaultComp.website||'', vat_number:defaultComp.vat_number||'',
      logo_url:defaultComp.logo_url||''
    };
    var custSnap = (q&&q.customer_snap)||{};
    var items    = (q&&q.items&&q.items.length)?q.items:[{description:'',quantity:1,unit_price:0,line_total:0}];
    var today    = new Date().toISOString().slice(0,10);
    var vatPct   = q?parseFloat(q.vat_pct||15):parseFloat(settings.qt_vat_pct||15);
    var status   = q?q.status:'Draft';
    var bilingual= q?(q.bilingual||0):0;
    var currency = q?(q.currency||settings.qt_currency||'SAR'):(settings.qt_currency||'SAR');

    // Company dropdown options
    var compOpts = '<option value="">-- Select Company --</option>' +
      companies.map(function(c){
        return '<option value="'+c.id+'"'+(String(fromSnap.company_id)===String(c.id)?' selected':'')+'>'+c.name+(c.is_default?' (Default)':'')+'</option>';
      }).join('');
    var custOpts = '<option value="">-- Select or type --</option>' +
      customers.map(function(c){return '<option value="'+c.id+'">'+c.company_name+(c.contact_name?' | '+c.contact_name:'')+'</option>';}).join('');
    var statusOpts = STATUSES.map(function(s){return '<option'+(status===s?' selected':'')+'>'+s+'</option>';}).join('');
    var currOpts  = ['SAR','USD','EUR','GBP','AED'].map(function(c){return '<option'+(currency===c?' selected':'')+'>'+c+'</option>';}).join('');

    var html = '<div class="pg-hdr">' +
      '<div style="display:flex;align-items:center;gap:12px">' +
        '<button onclick="Quotations.showList()" style="background:none;border:1px solid var(--bord);border-radius:6px;padding:6px 12px;color:var(--text);cursor:pointer">&#8592; Back</button>' +
        '<h2>'+(id?'Edit Quotation':'New Quotation')+'</h2>' +
      '</div>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
        '<label style="font-size:12px;color:var(--muted);display:flex;align-items:center;gap:6px">' +
          '<input type="checkbox" id="qf-bilingual"'+(bilingual?' checked':'')+' style="width:auto"> &#127758; Bilingual (EN+AR)' +
        '</label>' +
        '<select id="qf-status" style="padding:8px 12px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text)">'+statusOpts+'</select>' +
        '<button onclick="Quotations.saveForm()" style="padding:8px 18px;border:none;border-radius:6px;background:#1e2d4a;color:#fff;font-weight:700;cursor:pointer">&#128190; Save</button>' +
        (id?'<button onclick="Quotations.openPreview('+id+')" style="padding:8px 18px;border:none;border-radius:6px;background:#2abfbf;color:#fff;cursor:pointer">&#128065; Preview</button>':'') +
      '</div></div>';

    // Quote details bar
    html += '<div class="panel" style="margin-bottom:16px"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px">' +
      '<div><label>Quote Date *</label><input type="date" id="qf-date" value="'+(q?q.quote_date:today)+'"></div>' +
      '<div><label>Expiry Date</label><input type="date" id="qf-expiry" value="'+(q&&q.expiry_date?q.expiry_date:'')+'"></div>' +
      '<div><label>Currency</label><select id="qf-currency" style="padding:10px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);width:100%">'+currOpts+'</select></div>' +
      '<div><label>VAT %</label><input type="number" id="qf-vat" value="'+vatPct+'" step="0.01" min="0" max="100" oninput="Quotations.recalc()"></div>' +
    '</div></div>';

    // FROM / TO panels
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">';

    // FROM panel
    html += '<div class="panel"><div class="ph dark">From (Your Company)</div><div class="fb" style="gap:10px">' +
      '<div><label>Select Company Profile</label>' +
        '<select id="qf-comp-sel" onchange="Quotations.fillCompany(this.value)" style="padding:10px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:14px;width:100%">'+compOpts+'</select>' +
      '</div>' +
      '<div class="mrow"><div><label>Name (EN)</label><input id="qf-from-name" value="'+esc(fromSnap.name||'')+'"></div>' +
        '<div><label>&#1575;&#1604;&#1575;&#1587;&#1605; (AR)</label><input id="qf-from-name-ar" value="'+esc(fromSnap.name_ar||'')+'" dir="rtl" style="text-align:right"></div></div>' +
      '<div><label>Address (EN)</label><textarea id="qf-from-addr" style="min-height:45px">'+esc(fromSnap.address||'')+'</textarea></div>' +
      '<div><label>&#1575;&#1604;&#1593;&#1606;&#1608;&#1575;&#1606; (AR)</label><textarea id="qf-from-addr-ar" style="min-height:45px" dir="rtl">'+esc(fromSnap.address_ar||'')+'</textarea></div>' +
      '<div class="mrow"><div><label>Phone</label><input id="qf-from-phone" value="'+esc(fromSnap.phone||'')+'"></div>' +
        '<div><label>Email</label><input id="qf-from-email" value="'+esc(fromSnap.email||'')+'"></div></div>' +
      '<div class="mrow"><div><label>Website</label><input id="qf-from-web" value="'+esc(fromSnap.website||'')+'"></div>' +
        '<div><label>VAT No.</label><input id="qf-from-vat" value="'+esc(fromSnap.vat_number||'')+'"></div></div>' +
      '<div><label>Logo URL</label><input id="qf-from-logo" value="'+esc(fromSnap.logo_url||'')+'" placeholder="https://..."></div>' +
    '</div></div>';

    // TO panel
    html += '<div class="panel"><div class="ph dark">To (Customer)</div><div class="fb" style="gap:10px">' +
      '<div><label>Select Customer</label>' +
        '<select id="qf-cust-sel" onchange="Quotations.fillCustomer(this.value)" style="padding:10px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:14px;width:100%">'+custOpts+'</select>' +
      '</div>' +
      '<div><label>Company Name *</label><input id="qf-to-company" value="'+esc(custSnap.company_name||'')+'" placeholder="Customer company"></div>' +
      '<div><label>Contact Person</label><input id="qf-to-contact" value="'+esc(custSnap.contact_name||'')+'"></div>' +
      '<div class="mrow"><div><label>Email</label><input id="qf-to-email" value="'+esc(custSnap.email||'')+'"></div>' +
        '<div><label>Phone</label><input id="qf-to-phone" value="'+esc(custSnap.phone||'')+'"></div></div>' +
      '<div><label>Address</label><textarea id="qf-to-addr" style="min-height:45px">'+esc(custSnap.address||'')+'</textarea></div>' +
      '<div><label>VAT No.</label><input id="qf-to-vat" value="'+esc(custSnap.vat_number||'')+'"></div>' +
      '<div style="text-align:right"><button onclick="Quotations.saveNewCustomer()" style="padding:7px 14px;border:1px solid var(--teal);border-radius:6px;background:transparent;color:var(--teal);cursor:pointer;font-size:12px">+ Save as Customer</button></div>' +
    '</div></div>';

    html += '</div>';

    // Items
    html += '<div class="panel" style="margin-bottom:16px">' +
      '<div class="ph dark" style="display:flex;justify-content:space-between;align-items:center"><span>Line Items</span>' +
        '<button onclick="Quotations.addItemRow()" style="padding:4px 12px;border:1px solid rgba(255,255,255,.3);border-radius:4px;background:transparent;color:#fff;font-size:12px;cursor:pointer">+ Add Row</button>' +
      '</div>' +
      '<div style="overflow-x:auto"><table class="ltbl"><thead><tr>' +
        '<th style="min-width:280px">Description (EN)</th>' +
        '<th style="min-width:200px">Description (AR) &#1575;&#1604;&#1608;&#1589;&#1601;</th>' +
        '<th style="width:90px;text-align:right">Qty</th>' +
        '<th style="width:130px;text-align:right">Unit Price</th>' +
        '<th style="width:130px;text-align:right">Line Total</th>' +
        '<th style="width:36px"></th>' +
      '</tr></thead><tbody id="qf-items-body">';

    items.forEach(function(it, i) {
      html += itemRowHTML(i, it.description||'', it.description_ar||'', it.quantity||1, it.unit_price||0, it.line_total||0);
    });
    html += '</tbody></table></div>';

    html += '<div style="display:flex;justify-content:flex-end;padding:16px"><div style="width:280px">' +
      '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bord)"><span style="color:var(--muted)">Subtotal</span><strong id="qf-subtotal">0.00</strong></div>' +
      '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bord)"><span style="color:var(--muted)">VAT (<span id="qf-vat-lbl">'+vatPct+'</span>%)</span><strong id="qf-vat-amt">0.00</strong></div>' +
      '<div style="display:flex;justify-content:space-between;padding:10px 0;font-size:18px"><span style="font-weight:700">Grand Total</span><strong id="qf-total" style="color:var(--teal)">0.00</strong></div>' +
    '</div></div></div>';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">' +
      '<div class="panel"><div class="ph dark">Notes</div><div style="padding:12px"><textarea id="qf-notes" style="width:100%;min-height:70px;background:var(--surf2);border:1px solid var(--bord);border-radius:6px;color:var(--text);padding:10px;font-family:inherit" placeholder="Notes...">'+esc(q?q.notes||'':'')+'</textarea></div></div>' +
      '<div class="panel"><div class="ph dark">Footer / Terms</div><div style="padding:12px"><textarea id="qf-footer" style="width:100%;min-height:70px;background:var(--surf2);border:1px solid var(--bord);border-radius:6px;color:var(--text);padding:10px;font-family:inherit">'+esc(q?q.footer_text||(settings.qt_footer||''):(settings.qt_footer||''))+'</textarea></div></div>' +
    '</div>';

    html += '<div style="display:flex;justify-content:flex-end;gap:10px;margin-bottom:40px">' +
      '<button onclick="Quotations.showList()" style="padding:12px 24px;border:1px solid var(--bord);border-radius:8px;background:var(--surf2);color:var(--text);cursor:pointer">Cancel</button>' +
      '<button onclick="Quotations.saveForm()" style="padding:12px 28px;border:none;border-radius:8px;background:#1e2d4a;color:#fff;font-size:15px;font-weight:700;cursor:pointer">&#128190; Save Quotation</button>' +
    '</div>';

    wrap.innerHTML = html;
    recalc();
    if (q && q.customer_id) { var s=el('qf-cust-sel');if(s)s.value=q.customer_id; }
    if (fromSnap.company_id) { var s2=el('qf-comp-sel');if(s2)s2.value=fromSnap.company_id; }
  }

  function itemRowHTML(i, desc, descAr, qty, price, total) {
    var inp = function(cls, val, align, placeholder) {
      return '<input type="'+(cls==='qf-qty'||cls==='qf-price'?'number':'text')+'" value="'+esc(String(val))+'" ' +
        (cls==='qf-qty'||cls==='qf-price'?'min="0" step="0.01" ':'') +
        'placeholder="'+(placeholder||'')+'" ' +
        'style="width:100%;background:var(--surf2);border:1px solid var(--bord);border-radius:4px;color:var(--text);padding:7px;font-family:inherit;'+(align?'text-align:right;':'')+'" ' +
        'oninput="Quotations.recalc()" class="'+cls+'">';
    };
    return '<tr id="qf-row-'+i+'">' +
      '<td>'+inp('qf-desc',desc,false,'Item description...')+'</td>' +
      '<td>'+inp('qf-desc-ar',descAr,true,'الوصف بالعربية')+' '+
        '</td>' +
      '<td>'+inp('qf-qty',qty,true,'')+'</td>' +
      '<td>'+inp('qf-price',price,true,'')+'</td>' +
      '<td style="text-align:right;font-weight:600;padding:0 8px" id="qf-lt-'+i+'">'+fmt(total)+'</td>' +
      '<td><button onclick="Quotations.removeRow('+i+')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;padding:4px">&#10005;</button></td>' +
    '</tr>';
  }

  function addItemRow() {
    var tbody=el('qf-items-body');if(!tbody)return;
    var i=tbody.rows.length;
    var tr=document.createElement('tr');tr.id='qf-row-'+i;
    tr.innerHTML=itemRowHTML(i,'','',1,0,0).replace('<tr id="qf-row-'+i+'">','').replace('</tr>','');
    tbody.appendChild(tr);
  }
  function removeRow(i){var r=el('qf-row-'+i);if(r)r.remove();recalc();}

  function recalc() {
    var tbody=el('qf-items-body');if(!tbody)return;
    var sub=0;
    Array.from(tbody.querySelectorAll('tr')).forEach(function(row,i){
      var qty  =parseFloat((row.querySelector('.qf-qty')  ||{value:0}).value)||0;
      var price=parseFloat((row.querySelector('.qf-price')||{value:0}).value)||0;
      var lt   =Math.round(qty*price*100)/100;
      sub+=lt;
      var lte=row.querySelector('[id^="qf-lt-"]');if(lte)lte.textContent=fmt(lt);
    });
    var vp=parseFloat((el('qf-vat')||{value:15}).value)||0;
    var va=Math.round(sub*vp)/100, tot=sub+va;
    var sv=function(id,v){var e2=el(id);if(e2)e2.textContent=fmt(v);};
    var vlbl=el('qf-vat-lbl');if(vlbl)vlbl.textContent=vp;
    sv('qf-subtotal',sub);sv('qf-vat-amt',va);sv('qf-total',tot);
  }

  function fillCompany(id) {
    if(!id)return;
    var c=companies.find(function(x){return String(x.id)===String(id);});if(!c)return;
    var sv=function(eid,val){var e2=el(eid);if(e2)e2.value=val||'';};
    sv('qf-from-name',   c.name);    sv('qf-from-name-ar', c.name_ar);
    sv('qf-from-phone',  c.phone);   sv('qf-from-email',   c.email);
    sv('qf-from-web',    c.website); sv('qf-from-vat',     c.vat_number);
    sv('qf-from-logo',   c.logo_url);
    var a=el('qf-from-addr');if(a)a.value=c.address||'';
    var aa=el('qf-from-addr-ar');if(aa)aa.value=c.address_ar||'';
  }

  function fillCustomer(id) {
    if(!id)return;
    var c=customers.find(function(x){return String(x.id)===String(id);});if(!c)return;
    var sv=function(eid,val){var e2=el(eid);if(e2)e2.value=val||'';};
    sv('qf-to-company',c.company_name);sv('qf-to-contact',c.contact_name);
    sv('qf-to-email',c.email);sv('qf-to-phone',c.phone);sv('qf-to-vat',c.vat_number);
    var a=el('qf-to-addr');if(a)a.value=c.address||'';
  }

  async function saveNewCustomer() {
    var company=(el('qf-to-company')||{value:''}).value.trim();
    if(!company)return toast('Enter customer company name first',true);
    try {
      var c=await qtReq('POST','/customers',{
        company_name:company,contact_name:(el('qf-to-contact')||{value:''}).value,
        email:(el('qf-to-email')||{value:''}).value,phone:(el('qf-to-phone')||{value:''}).value,
        address:(el('qf-to-addr')||{value:''}).value,vat_number:(el('qf-to-vat')||{value:''}).value,
      });
      customers.push(c);
      var sel=el('qf-cust-sel');
      if(sel){var opt=document.createElement('option');opt.value=c.id;opt.textContent=c.company_name;opt.selected=true;sel.appendChild(opt);}
      toast('Customer saved!');
    }catch(e){toast(e.message,true);}
  }

  function collectFormData() {
    var tbody=el('qf-items-body');
    var rows=tbody?tbody.querySelectorAll('tr'):[];
    var items=[],sub=0;
    rows.forEach(function(row){
      var desc =(row.querySelector('.qf-desc')   ||{value:''}).value.trim();
      var descAr=(row.querySelector('.qf-desc-ar')||{value:''}).value.trim();
      var qty  =parseFloat((row.querySelector('.qf-qty')  ||{value:0}).value)||0;
      var price=parseFloat((row.querySelector('.qf-price')||{value:0}).value)||0;
      var lt   =Math.round(qty*price*100)/100;
      sub+=lt;
      if(desc||descAr||qty||price)items.push({description:desc,description_ar:descAr,quantity:qty,unit_price:price,line_total:lt});
    });
    var vp=parseFloat((el('qf-vat')||{value:15}).value)||0;
    var va=Math.round(sub*vp)/100;
    var compId=(el('qf-comp-sel')||{value:''}).value;
    var custId=(el('qf-cust-sel')||{value:''}).value;
    var bilingual=(el('qf-bilingual')||{checked:false}).checked?1:0;
    return {
      quote_date:  (el('qf-date')    ||{value:''}).value,
      expiry_date: (el('qf-expiry')  ||{value:''}).value||null,
      status:      (el('qf-status')  ||{value:'Draft'}).value,
      customer_id: custId?parseInt(custId):null,
      currency:    (el('qf-currency')||{value:'SAR'}).value,
      vat_pct:vp, subtotal:sub, vat_amount:va, grand_total:sub+va,
      bilingual:   bilingual,
      notes:       (el('qf-notes')   ||{value:''}).value,
      footer_text: (el('qf-footer')  ||{value:''}).value,
      from_snap:{
        company_id:   compId,
        name:         (el('qf-from-name')   ||{value:''}).value,
        name_ar:      (el('qf-from-name-ar')||{value:''}).value,
        address:      (el('qf-from-addr')   ||{value:''}).value,
        address_ar:   (el('qf-from-addr-ar')||{value:''}).value,
        phone:        (el('qf-from-phone')  ||{value:''}).value,
        email:        (el('qf-from-email')  ||{value:''}).value,
        website:      (el('qf-from-web')    ||{value:''}).value,
        vat_number:   (el('qf-from-vat')    ||{value:''}).value,
        logo_url:     (el('qf-from-logo')   ||{value:''}).value,
      },
      customer_snap:{
        company_name: (el('qf-to-company')||{value:''}).value,
        contact_name: (el('qf-to-contact')||{value:''}).value,
        email:        (el('qf-to-email')  ||{value:''}).value,
        phone:        (el('qf-to-phone')  ||{value:''}).value,
        address:      (el('qf-to-addr')   ||{value:''}).value,
        vat_number:   (el('qf-to-vat')    ||{value:''}).value,
      },
      items:items,
    };
  }

  async function saveForm() {
    var data=collectFormData();
    if(!data.quote_date)return toast('Select a quotation date',true);
    if(!data.customer_snap.company_name)return toast('Enter customer company name',true);
    if(!data.items.length)return toast('Add at least one line item',true);
    try {
      if(editingId){
        await qtReq('PUT','/'+editingId,data);
        var updated=await qtReq('GET','/'+editingId);
        var idx=quotations.findIndex(function(q){return q.id===editingId;});
        if(idx>=0)quotations[idx]=updated;else quotations.unshift(updated);
        toast('Quotation updated!');openPreview(editingId);
      }else{
        var saved=await qtReq('POST','/',data);
        quotations.unshift(saved);
        toast('Quotation created: '+saved.quote_number);openPreview(saved.id);
      }
    }catch(e){toast(e.message,true);}
  }

  // ── PREVIEW ───────────────────────────────────────────────────────────
  async function openPreview(id) {
    currentView='preview';
    wrap.innerHTML='<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:12px;color:var(--muted)"><span class="spinner"></span> Loading...</div>';
    var q;
    try{q=await qtReq('GET','/'+id);}catch(e){toast(e.message,true);showList();return;}
    var idx=quotations.findIndex(function(x){return x.id===id;});if(idx>=0)quotations[idx]=q;
    var sc=STATUS_COLORS[q.status]||'#64748b';
    var today=new Date().toISOString().slice(0,10);
    var exp=q.expiry_date&&q.expiry_date<today&&q.status!=='Approved';
    var cur=q.currency||'SAR';
    var from=q.from_snap||{};
    var cust=q.customer_snap||{};
    var bilingual=q.bilingual||0;

    var html='<div class="pg-hdr">' +
      '<div style="display:flex;align-items:center;gap:12px">' +
        '<button onclick="Quotations.showList()" style="background:none;border:1px solid var(--bord);border-radius:6px;padding:6px 12px;color:var(--text);cursor:pointer">&#8592; Back</button>' +
        '<h2>'+q.quote_number+'</h2>' +
        '<span style="font-size:11px;padding:4px 12px;border-radius:12px;font-weight:700;background:'+sc+'22;color:'+sc+'">'+q.status+'</span>' +
        (exp?'<span style="font-size:11px;color:var(--red)">&#9888; Expired</span>':'') +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<select onchange="Quotations.changeStatus('+id+',this.value)" style="padding:6px 10px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:13px">' +
          STATUSES.map(function(s){return '<option'+(q.status===s?' selected':'')+'>'+s+'</option>';}).join('') +
        '</select>' +
        '<button onclick="Quotations.openForm('+id+')" style="padding:6px 14px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);cursor:pointer">Edit</button>' +
        '<button onclick="Quotations.duplicate('+id+')" style="padding:6px 14px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);cursor:pointer">Duplicate</button>' +
        '<button onclick="Quotations.convertToInvoice('+id+')" style="padding:6px 14px;border:none;border-radius:6px;background:#16a34a;color:#fff;cursor:pointer;font-weight:700">&#129534; Convert to Invoice</button>' +
        '<button onclick="Quotations.printPDF('+id+')" style="padding:6px 14px;border:none;border-radius:6px;background:#1e2d4a;color:#fff;cursor:pointer;font-weight:700">&#128196; PDF</button>' +
      '</div></div>';

    // Preview card
    var sub=parseFloat(q.subtotal||0),vat=parseFloat(q.vat_amount||0),tot=parseFloat(q.grand_total||0);
    html+='<div style="background:var(--surf);border:1px solid var(--bord);border-radius:12px;padding:40px;max-width:820px;margin:0 auto">';
    html+=previewHeaderHTML(q,from,cust,cur,sub,vat,tot,bilingual,false);
    html+='</div>';
    wrap.innerHTML=html;
  }

  function previewHeaderHTML(q,from,cust,cur,sub,vat,tot,bilingual,forPDF) {
    var today=new Date().toISOString().slice(0,10);
    var exp=q.expiry_date&&q.expiry_date<today&&q.status!=='Approved';
    var bg=forPDF?'#fff':'var(--surf)';
    var textColor=forPDF?'#111':'var(--text)';
    var mutedColor=forPDF?'#6b7280':'var(--muted)';
    var bordColor=forPDF?'#e5e7eb':'var(--bord)';

    var logo=from.logo_url||'';
    var html='';

    // Header
    html+='<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:3px solid #1e2d4a">';
    html+='<div>';
    if(logo)html+='<img src="'+logo+'" style="height:55px;margin-bottom:10px;display:block" alt="logo">';
    if(bilingual&&from.name_ar){
      html+='<div style="display:flex;gap:16px;align-items:baseline">' +
        '<div style="font-size:18px;font-weight:800;color:#1e2d4a">'+esc(from.name||'')+'</div>' +
        '<div style="font-size:16px;font-weight:700;color:#1e2d4a;direction:rtl">'+esc(from.name_ar||'')+'</div>' +
      '</div>';
    } else {
      html+='<div style="font-size:18px;font-weight:800;color:#1e2d4a">'+esc(from.name||'')+'</div>';
    }
    html+='<div style="font-size:11px;color:'+mutedColor+';margin-top:6px;line-height:1.8">';
    if(from.address)html+=esc(from.address)+'<br>';
    if(bilingual&&from.address_ar)html+='<span dir="rtl">'+esc(from.address_ar)+'</span><br>';
    if(from.phone)html+='Tel: '+esc(from.phone)+'<br>';
    if(from.email)html+=esc(from.email)+'<br>';
    if(from.website)html+=esc(from.website)+'<br>';
    if(from.vat_number)html+='VAT: '+esc(from.vat_number);
    html+='</div></div>';

    html+='<div style="text-align:right">';
    if(bilingual){
      html+='<div style="display:flex;gap:12px;justify-content:flex-end;align-items:baseline">' +
        '<div style="font-size:24px;font-weight:800;color:#1e2d4a">QUOTATION</div>' +
        '<div style="font-size:18px;font-weight:800;color:#1e2d4a;direction:rtl">&#1593;&#1585;&#1590; &#1587;&#1593;&#1585;</div>' +
      '</div>';
    } else {
      html+='<div style="font-size:26px;font-weight:800;color:#1e2d4a">QUOTATION</div>';
    }
    html+='<div style="font-size:14px;font-weight:700;color:#2abfbf;margin-top:3px">'+q.quote_number+'</div>';
    html+='<div style="font-size:11px;color:'+mutedColor+';margin-top:8px;line-height:1.8">';
    html+='Date: <strong>'+fmtD(q.quote_date)+'</strong><br>';
    if(q.expiry_date)html+='Expires: <strong style="color:'+(exp?'#dc2626':'inherit')+'">'+fmtD(q.expiry_date)+'</strong><br>';
    html+='Currency: <strong>'+cur+'</strong>';
    html+='</div></div></div>';

    // Bill To
    html+='<div style="margin-bottom:24px;padding:14px;background:'+(forPDF?'#f8fafc':'var(--surf2)')+';border-radius:8px">';
    html+='<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:'+mutedColor+';margin-bottom:6px">';
    html+= bilingual ? 'Bill To / &#1605;&#1608;&#1580;&#1607; &#1573;&#1604;&#1609;' : 'Bill To';
    html+='</div>';
    html+='<div style="font-size:15px;font-weight:700;color:#1e2d4a">'+esc(cust.company_name||'')+'</div>';
    html+='<div style="font-size:12px;color:'+mutedColor+';margin-top:4px;line-height:1.7">';
    if(cust.contact_name)html+='Attn: '+esc(cust.contact_name)+'<br>';
    if(cust.address)html+=esc(cust.address)+'<br>';
    if(cust.phone)html+=esc(cust.phone)+'<br>';
    if(cust.email)html+=esc(cust.email)+'<br>';
    if(cust.vat_number)html+='VAT: '+esc(cust.vat_number);
    html+='</div></div>';

    // Items table
    html+='<table style="width:100%;border-collapse:collapse;margin-bottom:20px">';
    html+='<thead><tr style="background:#1e2d4a;color:#fff">';
    html+='<th style="padding:9px 12px;text-align:left;font-size:11px;width:30px">#</th>';
    html+='<th style="padding:9px 12px;text-align:left;font-size:11px">Description'+(bilingual?' / &#1575;&#1604;&#1608;&#1589;&#1601;':'')+'</th>';
    html+='<th style="padding:9px 12px;text-align:right;font-size:11px;width:55px">Qty</th>';
    html+='<th style="padding:9px 12px;text-align:right;font-size:11px;width:115px">Unit Price</th>';
    html+='<th style="padding:9px 12px;text-align:right;font-size:11px;width:115px">Total</th>';
    html+='</tr></thead><tbody>';
    (q.items||[]).forEach(function(it,i){
      html+='<tr style="background:'+(i%2===0?(forPDF?'#fff':'transparent'):(forPDF?'#f9fafb':'rgba(0,0,0,.02)'))+';border-bottom:1px solid '+bordColor+'">';
      html+='<td style="padding:9px 12px;font-size:11px;color:'+mutedColor+'">'+(i+1)+'</td>';
      var descHTML = esc(it.description||'');
      if(bilingual&&it.description_ar)descHTML+='<br><span style="direction:rtl;font-size:11px;color:'+mutedColor+'">'+esc(it.description_ar)+'</span>';
      html+='<td style="padding:9px 12px;font-size:13px">'+descHTML+'</td>';
      html+='<td style="padding:9px 12px;text-align:right;font-size:13px">'+parseFloat(it.quantity||0)+'</td>';
      html+='<td style="padding:9px 12px;text-align:right;font-size:13px">'+cur+' '+fmt(it.unit_price||0)+'</td>';
      html+='<td style="padding:9px 12px;text-align:right;font-size:13px;font-weight:600">'+cur+' '+fmt(it.line_total||0)+'</td>';
      html+='</tr>';
    });
    html+='</tbody></table>';

    // Totals
    html+='<div style="display:flex;justify-content:flex-end;margin-bottom:20px"><div style="width:270px">';
    html+='<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid '+bordColor+'"><span style="color:'+mutedColor+';font-size:12px">Subtotal'+(bilingual?' / &#1575;&#1604;&#1605;&#1580;&#1605;&#1608;&#1593; &#1575;&#1604;&#1601;&#1585;&#1593;&#1610;':'')+'</span><span style="font-weight:600">'+cur+' '+fmt(sub)+'</span></div>';
    html+='<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid '+bordColor+'"><span style="color:'+mutedColor+';font-size:12px">VAT ('+parseFloat(q.vat_pct||15)+'%)</span><span style="font-weight:600">'+cur+' '+fmt(vat)+'</span></div>';
    html+='<div style="display:flex;justify-content:space-between;padding:10px;background:#1e2d4a;color:#fff;border-radius:4px;margin-top:4px">' +
      '<span style="font-weight:700;font-size:14px">Grand Total'+(bilingual?' / &#1575;&#1604;&#1573;&#1580;&#1605;&#1575;&#1604;&#1610;':'')+'</span>' +
      '<span style="font-weight:800;font-size:16px;color:#2abfbf">'+cur+' '+fmt(tot)+'</span></div>';
    html+='</div></div>';

    if(q.notes)html+='<div style="margin-bottom:14px;padding:12px;background:'+(forPDF?'#f8fafc':'var(--surf2)')+';border-radius:6px;border-left:4px solid #2abfbf"><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:'+mutedColor+';margin-bottom:5px">Notes</div><div style="font-size:12px">'+esc(q.notes)+'</div></div>';
    if(q.footer_text)html+='<div style="margin-top:20px;padding-top:14px;border-top:1px solid '+bordColor+';font-size:11px;color:'+mutedColor+'">'+esc(q.footer_text)+'</div>';

    return html;
  }

  async function changeStatus(id,status){
    try{await qtReq('PATCH','/'+id+'/status',{status:status});var q=quotations.find(function(x){return x.id===id;});if(q)q.status=status;openPreview(id);toast('Status: '+status);}
    catch(e){toast(e.message,true);}
  }

  async function duplicate(id){
    try{var r=await qtReq('POST','/'+id+'/duplicate',{});var f=await qtReq('GET','/'+r.id);quotations.unshift(f);toast('Duplicated as '+r.quote_number);openPreview(r.id);}
    catch(e){toast(e.message,true);}
  }

  async function deleteQ(id){
    if(!confirm('Delete this quotation?'))return;
    try{await qtReq('DELETE','/'+id,{});quotations=quotations.filter(function(q){return q.id!==id;});showList();toast('Deleted');}
    catch(e){toast(e.message,true);}
  }

  // ── PDF PRINT ─────────────────────────────────────────────────────────
  function printPDF(id) {
    qtReq('GET','/'+id).then(function(q){
      generatePDF(q);
    }).catch(function(e){toast(e.message,true);});
  }

  function generateQRData(q) {
    // QR content: Quotation reference info
    var from = q.from_snap||{};
    var cust = q.customer_snap||{};
    var lines = [
      'Quote: '+q.quote_number,
      'Date: '+fmtD(q.quote_date),
      'From: '+(from.name||''),
      'To: '+(cust.company_name||''),
      'Total: '+(q.currency||'SAR')+' '+fmt(q.grand_total||0),
      'Status: '+q.status,
    ];
    return lines.filter(Boolean).join('\n');
  }

  function generatePDF(q) {
    var cur=q.currency||'SAR';
    var sub=parseFloat(q.subtotal||0),vat=parseFloat(q.vat_amount||0),tot=parseFloat(q.grand_total||0);
    var from=q.from_snap||{},cust=q.customer_snap||{};
    var bilingual=q.bilingual||0;
    var logo=from.logo_url||'';
    var qrData=generateQRData(q);

    var itemRows=(q.items||[]).map(function(it,i){
      var descHTML='<div style="font-size:12px;font-weight:500">'+esc(it.description||'')+'</div>';
      if(bilingual&&it.description_ar)descHTML+='<div style="direction:rtl;font-size:11px;color:#64748b;margin-top:2px">'+esc(it.description_ar)+'</div>';
      return '<tr style="background:'+(i%2===0?'#ffffff':'#f8fafc')+'">' +
        '<td style="padding:10px 14px;font-size:12px;color:#94a3b8;border-bottom:1px solid #f1f5f9;width:30px">'+(i+1)+'</td>' +
        '<td style="padding:10px 14px;border-bottom:1px solid #f1f5f9">'+descHTML+'</td>' +
        '<td style="padding:10px 14px;text-align:right;font-size:13px;border-bottom:1px solid #f1f5f9;color:#334155">'+parseFloat(it.quantity||0)+'</td>' +
        '<td style="padding:10px 14px;text-align:right;font-size:13px;border-bottom:1px solid #f1f5f9;color:#334155">'+cur+' '+fmt(it.unit_price||0)+'</td>' +
        '<td style="padding:10px 14px;text-align:right;font-size:13px;font-weight:700;border-bottom:1px solid #f1f5f9;color:#1e2d4a">'+cur+' '+fmt(it.line_total||0)+'</td>' +
        '</tr>';
    }).join('');

    var today=new Date().toISOString().slice(0,10);
    var exp=q.expiry_date&&q.expiry_date<today&&q.status!=='Approved';

    // ── Header band ──────────────────────────────────────────────────────
    // Left: logo + company info | Right: QUOTATION title + quote details
    var logoHTML = logo ? '<div style="background:#fff;border-radius:10px;padding:6px 10px;display:inline-block;margin-bottom:10px"><img src="'+logo+'" style="height:44px;display:block"></div>' : '';

    // Company name - bilingual side by side
    var compNameHTML = '';
    if(bilingual && from.name_ar) {
      compNameHTML = '<div style="display:flex;align-items:baseline;gap:20px;flex-wrap:wrap">' +
        '<span style="font-size:19px;font-weight:900;color:#fff;letter-spacing:-0.3px">'+esc(from.name||'')+'</span>' +
        '<span style="width:1px;height:18px;background:rgba(255,255,255,0.3);display:inline-block;align-self:center"></span>' +
        '<span style="font-size:17px;font-weight:800;color:rgba(255,255,255,0.9);direction:rtl">'+esc(from.name_ar)+'</span>' +
        '</div>';
    } else {
      compNameHTML = '<div style="font-size:19px;font-weight:900;color:#fff;letter-spacing:-0.3px">'+esc(from.name||'')+'</div>';
    }

    // Company details in header
    var compDetails = '<div style="font-size:10px;color:rgba(255,255,255,0.75);margin-top:8px;line-height:2">';
    // Address - break into multiple lines if long
    if(from.address) {
      var addrParts = from.address.split(',');
      compDetails += '<div>'+addrParts.map(function(p){return esc(p.trim());}).join('<br>')+'</div>';
    }
    if(bilingual&&from.address_ar) {
      compDetails += '<div dir="rtl" style="text-align:left">'+esc(from.address_ar)+'</div>';
    }
    // Contact line
    var contacts = [];
    if(from.phone)  contacts.push('Tel: '+esc(from.phone));
    if(from.email)  contacts.push(esc(from.email));
    if(from.website)contacts.push(esc(from.website));
    if(contacts.length) compDetails += '<div>'+contacts.join(' &nbsp;&bull;&nbsp; ')+'</div>';
    // VAT - only show if it doesn't look like an email address
    if(from.vat_number && from.vat_number.indexOf('@')===-1 && from.vat_number.trim()!=='') {
      compDetails += '<div>VAT: '+esc(from.vat_number)+'</div>';
    }
    compDetails += '</div>';

    // Right side quote header
    var quoteTitle = bilingual
      ? '<div style="text-align:right"><div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px;line-height:1">QUOTATION</div><div style="font-size:18px;font-weight:800;color:rgba(255,255,255,0.85);direction:rtl;margin-top:2px">&#1593;&#1585;&#1590; &#1587;&#1593;&#1585;</div></div>'
      : '<div style="font-size:30px;font-weight:900;color:#fff;letter-spacing:-0.5px;text-align:right">QUOTATION</div>';

    var quoteDetails = '<div style="text-align:right;margin-top:8px">' +
      '<div style="display:inline-block;background:rgba(255,255,255,0.12);border-radius:6px;padding:8px 14px">' +
        '<div style="font-size:15px;font-weight:800;color:#2abfbf;letter-spacing:0.5px">'+q.quote_number+'</div>' +
        '<div style="font-size:10px;color:rgba(255,255,255,0.7);margin-top:5px;line-height:1.8">' +
          'Date: <strong style="color:#fff">'+fmtD(q.quote_date)+'</strong><br>' +
          (q.expiry_date?'Expires: <strong style="color:'+(exp?'#fca5a5':'#fff')+'">'+fmtD(q.expiry_date)+'</strong><br>':'')+
          'Currency: <strong style="color:#fff">'+cur+'</strong>' +
        '</div>' +
      '</div>' +
    '</div>';

    // ── Bill To + QR ─────────────────────────────────────────────────────
    var billToLabel = bilingual ? 'BILL TO &nbsp;/&nbsp; <span dir="rtl">&#1605;&#1608;&#1580;&#1607; &#1573;&#1604;&#1609;</span>' : 'BILL TO';
    var billTo = '<div style="display:grid;grid-template-columns:1fr auto;gap:20px;align-items:start;margin-bottom:24px">' +
      '<div style="background:#f8fafc;border-radius:8px;padding:16px;border-left:4px solid #2abfbf">' +
        '<div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;margin-bottom:8px">'+billToLabel+'</div>' +
        '<div style="font-size:16px;font-weight:800;color:#1e2d4a;margin-bottom:6px">'+esc(cust.company_name||'')+'</div>' +
        '<div style="font-size:11px;color:#64748b;line-height:1.8">' +
          (cust.contact_name?'<div>Attn: <strong>'+esc(cust.contact_name)+'</strong></div>':'')+
          (cust.address?'<div>'+esc(cust.address)+'</div>':'')+
          (cust.phone?'<div>'+esc(cust.phone)+'</div>':'')+
          (cust.email?'<div>'+esc(cust.email)+'</div>':'')+
          (cust.vat_number?'<div>VAT: <strong>'+esc(cust.vat_number)+'</strong></div>':'')+
        '</div>' +
      '</div>' +
      '<div style="text-align:center">' +
        '<canvas id="qt-qr-canvas" width="90" height="90" style="border:3px solid #e2e8f0;border-radius:8px;display:block"></canvas>' +
        '<div style="font-size:8px;color:#94a3b8;margin-top:4px;text-align:center">Scan to verify</div>' +
      '</div>' +
    '</div>';

    // ── Totals ────────────────────────────────────────────────────────────
    var totalsHTML =
      '<div style="display:flex;justify-content:flex-end;margin-bottom:20px">' +
      '<div style="width:280px">' +
        '<div style="background:#f8fafc;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">' +
          '<div style="display:flex;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #e2e8f0">' +
            '<span style="font-size:12px;color:#64748b">Subtotal'+(bilingual?' / &#1575;&#1604;&#1605;&#1580;&#1605;&#1608;&#1593; &#1575;&#1604;&#1601;&#1585;&#1593;&#1610;':'')+'</span>' +
            '<span style="font-size:13px;font-weight:600;color:#1e2d4a">'+cur+' '+fmt(sub)+'</span>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #e2e8f0">' +
            '<span style="font-size:12px;color:#64748b">VAT ('+parseFloat(q.vat_pct||15)+'%)'+(bilingual?' / &#1590;&#1585;&#1610;&#1576;&#1577; &#1575;&#1604;&#1602;&#1610;&#1605;&#1577; &#1575;&#1604;&#1605;&#1590;&#1575;&#1601;&#1577;':'')+'</span>' +
            '<span style="font-size:13px;font-weight:600;color:#1e2d4a">'+cur+' '+fmt(vat)+'</span>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;padding:12px 16px;background:#1e2d4a">' +
            '<span style="font-size:14px;font-weight:800;color:#fff">Grand Total'+(bilingual?' / &#1575;&#1604;&#1573;&#1580;&#1605;&#1575;&#1604;&#1610;':'')+'</span>' +
            '<span style="font-size:16px;font-weight:900;color:#2abfbf">'+cur+' '+fmt(tot)+'</span>' +
          '</div>' +
        '</div>' +
      '</div></div>';

    var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+q.quote_number+'</title>' +
    '' +
    '<style>' +
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{font-family:Arial,sans-serif;background:#e2e8f0;color:#111}' +
    '.topbar{background:#1e2d4a;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:99}' +
    '.page{width:210mm;min-height:297mm;margin:20px auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.12);border-radius:4px;overflow:hidden}' +
    '.header-band{background:linear-gradient(135deg,#1e2d4a 0%,#2d4a6e 100%);padding:28px 32px;display:flex;justify-content:space-between;align-items:flex-start}' +
    '.body-pad{padding:28px 32px}' +
    'table{width:100%;border-collapse:collapse}' +
    'th{background:#1e2d4a;color:#fff;padding:10px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}' +
    '.section-title{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;margin-bottom:10px}' +
    '@media print{.topbar{display:none!important}body{background:#fff}.page{box-shadow:none;margin:0;border-radius:0;width:100%;min-height:0}@page{size:A4;margin:0}}' +
    '</style></head><body>' +

    '<div class="topbar">' +
      '<span style="color:#fff;font-weight:700">'+q.quote_number+'</span>' +
      '<button onclick="window.print()" style="padding:8px 22px;background:#2abfbf;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer">&#128424; Print / Save as PDF</button>' +
    '</div>' +

    '<div class="page">' +

    // Navy header band
    '<div class="header-band">' +
      '<div style="flex:1">' +
        logoHTML +
        compNameHTML +
        compDetails +
      '</div>' +
      '<div style="flex-shrink:0;margin-left:32px">' +
        quoteTitle +
        quoteDetails +
      '</div>' +
    '</div>' +

    '<div class="body-pad">' +
      billTo +

      // Items table
      '<div style="margin-bottom:20px;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">' +
      '<table>' +
        '<thead><tr>' +
          '<th style="text-align:left;width:30px">#</th>' +
          '<th style="text-align:left">Description'+(bilingual?' / &#1575;&#1604;&#1608;&#1589;&#1601;':'')+'</th>' +
          '<th style="text-align:right;width:60px">Qty'+(bilingual?' / &#1575;&#1604;&#1603;&#1605;&#1610;&#1577;':'')+'</th>' +
          '<th style="text-align:right;width:120px">Unit Price'+(bilingual?' / &#1587;&#1593;&#1585; &#1575;&#1604;&#1608;&#1581;&#1583;&#1577;':'')+'</th>' +
          '<th style="text-align:right;width:120px">Total'+(bilingual?' / &#1575;&#1604;&#1573;&#1580;&#1605;&#1575;&#1604;&#1610;':'')+'</th>' +
        '</tr></thead>' +
        '<tbody>'+itemRows+'</tbody>' +
      '</table></div>' +

      totalsHTML +

      (q.notes?'<div style="margin-bottom:16px;background:#f0f9ff;border-radius:8px;padding:14px 16px;border-left:4px solid #2abfbf">' +
        '<div class="section-title">Notes</div>' +
        '<div style="font-size:12px;color:#334155;line-height:1.6">'+esc(q.notes)+'</div>' +
      '</div>':'')+

      // Footer
      '<div style="margin-top:20px;padding-top:16px;border-top:2px solid #f1f5f9;display:flex;justify-content:space-between;align-items:flex-end">' +
        '<div style="font-size:10px;color:#94a3b8;line-height:1.8">' +
          (q.footer_text?'<div style="max-width:380px">'+esc(q.footer_text)+'</div>':'')+
        '</div>' +
        '<div style="text-align:right;font-size:10px;color:#94a3b8">' +
          '<div style="font-weight:700;color:#1e2d4a;font-size:11px">'+esc(from.name||'')+'</div>' +
          '<div>'+q.quote_number+'</div>' +
        '</div>' +
      '</div>' +

    '</div></div>' + // end body-pad + page

'' +
    '</body></html>';

    var w=window.open('','_blank','width=960,height=800');
    w.document.write(html);
    w.document.close();
  }

  // ── COMPANIES MODAL ───────────────────────────────────────────────────
  function openCompanies() {
    var modal=el('qt-comp-modal');
    if(!modal){modal=document.createElement('div');modal.className='overlay';modal.id='qt-comp-modal';document.body.appendChild(modal);}
    renderCompModal(modal,null);
    openModal('qt-comp-modal');
  }

  function renderCompModal(modal, editComp) {
    var isEdit = editComp != null;
    var c = editComp || {};
    modal.innerHTML='<div class="modal" style="max-width:680px">' +
      '<h3>&#127970; '+(isEdit?'Edit Company':'Company Profiles')+'</h3>' +
      (isEdit ? renderCompForm(c) : renderCompList()) +
      '<div class="mact"><button class="btn-c" onclick="'+(isEdit?'Quotations.cancelCompEdit()':'closeModal(\'qt-comp-modal\')')+'">'+(isEdit?'Cancel':'Close')+'</button>' +
        (isEdit?'<button class="btn-s" onclick="Quotations.saveComp()">Save Company</button>':'') +
      '</div>' +
    '</div>';
  }

  function renderCompList() {
    var html='<div style="margin:12px 0"><button onclick="Quotations.newComp()" style="padding:8px 16px;border:none;border-radius:6px;background:#1e2d4a;color:#fff;cursor:pointer;font-size:13px;font-weight:700">+ Add New Company</button></div>';
    if(!companies.length)return html+'<div class="empty">No companies yet.</div>';
    html+='<div style="max-height:380px;overflow-y:auto">';
    companies.forEach(function(c){
      html+='<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1px solid var(--bord);border-radius:8px;margin-bottom:8px;background:var(--surf2)">' +
        '<div>' +
          '<div style="font-weight:700;font-size:14px">'+esc(c.name)+(c.is_default?'<span style="margin-left:8px;font-size:10px;background:#2abfbf;color:#fff;padding:2px 8px;border-radius:10px">Default</span>':'')+  '</div>' +
          (c.name_ar?'<div style="font-size:12px;color:var(--muted);direction:rtl;text-align:right">'+esc(c.name_ar)+'</div>':'')+
          '<div style="font-size:11px;color:var(--muted)">'+[c.phone,c.email,c.website].filter(Boolean).join(' | ')+'</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px">' +
          '<button onclick="Quotations.editComp('+c.id+')" style="padding:5px 12px;border:1px solid var(--bord);border-radius:4px;background:transparent;color:var(--text);cursor:pointer;font-size:12px">Edit</button>' +
          (c.is_default?'':'<button onclick="Quotations.setDefaultComp('+c.id+')" style="padding:5px 12px;border:1px solid var(--teal);border-radius:4px;background:transparent;color:var(--teal);cursor:pointer;font-size:12px">Set Default</button>')+
          '<button onclick="Quotations.deleteComp('+c.id+')" class="del-btn">&#10005;</button>' +
        '</div>' +
      '</div>';
    });
    html+='</div>';
    return html;
  }

  function renderCompForm(c) {
    var iv=function(id,val,dir){return '<input id="qc-'+id+'" value="'+esc(String(val||''))+'" '+(dir?'dir="rtl" style="text-align:right"':'')+' style="width:100%;padding:8px 10px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:13px'+(dir?';text-align:right':'')+'">';};
    var ta=function(id,val,dir){return '<textarea id="qc-'+id+'" style="width:100%;padding:8px 10px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:13px;min-height:55px'+(dir?';text-align:right;direction:rtl':'')+'">'+(val||'')+'</textarea>';};
    return '<input type="hidden" id="qc-id" value="'+(c.id||'')+'">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">' +
        '<div><label style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:5px">Company Name (EN) *</label>'+iv('name',c.name)+'</div>' +
        '<div><label style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:5px">&#1575;&#1604;&#1575;&#1587;&#1605; (AR)</label>'+iv('name_ar',c.name_ar,true)+'</div>' +
        '<div><label style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:5px">Address (EN)</label>'+ta('address',c.address)+'</div>' +
        '<div><label style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:5px">&#1575;&#1604;&#1593;&#1606;&#1608;&#1575;&#1606; (AR)</label>'+ta('address_ar',c.address_ar,true)+'</div>' +
        '<div><label style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:5px">Phone</label>'+iv('phone',c.phone)+'</div>' +
        '<div><label style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:5px">Email</label>'+iv('email',c.email)+'</div>' +
        '<div><label style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:5px">Website</label>'+iv('website',c.website)+'</div>' +
        '<div><label style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:5px">VAT Number</label>'+iv('vat_number',c.vat_number)+'</div>' +
      '</div>' +
      '<div style="margin-top:12px"><label style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:5px">Logo URL</label>'+iv('logo_url',c.logo_url)+'</div>' +
      '<div style="margin-top:10px;display:flex;align-items:center;gap:8px"><input type="checkbox" id="qc-is_default"'+(c.is_default?' checked':'')+' style="width:auto"><label style="font-size:13px;color:var(--text)">Set as Default Company</label></div>';
  }

  var compEditingId = null;

  function newComp() {
    compEditingId=null;
    var modal=el('qt-comp-modal');if(modal)renderCompModal(modal,{id:null,name:'',name_ar:'',address:'',address_ar:'',phone:'',email:'',website:'',vat_number:'',logo_url:'',is_default:0});
  }

  function editComp(id) {
    compEditingId=id;
    var c=companies.find(function(x){return x.id===id;});
    var modal=el('qt-comp-modal');if(modal&&c)renderCompModal(modal,c);
  }

  function cancelCompEdit() {
    compEditingId=null;
    var modal=el('qt-comp-modal');if(modal)renderCompModal(modal,null);
  }

  async function saveComp() {
    var get=function(id){var e2=el('qc-'+id);return e2?e2.value:'';};
    var name=get('name').trim();
    if(!name)return toast('Company name required',true);
    var data={
      name:name, name_ar:get('name_ar'), address:(el('qc-address')||{value:''}).value,
      address_ar:(el('qc-address_ar')||{value:''}).value,
      phone:get('phone'), email:get('email'), website:get('website'),
      vat_number:get('vat_number'), logo_url:get('logo_url'),
      is_default:(el('qc-is_default')||{checked:false}).checked?1:0,
    };
    try {
      if(compEditingId){
        await qtReq('PUT','/companies/'+compEditingId,data);
        var idx=companies.findIndex(function(c){return c.id===compEditingId;});
        if(idx>=0){companies[idx]={...companies[idx],...data};}
        if(data.is_default)companies.forEach(function(c,i){if(i!==idx)c.is_default=0;});
      } else {
        var nc=await qtReq('POST','/companies',data);
        companies.push(nc);
        if(data.is_default)companies.forEach(function(c){if(c.id!==nc.id)c.is_default=0;});
      }
      compEditingId=null;
      var modal=el('qt-comp-modal');if(modal)renderCompModal(modal,null);
      toast('Company saved!');
    }catch(e){toast(e.message,true);}
  }

  async function setDefaultComp(id) {
    try{
      await qtReq('PUT','/companies/'+id,{...companies.find(function(c){return c.id===id;}),is_default:1});
      companies.forEach(function(c){c.is_default=c.id===id?1:0;});
      var modal=el('qt-comp-modal');if(modal)renderCompModal(modal,null);
      toast('Default company updated');
    }catch(e){toast(e.message,true);}
  }

  async function deleteComp(id) {
    if(!confirm('Delete this company profile?'))return;
    try{
      await qtReq('DELETE','/companies/'+id,{});
      companies=companies.filter(function(c){return c.id!==id;});
      var modal=el('qt-comp-modal');if(modal)renderCompModal(modal,null);
      toast('Deleted');
    }catch(e){toast(e.message,true);}
  }

  // ── CUSTOMERS MODAL ───────────────────────────────────────────────────
  function openCustomers() {
    var modal=el('qt-cust-modal');
    if(!modal){modal=document.createElement('div');modal.className='overlay';modal.id='qt-cust-modal';document.body.appendChild(modal);}
    renderCustModal(modal);openModal('qt-cust-modal');
  }

  function renderCustModal(modal) {
    modal.innerHTML='<div class="modal" style="max-width:600px"><h3>&#128101; Customers</h3>' +
      '<div style="margin:12px 0;display:flex;gap:8px">' +
        '<input type="text" placeholder="Search..." oninput="Quotations.searchCust(this.value)" style="flex:1;padding:8px 12px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text)">' +
      '</div>' +
      '<div id="qt-cust-list" style="max-height:400px;overflow-y:auto">'+renderCustList(customers)+'</div>' +
      '<div class="mact"><button class="btn-c" onclick="closeModal(\'qt-cust-modal\')">Close</button></div>' +
    '</div>';
  }

  function renderCustList(list){
    if(!list.length)return'<div class="empty">No customers yet.</div>';
    return'<table class="ltbl"><thead><tr><th>Company</th><th>Contact</th><th>Email</th><th></th></tr></thead><tbody>'+
      list.map(function(c){return'<tr><td style="font-weight:600">'+esc(c.company_name)+'</td><td style="font-size:12px;color:var(--muted)">'+esc(c.contact_name||'')+'</td><td style="font-size:12px;color:var(--muted)">'+esc(c.email||'')+'</td><td><button onclick="Quotations.deleteCust('+c.id+')" class="del-btn">&#10005;</button></td></tr>';}).join('')+
    '</tbody></table>';
  }

  function searchCust(q){
    var f=q?customers.filter(function(c){return c.company_name.toLowerCase().includes(q.toLowerCase());}) : customers;
    var l=el('qt-cust-list');if(l)l.innerHTML=renderCustList(f);
  }

  async function deleteCust(id){
    if(!confirm('Delete this customer?'))return;
    try{await qtReq('DELETE','/customers/'+id,{});customers=customers.filter(function(c){return c.id!==id;});var m=el('qt-cust-modal');if(m)renderCustModal(m);toast('Deleted');}
    catch(e){toast(e.message,true);}
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function fmtD(d){
    if(!d)return'';
    var dt=new Date(String(d).slice(0,10)+'T00:00:00');if(isNaN(dt))return d;
    return['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()]+' '+dt.getDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]+' '+dt.getFullYear();
  }

  async function convertToInvoice(quoteId) {
    if (!window.TaxInvoices) return toast('Tax Invoices module not loaded', true);
    var newId = await window.TaxInvoices.fromQuote(quoteId);
    if (newId) {
      // Switch to tax-invoices app
      if (window.openApp) openApp('tax-invoices');
    }
  }

  return{
    render,showList,openForm,openPreview,printPDF,openCompanies,openCustomers,convertToInvoice,
    setFilter,clearFilters,addItemRow,removeRow,recalc,
    fillCompany,fillCustomer,saveNewCustomer,saveForm,
    changeStatus,duplicate,deleteQ,
    newComp,editComp,cancelCompEdit,saveComp,setDefaultComp,deleteComp,
    searchCust,deleteCust,
  };
})();
