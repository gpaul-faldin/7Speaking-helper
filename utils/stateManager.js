export class StateManager {
  constructor() {
    this.STATE_KEY = "extension_state";
  }

  async getState() {
    const result = await chrome.storage.local.get(this.STATE_KEY);
    return result[this.STATE_KEY] || { activated: false };
  }

  async setState(state) {
    await chrome.storage.local.set({ [this.STATE_KEY]: state });
  }

  async setActivated(activated) {
    const currentState = await this.getState();
    await this.setState({ ...currentState, activated });
  }
}
