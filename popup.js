document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("modeToggle");
  const status = document.getElementById("status");

  // Load saved mode
  chrome.storage.local.get(["examMode"], function (result) {
    toggle.checked = result.examMode || false;
    updateStatus(result.examMode);
  });

  // Handle mode changes
  toggle.addEventListener("change", function () {
    const examMode = toggle.checked;
    chrome.storage.local.set({ examMode: examMode });
    updateStatus(examMode);

    // Notify content script of mode change
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "MODE_CHANGED",
          examMode: examMode,
        });
      }
    });
  });

  function updateStatus(examMode) {
    status.textContent = examMode ? "Exam Mode" : "Training Mode";
    status.className = `status ${examMode ? "exam" : "training"}`;
  }
});
