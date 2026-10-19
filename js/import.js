import { localstorageSetter } from "./data.js";

// Use a local key to avoid importing from script.js (prevents circular deps)
const key = "tasks";

document.addEventListener("DOMContentLoaded", () => {
    const screenimport = document.querySelector("#screenimport");
    const importBtn = document.querySelector("#import");
    const pasteBtn = document.querySelector("#paste")
    if (!screenimport || !importBtn || !pasteBtn) return;

    importBtn.addEventListener("click", () => {
        const raw = (screenimport.value || "").trim();

        if (!raw) {
            if (typeof Swal !== "undefined") {
                Swal.fire({
                    icon: "error",
                    title: "Oops...",
                    text: "Please paste the JSON data to import."
                });
            }
            return;
        }

        try {
            const parsed = JSON.parse(raw);

            if (!Array.isArray(parsed)) {
                throw new Error("Imported data must be an array of tasks");
            }

            // Optional: basic shape check for tasks
            const isValid = parsed.every(t => typeof t === "object" && t !== null &&
                "id" in t && "title" in t && "date" in t && "content" in t && "status" in t);

            if (!isValid) {
                throw new Error("Invalid task format. Each task must include id, title, date, content, and status.");
            }

            // Persist to localStorage; index page will pick it up on load
            localstorageSetter(key, parsed);

            if (typeof Swal !== "undefined") {
                Swal.fire({
                    icon: "success",
                    title: "Imported",
                    text: "Tasks imported successfully!",
                    confirmButtonText: "OK"
                }).then(() => {
                    // Optionally navigate back to home where tasks are shown
                    window.location.href = "index.html";
                });
            }
        } catch (err) {
            console.error("Failed to import tasks:", err);
            if (typeof Swal !== "undefined") {
                Swal.fire({
                    icon: "error",
                    title: "Invalid JSON",
                    text: err.message || "Please ensure the pasted data is valid JSON."
                });
            }
        }
    });

    pasteBtn.addEventListener("click",async()=>{
        const text = await navigator.clipboard.readText()
     document.querySelector('#screenimport').value = text;
     pasteBtn.innerHTML = `<i class="fa-solid fa-check"></i>`
    setTimeout(()=>{
        pasteBtn.innerHTML = `<i class="fa-solid fa-paste"></i>`
        console.log("done")
    },2000)
    })
});