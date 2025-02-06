console.log("Background script started at:", new Date().toLocaleString());

const processedUrls = new Set();

chrome.webRequest.onCompleted.addListener(
  function (details) {
    if (processedUrls.has(details.url)) {
      return;
    }

    if (details.url.includes("quiz.cfc") && details.method === "GET") {
      console.log("Test response detected:", {
        url: details.url,
        method: details.method,
        type: details.type,
        statusCode: details.statusCode,
        timeStamp: new Date(details.timeStamp).toLocaleString(),
      });

      processedUrls.add(details.url);

      setTimeout(() => {
        processedUrls.delete(details.url);
      }, 15000);

      fetch(details.url)
        .then((response) => response.json())
        .then((data) => {
          console.log("Successfully fetched response data:", data);

          if (data.payload?.questions?.data) {
            console.log("Found questions data!", data.payload.questions.data);

            chrome.tabs.query(
              { active: true, currentWindow: true },
              function (tabs) {
                if (tabs[0]) {
                  chrome.tabs.sendMessage(tabs[0].id, {
                    type: "ANSWERS_RECEIVED",
                    answers: data.payload.questions.data,
                  });
                  console.log("Sent answers to content script");
                }
              }
            );
          }
        })
        .catch((error) => {
          console.error("Error fetching response:", error);
          processedUrls.delete(details.url);
        });
    }
  },
  {
    urls: ["*://*.7speaking.com/*"],
  },
  ["responseHeaders"]
);

setInterval(() => {
  processedUrls.clear();
}, 30000);
