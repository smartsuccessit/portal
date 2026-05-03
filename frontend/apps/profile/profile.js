/**
 * Profile App Module
 */
window.Profile = (() => {
  function render(wrap) {
    const u = APP.user;
    if (!u) return;
    wrap.innerHTML = `
    <div class="pg-hdr"><h2>&#128100; ${t('profTitle')}</h2></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:800px">

      <div class="panel">
        <div class="ph dark">&#128394; ${t('appProfile')}</div>
        <div class="fb" style="gap:16px">
          <div style="font-size:12px;color:var(--muted)">${t('profNameNote')}</div>
          <div><label>${t('profNameEn')}</label>
            <input type="text" id="prof-en" value="${u.name}" placeholder="Your name in English">
          </div>
          <div><label>${t('profNameAr')}</label>
            <input type="text" id="prof-ar" value="${u.name_ar||''}" placeholder="&#1575;&#1587;&#1605;&#1603; &#1576;&#1575;&#1604;&#1593;&#1585;&#1576;&#1610;&#1577;" dir="rtl" style="text-align:right">
          </div>
          <button onclick="Profile.saveName()" style="padding:11px;background:var(--teal);color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;width:100%">${t('profSaveName')}</button>
        </div>
      </div>

      <div class="panel">
        <div class="ph dark">&#128273; ${t('profPin')}</div>
        <div class="fb" style="gap:16px">
          <div><label>${t('profCurPin')}</label>
            <input type="password" id="prof-cur" maxlength="4" placeholder="&#8226;&#8226;&#8226;&#8226;" style="letter-spacing:6px;font-size:20px;text-align:center">
          </div>
          <div><label>${t('profNewPin')}</label>
            <input type="password" id="prof-new" maxlength="4" placeholder="&#8226;&#8226;&#8226;&#8226;" style="letter-spacing:6px;font-size:20px;text-align:center">
          </div>
          <div><label>${t('profConfPin')}</label>
            <input type="password" id="prof-conf" maxlength="4" placeholder="&#8226;&#8226;&#8226;&#8226;" style="letter-spacing:6px;font-size:20px;text-align:center">
          </div>
          <button onclick="Profile.savePin()" style="padding:11px;background:var(--navy);color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;width:100%">${t('profSavePin')}</button>
        </div>
      </div>
    </div>

    <div style="margin-top:20px;max-width:800px;background:var(--surf2);border:1px solid var(--bord);border-radius:10px;padding:16px 20px;display:flex;align-items:center;gap:16px">
      <div style="width:52px;height:52px;border-radius:50%;background:${u.color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;flex-shrink:0">${u.initials}</div>
      <div>
        <div style="font-size:16px;font-weight:700">${u.name}${u.name_ar ? ' / '+u.name_ar : ''}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">${u.role}</div>
        <div style="font-size:11px;color:var(--teal);margin-top:3px">${u.is_admin?'&#9881; Admin ':' '}${u.is_approver?'&#10003; Approver':''}</div>
      </div>
    </div>`;
  }

  async function saveName() {
    const nameEn = (el('prof-en')||{value:''}).value.trim();
    const nameAr = (el('prof-ar')||{value:''}).value.trim();
    if (!nameEn) return toast(t('profErrName'), true);
    try {
      await API.updateUser(APP.user.id, { name_ar: nameAr });
      APP.user.name_ar = nameAr;
      localStorage.setItem('ss_user', JSON.stringify(APP.user));
      // Update header
      const sn = el('sess-name');
      if (sn) sn.textContent = APP.lang === 'ar' && nameAr ? nameAr : APP.user.name;
      toast(t('profSavedName'));
      render(el('app-wrap'));
    } catch(e) { toast(e.message, true); }
  }

  async function savePin() {
    const cur  = (el('prof-cur') ||{value:''}).value.trim();
    const nw   = (el('prof-new') ||{value:''}).value.trim();
    const conf = (el('prof-conf')||{value:''}).value.trim();
    if (!/^\d{4}$/.test(nw))  return toast(t('profErrPin4'), true);
    if (nw !== conf)           return toast(t('profErrPinMatch'), true);
    try {
      await API.changePin(APP.user.id, { current_pin: cur, new_pin: nw });
      ['prof-cur','prof-new','prof-conf'].forEach(id => { const e=el(id); if(e) e.value=''; });
      toast(t('profSavedPin'));
    } catch(e) { toast(e.message, true); }
  }

  return { render, saveName, savePin };
})();
