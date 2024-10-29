console.log("7Speaking Answer Helper loaded!");

const OPENAI_API_KEY = "";

let storedAnswers = [];
let currentTitle = "";
let examMode = null;
let currentAudio = null;

chrome.storage.local.get(["examMode"], function (result) {
  examMode = result.examMode || false;
  if (examMode) {
    startExamMode();
  } else {
    startTrainingMode();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "MODE_CHANGED") {
    examMode = message.examMode;
    if (examMode) {
      startExamMode();
    } else {
      startTrainingMode();
    }
  } else if (message.type === "ANSWERS_RECEIVED") {
    storedAnswers = message.answers;
    if (!examMode) {
      checkCurrentQuestion();
    }
  }
});

function parseQuestions(text) {
  // Split the text into individual questions
  const questionsRaw = text.trim().split("?");
  const questionsParsed = [];

  for (let questionText of questionsRaw) {
    // Skip empty strings
    if (!questionText.trim()) {
      continue;
    }

    // Split into question and answers
    const parts = questionText.split("A.");

    if (parts.length !== 2) {
      continue;
    }

    const question = parts[0].trim();
    const answersText = "A." + parts[1];

    // Parse answers
    const answers = {};
    const answerLetters = ["A", "B", "C"];

    for (let answerLetter of answerLetters) {
      const pattern = `${answerLetter}.`;
      const splitResult = answersText.split(pattern);

      if (splitResult.length > 1) {
        // Get the answer text up to the next letter or end
        let answerText = splitResult[1];

        // Find where the next answer starts (if it exists)
        for (let nextLetter of ["B", "C"]) {
          const nextPattern = `${nextLetter}.`;
          if (answerText.includes(nextPattern)) {
            answerText = answerText.split(nextPattern)[0];
          }
        }

        answers[answerLetter] = answerText.trim();
      }
    }

    questionsParsed.push({
      question: question + "?",
      answers: answers,
    });
  }

  return questionsParsed;
}

function formatParsedQuestions(parsedQuestions) {
  const formattedQuestions = [];
  return parsedQuestions;
}

function checkCurrentQuestion() {
  if (storedAnswers.length === 0) {
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
      checkmark.className = "answer-checkmark";
      if (!answer.querySelector(".answer-checkmark")) {
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

function startTrainingMode() {
  console.log("Starting Training Mode");
  observeQuestionChanges();
  if (storedAnswers.length > 0) {
    checkCurrentQuestion();
  }
}

function observeQuestionChanges() {
  let currentQuestionId = null;

  const getQuestionIdentifier = () => {
    const audio = document.querySelector("audio");
    return audio ? audio.src : null;
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (!examMode) {
        const query = document.querySelector('h2[class*="question__title"]');
        const newQuestionId = getQuestionIdentifier();

        if (query && query.textContent !== currentTitle) {
          currentTitle = "";
          checkCurrentQuestion();
        }
      } else {
        // For exam mode, we check if the question/audio has changed
        const newQuestionId = getQuestionIdentifier();

        if (newQuestionId && newQuestionId !== currentQuestionId) {
          currentQuestionId = newQuestionId;

          // Remove the old transcription box
          const transcription = document.querySelector(".transcription-result");
          if (transcription) {
            transcription.remove();
          }

          // Re-initialize exam mode for the new question
          initExamMode();
        }
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

async function transcribeAudio(audioFileOrUrl, isUrl = false) {
  try {
    const formData = new FormData();

    if (isUrl) {
      // Fetch the audio file from the URL
      const response = await fetch(audioFileOrUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio file: ${response.status}`);
      }
      const audioBlob = await response.blob();
      // Create a File object from the blob
      const audioFile = new File([audioBlob], "audio.mp3", {
        type: "audio/mp3",
      });
      formData.append("file", audioFile);
    } else {
      // Handle direct file input
      formData.append("file", audioFileOrUrl);
    }

    formData.append("model", "whisper-1");
    formData.append("response_format", "json");

    // Make the OpenAI API request
    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`OpenAI API error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw error;
  }
}

async function transcribeRemoteAudio(audioElement) {
  try {
    const transcription = await transcribeAudio(audioElement.src, true);

    return transcription.text;
  } catch (error) {
    console.error("Failed to transcribe:", error);
    throw error;
  }
}

function startExamMode() {
  console.log("Starting Exam Mode");
  observeQuestionChanges();
  addTranscribeButton();
}

function addTranscribeButton() {
  const existingButton = document.querySelector(".transcribe-button");
  if (existingButton) {
    existingButton.remove();
  }

  const title = document.querySelector('h2[class*="section_title"]');
  if (!title) {
    console.log("Title element not found, retrying in 1 second...");
    setTimeout(addTranscribeButton, 1000);
    return;
  }

  const button = document.createElement("button");
  button.textContent = "Transcribe Audio";
  button.className = "transcribe-button";

  button.style.marginLeft = "10px";
  button.style.padding = "5px 10px";
  button.style.backgroundColor = "#4CAF50";
  button.style.color = "white";
  button.style.border = "none";
  button.style.borderRadius = "4px";
  button.style.cursor = "pointer";

  // Add hover effect
  button.addEventListener("mouseover", () => {
    button.style.backgroundColor = "#45a049";
  });

  button.addEventListener("mouseout", () => {
    button.style.backgroundColor = "#4CAF50";
  });

  button.addEventListener("click", async () => {
    const audio = document.querySelector("audio");
    if (!audio) {
      console.error("No audio element found");
      return;
    }

    button.disabled = true;
    button.textContent = "Transcribing...";
    button.style.backgroundColor = "#cccccc";

    try {
      const result = formatParsedQuestions(
        parseQuestions(await transcribeRemoteAudio(audio))
      );

      // Keep any existing transcription box
      let transcriptionDisplay = document.querySelector(
        ".transcription-result"
      );

      // Only create a new one if it doesn't exist
      if (!transcriptionDisplay) {
        transcriptionDisplay = document.createElement("div");
        transcriptionDisplay.className = "transcription-result";
        transcriptionDisplay.style.margin = "10px 0";
        transcriptionDisplay.style.padding = "10px";
        transcriptionDisplay.style.backgroundColor = "#f5f5f5";
        transcriptionDisplay.style.borderRadius = "4px";
        transcriptionDisplay.style.border = "1px solid #ddd";
        title.parentElement.insertBefore(
          transcriptionDisplay,
          title.nextSibling
        );
      }

      transcriptionDisplay.textContent = result;
    } catch (error) {
      console.error("Transcription failed:", error);
      button.style.backgroundColor = "#ff4444";
      button.textContent = "Transcription failed";
      setTimeout(() => {
        button.style.backgroundColor = "#4CAF50";
        button.textContent = "Retry Transcription";
        button.disabled = false;
      }, 2000);
      return;
    }

    button.disabled = false;
    button.textContent = "Transcribe Audio";
    button.style.backgroundColor = "#4CAF50";
  });

  title.appendChild(button);
}

function initExamMode() {
  const checkCurrentQuestion = () => {
    const audio = document.querySelector("audio");

    if (audio) {
      if (currentAudio !== audio.src) {
        currentAudio = audio.src;
        return { type: "audio", element: audio };
      }
    }
  };

  var questionType = checkCurrentQuestion();

  if (!questionType) {
    return;
  }

  switch (questionType.type) {
    case "audio":
      // const transcriptionText = transcribeRemoteAudio(
      //   questionType.element
      // ).then((val) => {
      //   console.log("Transcription:", val);
      // });
      //console.log("Transcription:", transcriptionText);
      break;
    default:
      break;
  }

  // Example exam mode features:
  // 1. Track time spent on each question
  // 2. Save user's answers
  // 3. Calculate score at the end
  // 4. Show results only after completion
  // etc.
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  console.log("Page loaded, initializing appropriate mode");
  if (examMode === false) {
    startTrainingMode();
  } else if (examMode === true) {
    startExamMode();
  }
});
