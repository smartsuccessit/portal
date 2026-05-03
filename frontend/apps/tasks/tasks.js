/**
 * Tasks App Module
 */
window.Tasks = (() => {
  let tasks = [], users = [], editId = null;
  const MANAGERS = ['Shahzaib','Riyad'];

  async function render(wrap) {
    try {
      [tasks, users] = await Promise.all([API.getTasks(), API.getUsers()]);
      buildUI(wrap);
    } catch(e) {
      wrap.innerHTML = `<div class="empty">Error: ${e.message}</div>`;
    }
  }

  function canManage() { return MANAGERS.includes(APP.user.name); }

  function buildUI(wrap) {
    const addBtn = `<button class="act-btn grn" onclick="Tasks.openModal()">${t('tmTitle')} +</button>`;
    wrap.innerHTML = `
    <div class="pg-hdr"><h2>${t('tasksH')}</h2>${addBtn}</div>

    <div style="margin-bottom:8px;display:flex;align-items:center;gap:8px">
      <span style="font-size:13px;font-weight:700;color:var(--teal)">&#128100; ${t('taskMyTasks')}</span>
    </div>
    <div class="task-board" id="my-board">
      ${['todo','prog','done'].map((s,i) => `
        <div class="tcol">
          <div class="tch"><span>${[t('colTodo'),t('colProg'),t('colDone')][i]}</span>
          <span class="tcc" id="my-cnt-${s}">0</span></div>
          <div class="tla" id="my-${s}"></div>
          <button class="add-col-btn" data-status="${s}" onclick="Tasks.openModal(this.dataset.status)">+ ${t('tmTitle')}</button>
        </div>`).join('')}
    </div>

    <div style="margin:22px 0 8px;display:flex;align-items:center;gap:8px">
      <span style="font-size:13px;font-weight:700;color:var(--muted)">&#128101; ${t('taskAllTasks')}</span>
    </div>
    <div class="task-board" id="all-board">
      ${['todo','prog','done'].map((s,i) => `
        <div class="tcol">
          <div class="tch"><span>${[t('colTodo'),t('colProg'),t('colDone')][i]}</span>
          <span class="tcc" id="all-cnt-${s}">0</span></div>
          <div class="tla" id="all-${s}"></div>
          <button class="add-col-btn" data-status="${s}" onclick="Tasks.openModal(this.dataset.status)">+ ${t('tmTitle')}</button>
        </div>`).join('')}
    </div>

    <!-- Task Modal -->
    <div class="overlay" id="task-modal">
      <div class="modal">
        <h3 id="tm-h">${t('tmTitle')}</h3>
        <div class="mf">
          <div><label>${t('tmTlbl')}</label><input type="text" id="tm-title"></div>
          <div class="mrow">
            <div><label>${t('tmAlbl')}</label>
              <select id="tm-who">${users.map(u=>`<option value="${u.name}">${u.name}</option>`).join('')}</select>
            </div>
            <div><label>${t('tmPlbl')}</label>
              <select id="tm-prio">
                <option value="h">${t('pH')}</option>
                <option value="m" selected>${t('pM')}</option>
                <option value="l">${t('pL')}</option>
              </select>
            </div>
          </div>
          <div class="mrow">
            <div><label>${t('tmSlbl')}</label>
              <select id="tm-status">
                <option value="todo">${t('sTodo')}</option>
                <option value="prog">${t('sProg')}</option>
                <option value="done">${t('sDone')}</option>
              </select>
            </div>
            <div><label>${t('tmDlbl')}</label><input type="date" id="tm-due"></div>
          </div>
          <div><label>${t('tmNlbl')}</label><textarea id="tm-notes" style="min-height:55px"></textarea></div>
        </div>
        <div class="mact">
          <button class="btn-c" onclick="Tasks.closeModal()">${t('tmCancel')}</button>
          ${editId && canManage() ? `<button class="btn-d" onclick="Tasks.deleteTask(${editId})">${t('taskDelete')}</button>` : ''}
          <button class="btn-s" onclick="Tasks.saveTask()">${t('tmSave')}</button>
        </div>
      </div>
    </div>`;

    renderBoards();
  }

  function renderBoards() {
    const cols = { todo:[], prog:[], done:[] };
    const mine = { todo:[], prog:[], done:[] };
    tasks.forEach(tk => {
      if (cols[tk.status]) {
        cols[tk.status].push(tk);
        if (tk.assigned_to === APP.user.name) mine[tk.status].push(tk);
      }
    });

    const pc = { h:'ph-c', m:'pm-c', l:'pl-c' };
    const pl = { h:t('pH'), m:t('pM'), l:t('pL') };

    function cardHTML(tk) {
      const delBtn = canManage()
        ? `<button class="del-btn" style="margin-left:4px" data-id="${tk.id}" onclick="event.stopPropagation();Tasks.deleteTask(Number(this.dataset.id))">&#10005;</button>`
        : '';
      return `<div class="ti" data-id="${tk.id}" onclick="Tasks.openModal(null,Number(this.dataset.id))">
        <div class="ti-title"><span>${tk.title}</span>${delBtn}</div>
        <div class="ti-meta">
          <span>${tk.assigned_to}</span>
          <span class="tpr ${pc[tk.priority]}">${pl[tk.priority]}</span>
          ${tk.due_date ? `<span>${tk.due_date}</span>` : ''}
        </div>
        ${tk.created_by !== tk.assigned_to ? `<div style="font-size:10px;color:var(--muted);margin-top:3px">${t('taskAddedBy')}: ${tk.created_by}</div>` : ''}
      </div>`;
    }

    ['todo','prog','done'].forEach(s => {
      const mCnt = el(`my-cnt-${s}`);   if(mCnt) mCnt.textContent = mine[s].length;
      const aCnt = el(`all-cnt-${s}`);  if(aCnt) aCnt.textContent = cols[s].length;
      const mEl  = el(`my-${s}`);
      const aEl  = el(`all-${s}`);
      if (mEl) mEl.innerHTML = mine[s].length ? mine[s].map(cardHTML).join('') : `<div style="padding:16px;text-align:center;color:var(--muted);font-size:12px">${t('taskNoMyTasks')}</div>`;
      if (aEl) aEl.innerHTML = cols[s].length  ? cols[s].map(cardHTML).join('') : `<div style="padding:16px;text-align:center;color:var(--muted);font-size:12px">${t('taskNoTasks')}</div>`;
    });
  }

  function openModal(status, id) {
    editId = id || null;
    const modal = el('task-modal');
    if (!modal) return;

    el('tm-h').textContent = id ? 'Edit Task' : t('tmTitle');
    el('tm-who').value     = APP.user.name;
    el('tm-prio').value    = 'm';
    el('tm-status').value  = status || 'todo';
    el('tm-due').value     = '';
    el('tm-notes').value   = '';
    el('tm-title').value   = '';

    if (id) {
      const tk = tasks.find(x => x.id === id);
      if (tk) {
        el('tm-title').value  = tk.title;
        el('tm-who').value    = tk.assigned_to;
        el('tm-prio').value   = tk.priority;
        el('tm-status').value = tk.status;
        el('tm-due').value    = tk.due_date || '';
        el('tm-notes').value  = tk.notes || '';
      }
    }

    // Update delete button visibility
    const deleteBtn = modal.querySelector('.btn-d');
    if (deleteBtn) deleteBtn.style.display = (id && canManage()) ? 'inline-block' : 'none';

    modal.classList.add('open');
  }

  function closeModal() {
    const m = el('task-modal');
    if (m) m.classList.remove('open');
  }

  async function saveTask() {
    const title = el('tm-title').value.trim();
    if (!title) return toast('Add a task title', true);
    const data = {
      title,
      assigned_to: el('tm-who').value,
      priority:    el('tm-prio').value,
      status:      el('tm-status').value,
      due_date:    el('tm-due').value,
      notes:       el('tm-notes').value,
    };
    try {
      if (editId) {
        await API.updateTask(editId, data);
        const idx = tasks.findIndex(x => x.id === editId);
        if (idx >= 0) tasks[idx] = { ...tasks[idx], ...data };
      } else {
        const newTask = await API.addTask(data);
        tasks.unshift(newTask);
      }
      closeModal();
      renderBoards();
      toast(t('tTask'));
    } catch(e) { toast(e.message, true); }
  }

  async function deleteTask(id) {
    if (!canManage()) return toast('Managers only', true);
    if (!confirm(t('taskDeleteConfirm'))) return;
    try {
      await API.deleteTask(id);
      tasks = tasks.filter(x => x.id !== id);
      closeModal();
      renderBoards();
      toast(t('tTaskDel'));
    } catch(e) { toast(e.message, true); }
  }

  return { render, openModal, closeModal, saveTask, deleteTask };
})();
