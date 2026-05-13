/** Tax Invoice v1 — ZATCA Phase 1 Compliant */
window.TaxInvoices = (function() {
  var invoices = [], customers = [], companies = [], settings = {}, wrap;
  var currentView = 'list';
  var editingId = null;
  var filterStatus = '', filterQ = '', filterFrom = '', filterTo = '';
  var STATUSES = ['Draft','Issued','Paid','Cancelled'];
  var STATUS_COLORS = {Draft:'#64748b',Issued:'#2abfbf',Paid:'#16a34a',Cancelled:'#dc2626'};

  function tiReq(method, path, body) { return API.req(method, '/tax-invoices' + path, body); }
  function qtReq(method, path, body) { return API.req(method, '/quotations' + path, body); }

  async function render(container) {
    wrap = container;
    wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:12px;color:var(--muted)"><span class="spinner"></span> Loading...</div>';
    try {
      var r = await Promise.all([
        tiReq('GET','/'), qtReq('GET','/customers'),
        tiReq('GET','/settings'), qtReq('GET','/companies')
      ]);
      invoices = r[0]||[]; customers = r[1]||[]; settings = r[2]||{}; companies = r[3]||[];
    } catch(e) { invoices=[]; customers=[]; settings={}; companies=[]; }
    showList();
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────
  function showList() {
    currentView='list'; editingId=null;
    var filtered = invoices.filter(function(inv) {
      if (filterStatus && inv.status !== filterStatus) return false;
      if (filterQ) {
        var qs = filterQ.toLowerCase();
        var cn = (inv.customer_snap && inv.customer_snap.company_name) ? inv.customer_snap.company_name.toLowerCase() : '';
        if (!inv.invoice_number.toLowerCase().includes(qs) && !cn.includes(qs)) return false;
      }
      if (filterFrom && inv.invoice_date < filterFrom) return false;
      if (filterTo   && inv.invoice_date > filterTo)   return false;
      return true;
    });

    var issued = invoices.filter(function(i){return i.status==='Issued'||i.status==='Paid';});
    var paid   = invoices.filter(function(i){return i.status==='Paid';});
    var totalVal = issued.reduce(function(s,i){return s+parseFloat(i.grand_total||0);},0);

    var html = '<div class="pg-hdr"><h2>&#129534; Tax Invoices</h2>' +
      '<button onclick="TaxInvoices.openForm()" style="padding:8px 16px;border:none;border-radius:6px;background:#1e2d4a;color:#fff;cursor:pointer;font-size:13px;font-weight:700">+ New Invoice</button>' +
    '</div>';

    // Stats
    html += '<div class="cards" style="margin-bottom:20px">' +
      '<div class="card"><div class="cl">Total</div><div class="cv" style="color:var(--teal)">'+invoices.length+'</div></div>' +
      '<div class="card tel"><div class="cl">Issued</div><div class="cv">'+issued.length+'</div></div>' +
      '<div class="card grn"><div class="cl">Paid</div><div class="cv">'+paid.length+'</div></div>' +
      '<div class="card"><div class="cl">Total Issued Value</div><div class="cv" style="color:var(--green)">SAR '+fmt(totalVal)+'</div></div>' +
    '</div>';

    html += '<div class="panel">' +
      '<div class="ph dark" style="display:flex;justify-content:space-between;align-items:center"><span>&#129534; All Invoices ('+filtered.length+')</span></div>' +
      '<div class="lctrl" style="flex-wrap:wrap;gap:8px">' +
        '<input class="srch" type="text" placeholder="Search invoice # or customer..." value="'+filterQ+'" oninput="TaxInvoices.setFilter(\'q\',this.value)">' +
        '<select onchange="TaxInvoices.setFilter(\'status\',this.value)" style="padding:5px 10px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--text);font-size:12px">' +
          '<option value="">All Statuses</option>' +
          STATUSES.map(function(s){return '<option value="'+s+'"'+(filterStatus===s?' selected':'')+'>'+s+'</option>';}).join('') +
        '</select>' +
        '<input type="date" value="'+filterFrom+'" onchange="TaxInvoices.setFilter(\'from\',this.value)" style="padding:5px 8px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--text);font-size:12px">' +
        '<input type="date" value="'+filterTo+'"   onchange="TaxInvoices.setFilter(\'to\',this.value)"   style="padding:5px 8px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--text);font-size:12px">' +
        '<button onclick="TaxInvoices.clearFilters()" style="padding:5px 10px;border:1px solid var(--bord);border-radius:4px;background:var(--surf2);color:var(--muted);font-size:12px;cursor:pointer">Clear</button>' +
      '</div>';

    if (!filtered.length) {
      html += '<div class="empty" style="padding:40px">No invoices found. Click "+ New Invoice" to create one.</div>';
    } else {
      html += '<div class="sw"><table class="ltbl"><thead><tr>' +
        '<th>Invoice #</th><th>Date</th><th>Due</th><th>Customer</th>' +
        '<th style="text-align:right">Total (incl. VAT)</th><th>Status</th><th>From Quote</th><th>Actions</th>' +
      '</tr></thead><tbody>';
      filtered.forEach(function(inv) {
        var cn  = (inv.customer_snap && inv.customer_snap.company_name) ? inv.customer_snap.company_name : '—';
        var sc  = STATUS_COLORS[inv.status]||'#64748b';
        var today = new Date().toISOString().slice(0,10);
        var overdue = inv.due_date && inv.due_date < today && inv.status !== 'Paid' && inv.status !== 'Cancelled';
        html += '<tr>' +
          '<td style="font-weight:700;color:var(--teal);cursor:pointer" onclick="TaxInvoices.openPreview('+inv.id+')">'+inv.invoice_number+'</td>' +
          '<td style="font-size:12px;color:var(--muted)">'+fmtD(inv.invoice_date)+'</td>' +
          '<td style="font-size:12px;color:'+(overdue?'var(--red)':'var(--muted)')+'">'+( inv.due_date?fmtD(inv.due_date)+(overdue?' ⚠':''):'—')+'</td>' +
          '<td style="font-weight:500">'+cn+'</td>' +
          '<td style="text-align:right;font-weight:700">'+(settings.ti_currency||'SAR')+' '+fmt(inv.grand_total)+'</td>' +
          '<td><span style="font-size:10px;padding:3px 10px;border-radius:12px;font-weight:700;background:'+sc+'22;color:'+sc+'">'+inv.status+'</span></td>' +
          '<td style="font-size:11px;color:var(--muted)">'+(inv.source_quote_id?'&#128279; QT #'+inv.source_quote_id:'—')+'</td>' +
          '<td><div style="display:flex;gap:4px">' +
            '<button onclick="TaxInvoices.openPreview('+inv.id+')" class="act-btn" style="font-size:10px;padding:3px 8px">View</button>' +
            '<button onclick="TaxInvoices.openForm('+inv.id+')" class="act-btn" style="font-size:10px;padding:3px 8px">Edit</button>' +
            '<button onclick="TaxInvoices.duplicate('+inv.id+')" class="act-btn" style="font-size:10px;padding:3px 8px">Copy</button>' +
            '<button onclick="TaxInvoices.deleteInv('+inv.id+')" class="del-btn">&#10005;</button>' +
          '</div></td>' +
        '</tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';
    wrap.innerHTML = html;
  }

  function setFilter(k,v){if(k==='q')filterQ=v;if(k==='status')filterStatus=v;if(k==='from')filterFrom=v;if(k==='to')filterTo=v;showList();}
  function clearFilters(){filterQ='';filterStatus='';filterFrom='';filterTo='';showList();}

  // ── FORM VIEW ─────────────────────────────────────────────────────────
  async function openForm(id) {
    currentView='form'; editingId=id||null;
    wrap.innerHTML='<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:12px;color:var(--muted)"><span class="spinner"></span> Loading...</div>';
    var inv=null;
    if(id){try{inv=await tiReq('GET','/'+id);}catch(e){}}

    var defaultComp = companies.find(function(c){return c.is_default;})||companies[0]||{};
    var fromSnap = (inv&&inv.from_snap) ? inv.from_snap : {
      name:defaultComp.name||settings.ti_company_name||'',
      name_ar:defaultComp.name_ar||'',
      address:defaultComp.address||settings.ti_address||'',
      address_ar:defaultComp.address_ar||'',
      phone:defaultComp.phone||settings.ti_phone||'',
      email:defaultComp.email||settings.ti_email||'',
      website:defaultComp.website||settings.ti_website||'',
      vat_number:defaultComp.vat_number||settings.ti_vat_number||'',
      logo_url:defaultComp.logo_url||settings.ti_logo_url||''
    };
    var custSnap = (inv&&inv.customer_snap)||{};
    var items    = (inv&&inv.items&&inv.items.length)?inv.items:[{description:'',description_ar:'',quantity:1,unit_price:0,line_total:0}];
    var today    = new Date().toISOString().slice(0,10);
    var vatPct   = inv?parseFloat(inv.vat_pct||15):parseFloat(settings.ti_vat_pct||15);
    var bilingual= inv?(inv.bilingual||0):0;
    var currency = inv?(inv.currency||settings.ti_currency||'SAR'):(settings.ti_currency||'SAR');
    var status   = inv?inv.status:'Draft';
    var invType  = inv?(inv.invoice_type||'standard'):'standard';

    var compOpts = '<option value="">-- Select Company --</option>' +
      companies.map(function(c){return '<option value="'+c.id+'"'+(String(fromSnap.company_id||'')===String(c.id)?' selected':'')+'>'+c.name+(c.is_default?' (Default)':'')+'</option>';}).join('');
    var custOpts = '<option value="">-- Select or type --</option>' +
      customers.map(function(c){return '<option value="'+c.id+'">'+c.company_name+(c.contact_name?' | '+c.contact_name:'')+'</option>';}).join('');
    var statusOpts = STATUSES.map(function(s){return '<option'+(status===s?' selected':'')+'>'+s+'</option>';}).join('');
    var currOpts  = ['SAR','USD','EUR','GBP','AED'].map(function(c){return '<option'+(currency===c?' selected':'')+'>'+c+'</option>';}).join('');

    var html = '<div class="pg-hdr">' +
      '<div style="display:flex;align-items:center;gap:12px">' +
        '<button onclick="TaxInvoices.showList()" style="background:none;border:1px solid var(--bord);border-radius:6px;padding:6px 12px;color:var(--text);cursor:pointer">&#8592; Back</button>' +
        '<h2>'+(id?'Edit Tax Invoice':'New Tax Invoice')+'</h2>' +
      '</div>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
        '<label style="font-size:12px;color:var(--muted);display:flex;align-items:center;gap:6px"><input type="checkbox" id="ti-bilingual"'+(bilingual?' checked':'')+' style="width:auto"> &#127758; Bilingual</label>' +
        '<select id="ti-status" style="padding:8px 12px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text)">'+statusOpts+'</select>' +
        '<button onclick="TaxInvoices.saveForm()" style="padding:8px 18px;border:none;border-radius:6px;background:#1e2d4a;color:#fff;font-weight:700;cursor:pointer">&#128190; Save</button>' +
        (id?'<button onclick="TaxInvoices.openPreview('+id+')" style="padding:8px 18px;border:none;border-radius:6px;background:#2abfbf;color:#fff;cursor:pointer">&#128065; Preview</button>':'') +
      '</div></div>';

    // Invoice details bar
    html += '<div class="panel" style="margin-bottom:16px"><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;padding:16px">' +
      '<div><label>Invoice Date *</label><input type="date" id="ti-date" value="'+(inv?inv.invoice_date:today)+'"></div>' +
      '<div><label>Supply Date</label><input type="date" id="ti-supply" value="'+(inv&&inv.supply_date?inv.supply_date:'')+'"></div>' +
      '<div><label>Due Date</label><input type="date" id="ti-due" value="'+(inv&&inv.due_date?inv.due_date:'')+'"></div>' +
      '<div><label>Currency</label><select id="ti-currency" style="padding:10px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);width:100%">'+currOpts+'</select></div>' +
      '<div><label>VAT %</label><input type="number" id="ti-vat" value="'+vatPct+'" step="0.01" min="0" max="100" oninput="TaxInvoices.recalc()"></div>' +
    '</div></div>';

    // FROM / TO
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">';
    html += '<div class="panel"><div class="ph dark">From (Your Company)</div><div class="fb" style="gap:10px">' +
      '<div><label>Select Company</label><select id="ti-comp-sel" onchange="TaxInvoices.fillCompany(this.value)" style="padding:10px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:14px;width:100%">'+compOpts+'</select></div>' +
      '<div class="mrow"><div><label>Name (EN)</label><input id="ti-from-name" value="'+esc(fromSnap.name||'')+'"></div>' +
        '<div><label>الاسم (AR)</label><input id="ti-from-name-ar" value="'+esc(fromSnap.name_ar||'')+'" dir="rtl" style="text-align:right"></div></div>' +
      '<div><label>Address (EN)</label><textarea id="ti-from-addr" style="min-height:45px">'+esc(fromSnap.address||'')+'</textarea></div>' +
      '<div><label>العنوان (AR)</label><textarea id="ti-from-addr-ar" style="min-height:45px" dir="rtl">'+esc(fromSnap.address_ar||'')+'</textarea></div>' +
      '<div class="mrow"><div><label>Phone</label><input id="ti-from-phone" value="'+esc(fromSnap.phone||'')+'"></div>' +
        '<div><label>Email</label><input id="ti-from-email" value="'+esc(fromSnap.email||'')+'"></div></div>' +
      '<div class="mrow"><div><label>Website</label><input id="ti-from-web" value="'+esc(fromSnap.website||'')+'"></div>' +
        '<div><label>VAT Number *</label><input id="ti-from-vat" value="'+esc(fromSnap.vat_number||'')+'" placeholder="Required for ZATCA"></div></div>' +
      '<div><label>Logo URL</label><input id="ti-from-logo" value="'+esc(fromSnap.logo_url||'')+'" placeholder="https://..."></div>' +
    '</div></div>';

    html += '<div class="panel"><div class="ph dark">To (Customer)</div><div class="fb" style="gap:10px">' +
      '<div><label>Select Customer</label><select id="ti-cust-sel" onchange="TaxInvoices.fillCustomer(this.value)" style="padding:10px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:14px;width:100%">'+custOpts+'</select></div>' +
      '<div><label>Company Name *</label><input id="ti-to-company" value="'+esc(custSnap.company_name||'')+'"></div>' +
      '<div><label>Contact Person</label><input id="ti-to-contact" value="'+esc(custSnap.contact_name||'')+'"></div>' +
      '<div class="mrow"><div><label>Email</label><input id="ti-to-email" value="'+esc(custSnap.email||'')+'"></div>' +
        '<div><label>Phone</label><input id="ti-to-phone" value="'+esc(custSnap.phone||'')+'"></div></div>' +
      '<div><label>Address</label><textarea id="ti-to-addr" style="min-height:45px">'+esc(custSnap.address||'')+'</textarea></div>' +
      '<div><label>VAT Number</label><input id="ti-to-vat" value="'+esc(custSnap.vat_number||'')+'"></div>' +
    '</div></div>';
    html += '</div>';

    // Items
    html += '<div class="panel" style="margin-bottom:16px">' +
      '<div class="ph dark" style="display:flex;justify-content:space-between;align-items:center"><span>Line Items</span>' +
        '<button onclick="TaxInvoices.addRow()" style="padding:4px 12px;border:1px solid rgba(255,255,255,.3);border-radius:4px;background:transparent;color:#fff;font-size:12px;cursor:pointer">+ Add Row</button>' +
      '</div>' +
      '<div style="overflow-x:auto"><table class="ltbl"><thead><tr>' +
        '<th style="min-width:280px">Description (EN)</th>' +
        '<th style="min-width:180px">Description (AR)</th>' +
        '<th style="width:80px;text-align:right">Qty</th>' +
        '<th style="width:120px;text-align:right">Unit Price</th>' +
        '<th style="width:120px;text-align:right">Line Total</th>' +
        '<th style="width:36px"></th>' +
      '</tr></thead><tbody id="ti-items-body">';

    items.forEach(function(it,i){ html += itemRow(i,it.description||'',it.description_ar||'',it.quantity||1,it.unit_price||0,it.line_total||0); });
    html += '</tbody></table></div>';

    html += '<div style="display:flex;justify-content:flex-end;padding:16px"><div style="width:280px">' +
      '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bord)"><span style="color:var(--muted)">Subtotal</span><strong id="ti-subtotal">0.00</strong></div>' +
      '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bord)"><span style="color:var(--muted)">VAT (<span id="ti-vat-lbl">'+vatPct+'</span>%)</span><strong id="ti-vat-amt">0.00</strong></div>' +
      '<div style="display:flex;justify-content:space-between;padding:10px 0;font-size:18px"><span style="font-weight:700">Grand Total</span><strong id="ti-total" style="color:var(--teal)">0.00</strong></div>' +
    '</div></div></div>';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">' +
      '<div class="panel"><div class="ph dark">Notes</div><div style="padding:12px"><textarea id="ti-notes" style="width:100%;min-height:70px;background:var(--surf2);border:1px solid var(--bord);border-radius:6px;color:var(--text);padding:10px;font-family:inherit">'+esc(inv?inv.notes||'':'')+'</textarea></div></div>' +
      '<div class="panel"><div class="ph dark">Footer / Terms</div><div style="padding:12px"><textarea id="ti-footer" style="width:100%;min-height:70px;background:var(--surf2);border:1px solid var(--bord);border-radius:6px;color:var(--text);padding:10px;font-family:inherit">'+esc(inv?inv.footer_text||(settings.ti_footer||''):(settings.ti_footer||''))+'</textarea></div></div>' +
    '</div>';

    html += '<div style="display:flex;justify-content:flex-end;gap:10px;margin-bottom:40px">' +
      '<button onclick="TaxInvoices.showList()" style="padding:12px 24px;border:1px solid var(--bord);border-radius:8px;background:var(--surf2);color:var(--text);cursor:pointer">Cancel</button>' +
      '<button onclick="TaxInvoices.saveForm()" style="padding:12px 28px;border:none;border-radius:8px;background:#1e2d4a;color:#fff;font-size:15px;font-weight:700;cursor:pointer">&#128190; Save Invoice</button>' +
    '</div>';

    wrap.innerHTML = html;
    recalc();
    if(inv&&inv.customer_id){var s=el('ti-cust-sel');if(s)s.value=inv.customer_id;}
  }

  function itemRow(i,desc,descAr,qty,price,total){
    var inp=function(cls,val,num,dir){return '<input type="'+(num?'number':'text')+'" value="'+esc(String(val||''))+'" '+(num?'min="0" step="0.01" ':'')+' oninput="TaxInvoices.recalc()" class="ti-'+cls+'" style="width:100%;background:var(--surf2);border:1px solid var(--bord);border-radius:4px;color:var(--text);padding:7px;font-family:inherit;'+(dir?'text-align:right;direction:rtl':'')+(num?';text-align:right':'')+'">';};
    return '<tr id="ti-row-'+i+'">' +
      '<td>'+inp('desc',desc,false,false)+'</td>' +
      '<td>'+inp('desc-ar',descAr,false,true)+'</td>' +
      '<td>'+inp('qty',qty,true,false)+'</td>' +
      '<td>'+inp('price',price,true,false)+'</td>' +
      '<td style="text-align:right;font-weight:600;padding:0 8px" id="ti-lt-'+i+'">'+fmt(total)+'</td>' +
      '<td><button onclick="TaxInvoices.removeRow('+i+')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;padding:4px">&#10005;</button></td>' +
    '</tr>';
  }

  function addRow(){var tbody=el('ti-items-body');if(!tbody)return;var i=tbody.rows.length;var tr=document.createElement('tr');tr.id='ti-row-'+i;tr.innerHTML=itemRow(i,'','',1,0,0).replace('<tr id="ti-row-'+i+'">','').replace('</tr>','');tbody.appendChild(tr);}
  function removeRow(i){var r=el('ti-row-'+i);if(r)r.remove();recalc();}

  function recalc(){
    var tbody=el('ti-items-body');if(!tbody)return;
    var sub=0;
    Array.from(tbody.querySelectorAll('tr')).forEach(function(row,i){
      var qty  =parseFloat((row.querySelector('.ti-qty')  ||{value:0}).value)||0;
      var price=parseFloat((row.querySelector('.ti-price')||{value:0}).value)||0;
      var lt   =Math.round(qty*price*100)/100;
      sub+=lt;
      var lte=row.querySelector('[id^="ti-lt-"]');if(lte)lte.textContent=fmt(lt);
    });
    var vp=parseFloat((el('ti-vat')||{value:15}).value)||0;
    var va=Math.round(sub*vp)/100,tot=sub+va;
    var vlbl=el('ti-vat-lbl');if(vlbl)vlbl.textContent=vp;
    var sv=function(id,v){var e2=el(id);if(e2)e2.textContent=fmt(v);};
    sv('ti-subtotal',sub);sv('ti-vat-amt',va);sv('ti-total',tot);
  }

  function fillCompany(id){
    if(!id)return;
    var c=companies.find(function(x){return String(x.id)===String(id);});if(!c)return;
    var sv=function(eid,val){var e2=el(eid);if(e2)e2.value=val||'';};
    sv('ti-from-name',c.name);sv('ti-from-name-ar',c.name_ar);
    sv('ti-from-phone',c.phone);sv('ti-from-email',c.email);
    sv('ti-from-web',c.website);sv('ti-from-vat',c.vat_number);
    sv('ti-from-logo',c.logo_url);
    var a=el('ti-from-addr');if(a)a.value=c.address||'';
    var aa=el('ti-from-addr-ar');if(aa)aa.value=c.address_ar||'';
  }

  function fillCustomer(id){
    if(!id)return;
    var c=customers.find(function(x){return String(x.id)===String(id);});if(!c)return;
    var sv=function(eid,val){var e2=el(eid);if(e2)e2.value=val||'';};
    sv('ti-to-company',c.company_name);sv('ti-to-contact',c.contact_name);
    sv('ti-to-email',c.email);sv('ti-to-phone',c.phone);sv('ti-to-vat',c.vat_number);
    var a=el('ti-to-addr');if(a)a.value=c.address||'';
  }

  function collectData(){
    var tbody=el('ti-items-body');
    var rows=tbody?tbody.querySelectorAll('tr'):[];
    var items=[],sub=0;
    rows.forEach(function(row){
      var desc =(row.querySelector('.ti-desc')   ||{value:''}).value.trim();
      var descAr=(row.querySelector('.ti-desc-ar')||{value:''}).value.trim();
      var qty  =parseFloat((row.querySelector('.ti-qty')  ||{value:0}).value)||0;
      var price=parseFloat((row.querySelector('.ti-price')||{value:0}).value)||0;
      var lt   =Math.round(qty*price*100)/100;
      sub+=lt;
      if(desc||descAr||qty||price)items.push({description:desc,description_ar:descAr,quantity:qty,unit_price:price,line_total:lt});
    });
    var vp=parseFloat((el('ti-vat')||{value:15}).value)||0;
    var va=Math.round(sub*vp)/100;
    var compId=(el('ti-comp-sel')||{value:''}).value;
    var custId=(el('ti-cust-sel')||{value:''}).value;
    return {
      invoice_date: (el('ti-date')   ||{value:''}).value,
      supply_date:  (el('ti-supply') ||{value:''}).value||null,
      due_date:     (el('ti-due')    ||{value:''}).value||null,
      status:       (el('ti-status') ||{value:'Draft'}).value,
      invoice_type: 'standard',
      customer_id:  custId?parseInt(custId):null,
      currency:     (el('ti-currency')||{value:'SAR'}).value,
      vat_pct:vp, subtotal:sub, vat_amount:va, grand_total:sub+va,
      bilingual:    (el('ti-bilingual')||{checked:false}).checked?1:0,
      notes:        (el('ti-notes') ||{value:''}).value,
      footer_text:  (el('ti-footer')||{value:''}).value,
      from_snap:{
        company_id:  compId,
        name:        (el('ti-from-name')   ||{value:''}).value,
        name_ar:     (el('ti-from-name-ar')||{value:''}).value,
        address:     (el('ti-from-addr')   ||{value:''}).value,
        address_ar:  (el('ti-from-addr-ar')||{value:''}).value,
        phone:       (el('ti-from-phone')  ||{value:''}).value,
        email:       (el('ti-from-email')  ||{value:''}).value,
        website:     (el('ti-from-web')    ||{value:''}).value,
        vat_number:  (el('ti-from-vat')    ||{value:''}).value,
        logo_url:    (el('ti-from-logo')   ||{value:''}).value,
      },
      customer_snap:{
        company_name:(el('ti-to-company')||{value:''}).value,
        contact_name:(el('ti-to-contact')||{value:''}).value,
        email:       (el('ti-to-email')  ||{value:''}).value,
        phone:       (el('ti-to-phone')  ||{value:''}).value,
        address:     (el('ti-to-addr')   ||{value:''}).value,
        vat_number:  (el('ti-to-vat')    ||{value:''}).value,
      },
      items:items,
    };
  }

  async function saveForm(){
    var data=collectData();
    if(!data.invoice_date)return toast('Select invoice date',true);
    if(!data.customer_snap.company_name)return toast('Enter customer name',true);
    if(!data.from_snap.vat_number)return toast('Your VAT number is required for ZATCA compliance',true);
    if(!data.items.length)return toast('Add at least one line item',true);
    try{
      if(editingId){
        await tiReq('PUT','/'+editingId,data);
        var updated=await tiReq('GET','/'+editingId);
        var idx=invoices.findIndex(function(i){return i.id===editingId;});
        if(idx>=0)invoices[idx]=updated;else invoices.unshift(updated);
        toast('Invoice updated!');openPreview(editingId);
      }else{
        var saved=await tiReq('POST','/',data);
        invoices.unshift(saved);
        toast('Invoice created: '+saved.invoice_number);openPreview(saved.id);
      }
    }catch(e){toast(e.message,true);}
  }

  // ── ZATCA QR Code (TLV Base64) ────────────────────────────────────────
  function zatcaQR(inv) {
    var from = inv.from_snap||{};
    var sellerName    = from.name||'';
    var sellerVAT     = from.vat_number||'';
    var invoiceDate   = (inv.invoice_date||'').slice(0,10)+'T00:00:00Z';
    var totalWithVAT  = parseFloat(inv.grand_total||0).toFixed(2);
    var vatAmount     = parseFloat(inv.vat_amount||0).toFixed(2);

    function tlv(tag, value) {
      var enc = unescape(encodeURIComponent(value));
      var len = enc.length;
      var out = String.fromCharCode(tag) + String.fromCharCode(len);
      for (var i=0; i<len; i++) out += enc[i];
      return out;
    }
    var tlvStr = tlv(1,sellerName) + tlv(2,sellerVAT) + tlv(3,invoiceDate) + tlv(4,totalWithVAT) + tlv(5,vatAmount);
    // Base64 encode
    return btoa(unescape(encodeURIComponent(tlvStr)));
  }

  // ── PREVIEW ───────────────────────────────────────────────────────────
  async function openPreview(id){
    currentView='preview';
    wrap.innerHTML='<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:12px;color:var(--muted)"><span class="spinner"></span> Loading...</div>';
    var inv;
    try{inv=await tiReq('GET','/'+id);}catch(e){toast(e.message,true);showList();return;}
    var idx=invoices.findIndex(function(x){return x.id===id;});if(idx>=0)invoices[idx]=inv;
    var sc=STATUS_COLORS[inv.status]||'#64748b';
    var from=inv.from_snap||{};
    var cust=inv.customer_snap||{};
    var cur=inv.currency||'SAR';
    var sub=parseFloat(inv.subtotal||0),vat=parseFloat(inv.vat_amount||0),tot=parseFloat(inv.grand_total||0);
    var bilingual=inv.bilingual||0;
    var today=new Date().toISOString().slice(0,10);
    var overdue=inv.due_date&&inv.due_date<today&&inv.status!=='Paid'&&inv.status!=='Cancelled';

    var html='<div class="pg-hdr">' +
      '<div style="display:flex;align-items:center;gap:12px">' +
        '<button onclick="TaxInvoices.showList()" style="background:none;border:1px solid var(--bord);border-radius:6px;padding:6px 12px;color:var(--text);cursor:pointer">&#8592; Back</button>' +
        '<h2>'+inv.invoice_number+'</h2>' +
        '<span style="font-size:11px;padding:4px 12px;border-radius:12px;font-weight:700;background:'+sc+'22;color:'+sc+'">'+inv.status+'</span>' +
        (overdue?'<span style="font-size:11px;color:var(--red)">&#9888; Overdue</span>':'') +
        (inv.source_quote_id?'<span style="font-size:11px;color:var(--muted)">&#128279; From Quotation #'+inv.source_quote_id+'</span>':'') +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<select onchange="TaxInvoices.changeStatus('+id+',this.value)" style="padding:6px 10px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);font-size:13px">' +
          STATUSES.map(function(s){return '<option'+(inv.status===s?' selected':'')+'>'+s+'</option>';}).join('') +
        '</select>' +
        '<button onclick="TaxInvoices.openForm('+id+')" style="padding:6px 14px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);cursor:pointer">Edit</button>' +
        '<button onclick="TaxInvoices.duplicate('+id+')" style="padding:6px 14px;border:1px solid var(--bord);border-radius:6px;background:var(--surf2);color:var(--text);cursor:pointer">Duplicate</button>' +
        '<button onclick="TaxInvoices.printPDF('+id+')" style="padding:6px 14px;border:none;border-radius:6px;background:#1e2d4a;color:#fff;cursor:pointer;font-weight:700">&#128196; PDF / Print</button>' +
      '</div></div>';

    // Preview body
    html+='<div style="background:var(--surf);border:1px solid var(--bord);border-radius:12px;padding:32px;max-width:820px;margin:0 auto">';

    // Header
    html+='<div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;margin-bottom:18px;border-bottom:3px solid #1e2d4a">';
    html+='<div>';
    if(from.logo_url)html+='<div style="background:#f1f5f9;border-radius:8px;padding:6px 10px;display:inline-block;margin-bottom:8px"><img src="'+from.logo_url+'" style="height:40px;display:block"></div>';
    html+='<div style="font-size:17px;font-weight:800;color:var(--text)">'+esc(from.name||'');
    if(bilingual&&from.name_ar)html+=' &nbsp;<span style="color:var(--muted);font-size:14px">'+esc(from.name_ar)+'</span>';
    html+='</div><div style="font-size:11px;color:var(--muted);margin-top:4px;line-height:1.8">';
    if(from.address)html+=esc(from.address)+'<br>';
    if(from.phone||from.email)html+=[from.phone?'Tel: '+from.phone:'',from.email||''].filter(Boolean).join(' | ')+'<br>';
    if(from.vat_number&&from.vat_number.indexOf('@')===-1)html+='VAT: <strong>'+esc(from.vat_number)+'</strong>';
    html+='</div></div>';
    html+='<div style="text-align:right">';
    html+='<div style="font-size:26px;font-weight:900;color:#1e2d4a">'+(bilingual?'TAX INVOICE':'TAX INVOICE')+'</div>';
    if(bilingual)html+='<div style="font-size:18px;font-weight:800;color:#1e2d4a;direction:rtl">&#1601;&#1575;&#1578;&#1608;&#1585;&#1577; &#1590;&#1585;&#1610;&#1576;&#1610;&#1577;</div>';
    html+='<div style="font-size:14px;font-weight:700;color:#2abfbf;margin-top:4px">'+inv.invoice_number+'</div>';
    html+='<div style="font-size:11px;color:var(--muted);margin-top:6px;line-height:1.8">';
    html+='Invoice Date: <strong>'+fmtD(inv.invoice_date)+'</strong><br>';
    if(inv.supply_date)html+='Supply Date: <strong>'+fmtD(inv.supply_date)+'</strong><br>';
    if(inv.due_date)html+='Due Date: <strong style="color:'+(overdue?'var(--red)':'inherit')+'">'+fmtD(inv.due_date)+'</strong><br>';
    html+='Currency: <strong>'+cur+'</strong></div></div></div>';

    // Bill to
    html+='<div style="margin-bottom:20px;padding:14px;background:var(--surf2);border-radius:8px;border-left:4px solid #2abfbf">';
    html+='<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:6px">'+(bilingual?'Bill To / &#1605;&#1608;&#1580;&#1607; &#1573;&#1604;&#1609;':'Bill To')+'</div>';
    html+='<div style="font-size:15px;font-weight:700">'+esc(cust.company_name||'')+'</div>';
    html+='<div style="font-size:12px;color:var(--muted);margin-top:4px;line-height:1.7">';
    if(cust.contact_name)html+='Attn: '+esc(cust.contact_name)+'<br>';
    if(cust.address)html+=esc(cust.address)+'<br>';
    if(cust.phone)html+=esc(cust.phone)+'<br>';
    if(cust.email)html+=esc(cust.email)+'<br>';
    if(cust.vat_number)html+='VAT: '+esc(cust.vat_number);
    html+='</div></div>';

    // Items
    html+='<table style="width:100%;border-collapse:collapse;margin-bottom:20px"><thead><tr style="background:#1e2d4a;color:#fff">';
    html+='<th style="padding:9px 12px;text-align:left;font-size:11px;width:28px">#</th>';
    html+='<th style="padding:9px 12px;text-align:left;font-size:11px">Description'+(bilingual?' / &#1575;&#1604;&#1608;&#1589;&#1601;':'')+'</th>';
    html+='<th style="padding:9px 12px;text-align:right;font-size:11px;width:55px">Qty</th>';
    html+='<th style="padding:9px 12px;text-align:right;font-size:11px;width:110px">Unit Price</th>';
    html+='<th style="padding:9px 12px;text-align:right;font-size:11px;width:110px">Total</th>';
    html+='</tr></thead><tbody>';
    (inv.items||[]).forEach(function(it,i){
      html+='<tr style="background:'+(i%2===0?'transparent':'rgba(0,0,0,.02)')+';border-bottom:1px solid var(--bord)">';
      html+='<td style="padding:9px 12px;font-size:11px;color:var(--muted)">'+(i+1)+'</td>';
      var dh=esc(it.description||'');
      if(bilingual&&it.description_ar)dh+='<br><span style="direction:rtl;font-size:11px;color:var(--muted)">'+esc(it.description_ar)+'</span>';
      html+='<td style="padding:9px 12px;font-size:13px">'+dh+'</td>';
      html+='<td style="padding:9px 12px;text-align:right;font-size:13px">'+parseFloat(it.quantity||0)+'</td>';
      html+='<td style="padding:9px 12px;text-align:right;font-size:13px">'+cur+' '+fmt(it.unit_price||0)+'</td>';
      html+='<td style="padding:9px 12px;text-align:right;font-size:13px;font-weight:600">'+cur+' '+fmt(it.line_total||0)+'</td>';
      html+='</tr>';
    });
    html+='</tbody></table>';

    // Totals
    html+='<div style="display:flex;justify-content:flex-end;margin-bottom:20px"><div style="width:270px">';
    html+='<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--bord)"><span style="color:var(--muted);font-size:12px">Subtotal'+(bilingual?' / &#1575;&#1604;&#1605;&#1580;&#1605;&#1608;&#1593;':'')+'</span><span style="font-weight:600">'+cur+' '+fmt(sub)+'</span></div>';
    html+='<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--bord)"><span style="color:var(--muted);font-size:12px">VAT ('+parseFloat(inv.vat_pct||15)+'%)</span><span style="font-weight:600">'+cur+' '+fmt(vat)+'</span></div>';
    html+='<div style="display:flex;justify-content:space-between;padding:10px;background:#1e2d4a;color:#fff;border-radius:4px;margin-top:4px">';
    html+='<span style="font-weight:700;font-size:14px">Grand Total'+(bilingual?' / &#1575;&#1604;&#1573;&#1580;&#1605;&#1575;&#1604;&#1610;':'')+'</span>';
    html+='<span style="font-weight:800;font-size:16px;color:#2abfbf">'+cur+' '+fmt(tot)+'</span></div>';
    html+='</div></div>';

    if(inv.notes)html+='<div style="margin-bottom:12px;padding:12px;background:var(--surf2);border-radius:6px;border-left:4px solid var(--teal)"><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Notes</div><div style="font-size:12px">'+esc(inv.notes)+'</div></div>';
    if(inv.footer_text)html+='<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--bord);font-size:11px;color:var(--muted)">'+esc(inv.footer_text)+'</div>';

    html+='</div>';
    wrap.innerHTML=html;
  }

  async function changeStatus(id,status){
    try{await tiReq('PATCH','/'+id+'/status',{status:status});var inv=invoices.find(function(x){return x.id===id;});if(inv)inv.status=status;openPreview(id);toast('Status: '+status);}
    catch(e){toast(e.message,true);}
  }

  async function duplicate(id){
    try{var r=await tiReq('POST','/'+id+'/duplicate',{});var f=await tiReq('GET','/'+r.id);invoices.unshift(f);toast('Duplicated as '+r.invoice_number);openPreview(r.id);}
    catch(e){toast(e.message,true);}
  }

  async function deleteInv(id){
    if(!confirm('Delete this invoice?'))return;
    try{await tiReq('DELETE','/'+id,{});invoices=invoices.filter(function(i){return i.id!==id;});showList();toast('Deleted');}
    catch(e){toast(e.message,true);}
  }

  // ── Convert Quotation → Invoice ───────────────────────────────────────
  async function fromQuote(quoteId){
    try{
      var r=await tiReq('POST','/from-quote/'+quoteId,{});
      var full=await tiReq('GET','/'+r.id);
      invoices.unshift(full);
      toast('Invoice '+r.invoice_number+' created from quotation');
      return r.id;
    }catch(e){toast(e.message,true);return null;}
  }

  // ── PDF PRINT ─────────────────────────────────────────────────────────
  function printPDF(id){
    tiReq('GET','/'+id).then(function(inv){ generatePDF(inv); }).catch(function(e){toast(e.message,true);});
  }

  function generatePDF(inv){
    var cur=inv.currency||'SAR';
    // Pre-generate QR as data URL
    var qrDataUrl = '';
    try {
      var tmpCanvas = document.createElement('canvas');
      // Must be visible for toDataURL to work in some browsers
      tmpCanvas.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:106px;height:106px';
      tmpCanvas.width = 106;
      tmpCanvas.height = 106;
      document.body.appendChild(tmpCanvas);
      var qrBase64Tmp = zatcaQR(inv);
      if (typeof QRious !== 'undefined') {
        new QRious({element: tmpCanvas, value: qrBase64Tmp, size: 106, foreground: '#1e2d4a', background: '#ffffff'});
        qrDataUrl = tmpCanvas.toDataURL('image/png');
      }
      document.body.removeChild(tmpCanvas);
    } catch(e) { console.log('QR pre-gen error', e); }
    var sub=parseFloat(inv.subtotal||0),vat=parseFloat(inv.vat_amount||0),tot=parseFloat(inv.grand_total||0);
    var from=inv.from_snap||{},cust=inv.customer_snap||{};
    var bilingual=inv.bilingual||0;
    var logo=from.logo_url||'';
    var today=new Date().toISOString().slice(0,10);
    var overdue=inv.due_date&&inv.due_date<today&&inv.status!=='Paid';

    // ZATCA QR
    var qrBase64=zatcaQR(inv);
    var itemRows=(inv.items||[]).map(function(it,i){
      var descHTML='<div style="font-size:12px;font-weight:500">'+esc(it.description||'')+'</div>';
      if(bilingual&&it.description_ar)descHTML+='<div style="direction:rtl;font-size:11px;color:#64748b;margin-top:2px">'+esc(it.description_ar)+'</div>';
      return '<tr style="background:'+(i%2===0?'#fff':'#f8fafc')+'">' +
        '<td style="padding:10px 14px;font-size:11px;color:#94a3b8;border-bottom:1px solid #f1f5f9;width:28px">'+(i+1)+'</td>' +
        '<td style="padding:10px 14px;border-bottom:1px solid #f1f5f9">'+descHTML+'</td>' +
        '<td style="padding:10px 14px;text-align:right;font-size:13px;border-bottom:1px solid #f1f5f9;color:#334155">'+parseFloat(it.quantity||0)+'</td>' +
        '<td style="padding:10px 14px;text-align:right;font-size:13px;border-bottom:1px solid #f1f5f9;color:#334155">'+cur+' '+fmt(it.unit_price||0)+'</td>' +
        '<td style="padding:10px 14px;text-align:right;font-size:13px;font-weight:700;border-bottom:1px solid #f1f5f9;color:#1e2d4a">'+cur+' '+fmt(it.line_total||0)+'</td>' +
      '</tr>';
    }).join('');

    // Logo pill
    var logoHTML=logo?'<div style="background:#fff;border-radius:8px;padding:5px 8px;display:inline-block;margin-bottom:10px"><img src="'+logo+'" style="height:44px;display:block"></div>':'';

    // Company name
    var compNameHTML=bilingual&&from.name_ar
      ?'<div style="display:flex;align-items:baseline;gap:14px;flex-wrap:wrap"><span style="font-size:18px;font-weight:900;color:#fff">'+esc(from.name||'')+'</span><span style="width:1px;height:16px;background:rgba(255,255,255,.3);display:inline-block;align-self:center"></span><span style="font-size:16px;font-weight:800;color:rgba(255,255,255,.9);direction:rtl">'+esc(from.name_ar)+'</span></div>'
      :'<div style="font-size:19px;font-weight:900;color:#fff">'+esc(from.name||'')+'</div>';

    // Company details
    var compDet='<div style="font-size:10px;color:rgba(255,255,255,.75);margin-top:8px;line-height:2">';
    if(from.address){var ap=from.address.split(',');compDet+='<div>'+ap.map(function(p){return esc(p.trim());}).join('<br>')+'</div>';}
    if(bilingual&&from.address_ar)compDet+='<div dir="rtl" style="text-align:left">'+esc(from.address_ar)+'</div>';
    var contacts=[];
    if(from.phone)contacts.push('Tel: '+esc(from.phone));
    if(from.email)contacts.push(esc(from.email));
    if(from.website)contacts.push(esc(from.website));
    if(contacts.length)compDet+='<div>'+contacts.join(' &bull; ')+'</div>';
    if(from.vat_number&&from.vat_number.trim()&&from.vat_number.indexOf('@')===-1) {
      compDet+='<div>VAT: '+esc(from.vat_number)+'</div>';
    } else if(from.vat_number&&from.vat_number.indexOf('@')!==-1) {
      // vat field has email - skip, email already shown above
    }
    compDet+='</div>';

    // Title
    var titleHTML=bilingual
      ?'<div><div style="font-size:26px;font-weight:900;color:#fff;letter-spacing:-0.5px">TAX INVOICE</div><div style="font-size:17px;font-weight:800;color:rgba(255,255,255,.9);direction:rtl;margin-top:2px">&#1601;&#1575;&#1578;&#1608;&#1585;&#1577; &#1590;&#1585;&#1610;&#1576;&#1610;&#1577;</div></div>'
      :'<div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px">TAX INVOICE</div>';

    var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+inv.invoice_number+'</title>' +
    '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#e2e8f0}.topbar{background:#1e2d4a;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:99}.page{width:210mm;min-height:297mm;margin:20px auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.12);border-radius:4px;overflow:hidden}.hband{background:linear-gradient(135deg,#1e2d4a 0%,#2d4a6e 100%);padding:26px 30px;display:flex;justify-content:space-between;align-items:flex-start}.body{padding:26px 30px}table{width:100%;border-collapse:collapse}th{background:#1e2d4a;color:#fff;padding:10px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}@media print{.topbar{display:none!important}body{background:#fff}.page{box-shadow:none;margin:0;border-radius:0;width:100%;min-height:0}@page{size:A4;margin:0}}</style>' +
    '</head><body>' +
    '<div class="topbar"><span style="color:#fff;font-weight:700">'+inv.invoice_number+' — Tax Invoice</span><button onclick="window.print()" style="padding:8px 22px;background:#2abfbf;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer">&#128424; Print / Save as PDF</button></div>' +
    '<div class="page">' +
    '<div class="hband">' +
      '<div style="flex:1">'+logoHTML+compNameHTML+compDet+'</div>' +
      '<div style="flex-shrink:0;margin-left:28px;text-align:right">'+titleHTML+
        '<div style="margin-top:8px;display:inline-block;background:rgba(255,255,255,.12);border-radius:6px;padding:8px 14px;text-align:right">' +
          '<div style="font-size:15px;font-weight:800;color:#2abfbf">'+inv.invoice_number+'</div>' +
          '<div style="font-size:10px;color:rgba(255,255,255,.7);margin-top:5px;line-height:1.9">' +
            'Invoice Date: <strong style="color:#fff">'+fmtD(inv.invoice_date)+'</strong><br>' +
            (inv.supply_date?'Supply Date: <strong style="color:#fff">'+fmtD(inv.supply_date)+'</strong><br>':'')+
            (inv.due_date?'Due Date: <strong style="color:'+(overdue?'#fca5a5':'#fff')+'">'+fmtD(inv.due_date)+'</strong><br>':'')+
            'Currency: <strong style="color:#fff">'+cur+'</strong>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="body">' +
    // Bill to + QR
    '<div style="display:grid;grid-template-columns:1fr auto;gap:20px;align-items:start;margin-bottom:22px">' +
      '<div style="background:#f8fafc;border-radius:8px;padding:14px;border-left:4px solid #2abfbf">' +
        '<div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;margin-bottom:7px">'+(bilingual?'BILL TO / &#1605;&#1608;&#1580;&#1607; &#1573;&#1604;&#1609;':'BILL TO')+'</div>' +
        '<div style="font-size:15px;font-weight:800;color:#1e2d4a;margin-bottom:5px">'+esc(cust.company_name||'')+'</div>' +
        '<div style="font-size:11px;color:#64748b;line-height:1.8">' +
          (cust.contact_name?'<div>Attn: <strong>'+esc(cust.contact_name)+'</strong></div>':'')+
          (cust.address?'<div>'+esc(cust.address)+'</div>':'')+
          (cust.phone?'<div>'+esc(cust.phone)+'</div>':'')+
          (cust.email?'<div>'+esc(cust.email)+'</div>':'')+
          (cust.vat_number?'<div>VAT: <strong>'+esc(cust.vat_number)+'</strong></div>':'')+
        '</div>' +
      '</div>' +
      '<div style="text-align:center">' +
        (qrDataUrl ? '<img src="'+qrDataUrl+'" style="border:3px solid #e2e8f0;border-radius:8px;display:block;width:106px;height:106px">' : '<div style="width:106px;height:106px;border:3px solid #e2e8f0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#94a3b8;text-align:center;background:#f8fafc">QR unavailable</div>') +
        '<div style="font-size:8px;color:#94a3b8;margin-top:3px">ZATCA QR Code</div>' +
      '</div>' +
    '</div>' +
    // Items
    '<div style="margin-bottom:18px;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">' +
    '<table><thead><tr>' +
      '<th style="text-align:left;width:28px">#</th>' +
      '<th style="text-align:left">Description'+(bilingual?' / &#1575;&#1604;&#1608;&#1589;&#1601;':'')+'</th>' +
      '<th style="text-align:right;width:55px">Qty'+(bilingual?' / &#1575;&#1604;&#1603;&#1605;':'')+'</th>' +
      '<th style="text-align:right;width:115px">Unit Price'+(bilingual?' / &#1587;&#1593;&#1585;':'')+'</th>' +
      '<th style="text-align:right;width:115px">Total'+(bilingual?' / &#1575;&#1604;&#1573;&#1580;&#1605;&#1575;&#1604;&#1610;':'')+'</th>' +
    '</tr></thead><tbody>'+itemRows+'</tbody></table></div>' +
    // Totals
    '<div style="display:flex;justify-content:flex-end;margin-bottom:18px">' +
    '<div style="width:275px"><div style="background:#f8fafc;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">' +
      '<div style="display:flex;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e2e8f0"><span style="font-size:12px;color:#64748b">Subtotal'+(bilingual?' / &#1575;&#1604;&#1605;&#1580;&#1605;&#1608;&#1593;':'')+'</span><span style="font-size:13px;font-weight:600;color:#1e2d4a">'+cur+' '+fmt(sub)+'</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e2e8f0"><span style="font-size:12px;color:#64748b">VAT ('+parseFloat(inv.vat_pct||15)+'%)'+(bilingual?' / &#1590;&#1585;&#1610;&#1576;&#1577; &#1575;&#1604;&#1602;&#1610;&#1605;&#1577; &#1575;&#1604;&#1605;&#1590;&#1575;&#1601;&#1577;':'')+'</span><span style="font-size:13px;font-weight:600;color:#1e2d4a">'+cur+' '+fmt(vat)+'</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:12px 14px;background:#1e2d4a"><span style="font-size:14px;font-weight:800;color:#fff">Grand Total'+(bilingual?' / &#1575;&#1604;&#1573;&#1580;&#1605;&#1575;&#1604;&#1610;':'')+'</span><span style="font-size:16px;font-weight:900;color:#2abfbf">'+cur+' '+fmt(tot)+'</span></div>' +
    '</div></div></div>' +
    (inv.notes?'<div style="margin-bottom:14px;background:#f0f9ff;border-radius:8px;padding:12px 14px;border-left:4px solid #2abfbf"><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:4px">Notes</div><div style="font-size:11px;color:#334155">'+esc(inv.notes)+'</div></div>':'')+
    '<div style="margin-top:16px;padding-top:14px;border-top:2px solid #f1f5f9;display:flex;justify-content:space-between;align-items:flex-end">' +
      '<div style="font-size:10px;color:#94a3b8">'+(inv.footer_text?'<div style="max-width:380px;line-height:1.6">'+esc(inv.footer_text)+'</div>':'')+
      '<div style="margin-top:6px;font-size:9px;color:#cbd5e1">&#9632; ZATCA Phase 1 Compliant Tax Invoice</div></div>' +
      '<div style="text-align:right"><div style="font-weight:700;color:#1e2d4a;font-size:11px">'+esc(from.name||'')+'</div><div style="font-size:10px;color:#94a3b8">'+inv.invoice_number+'</div></div>' +
    '</div>' +
    '</div></div>' +
'' +
    '</body></html>';

    var w=window.open('','_blank','width=960,height=800');
    w.document.write(html);
    w.document.close();
  }

  function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function fmtD(d){if(!d)return'';var dt=new Date(String(d).slice(0,10)+'T00:00:00');if(isNaN(dt))return d;return['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()]+' '+dt.getDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]+' '+dt.getFullYear();}

  return{render,showList,openForm,openPreview,printPDF,fromQuote,
    setFilter,clearFilters,addRow,removeRow,recalc,
    fillCompany,fillCustomer,saveForm,changeStatus,duplicate,deleteInv};
})();
