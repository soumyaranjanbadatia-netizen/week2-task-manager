/* ========================================================
   app.js — Main application controller.
   Wires together storage, UI, and user interactions.
   Handles: task CRUD, filtering, search, drag & drop,
   theme toggling, keyboard shortcuts, and validation.
   ======================================================== */

class TaskApp {
  constructor() {
    /* ---- Core dependencies ---- */
    this.storage = new TaskStorage();
    this.ui = new TaskUI();

    /* ---- Application state ---- */
    this.tasks = [];
    this.activeFilter = 'all';
    this.searchTerm = '';
    this.editingTaskId = null;

    /* ---- Drag & Drop state ---- */
    this.dragSrcId = null;

    /* ---- Init ---- */
    this._loadData();
    this._bindEvents();
    this._applyTheme();
    this._render();
  }

  /* ========================================================
     INITIALISATION
     ======================================================== */

  /** Loads persisted tasks from localStorage. */
  _loadData() {
    this.tasks = this.storage.loadTasks();
  }

  /** Reads the saved theme and applies it. */
  _applyTheme() {
    const theme = this.storage.loadTheme();
    this.ui.applyTheme(theme);
  }

  /* ========================================================
     EVENT BINDING
     ======================================================== */

  _bindEvents() {
    /* ---- Form submission (add / edit) ---- */
    document.getElementById('taskForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this._handleFormSubmit();
    });

    /* ---- Cancel editing ---- */
    document.getElementById('cancelEditBtn').addEventListener('click', () => {
      this._cancelEdit();
    });

    /* ---- Theme toggle ---- */
    document.getElementById('themeToggle').addEventListener('click', () => {
      this._toggleTheme();
    });

    /* ---- Search (debounced) ---- */
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener(
      'input',
      debounce((e) => {
        this.searchTerm = e.target.value.trim().toLowerCase();
        this._render();
      }, 200)
    );

    /* ---- Filter buttons ---- */
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeFilter = btn.dataset.filter;
        this.ui.setActiveFilterButton(this.activeFilter);
        this._render();
      });
    });

    /* ---- Clear completed tasks ---- */
    document.getElementById('clearCompletedBtn').addEventListener('click', () => {
      this._clearCompleted();
    });

    /* ---- Task list event delegation (toggle / edit / delete) ---- */
    document.getElementById('taskList').addEventListener('click', (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;

      const taskItem = actionEl.closest('.task-item');
      if (!taskItem) return;

      const taskId = taskItem.dataset.id;
      const action = actionEl.dataset.action;

      if (action === 'toggle') this._toggleTask(taskId);
      if (action === 'edit') this._startEdit(taskId);
      if (action === 'delete') this._deleteTask(taskId);
    });

    /* ---- Drag & Drop events (delegated to task list) ---- */
    this._bindDragAndDrop();

    /* ---- Keyboard shortcuts ---- */
    document.addEventListener('keydown', (e) => {
      this._handleKeyboard(e);
    });

    /* ---- Clear validation error as user types in title ---- */
    document.getElementById('taskTitle').addEventListener('input', () => {
      this.ui.clearFieldError(
        document.getElementById('taskTitle'),
        document.getElementById('titleError')
      );
    });
  }

  /* ========================================================
     KEYBOARD SHORTCUTS
     ======================================================== */

  /**
   * Handles global keyboard shortcuts.
   * - Enter  → submit form (native, handled by form submit event)
   * - Escape → cancel editing
   * - Ctrl+F → focus search input
   */
  _handleKeyboard(e) {
    // Escape: cancel edit mode
    if (e.key === 'Escape' && this.editingTaskId) {
      e.preventDefault();
      this._cancelEdit();
      return;
    }

    // Ctrl+F: focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      const searchInput = document.getElementById('searchInput');
      if (document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    }
  }

  /* ========================================================
     FORM HANDLING — ADD & EDIT
     ======================================================== */

  /** Reads the form fields and returns a plain data object. */
  _readForm() {
    return {
      title: document.getElementById('taskTitle').value.trim(),
      description: document.getElementById('taskDescription').value.trim(),
      priority: document.getElementById('taskPriority').value,
      dueDate: document.getElementById('taskDueDate').value,
    };
  }

  /** Validates the form; shows inline errors if invalid. */
  _validateForm(data) {
    const titleInput = document.getElementById('taskTitle');
    const titleError = document.getElementById('titleError');

    this.ui.clearFieldError(titleInput, titleError);

    if (!data.title) {
      this.ui.showFieldError(titleInput, titleError, 'Please enter a task title.');
      titleInput.focus();
      return false;
    }

    if (data.title.length > 120) {
      this.ui.showFieldError(titleInput, titleError, 'Title must be 120 characters or fewer.');
      titleInput.focus();
      return false;
    }

    return true;
  }

  /** Handles "Add task" or "Save changes" form submission. */
  _handleFormSubmit() {
    const data = this._readForm();

    if (!this._validateForm(data)) return;

    if (this.editingTaskId) {
      this._saveEdit(data);
    } else {
      this._addTask(data);
    }
  }

  /** Resets the form fields and any edit state. */
  _resetForm() {
    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value = '';

    this.ui.clearFieldError(
      document.getElementById('taskTitle'),
      document.getElementById('titleError')
    );

    document.getElementById('submitBtnLabel').textContent = 'Add task';
    document.getElementById('submitBtn')
      .querySelector('.btn__icon').textContent = '+';
    document.getElementById('cancelEditBtn').hidden = true;
  }

  /* ========================================================
     TASK CRUD
     ======================================================== */

  /** Creates and saves a new task. */
  _addTask(data) {
    const newTask = {
      id: generateId(),
      title: data.title,
      description: data.description,
      priority: data.priority,
      dueDate: data.dueDate,
      completed: false,
      createdDate: nowISO(),
    };

    this.tasks = this.storage.addTask(this.tasks, newTask);
    this._resetForm();
    this._render();

    // Play entrance animation for the newly added task
    requestAnimationFrame(() => {
      this.ui.animateTaskEnter(newTask.id);
    });

    this.ui.showToast('Task added.');
    document.getElementById('taskTitle').focus();
  }

  /** Populates the form with the selected task's data for editing. */
  _startEdit(taskId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;

    this.editingTaskId = taskId;

    document.getElementById('taskId').value = taskId;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description;
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskDueDate').value = task.dueDate || '';

    document.getElementById('submitBtnLabel').textContent = 'Save changes';
    document.getElementById('submitBtn')
      .querySelector('.btn__icon').textContent = '✓';
    document.getElementById('cancelEditBtn').hidden = false;

    // Smooth scroll to form and focus title
    document.getElementById('taskTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('taskTitle').focus();
  }

  /** Saves edits to an existing task. */
  _saveEdit(data) {
    const taskId = this.editingTaskId;

    this.tasks = this.storage.updateTask(this.tasks, taskId, {
      title: data.title,
      description: data.description,
      priority: data.priority,
      dueDate: data.dueDate,
    });

    this.editingTaskId = null;
    this._resetForm();
    this._render();

    this.ui.showToast('Task updated.');
  }

  /** Cancels edit mode and resets the form. */
  _cancelEdit() {
    this.editingTaskId = null;
    this._resetForm();
  }

  /**
   * Toggles a task's completed status.
   * @param {string} taskId
   */
  _toggleTask(taskId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;

    this.tasks = this.storage.updateTask(this.tasks, taskId, {
      completed: !task.completed,
    });

    this._render();
    this.ui.showToast(task.completed ? 'Marked as active.' : 'Marked as complete.');
  }

  /**
   * Deletes a task with an exit animation.
   * @param {string} taskId
   */
  async _deleteTask(taskId) {
    // Play animation first, then remove from data
    await this.ui.animateTaskExit(taskId);
    this.tasks = this.storage.deleteTask(this.tasks, taskId);

    // If we were editing this task, cancel the edit
    if (this.editingTaskId === taskId) {
      this.editingTaskId = null;
      this._resetForm();
    }

    this._render();
    this.ui.showToast('Task deleted.');
  }

  /** Removes all completed tasks after confirming. */
  _clearCompleted() {
    const completedCount = this.tasks.filter((t) => t.completed).length;

    if (completedCount === 0) {
      this.ui.showToast('No completed tasks to clear.');
      return;
    }

    if (!window.confirm(`Remove ${completedCount} completed task${completedCount !== 1 ? 's' : ''}?`)) {
      return;
    }

    this.tasks = this.storage.clearCompletedTasks(this.tasks);
    this._render();
    this.ui.showToast(`Cleared ${completedCount} completed task${completedCount !== 1 ? 's' : ''}.`);
  }

  /* ========================================================
     FILTERING & SEARCH
     ======================================================== */

  /**
   * Returns a filtered + searched subset of this.tasks.
   * @returns {Array<Object>}
   */
  _getFilteredTasks() {
    let result = this.tasks;

    // Apply filter
    if (this.activeFilter === 'active') {
      result = result.filter((t) => !t.completed);
    } else if (this.activeFilter === 'completed') {
      result = result.filter((t) => t.completed);
    }

    // Apply search (against title + description)
    if (this.searchTerm) {
      const term = this.searchTerm;
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          (t.description && t.description.toLowerCase().includes(term))
      );
    }

    return result;
  }

  /* ========================================================
     STATISTICS
     ======================================================== */

  /** Computes summary statistics from the full task list. */
  _computeStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter((t) => t.completed).length;
    const active = total - completed;
    const highPriority = this.tasks.filter((t) => t.priority === 'high').length;
    const percentComplete = total === 0 ? 0 : Math.round((completed / total) * 100);

    return { total, active, completed, highPriority, percentComplete };
  }

  /* ========================================================
     THEME
     ======================================================== */

  _toggleTheme() {
    const currentTheme = this.storage.loadTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.storage.saveTheme(newTheme);
    this.ui.applyTheme(newTheme);
  }

  /* ========================================================
     DRAG & DROP
     ======================================================== */

  _bindDragAndDrop() {
    const list = document.getElementById('taskList');

    list.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.task-item');
      if (!item) return;
      this.dragSrcId = item.dataset.id;
      item.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      // Required for Firefox
      e.dataTransfer.setData('text/plain', this.dragSrcId);
    });

    list.addEventListener('dragend', (e) => {
      const item = e.target.closest('.task-item');
      if (item) item.classList.remove('is-dragging');
      // Clean up all drag-over indicators
      list.querySelectorAll('.is-drag-over').forEach((el) =>
        el.classList.remove('is-drag-over')
      );
    });

    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const overItem = e.target.closest('.task-item');
      if (!overItem || overItem.dataset.id === this.dragSrcId) return;

      // Highlight the drop target
      list.querySelectorAll('.is-drag-over').forEach((el) =>
        el.classList.remove('is-drag-over')
      );
      overItem.classList.add('is-drag-over');
    });

    list.addEventListener('dragleave', (e) => {
      const overItem = e.target.closest('.task-item');
      if (overItem) overItem.classList.remove('is-drag-over');
    });

    list.addEventListener('drop', (e) => {
      e.preventDefault();
      const overItem = e.target.closest('.task-item');
      if (!overItem || !this.dragSrcId) return;

      const targetId = overItem.dataset.id;
      if (targetId === this.dragSrcId) return;

      // Build new ID order from current DOM order, then swap
      const visibleIds = [...list.querySelectorAll('.task-item')].map(
        (el) => el.dataset.id
      );
      const srcIndex = visibleIds.indexOf(this.dragSrcId);
      const tgtIndex = visibleIds.indexOf(targetId);

      if (srcIndex === -1 || tgtIndex === -1) return;

      // Swap in the visible list
      visibleIds.splice(srcIndex, 1);
      visibleIds.splice(tgtIndex, 0, this.dragSrcId);

      // Build a full ordered ID list: visible tasks in new order,
      // then any hidden (filtered-out) tasks appended in their original order
      const visibleSet = new Set(visibleIds);
      const hiddenIds = this.tasks
        .map((t) => t.id)
        .filter((id) => !visibleSet.has(id));
      const orderedIds = [...visibleIds, ...hiddenIds];

      this.tasks = this.storage.reorderTasks(this.tasks, orderedIds);

      overItem.classList.remove('is-drag-over');
      this._render();
      this.ui.showToast('Task order saved.');
    });
  }

  /* ========================================================
     RENDER
     ======================================================== */

  /**
   * Master render method — updates stats, filter counts,
   * and the task list in a single pass.
   */
  _render() {
    const filteredTasks = this._getFilteredTasks();
    const stats = this._computeStats();

    this.ui.renderStats(stats);
    this.ui.setActiveFilterButton(this.activeFilter);
    this.ui.renderTasks(filteredTasks, {
      activeFilter: this.activeFilter,
      searchTerm: this.searchTerm,
    });
  }
}

/* ========================================================
   Bootstrap the app on DOMContentLoaded
   ======================================================== */
document.addEventListener('DOMContentLoaded', () => {
  window.app = new TaskApp();
});
