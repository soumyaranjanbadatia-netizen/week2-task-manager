/* ========================================================
   storage.js — All localStorage interactions, wrapped in a
   TaskStorage class for reuse and easy error handling.
   ======================================================== */

class TaskStorage {
  /**
   * @param {string} storageKey - localStorage key for tasks
   * @param {string} themeKey - localStorage key for theme preference
   */
  constructor(storageKey = 'taskline_tasks', themeKey = 'taskline_theme') {
    this.storageKey = storageKey;
    this.themeKey = themeKey;
  }

  /**
   * Loads the task list from localStorage.
   * Returns an empty array if nothing is stored or data is corrupt.
   * @returns {Array<Object>}
   */
  loadTasks() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (error) {
      console.error('TaskStorage.loadTasks: failed to read tasks from localStorage', error);
      return [];
    }
  }

  /**
   * Persists the full task list to localStorage.
   * @param {Array<Object>} tasks
   * @returns {boolean} success flag
   */
  saveTasks(tasks) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(tasks));
      return true;
    } catch (error) {
      console.error('TaskStorage.saveTasks: failed to write tasks to localStorage', error);
      return false;
    }
  }

  /**
   * Adds a new task object to storage.
   * @param {Array<Object>} tasks - current task list
   * @param {Object} task - new task to add
   * @returns {Array<Object>} updated task list
   */
  addTask(tasks, task) {
    const updated = [task, ...tasks];
    this.saveTasks(updated);
    return updated;
  }

  /**
   * Updates an existing task by ID with the provided fields.
   * @param {Array<Object>} tasks - current task list
   * @param {string} id - task ID to update
   * @param {Object} updates - fields to merge into the task
   * @returns {Array<Object>} updated task list
   */
  updateTask(tasks, id, updates) {
    const updated = tasks.map((task) =>
      task.id === id ? { ...task, ...updates } : task
    );
    this.saveTasks(updated);
    return updated;
  }

  /**
   * Removes a task by ID.
   * @param {Array<Object>} tasks - current task list
   * @param {string} id - task ID to remove
   * @returns {Array<Object>} updated task list
   */
  deleteTask(tasks, id) {
    const updated = tasks.filter((task) => task.id !== id);
    this.saveTasks(updated);
    return updated;
  }

  /**
   * Removes all tasks marked as completed.
   * @param {Array<Object>} tasks - current task list
   * @returns {Array<Object>} updated task list
   */
  clearCompletedTasks(tasks) {
    const updated = tasks.filter((task) => !task.completed);
    this.saveTasks(updated);
    return updated;
  }

  /**
   * Reorders tasks based on an array of IDs in the desired order,
   * then persists the new order.
   * @param {Array<Object>} tasks - current task list
   * @param {Array<string>} orderedIds - task IDs in new order
   * @returns {Array<Object>} reordered task list
   */
  reorderTasks(tasks, orderedIds) {
    const taskMap = new Map(tasks.map((task) => [task.id, task]));
    const reordered = orderedIds
      .map((id) => taskMap.get(id))
      .filter(Boolean);

    // Append any tasks not present in orderedIds (safety net)
    tasks.forEach((task) => {
      if (!orderedIds.includes(task.id)) {
        reordered.push(task);
      }
    });

    this.saveTasks(reordered);
    return reordered;
  }

  /**
   * Reads the saved theme preference ('light' or 'dark').
   * Defaults to 'light' if nothing is stored.
   * @returns {string}
   */
  loadTheme() {
    try {
      return localStorage.getItem(this.themeKey) || 'light';
    } catch (error) {
      console.error('TaskStorage.loadTheme: failed to read theme from localStorage', error);
      return 'light';
    }
  }

  /**
   * Saves the theme preference.
   * @param {string} theme - 'light' or 'dark'
   * @returns {boolean} success flag
   */
  saveTheme(theme) {
    try {
      localStorage.setItem(this.themeKey, theme);
      return true;
    } catch (error) {
      console.error('TaskStorage.saveTheme: failed to write theme to localStorage', error);
      return false;
    }
  }
}
