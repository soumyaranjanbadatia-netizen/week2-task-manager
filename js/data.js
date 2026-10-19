// Shared data and functions
export let allTasks = JSON.parse(localStorage.getItem("tasks")) || [];

export const localstorageSetter = (key, arr) => {
    localStorage.setItem(key, JSON.stringify(arr));
};

export const deleteTaskShared = (taskToRemove, allTasks) => {
    try {
        const newTasks = allTasks.filter(ele => ele.id !== taskToRemove.id);
        localstorageSetter("tasks", newTasks);
        return newTasks;
    } catch (error) {
        console.error('Error deleting task:', error);
        return allTasks; // Return original array if there's an error
    }
};

// Backward compatibility: keep the original export name expected by script.js
export { deleteTaskShared as deleteTask };
