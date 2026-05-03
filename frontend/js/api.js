/**
 * api.js — Centralised API client for Smart Success Portal
 */
window.API = (() => {
  const BASE = '/api';

  function getToken()     { return localStorage.getItem('ss_token') || ''; }
  function setToken(t)    { localStorage.setItem('ss_token', t); }
  function clearToken()   { localStorage.removeItem('ss_token'); localStorage.removeItem('ss_user'); }

  async function req(method, ep, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const r    = await fetch(BASE + ep, opts);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Server error ' + r.status);
    return data;
  }

  const get  = ep      => req('GET',    ep);
  const post = (ep, b) => req('POST',   ep, b);
  const put  = (ep, b) => req('PUT',    ep, b);
  const del  = ep      => req('DELETE', ep);

  // Generic request method for new apps
  const rawReq = (method, ep, body) => req(method, ep, body);

  return {
    req: rawReq,
    setToken, getToken, clearToken,
    login:            (name, pin) => post('/users/login', { name, pin }),
    getUsers:         ()           => get('/users'),
    me:               ()           => get('/users/me'),
    addUser:          d            => post('/users', d),
    updateUser:       (id, d)      => put(`/users/${id}`, d),
    deleteUser:       id           => del(`/users/${id}`),
    changePin:        (id, d)      => put(`/users/${id}/pin`, d),
    getEntries:       ()           => get('/petty-cash'),
    addEntry:         d            => post('/petty-cash', d),
    approveEntry:     id           => put(`/petty-cash/${id}/approve`, {}),
    requestDelete:    id           => put(`/petty-cash/${id}/request-delete`, {}),
    approveDelete:    id           => put(`/petty-cash/${id}/approve-delete`, {}),
    exportEntries:    ()           => get('/petty-cash/export'),
    getCategories:    ()           => get('/petty-cash/categories'),
    addCategory:      d            => post('/petty-cash/categories', d),
    updateCategory:   (id, d)      => put(`/petty-cash/categories/${id}`, d),
    deleteCategory:   id           => del(`/petty-cash/categories/${id}`),
    getTasks:         ()           => get('/tasks'),
    addTask:          d            => post('/tasks', d),
    updateTask:       (id, d)      => put(`/tasks/${id}`, d),
    deleteTask:       id           => del(`/tasks/${id}`),
    getDay:           date         => get(`/daily-report/${date}`),
    getRange:         (s, e)       => get(`/daily-report/range/${s}/${e}`),
    addDailyEntry:    d            => post('/daily-report/entry', d),
    deleteDailyEntry: id           => del(`/daily-report/entry/${id}`),
    saveQuotations:   (date, q)    => put('/daily-report/quotations', { report_date: date, quotations: q }),
    resetDay:         date         => del(`/daily-report/reset/${date}`),
    getSettings:      ()           => get('/settings'),
    saveSettings:     d            => put('/settings', d),
  };
})();
