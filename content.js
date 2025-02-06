console.log("7Speaking Answer Helper loaded!");

let storedAnswers = [];
let currentTitle = "";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANSWERS_RECEIVED") {
    storedAnswers = message.answers;
    checkCurrentQuestion();
  }
});

function observeQuestionChanges() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      const query = document.querySelector('h2[class*="question__title"]');

      if (query && query.textContent !== currentTitle) {
        currentTitle = "";
        checkCurrentQuestion();
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function checkCurrentQuestion() {
  if (storedAnswers.size === 0) {
    console.log("No stored answers available");
    return;
  }

  const currentQuestionTitle = document
    .querySelector('h2[class*="question__title"]')
    ?.textContent?.replace(/_/g, "")
    .trim();

  if (!currentQuestionTitle) {
    console.log("No question title found on page");
    return;
  }

  currentTitle = document.querySelector(
    'h2[class*="question__title"]'
  ).textContent;

  var currentQuestion = storedAnswers.find((question) => {
    let questionTitle = question.question.replace(/_/g, "").trim();
    if (currentQuestionTitle.includes(questionTitle)) {
      return question.question;
    }
  });

  console.log(storedAnswers);

  if (currentQuestion) {
    if (currentQuestion.variant === "choice") {
      handleMultipleChoice(currentQuestion);
    } else if (currentQuestion.variant === "fill") {
      handleFillInBlank(currentQuestion);
    }
  } else {
    console.log("No matching question found in stored answers");
  }
}

function handleMultipleChoice(question) {
  const correctAnswer = question.answerOptions.answer[0].value;

  document
    .querySelectorAll('span[class*="question__customLabel"]')
    .forEach((answer) => {
      answer.style.border = "";
      answer.style.backgroundColor = "";
    });

  const answers = document.querySelectorAll(
    'span[class*="question__customLabel"]'
  );

  answers.forEach((answer) => {
    if (answer.textContent.trim() === correctAnswer.trim()) {
      answer.style.border = "2px solid green";
      answer.style.backgroundColor = "rgba(0, 255, 0, 0.1)";

      const checkmark = document.createElement("span");
      checkmark.textContent = " ✓";
      checkmark.style.color = "green";
      checkmark.style.fontWeight = "bold";
      if (!answer.querySelector(".checkmark")) {
        answer.appendChild(checkmark);
      }
    }
  });
}

function handleFillInBlank(question) {
  const correctAnswer = question.answerOptions.answer[0].value;

  const input = document.querySelector('input[type="text"]');
  if (input) {
    let answerDisplay = document.querySelector("span[class*='textFix']");
    if (!answerDisplay) {
      answerDisplay = document.createElement("div");
      answerDisplay.className = "answer-helper";
      answerDisplay.style.position = "absolute";
      answerDisplay.style.right = "10px";
      answerDisplay.style.backgroundColor = "#f0f0f0";
      answerDisplay.style.padding = "5px";
      answerDisplay.style.borderRadius = "3px";
      answerDisplay.style.fontSize = "12px";
      input.parentElement.style.position = "relative";
      input.parentElement.appendChild(answerDisplay);
    }

    answerDisplay.textContent = `Answer: ${correctAnswer}`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("Page loaded, starting observer");
  observeQuestionChanges();
  // Check if we already have stored answers
  if (storedAnswers) {
    checkCurrentQuestion();
  }
});

observeQuestionChanges();
if (storedAnswers) {
  checkCurrentQuestion();
}
