class CheatModeManager {
  constructor() {
    this.isActive = false;
  }

  retrieveElement(selector) {
    const element = document.querySelector(selector);

    if (element === null) {
      console.log("Element not found, retrying in 1 second...");
      setTimeout(() => this.retrieveElement(selector), 1000);
      return;
    }
    return element;
  }

  getCorrectAnswer() {
    const questionElement = this.retrieveElement(".question_content");
    console.log(window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
    // console.log(this.findReactRoot(questionElement));
  }

  createCheatButton() {
    const title = this.retrieveElement('h2[class*="section_title"]');

    if (!title) {
      console.log("Title element not found, retrying in 1 second...");
      setTimeout(this.createCheatButton, 1000);
      return;
    }

    let existingButton = title.querySelector(".cheat-button");
    if (existingButton) {
      return;
    }

    const button = document.createElement("button");
    button.textContent = "Cheat";
    button.className = "cheat-button";

    button.onclick = async () => {
      console.log("Cheat button clicked");
      this.getCorrectAnswer();
    };

    title.appendChild(button);
  }

  removeCheatButton() {
    const title = this.retrieveSectionTitle();
    if (!title) {
      console.log("Title element not found, retrying in 1 second...");
      setTimeout(this.removeCheatButton, 1000);
      return;
    }

    const button = title.querySelector(".cheat-button");
    if (!button) {
      return;
    }

    title.removeChild(button);
  }

  startCheatMode() {
    if (this.isActive) return;

    console.log("Starting Cheat Mode");
    this.isActive = true;
    this.createCheatButton();
  }

  cleanCheatMode() {
    if (!this.isActive) return;

    console.log("Cleaning Cheat Mode");
    this.isActive = false;
    this.removeCheatButton();
    // Add cleanup implementation here
  }
}
