console.log("7Speaking Answer Helper loaded!");

const OPENAI_API_KEY =
  "";

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
  const preserveAbbreviations = (text) => {
    return text
      .replace(/Mr\./g, "MR_PLACEHOLDER")
      .replace(/Mrs\./g, "MRS_PLACEHOLDER")
      .replace(/Ms\./g, "MS_PLACEHOLDER")
      .replace(/Dr\./g, "DR_PLACEHOLDER")
      .replace(/Prof\./g, "PROF_PLACEHOLDER")
      .replace(/etc\./g, "ETC_PLACEHOLDER")
      .replace(/i\.e\./g, "IE_PLACEHOLDER")
      .replace(/e\.g\./g, "EG_PLACEHOLDER");
  };

  const restoreAbbreviations = (text) => {
    return text
      .replace(/MR_PLACEHOLDER/g, "Mr.")
      .replace(/MRS_PLACEHOLDER/g, "Mrs.")
      .replace(/MS_PLACEHOLDER/g, "Ms.")
      .replace(/DR_PLACEHOLDER/g, "Dr.")
      .replace(/PROF_PLACEHOLDER/g, "Prof.")
      .replace(/ETC_PLACEHOLDER/g, "etc.")
      .replace(/IE_PLACEHOLDER/g, "i.e.")
      .replace(/EG_PLACEHOLDER/g, "e.g.");
  };

  let processedText = preserveAbbreviations(text);

  const splitItems = (text) => {
    const itemPattern =
      /([^.?]+[.?])\s*A\.\s+([^.]+\.)\s*B\.\s+([^.]+\.)\s*C\.\s+([^.]+\.)/g;
    const items = [];
    let match;

    while ((match = itemPattern.exec(text)) !== null) {
      const [_, question, answerA, answerB, answerC] = match;
      items.push({
        question: question.trim(),
        answers: {
          A: answerA.trim(),
          B: answerB.trim(),
          C: answerC.trim(),
        },
      });
    }
    return items;
  };

  const formatItem = (item) => {
    return `${item.question}\nA. ${item.answers.A}\nB. ${item.answers.B}\nC. ${item.answers.C}`;
  };

  const items = splitItems(processedText);
  const formattedItems = items.map(formatItem);

  const cleaned = restoreAbbreviations(formattedItems.join("\n\n")).split(
    "\n\n"
  );

  if (cleaned.length === 1) return text;

  return cleaned;
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
    formData.append(
      "prompt",
      "For any multiple choice questions, format the output as follows:[Question]?\nA. [Answer]\nB. [Answer]\nC. [Answer]\n"
    );

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

  const existingTranscription = document.querySelector(".transcription-result");
  if (existingTranscription) {
    button.disabled = true;
    button.style.backgroundColor = "#cccccc";
    button.style.cursor = "not-allowed";
  }

  button.addEventListener("mouseover", () => {
    if (!button.disabled) {
      button.style.backgroundColor = "#45a049";
    }
  });

  button.addEventListener("mouseout", () => {
    if (!button.disabled) {
      button.style.backgroundColor = "#4CAF50";
    }
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
      const result = parseQuestions(await transcribeRemoteAudio(audio));

      let transcriptionDisplay = document.querySelector(
        ".transcription-result"
      );

      if (!transcriptionDisplay) {
        transcriptionDisplay = document.createElement("div");
        transcriptionDisplay.className = "transcription-result";
        transcriptionDisplay.style.margin = "10px 0";
        transcriptionDisplay.style.padding = "10px";
        transcriptionDisplay.style.backgroundColor = "#f5f5f5";
        transcriptionDisplay.style.borderRadius = "4px";
        transcriptionDisplay.style.border = "1px solid #ddd";
        transcriptionDisplay.style.maxHeight = "400px";
        transcriptionDisplay.style.overflowY = "auto";
        title.parentElement.insertBefore(
          transcriptionDisplay,
          title.nextSibling
        );
      }

      transcriptionDisplay.innerHTML = "";

      if (Array.isArray(result)) {
        result.forEach((item, index) => {
          const qaContainer = document.createElement("div");
          qaContainer.style.marginBottom = "20px";
          if (index === result.length - 1) {
            qaContainer.style.marginBottom = "0";
          }

          const parts = item.split("\n");
          const question = parts[0];
          const answers = parts.slice(1);

          const questionElem = document.createElement("p");
          questionElem.textContent = `${index + 1}. ${question}`;
          questionElem.style.fontWeight = "bold";
          questionElem.style.marginBottom = "8px";
          questionElem.style.color = "#333";

          const answersList = document.createElement("ul");
          answersList.style.margin = "0 0 0 20px";
          answersList.style.paddingLeft = "0";

          answers.forEach((answer) => {
            const answerItem = document.createElement("li");
            answerItem.textContent = answer;
            answerItem.style.marginBottom = "4px";
            answerItem.style.color = "#666";
            answersList.appendChild(answerItem);
          });

          qaContainer.appendChild(questionElem);
          qaContainer.appendChild(answersList);

          if (index !== result.length - 1) {
            const separator = document.createElement("hr");
            separator.style.margin = "20px 0";
            separator.style.border = "none";
            separator.style.borderTop = "1px solid #ddd";
            qaContainer.appendChild(separator);
          }

          transcriptionDisplay.appendChild(qaContainer);
        });
      } else {
        const textContainer = document.createElement("div");
        textContainer.style.marginBottom = "15px";
        textContainer.textContent = result;
        transcriptionDisplay.appendChild(textContainer);
      }

      const answerButton = document.createElement("button");
      answerButton.textContent = "Get Answer";
      answerButton.style.marginTop = "15px";
      answerButton.style.padding = "8px 16px";
      answerButton.style.backgroundColor = "#2196F3";
      answerButton.style.color = "white";
      answerButton.style.border = "none";
      answerButton.style.borderRadius = "4px";
      answerButton.style.cursor = "pointer";
      answerButton.style.display = "block";
      answerButton.style.width = "100%";

      answerButton.addEventListener("mouseover", () => {
        answerButton.style.backgroundColor = "#1976D2";
      });

      answerButton.addEventListener("mouseout", () => {
        answerButton.style.backgroundColor = "#2196F3";
      });

      answerButton.addEventListener("click", () => {
        console.log("CHEATER")
        // retrieveAnswerWithLLM();
      });

      transcriptionDisplay.appendChild(answerButton);

      button.disabled = true;
      button.style.backgroundColor = "#cccccc";
      button.style.cursor = "not-allowed";
      button.textContent = "Transcribe Audio";
    } catch (error) {
      console.error("Transcription failed:", error);
      button.style.backgroundColor = "#ff4444";
      button.textContent = "Transcription failed";
      setTimeout(() => {
        button.style.backgroundColor = "#4CAF50";
        button.textContent = "Retry Transcription";
        button.disabled = false;
        button.style.cursor = "pointer";
      }, 2000);
      return;
    }
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
