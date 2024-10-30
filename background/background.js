const MessageTypes = {
  MODE_CHANGED: "MODE_CHANGED",
  TOGGLE_CHEAT: "TOGGLE_CHEAT",
};

class BackgroundController {
  constructor() {
    this.initialize();
  }

  initialize() {
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
  }

  async handleMessage(message, sender, sendResponse) {
    if (message.type === MessageTypes.MODE_CHANGED) {
      try {

        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tabs[0]) {
          await chrome.tabs.sendMessage(tabs[0].id, {
            type: MessageTypes.TOGGLE_CHEAT,
            activated: message.activated,
          });
        }
        sendResponse({ success: true });
      } catch (error) {
        console.error("Error in background script:", error);
        sendResponse({ success: false, error: error.message });
      }
    }
    return true;
  }
}

new BackgroundController();
