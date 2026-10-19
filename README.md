# Task Manager Project — Documentation

This project contains **two task-manager codebases** that currently live in the same folder:

| App | Brand | Entry point | Data key in localStorage |
|---|---|---|---|
| **Taskline** (modern, class-based) | "Taskline" | `index.html` | `taskline_tasks` (+ `taskline_theme`) |
| **Tmanage** (Bootstrap, module-based) | "Tmanage" | `import.html`, `export.html` (its home page is not in the upload) | `tasks` |

Think of it like two shops that share one building: they have separate stock rooms (different localStorage keys), so tasks in one are invisible to the other. See [Known Issues](#8-known-issues--recommendations).

---

## 1. Quick Start

1. Put all files in the folder structure shown in section 2.
2. Open with VS Code **Live Server** (`.vscode/settings.json` sets the port to `5501`), or just double-click the HTML file.
3. No build step, no `npm install`, no backend. Everything runs in the browser.

> Note: `export.js` and `import.js` use ES modules (`type="module"`), so those pages need to be served over HTTP (Live Server), not opened via `file://`.

---

## 2. Folder Structure

```
project/
├── index.html            # Taskline app shell
├── import.html           # Tmanage: import tasks page
├── export.html           # Tmanage: export tasks page
├── LICENSE               # MIT
├── README.md             # Taskline readme
├── .gitignore
├── .vscode/settings.json # Live Server port 5501
│
├── css/
│   ├── theme.css         # Light/dark color tokens (Taskline)
│   └── style.css         # Taskline styles (Tmanage pages also link css/style.css)
│
└── js/
    ├── utils.js          # Taskline: helper functions
    ├── storage.js        # Taskline: TaskStorage class
    ├── ui.js             # Taskline: TaskUI class
    ├── app.js            # Taskline: TaskApp controller
    ├── createDom.module.js  # Tmanage: DOM helper
    ├── data.js           # Tmanage: shared data + storage helpers
    ├── script.js         # Tmanage: main page logic
    ├── export.js         # Tmanage: export page logic
    └── import.js         # Tmanage: import page logic
```

---

## 3. Taskline

A browser-only task manager with priorities, due dates, search, filters, stats, drag & drop, and dark mode.

### 3.1 Features
- Add, edit, delete tasks (title, description, priority, due date)
- Complete/uncomplete with a checkbox; "Clear completed" with confirm
- Filters: All / Active / Completed, with live counts
- Debounced live search over title + description
- Stats dashboard: Total, Active, Completed, High priority, completion ring
- Drag & drop reordering (order is saved)
- Light/dark theme (saved)
- Overdue badge for past due dates
- Toast notifications, animated enter/exit, reduced-motion support

### 3.2 Keyboard Shortcuts
| Key | Action |
|---|---|
| `Enter` | Submit add/edit form |
| `Esc` | Cancel editing |
| `Ctrl/Cmd + F` | Focus search box |

### 3.3 Data Model
```json
{
  "id": "task_1718000000000_abc1234",
  "title": "Review pull request",
  "description": "Check the auth branch",
  "priority": "high",
  "dueDate": "2026-06-20",
  "completed": false,
  "createdDate": "2026-06-16T08:30:00.000Z"
}
```
`priority` is `low | medium | high`. Stored as an array under `taskline_tasks`; theme (`light`/`dark`) under `taskline_theme`.

### 3.4 Architecture
Analogy: a restaurant. `TaskApp` is the manager, `TaskStorage` is the pantry, `TaskUI` is the waiter/dining room, `utils.js` is the toolbox.

Script load order in `index.html` matters: `utils.js → storage.js → ui.js → app.js` (they're plain scripts sharing the global scope).

**utils.js** — pure helpers

| Function | Purpose |
|---|---|
| `generateId()` | `task_<timestamp>_<random>` |
| `nowISO()` | Current time as ISO string |
| `escapeHTML(str)` | Prevents XSS when using `innerHTML` |
| `formatDate(iso)` / `formatCreatedDate(iso)` | Short readable date |
| `isOverdue(dueDate)` | True if due date is before today |
| `debounce(fn, delay)` | Delays calls until typing pauses |
| `capitalize(str)`, `clamp(v, min, max)` | Misc helpers |

**storage.js — `TaskStorage`**

| Method | Purpose |
|---|---|
| `loadTasks()` / `saveTasks(tasks)` | Read/write with try/catch, safe fallback to `[]` |
| `addTask(tasks, task)` | Prepends task, saves, returns new array |
| `updateTask(tasks, id, updates)` | Merges fields into matching task |
| `deleteTask(tasks, id)` | Removes by id |
| `clearCompletedTasks(tasks)` | Removes tasks where `completed` is true |
| `reorderTasks(tasks, orderedIds)` | Applies new order; unlisted tasks appended |
| `loadTheme()` / `saveTheme(theme)` | Theme persistence |

**ui.js — `TaskUI`** (all DOM work)

| Method | Purpose |
|---|---|
| `renderTasks(tasks, {activeFilter, searchTerm})` | Builds the list or empty state |
| `buildTaskElement(task)` | Builds one `<li>` (draggable, with data-action buttons) |
| `animateTaskEnter(id)` / `animateTaskExit(id)` | CSS animation hooks (exit returns a Promise) |
| `renderStats(stats)` | Updates counters, ring (`--pct` CSS var), filter counts |
| `setActiveFilterButton(filter)` | Highlights active filter |
| `showEmptyState` / `hideEmptyState` | Context-aware empty messages |
| `showToast(msg, duration)` | Temporary notification |
| `applyTheme(theme)` | Sets `data-theme` on `<html>` |
| `showFieldError` / `clearFieldError` | Inline validation |

**app.js — `TaskApp`** (controller)
State: `tasks`, `activeFilter`, `searchTerm`, `editingTaskId`, `dragSrcId`. Every change ends with `_render()`, which filters, computes stats, and redraws.

Key methods: `_addTask`, `_startEdit`, `_saveEdit`, `_cancelEdit`, `_toggleTask`, `_deleteTask`, `_clearCompleted`, `_getFilteredTasks`, `_computeStats`, `_toggleTheme`, `_bindDragAndDrop`, `_handleKeyboard`. Click handling on the list uses **event delegation** via `data-action="toggle|edit|delete"`.

Validation: title required, max 120 chars. Description max 500 (HTML `maxlength`).

### 3.5 Styling
- `theme.css` defines CSS custom properties (`--color-bg`, `--color-accent`, `--priority-*`, shadows). Dark mode overrides them under `[data-theme="dark"]`.
- `style.css` uses BEM-style class names (`.task-item__title`, `.btn--primary`), Google Fonts (Fraunces, Inter, JetBrains Mono), mobile-first breakpoints at 480/640/720px.

---

## 4. Tmanage

A Bootstrap 5 + Font Awesome + SweetAlert2 task app with JSON import/export. The uploaded files include its import/export pages and scripts, but **not its main page HTML** (the one that `script.js` expects).

### 4.1 Data Model
```json
{
  "id": 1718000000000,
  "title": "Buy milk",
  "date": "2026-10-25",
  "content": "2 litres",
  "status": "notcompleted"
}
```
`status` is `"completed"` or `"notcompleted"`. Stored as an array under `tasks`.

### 4.2 Modules

**createDom.module.js** — `createdom(ele, parent, text, classes, id, href, src, alt, cssText)`
Creates an element, appends it to `parent`, and optionally sets innerHTML, class, id, href, src, alt, and inline style. Returns the element. (Like a one-line "build me a div and stick it here" helper.)

**data.js** — shared state
- `allTasks` — loaded from `localStorage["tasks"]`
- `localstorageSetter(key, arr)` — JSON-saves
- `deleteTaskShared(task, allTasks)` (also exported as `deleteTask`) — returns a filtered array and saves it

**script.js** — main page logic (runs only if `#tasks` exists)
- Filtering by search text + status (`all`, `completed`, `notcompleted`)
- `updateStats()` writes to `#totalTasks`, `#completedTasks`, `#pendingTasks`
- `renderTasks()` builds task cards with checkbox, status badge, edit and delete buttons
- Add flow: `formCheck()` validates all fields filled, content ≤ 240 chars, date not in the past; then `readObject()` → `addToLocalStorage()` → `renderActiveView()`
- Edit flow: loads task into the form and removes the original; user re-submits
- Date input `min` set to today; live character counter (`#contentCount`)
- Expected element IDs: `#tasks, #create, #search, #title, #date, #content, #contentCount, #showcompleted, #shownotcompleted, #all, .screen`

**export.js** — `Generate Export` writes `JSON.stringify(allTasks)` into `#screenexport`; the copy button uses `document.execCommand('copy')` and shows a check icon for 2 seconds.

**import.js**
1. Paste button reads the clipboard (`navigator.clipboard.readText()`) into the textarea.
2. Import button: parses JSON, requires an array where every item has `id, title, date, content, status`, saves under `tasks`, shows a SweetAlert success, then redirects to `index.html`.
3. Errors shown through SweetAlert.

### 4.3 Pages
`import.html` and `export.html` share a Bootstrap navbar (Home / Import / Export), `css/style.css`, and use classes like `app-shell`, `content-panel`, `app-primary-btn`, `utility-textarea` (these classes are not defined in the uploaded `style.css`).

---

## 5. Dependencies (CDN)
- Bootstrap 5.3.8 (CSS + bundle JS)
- Font Awesome 7.0.1
- SweetAlert2 v11
- Google Fonts: Fraunces, Inter, JetBrains Mono (Taskline)

## 6. Browser Support
Modern Chrome, Firefox, Safari, Edge. Uses ES6 classes/modules, CSS custom properties, `localStorage`, and the Clipboard API (import paste needs HTTPS or localhost).

## 7. License
MIT, Copyright (c) 2026 Vishal-9451.

---

## 8. Known Issues & Recommendations

1. **Two apps, one folder.** Both link `css/style.css`, and `index.html` is Taskline's, but `import.js` redirects to `index.html` expecting Tmanage. Suggest splitting into two folders, or picking one app.
2. **Incompatible data formats.** Taskline uses `taskline_tasks` with `completed`/`description`/`dueDate`/`priority`; Tmanage uses `tasks` with `status`/`content`/`date`. Exporting from one and importing into the other won't work without a converter.
3. **Missing Tmanage main page.** `script.js` needs an HTML page with the IDs listed in 4.2.
4. **Missing styles.** Tmanage classes (`app-navbar`, `content-panel`, `app-primary-btn`, etc.) have no CSS in the uploaded `style.css`, which only contains Taskline styles.
5. **Tmanage edit risk.** Clicking Edit deletes the task immediately; if the user leaves the page without re-adding, the task is lost. Better: keep an `editingId` and update in place (as Taskline does).
6. **Stale export.** `export.js` reads `allTasks` loaded at module start; if tasks change in another tab, export is outdated. Read from localStorage on click instead.
7. **Deprecated API.** `document.execCommand('copy')` — prefer `navigator.clipboard.writeText()`.
8. **Script order.** `import.html` loads SweetAlert2 after `import.js`; works because Swal is only used at click time, but loading it earlier is safer.
9. **README mismatch.** README describes only Taskline and a `week2-task-manager/` root and `app.js` as `TaskApp`; update it if Tmanage stays.
10. **Taskline:** `clearCompletedTasks` and `filter` rely on `completed` boolean, so imported Tmanage data (using `status`) would show as all active.
