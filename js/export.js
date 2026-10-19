import { allTasks } from "./data.js"

document.addEventListener('DOMContentLoaded', () => {
    const exportBtn = document.querySelector("#export");
    const exportScreen = document.querySelector("#screenexport");
    const copyBtn = document.querySelector(".copy");

    if (exportBtn && exportScreen) {
        exportBtn.addEventListener("click", () => {
            
            
            exportScreen.value = JSON.stringify(allTasks) || [];
        });
    }

    if (copyBtn && exportScreen) {
        copyBtn.addEventListener("click", () => {
            exportScreen.select();
            document.execCommand('copy');
            
            // Change button text temporarily
            const originalText = copyBtn.innerHTML;
            
            copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                
            }, 2000);
        });
    }
});