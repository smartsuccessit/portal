/**
 * Roles & Responsibilities App Module
 */
window.Roles = (() => {

const ROLES=[
  {name:'Shahzaib',ini:'SZ',color:'#1e2d4a',
    title:{en:'Senior IT Engineer & Technical Lead',ar:'\u0645\u0647\u0646\u062F\u0633 IT \u0623\u0648\u0644 \u0648\u0645\u0633\u0624\u0648\u0644 \u062A\u0642\u0646\u064A'},
    secs:[
      {t:{en:'Advanced IT Projects',ar:'\u0645\u0634\u0627\u0631\u064A\u0639 IT \u0627\u0644\u0645\u062A\u0642\u062F\u0645\u0629'},
        i:{en:['Database design and management (L1-L3)','Network infrastructure design and deployment (L2-L3)','CCTV system design and configuration (L2-L3)','Server installation and administration (L2-L3)','Web hosting, DNS and cloud infrastructure','Cybersecurity assessment and incident response','POS system deployment and support'],
            ar:['\u062A\u0635\u0645\u064A\u0645 \u0648\u0625\u062F\u0627\u0631\u0629 \u0642\u0648\u0627\u0639\u062F \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A','\u062A\u0635\u0645\u064A\u0645 \u0648\u0646\u0634\u0631 \u0627\u0644\u0628\u0646\u064A\u0629 \u0627\u0644\u062A\u062D\u062A\u064A\u0629 \u0644\u0644\u0634\u0628\u0643\u0627\u062A','\u062A\u0635\u0645\u064A\u0645 \u0648\u062A\u0643\u0648\u064A\u0646 \u0623\u0646\u0638\u0645\u0629 CCTV','\u062A\u0631\u0643\u064A\u0628 \u0648\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u062E\u0648\u0627\u062F\u0645','\u0627\u0633\u062A\u0636\u0627\u0641\u0629 \u0627\u0644\u0648\u064A\u0628 \u0648DNS \u0648\u0627\u0644\u0628\u0646\u064A\u0629 \u0627\u0644\u0633\u062D\u0627\u0628\u064A\u0629','\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0623\u0645\u0646 \u0627\u0644\u0633\u064A\u0628\u0631\u0627\u0646\u064A','\u0646\u0634\u0631 \u0648\u062A\u0634\u063A\u064A\u0644 \u0623\u0646\u0638\u0645\u0629 POS']}},
      {t:{en:'Finance & Reporting',ar:'\u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0648\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631'},
        i:{en:['Calculate and prepare VAT returns','Profit and loss calculations and reporting'],
            ar:['\u062D\u0633\u0627\u0628 \u0648\u0625\u0639\u062F\u0627\u062F \u0625\u0642\u0631\u0627\u0631\u0627\u062A \u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629','\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0631\u0628\u062D \u0648\u0627\u0644\u062E\u0633\u0627\u0631\u0629']}},
    ]},
  {name:'Riyad',ini:'RI',color:'#2c5f8a',
    title:{en:'General Manager & Business Development Lead',ar:'\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645 \u0648\u0631\u0627\u0626\u062F \u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0623\u0639\u0645\u0627\u0644'},
    secs:[
      {t:{en:'Management & Leadership',ar:'\u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0648\u0627\u0644\u0642\u064A\u0627\u062F\u0629'},
        i:{en:['Oversee all team members and daily operations','Manage projects: planning, execution, documentation','Collect and analyze reports from all team members'],
            ar:['\u0627\u0644\u0625\u0634\u0631\u0627\u0641 \u0639\u0644\u0649 \u062C\u0645\u064A\u0639 \u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0641\u0631\u064A\u0642','\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639','\u062C\u0645\u0639 \u0648\u062A\u062D\u0644\u064A\u0644 \u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0641\u0631\u064A\u0642']}},
      {t:{en:'Finance & Compliance',ar:'\u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0648\u0627\u0644\u0627\u0645\u062A\u062B\u0627\u0644'},
        i:{en:['Manage all incoming and outgoing payments','Maintain cash flow and financial planning','Handle legal matters and government platforms (Qiwa, Zakat, GOSI, Mudad)'],
            ar:['\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u062F\u0641\u0648\u0639\u0627\u062A \u0627\u0644\u0648\u0627\u0631\u062F\u0629 \u0648\u0627\u0644\u0635\u0627\u062F\u0631\u0629','\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u062A\u062F\u0641\u0642 \u0627\u0644\u0646\u0642\u062F\u064A','\u0627\u0644\u0634\u0624\u0648\u0646 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629 \u0648\u0627\u0644\u0645\u0646\u0635\u0627\u062A \u0627\u0644\u062D\u0643\u0648\u0645\u064A\u0629']}},
    ]},
  {name:'Azzam',ini:'AZ',color:'#1a5c3a',
    title:{en:'Shop Operations & Sales Coordinator',ar:'\u0645\u0646\u0633\u0642 \u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u0645\u062A\u062C\u0631 \u0648\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A'},
    secs:[
      {t:{en:'POS & Accounting',ar:'\u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064A\u0639 \u0648\u0627\u0644\u0645\u062D\u0627\u0633\u0628\u0629'},
        i:{en:['Manage POS: record sales invoices, purchase orders, expenses','Prepare VAT calculation documents','Manage petty cash and maintain accurate records','Manage vendor payments'],
            ar:['\u0625\u062F\u0627\u0631\u0629 \u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064A\u0639','\u0625\u0639\u062F\u0627\u062F \u0648\u062B\u0627\u0626\u0642 \u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629','\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0646\u062B\u0631\u064A','\u0625\u062F\u0627\u0631\u0629 \u0645\u062F\u0641\u0648\u0639\u0627\u062A \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646']}},
      {t:{en:'Technical Services (L1)',ar:'\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u0642\u0646\u064A\u0629 (L1)'},
        i:{en:['Windows installation, Office setup, driver installations','Minor hardware upgrades: SSD, RAM','Basic troubleshooting and device diagnostics'],
            ar:['\u062A\u062B\u0628\u064A\u062A Windows \u0648\u0625\u0639\u062F\u0627\u062F Office','\u062A\u0631\u0642\u064A\u0627\u062A \u0627\u0644\u0623\u062C\u0647\u0632\u0629 \u0627\u0644\u0628\u0633\u064A\u0637\u0629','\u0627\u0633\u062A\u0643\u0634\u0627\u0641 \u0627\u0644\u0623\u062E\u0637\u0627\u0621 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629']}},
    ]},
  {name:'Hussam',ini:'HU',color:'#7a3a1a',
    title:{en:'Field Technician & Technical Sales',ar:'\u0641\u0646\u064A \u0645\u064A\u062F\u0627\u0646\u064A \u0648\u0645\u0646\u062F\u0648\u0628 \u0645\u0628\u064A\u0639\u0627\u062A \u062A\u0642\u0646\u064A'},
    secs:[
      {t:{en:'Field & Project Work',ar:'\u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0645\u064A\u062F\u0627\u0646\u064A'},
        i:{en:['CCTV installation and configuration (L1)','Network infrastructure projects (L1)','Structured cabling and socket installation','Laptop hardware diagnosis and repair'],
            ar:['\u062A\u0631\u0643\u064A\u0628 \u0648\u062A\u0643\u0648\u064A\u0646 CCTV','\u0645\u0634\u0627\u0631\u064A\u0639 \u0627\u0644\u0628\u0646\u064A\u0629 \u0627\u0644\u062A\u062D\u062A\u064A\u0629 \u0644\u0644\u0634\u0628\u0643\u0627\u062A','\u0627\u0644\u062A\u0645\u062F\u064A\u062F\u0627\u062A \u0627\u0644\u0647\u064A\u0643\u0644\u064A\u0629','\u062A\u0634\u062E\u064A\u0635 \u0648\u0625\u0635\u0644\u0627\u062D \u0627\u0644\u0644\u0627\u0628\u062A\u0648\u0628']}},
      {t:{en:'Sales & Procurement',ar:'\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0648\u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A'},
        i:{en:['Drive sales in-shop and through field visits','Obtain competitive quotations from suppliers'],
            ar:['\u062F\u0641\u0639 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0641\u064A \u0627\u0644\u0645\u062A\u062C\u0631 \u0648\u0627\u0644\u0645\u064A\u062F\u0627\u0646','\u0627\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0639\u0631\u0648\u0636 \u0623\u0633\u0639\u0627\u0631 \u062A\u0646\u0627\u0641\u0633\u064A\u0629']}},
    ]},
  {name:'Shahdat',ini:'SD',color:'#5a2a7a',
    title:{en:'Sales Representative & Market Scout',ar:'\u0645\u0646\u062F\u0648\u0628 \u0645\u0628\u064A\u0639\u0627\u062A \u0648\u0628\u0627\u062D\u062B \u0633\u0648\u0642\u064A'},
    secs:[
      {t:{en:'Sales & Customer Relations',ar:'\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0648\u0639\u0644\u0627\u0642\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0621'},
        i:{en:['Prospect and bring in new customers','Primary contact for Hindi, Urdu and Bengali-speaking customers','Follow up with leads and maintain customer relationships'],
            ar:['\u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0639\u0645\u0644\u0627\u0621 \u062C\u062F\u062F','\u062C\u0647\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0644\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0646\u0627\u0637\u0642\u064A\u0646 \u0628\u0627\u0644\u0647\u0646\u062F\u064A\u0629 \u0648\u0627\u0644\u0623\u0631\u062F\u064A\u0629','\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621']}},
      {t:{en:'Market & Procurement',ar:'\u0627\u0644\u0633\u0648\u0642 \u0648\u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A'},
        i:{en:['Scout the market for competitive pricing','Negotiate with suppliers for best rates'],
            ar:['\u0627\u0633\u062A\u0637\u0644\u0627\u0639 \u0627\u0644\u0633\u0648\u0642 \u0644\u0644\u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u062A\u0646\u0627\u0641\u0633\u064A\u0629','\u0627\u0644\u062A\u0641\u0627\u0648\u0636 \u0645\u0639 \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646']}},
    ]},
];

  function render(wrap) {
    const lang = APP.lang;
    wrap.innerHTML =
      '<div class="pg-hdr"><h2>' + t('rolesH') + '</h2><span style="font-size:11px;color:var(--muted)">Smart Success IT — 2026</span></div>'+
      '<div class="roles-grid">'+
      ROLES.map(p => `
        <div class="rc">
          <div class="rh">
            <div class="rav" style="background:${p.color};color:#fff">${p.ini}</div>
            <div><div class="rn">${p.name}</div>
            <div class="rt">${lang==='ar'?p.title.ar:p.title.en}</div></div>
          </div>
          <div class="rb">
            ${p.secs.map(s => `
              <div class="rs">
                <div class="rs-title">${lang==='ar'?s.t.ar:s.t.en}</div>
                <ul>${s.i[lang].map(item => `<li>${item}</li>`).join('')}</ul>
              </div>`).join('')}
          </div>
        </div>`).join('')+
      '</div>';
  }

  return { render };
})();
