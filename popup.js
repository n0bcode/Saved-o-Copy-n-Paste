// When the popup loads, get the current settings from storage
document.addEventListener("DOMContentLoaded", () => {
  const previewToggle = document.getElementById("previewToggle");
  const layoutSelect = document.getElementById("layoutSelect");
  const saveButton = document.getElementById("saveSettings");
  const saveStatus = document.getElementById("saveStatus");

  // Load settings from storage
  if (chrome && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(
      {
        enablePreviews: true,
        layout: "vertical",
      },
      (items) => {
        previewToggle.checked = items.enablePreviews;
        layoutSelect.value = items.layout;
      }
    );
  } else {
    console.log("chrome.storage.sync not available, using default settings.");
    previewToggle.checked = true;
    layoutSelect.value = "vertical";
  }

  // Save settings when the button is clicked
  saveButton.addEventListener("click", () => {
    const enablePreviews = previewToggle.checked;
    const layout = layoutSelect.value;

    if (chrome && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set(
        {
          enablePreviews: enablePreviews,
          layout: layout,
        },
        () => {
          saveStatus.textContent = "Settings saved!";
          saveStatus.style.color = "#28a745"; // Success green

          // Send message to content script to update settings in real-time
          if (chrome && chrome.runtime) {
            chrome.runtime.sendMessage({
              action: "updateSettings",
              enablePreviews: enablePreviews,
              layout: layout,
            });
          } else {
            console.log("chrome.runtime not available, settings update message not sent.");
          }

          // Clear the status message after a short delay
          setTimeout(() => {
            saveStatus.textContent = "";
          }, 2000);
        }
      );
    } else {
      console.log("chrome.storage.sync not available, settings not saved.");
      saveStatus.textContent = "Error: Settings could not be saved.";
      saveStatus.style.color = "#dc3545"; // Error red
    }
  });
});
