document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("modeToggle");
  const status = document.getElementById("status");

  // Initialize popup state
  chrome.storage.local.get(["activated"], function (result) {
    toggle.checked = result.activated || false;
    updateStatus(result.activated);
    console.log("Popup initialized with state:", result.activated);
  });

  toggle.addEventListener("change", async function () {
    const activated = toggle.checked;
    console.log("Toggle changed to:", activated);

    // Update storage
    await chrome.storage.local.set({ activated: activated });
    updateStatus(activated);

    // Send message to background script
    chrome.runtime.sendMessage(
      {
        type: MessageTypes.MODE_CHANGED,
        activated: activated,
      },
      (response) => {
        console.log("Background script response:", response);
      }
    );
  });

  function updateStatus(activated) {
    status.textContent = activated
      ? "Cheating in progress"
      : "Nothing to see here";
    status.className = `status ${activated ? "cheating" : "nothing"}`;
  }
});
