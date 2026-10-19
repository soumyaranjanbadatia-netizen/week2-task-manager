import { createdom } from "./createDom.module.js";
import { allTasks, localstorageSetter, deleteTask as deleteTaskShared } from "./data.js";

export const key = "tasks";

let currentSearch = "";
let currentFilter = "all";

const getFilteredTasks = () => {
    return allTasks.filter((task) => {
        const matchesSearch =
            task.title.toLowerCase().includes(currentSearch) ||
            task.content.toLowerCase().includes(currentSearch);
        const matchesFilter = currentFilter === "all" ? true : task.status === currentFilter;
        return matchesSearch && matchesFilter;
    });
};

const updateStats = () => {
    const total = allTasks.length;
    const completed = allTasks.filter((task) => task.status === "completed").length;
    const pending = total - completed;

    const totalTasks = document.querySelector("#totalTasks");
    const completedTasks = document.querySelector("#completedTasks");
    const pendingTasks = document.querySelector("#pendingTasks");

    if (totalTasks) totalTasks.textContent = total;
    if (completedTasks) completedTasks.textContent = completed;
    if (pendingTasks) pendingTasks.textContent = pending;
};

const renderEmptyState = (tasksContainer) => {
    const emptyState = createdom("div", tasksContainer, "", "empty-state");
    const isFiltered = currentSearch || currentFilter !== "all";

    createdom("i", emptyState, "", "fa-regular fa-note-sticky");
    createdom("h3", emptyState, isFiltered ? "No tasks match this view yet." : "No tasks yet.", "h4 mb-2");
    createdom(
        "p",
        emptyState,
        isFiltered
            ? "Try a different search or filter to find your tasks."
            : "Create your first task to start planning your day.",
        "mb-0"
    );
};

const renderTasks = (tasks) => {
    const tasksContainer = document.querySelector("#tasks");
    if (!tasksContainer) return;

    tasksContainer.innerHTML = "";

    if (!tasks.length) {
        renderEmptyState(tasksContainer);
        updateStats();
        return;
    }

    tasks.forEach((task) => {
        const card = createdom("div", tasksContainer, "", "task-card");

        const check = createdom("input", card, "", "form-check-input");
        check.setAttribute("type", "checkbox");
        check.setAttribute("aria-label", `Mark ${task.title} as completed`);
        check.checked = task.status === "completed";

        check.addEventListener("change", () => {
            task.status = check.checked ? "completed" : "notcompleted";
            localstorageSetter(key, allTasks);
            renderActiveView();
        });

        const wrapperParent = createdom("div", card, "", "d-flex justify-content-between align-items-start gap-3 w-100 flex-wrap flex-md-nowrap");
        const wrapperChild = createdom("div", wrapperParent, "", "flex-grow-1");

        createdom(
            "span",
            wrapperChild,
            task.status === "completed" ? "Completed" : "Pending",
            `task-status-badge ${task.status === "completed" ? "completed" : "pending"}`
        );
        createdom("h5", wrapperChild, task.title, "text-capitalize mb-1 fw-bold");
        createdom("small", wrapperChild, task.date, "d-block mb-2");
        createdom("p", wrapperChild, task.content, "");

        const wrapper = createdom("div", wrapperParent, "", "task-actions d-flex gap-2");

        const editBtn = createdom("button", wrapper, `<i class="fa-solid fa-pen-to-square"></i>`, "btn btn-sm btn-outline-info rounded-circle");
        editBtn.setAttribute("aria-label", `Edit ${task.title}`);
        editBtn.addEventListener("click", () => {
            document.querySelector("#title").value = task.title;
            document.querySelector("#date").value = task.date;
            document.querySelector("#content").value = task.content;
            updateContentCount();

            const updatedTasks = deleteTaskShared(task, allTasks);
            allTasks.length = 0;
            allTasks.push(...updatedTasks);
            renderActiveView();
        });

        const deleteBtn = createdom("button", wrapper, `<i class="fa-solid fa-trash"></i>`, "btn btn-sm btn-outline-danger rounded-circle");
        deleteBtn.setAttribute("aria-label", `Delete ${task.title}`);
        deleteBtn.addEventListener("click", () => {
            const updatedTasks = deleteTaskShared(task, allTasks);
            allTasks.length = 0;
            allTasks.push(...updatedTasks);
            renderActiveView();
        });
    });

    updateStats();
};

const renderActiveView = () => {
    renderTasks(getFilteredTasks());
};

const updateContentCount = () => {
    const content = document.querySelector("#content");
    const contentCount = document.querySelector("#contentCount");
    if (!content || !contentCount) return;

    contentCount.textContent = content.value.length;
};

if (document.querySelector("#tasks")) {
    const addButton = document.querySelector("#create");
    const search = document.querySelector("#search");
    const titleInput = document.querySelector("#title");
    const dateInput = document.querySelector("#date");
    const contentInput = document.querySelector("#content");

    const readObject = () => ({
        id: Date.now(),
        title: titleInput.value.trim(),
        date: dateInput.value,
        content: contentInput.value.trim(),
        status: "notcompleted"
    });

    const addToLocalStorage = (task) => {
        allTasks.unshift(task);
        localstorageSetter(key, allTasks);
    };

    const formCheck = () => {
        const title = titleInput.value.trim();
        const date = dateInput.value;
        const content = contentInput.value.trim();

        if (!title || !date || !content) {
            return { isValid: false, message: "Please fill in all fields" };
        }

        if (content.length > 240) {
            return { isValid: false, message: "Task details should stay within 240 characters" };
        }

        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            return { isValid: false, message: "Please select today's or a future date" };
        }

        return { isValid: true };
    };

    const clearForm = () => {
        titleInput.value = "";
        dateInput.value = "";
        contentInput.value = "";
        updateContentCount();
    };

    const setMinDate = () => {
        const today = new Date();
        const month = `${today.getMonth() + 1}`.padStart(2, "0");
        const day = `${today.getDate()}`.padStart(2, "0");
        dateInput.min = `${today.getFullYear()}-${month}-${day}`;
    };

    addButton.addEventListener("click", () => {
        const validation = formCheck();

        if (validation.isValid) {
            const newTask = readObject();
            addToLocalStorage(newTask);
            clearForm();
            renderActiveView();
        } else if (typeof Swal !== "undefined") {
            Swal.fire({
                icon: "error",
                title: "Oops...",
                text: validation.message || "An error occurred"
            });
        }
    });

    if (search) {
        search.addEventListener("input", () => {
            currentSearch = search.value.trim().toLowerCase();
            renderActiveView();
        });
    }

    if (contentInput) {
        contentInput.addEventListener("input", updateContentCount);
    }

    const makeFilter = (btn, label, status) => {
        if (!btn) return;

        btn.addEventListener("click", (event) => {
            event.preventDefault();
            currentFilter = status;
            const screen = document.querySelector(".screen");
            if (screen) screen.textContent = label;
            renderActiveView();
        });
    };

    makeFilter(document.querySelector("#showcompleted"), "Completed", "completed");
    makeFilter(document.querySelector("#shownotcompleted"), "Not Completed", "notcompleted");
    makeFilter(document.querySelector("#all"), "All", "all");

    setMinDate();
    updateContentCount();
    renderActiveView();
}
