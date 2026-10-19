/* ========================================================
   ui.js — Handles all DOM rendering: task list, stats,
   filters, toasts, empty states, and theme visuals.
   ======================================================== */

class TaskUI {
  constructor() {
    // Cache frequently used DOM elements
    this.taskListEl = document.getElementById('taskList');
    this.emptyStateEl = document.getElementById('emptyState');
    this.emptyStateTitleEl = document.getElementById('emptyStateTitle');
    this.emptyStateTextEl = document.getElementById('emptyStateText');

    this.statTotalEl = document.getElementById('statTotal');
    this.statActiveEl = document.getElementById('statActive');
    this.statCompletedEl = document.getElementById('statCompleted');
    this.statHighEl = document.getElementById('statHigh');
    this.statPercentEl = document.getElementById('statPercent');
    this.statRingEl = document.getElementById('statRing');

    this.countAllEl = document.getElementById('countAll');
    this.countActiveEl = document.getElementById('countActive');
    this.countCompletedEl = document.getElementById('countCompleted');

    this.toastEl = document.getElementById('toast');
    this.toastTimeoutId = null;
  }

  /**
   * Renders the full list of tasks (already filtered/searched).
   * @param {Array<Object>} tasks - tasks to display
   * @param {Object} options
   * @param {string} options.activeFilter - current filter ('all' | 'active' | 'completed')
   * @param {string} options.searchTerm - current search term
   */
  renderTasks(tasks, { activeFilter = 'all', searchTerm = '' } = {}) {
    // Clear current list
    this.taskListEl.innerHTML = '';

    if (tasks.length === 0) {
      this.showEmptyState(activeFilter, searchTerm);
      return;
    }

    this.hideEmptyState();

    const fragment = document.createDocumentFragment();
    tasks.forEach((task) => {
      fragment.appendChild(this.buildTaskElement(task));
    });
    this.taskListEl.appendChild(fragment);
  }

  /**
   * Builds a single <li> element representing a task.
   * @param {Object} task
   * @returns {HTMLElement}
   */
  buildTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.dataset.id = task.id;
    li.dataset.priority = task.priority;
    li.draggable = true;

    if (task.completed) {
      li.classList.add('is-completed');
    }

    const overdue = !task.completed && isOverdue(task.dueDate);

    li.innerHTML = `
      <button class="task-item__checkbox" type="button" aria-label="${task.completed ? 'Mark task as incomplete' : 'Mark task as complete'}" data-action="toggle">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </button>
      <div class="task-item__body">
        <div class="task-item__title-row">
          <span class="task-item__title">${escapeHTML(task.title)}</span>
        </div>
        ${task.description ? `<p class="task-item__description">${escapeHTML(task.description)}</p>` : ''}
        <div class="task-item__meta">
          <span class="badge badge--${task.priority}">${capitalize(task.priority)}</span>
          ${task.dueDate ? `<span class="badge badge--due ${overdue ? 'is-overdue' : ''}">${overdue ? 'Overdue · ' : 'Due '}${formatDate(task.dueDate)}</span>` : ''}
          <span class="badge badge--created">Created ${formatCreatedDate(task.createdDate)}</span>
        </div>
      </div>
      <div class="task-item__actions">
        <button class="icon-btn icon-btn--edit" type="button" aria-label="Edit task" data-action="edit" title="Edit">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
        <button class="icon-btn icon-btn--delete" type="button" aria-label="Delete task" data-action="delete" title="Delete">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    `;

    return li;
  }

  /**
   * Plays the "enter" animation on a freshly added task element.
   * @param {string} taskId
   */
  animateTaskEnter(taskId) {
    const el = this.taskListEl.querySelector(`[data-id="${taskId}"]`);
    if (el) {
      el.classList.add('task-enter');
      el.addEventListener('animationend', () => el.classList.remove('task-enter'), { once: true });
    }
  }

  /**
   * Plays the "exit" animation on a task before it's removed,
   * then resolves once the animation completes.
   * @param {string} taskId
   * @returns {Promise<void>}
   */
  animateTaskExit(taskId) {
    return new Promise((resolve) => {
      const el = this.taskListEl.querySelector(`[data-id="${taskId}"]`);
      if (!el) {
        resolve();
        return;
      }
      el.classList.add('task-exit');
      el.addEventListener('animationend', () => resolve(), { once: true });
      // Fallback in case animationend doesn't fire
      setTimeout(resolve, 320);
    });
  }

  /**
   * Updates the statistics dashboard.
   * @param {Object} stats
   * @param {number} stats.total
   * @param {number} stats.active
   * @param {number} stats.completed
   * @param {number} stats.highPriority
   * @param {number} stats.percentComplete
   */
  renderStats({ total, active, completed, highPriority, percentComplete }) {
    this.statTotalEl.textContent = total;
    this.statActiveEl.textContent = active;
    this.statCompletedEl.textContent = completed;
    this.statHighEl.textContent = highPriority;
    this.statPercentEl.textContent = `${percentComplete}%`;
    this.statRingEl.style.setProperty('--pct', percentComplete);

    // Filter button counters
    this.countAllEl.textContent = total;
    this.countActiveEl.textContent = active;
    this.countCompletedEl.textContent = completed;
  }

  /**
   * Highlights the currently active filter button.
   * @param {string} filter - 'all' | 'active' | 'completed'
   */
  setActiveFilterButton(filter) {
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.filter === filter);
    });
  }

  /**
   * Shows the empty state with a contextual message depending
   * on the current filter/search combination.
   * @param {string} activeFilter
   * @param {string} searchTerm
   */
  showEmptyState(activeFilter, searchTerm) {
    let title = 'Nothing here yet';
    let text = 'Add your first task above to get started.';

    if (searchTerm) {
      title = 'No matches found';
      text = `No tasks match "${searchTerm}". Try a different search term.`;
    } else if (activeFilter === 'active') {
      title = 'All caught up';
      text = 'There are no active tasks. Add a new one or check the completed list.';
    } else if (activeFilter === 'completed') {
      title = 'No completed tasks';
      text = 'Tasks you finish will show up here.';
    }

    this.emptyStateTitleEl.textContent = title;
    this.emptyStateTextEl.textContent = text;
    this.emptyStateEl.hidden = false;
  }

  /**
   * Hides the empty state message.
   */
  hideEmptyState() {
    this.emptyStateEl.hidden = true;
  }

  /**
   * Displays a brief toast notification.
   * @param {string} message
   * @param {number} duration - milliseconds before auto-hide
   */
  showToast(message, duration = 2400) {
    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
    }
    this.toastEl.textContent = message;
    this.toastEl.classList.add('is-visible');

    this.toastTimeoutId = setTimeout(() => {
      this.toastEl.classList.remove('is-visible');
    }, duration);
  }

  /**
   * Applies the given theme to the document and updates the
   * toggle button's accessible state.
   * @param {string} theme - 'light' or 'dark'
   */
  applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    }
  }

  /**
   * Displays an inline validation error on a form field.
   * @param {HTMLElement} inputEl
   * @param {HTMLElement} errorEl
   * @param {string} message
   */
  showFieldError(inputEl, errorEl, message) {
    inputEl.classList.add('is-invalid');
    errorEl.textContent = message;
  }

  /**
   * Clears an inline validation error on a form field.
   * @param {HTMLElement} inputEl
   * @param {HTMLElement} errorEl
   */
  clearFieldError(inputEl, errorEl) {
    inputEl.classList.remove('is-invalid');
    errorEl.textContent = '';
  }
}
