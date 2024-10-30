class ContentController {
  constructor() {
    this.cheatManager = new CheatModeManager();
    this.initialize();
  }

  initialize() {
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    console.log("7Speaking helper initialized");
  }

  handleMessage(message, sender, sendResponse) {

    if (message.type === MessageTypes.TOGGLE_CHEAT) {
      if (message.activated) {
        this.cheatManager.startCheatMode();
      } else {
        this.cheatManager.cleanCheatMode();
      }
      sendResponse({ success: true });
    }
    return true; // Keep message channel open for async response
  }
}

new ContentController();
