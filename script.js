// API Configuration
const apiKey = "AIzaSyARWEu4Y-VbI8N1AlTWVBIo4ZUD2gPy0Wo";
const sheetId = "1wE0KJlSkhaTFMTcjDj3t_rpp3SOHmn6hrSZeoIwcNzw";
const sheetURL =
  "https://script.google.com/macros/s/AKfycbyvp2YeF59W4dI2L7ck9dsbK1SsKjMDcZhegGibwtZbdljkIRygbYjpOpkAyLvVUaGUqA/exec";

// Helper Functions
function getSheetName(subject, classLevel) {
  return `${subject.replace(/\s+/g, "")}_${classLevel}`;
}

// Global variable for hint tracking across the entire exam
let totalHintsUsed = 0;
const MAX_TOTAL_HINTS = 5;

// Fetch and Display Questions
async function fetchQuestions(day, cls, subject) {
  if (!subject) {
    alert("Please select a subject.");
    return;
  }

  console.log("Fetching questions for:", { day, class: cls, subject });

  const sheetName = getSheetName(subject, cls);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}?key=${apiKey}`;

  try {
    console.log("Fetching from URL:", url);
    const response = await fetch(url);
    const data = await response.json();

    if (!data.values) {
      console.error("No values found in response:", data);
      throw new Error(`No sheet found for ${sheetName}`);
    }

    console.log(`Found ${data.values.length} rows of data`);

    // Reset hints when loading new questions
    totalHintsUsed = 0;

    displayQuestions(data.values, subject, cls);

    // Start the timer after questions are displayed
    startTimer();
  } catch (error) {
    console.error("Error fetching questions:", error);
    document.getElementById("questions").innerHTML = `
      <p class="error"> ${subject.replace(
        /_/g,
        " "
      )} - ${cls} is not yet available.</p>
      <p class="error">Please make sure you've selected the right Class, Subject and Day.</p>
      <button onclick="window.location.href='index.html'" class="sub-btn">Go Back</button>
    `;
  }
}

// Store questions data globally
let questionsData = [];

// Display questions in HTML
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function displayQuestions(data, subject, cls) {
  const questionsDiv = document.getElementById("questions");
  questionsDiv.innerHTML = "";
  questionsData = [];

  if (!data || data.length <= 1) {
    questionsDiv.innerHTML = "<p>No questions found.</p>";
    return;
  }
  // Separate header row and question rows
  const headerRow = data[0];
  const questionRows = data.slice(1);

  // Shuffle only the question rows, keeping the header row intact
  const shuffledQuestionRows = shuffleArray(questionRows);

  // Limit to 20 questions or less if there aren't enough questions
  const limitedQuestionRows = shuffledQuestionRows.slice(0, 15);

  // Get username from localStorage
  const userName = localStorage.getItem("userName") || "Student";

  // Add exam metadata section
  questionsDiv.innerHTML = `
       <div class="exam-header">
      <h3>Subject: ${subject.replace(/_/g, " ")}</h3>
      <h3>Student: ${userName}</h3>
      <h3 class="Warn">Do well to answer all the questions before the time runs out.</h3>
    </div>
  `;

  // Create questions
  for (let i = 0; i < limitedQuestionRows.length; i++) {
    const row = limitedQuestionRows[i];
    const questionText = row[0];
    const options = {
      A: row[1],
      B: row[2],
      C: row[3],
      D: row[4],
    };
    const correctAnswer = row[5];

    // Get the question type (column H) which contains the hint
    const questionHint = row[6] || "";

    // Shuffle the options while maintaining the correct mapping
    const optionKeys = ["A", "B", "C", "D"];
    const shuffledOptionKeys = shuffleArray([...optionKeys]);

    // Create shuffled options object
    const shuffledOptions = {};
    shuffledOptionKeys.forEach((newKey, index) => {
      shuffledOptions[newKey] = options[optionKeys[index]];
    });

    // Find the new key for the correct answer
    const newCorrectAnswerKey =
      shuffledOptionKeys[optionKeys.indexOf(correctAnswer)];

    // Process the question text to extract and handle image URLs
    const { processedText, imageHtmlContent } = processQuestionImages(
      questionText,
      i
    );

    // Create a unique ID for this question
    const questionId = `q${i + 1}`;

    // Get the explanation from column I
    const questionExplanation =
      row[7] || "No explanation available for this question.";

    questionsData.push({
      questionNumber: i + 1,
      questionText: processedText,
      options: shuffledOptions,
      correctAnswer: newCorrectAnswerKey,
      subject,
      cls,
      topic: categorizeQuestionByTopic(processedText),
      hint: questionHint, // Store the hint from column H
      questionId: questionId,
      explanation: questionExplanation, // Store the explanation from column I
    });

    // Create the hint character HTML - initial state is always standing
    const hintCharacterHTML = `
      <div class="character-wrapper" data-question-id="${questionId}">
        <img src="assets/standing.png" alt="Hint Character" class="hint-character" id="character-${questionId}">
        <div class="speech-bubble" id="hint-bubble-${questionId}">
          Click for a hint!
        </div>
      </div>
    `;

    const questionHTML = `
      <div class="question-container">
        <p class="question-text"><strong>Question ${
          i + 1
        }:</strong> ${processedText}</p>
        ${imageHtmlContent}
        
        ${hintCharacterHTML}
        
        <div class="options-container">
          ${Object.entries(shuffledOptions)
            .map(
              ([key, value]) => `
            <label class="option-label">
              <input type="radio" name="q${i + 1}" value="${key}" required> 
              ${value}
            </label>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    questionsDiv.innerHTML += questionHTML;
  }

  // Add submit button
  questionsDiv.innerHTML += `
    <button onclick="checkAnswers()" class="submit-btn">Submit Exam</button>
  `;

  // Add this line to set up the listeners for removing the "unanswered" class
  addRadioChangeListeners();

  // Setup image error handling
  setupImageErrorHandling();

  // Setup hint character interactions
  setupHintCharacters();

  // Add hint counter display
  addHintCounterDisplay();
}

// Add hint counter display
function addHintCounterDisplay() {
  // Create a hint counter element
  const hintCounter = document.createElement("div");
  hintCounter.id = "hint-counter";
  hintCounter.className = "hint-counter";
  hintCounter.innerHTML = `Hints: <span>${
    MAX_TOTAL_HINTS - totalHintsUsed
  }</span> remaining`;

  // Add it to the page
  document
    .querySelector(".container")
    .insertBefore(hintCounter, document.querySelector(".progress-bar"));

  // Update the counter display
  updateHintCounter();
}

// Update hint counter display
function updateHintCounter() {
  const hintCounter = document.getElementById("hint-counter");
  if (hintCounter) {
    hintCounter.innerHTML = `Hints: <span>${
      MAX_TOTAL_HINTS - totalHintsUsed
    }</span> remaining`;

    // Add warning class if running low on hints
    if (MAX_TOTAL_HINTS - totalHintsUsed <= 1) {
      hintCounter.classList.add("hint-counter-warning");
    }
  }
}

// Helper function to process question images - handles both regular and Google Drive images
function processQuestionImages(questionText, questionNumber) {
  let processedText = questionText;
  let imageHtmlContent = "";

  // Regular expression for standard image URLs
  const standardImageRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/gi;

  // Regular expression for Google Drive links
  const googleDriveRegex =
    /(https?:\/\/drive\.google\.com\/file\/d\/([^/\s]+)\/view[^\s]*|https?:\/\/drive\.google\.com\/open\?id=([^\s&]+))/gi;

  // First check for Google Drive links
  const driveMatches = [...questionText.matchAll(googleDriveRegex)];

  if (driveMatches && driveMatches.length > 0) {
    for (const match of driveMatches) {
      const fullUrl = match[0];
      // Extract fileId from the URL - either from /d/FILEID/view or ?id=FILEID
      const fileId = match[2] || match[3];

      if (fileId) {
        // Create a direct link for the image
        // This format allows direct image embedding from Google Drive
        const directImageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

        // Replace the Google Drive URL in the question text
        processedText = processedText.replace(fullUrl, "");

        // Create image HTML
        imageHtmlContent += `<div class="question-image-container">
          <img src="${directImageUrl}" alt="Question ${questionNumber} image" class="question-image" data-source="google-drive">
        </div>`;
      }
    }
  }
  // If no Google Drive links, check for standard image URLs
  else {
    const standardMatches = [...questionText.matchAll(standardImageRegex)];

    if (standardMatches && standardMatches.length > 0) {
      for (const match of standardMatches) {
        const imageUrl = match[0];

        // Replace the URL in the question text
        processedText = processedText.replace(imageUrl, "");

        // Create image HTML
        imageHtmlContent += `<div class="question-image-container">
          <img src="${imageUrl}" alt="Question ${questionNumber} image" class="question-image">
        </div>`;
      }
    }
  }

  return { processedText, imageHtmlContent };
}

// Function to handle image loading errors
function setupImageErrorHandling() {
  document.querySelectorAll(".question-image").forEach((img) => {
    img.onerror = function () {
      this.onerror = null;

      // Custom message for Google Drive images
      const errorMessage =
        this.dataset.source === "google-drive"
          ? "Google Drive image could not be loaded. Make sure the file is publicly accessible."
          : "Image could not be loaded";

      this.parentNode.innerHTML = `
        <div class="image-error">
          <p>${errorMessage}</p>
          <small>${this.src}</small>
        </div>
      `;
    };
  });
}

// Setup hint character interactions
function setupHintCharacters() {
  document.querySelectorAll(".character-wrapper").forEach((character) => {
    const questionId = character.dataset.questionId;
    const characterImg = character.querySelector(".hint-character");
    const speechBubble = character.querySelector(".speech-bubble");

    character.addEventListener("click", () => {
      // Check if we've used all hints for the entire exam
      if (totalHintsUsed >= MAX_TOTAL_HINTS) {
        // Update all characters to lying down
        document.querySelectorAll(".hint-character").forEach((img) => {
          img.src = "assets/standing.png";
        });

        speechBubble.textContent = "I'm tired. No more hints for this exam!";
        speechBubble.classList.add("show");

        // Hide the bubble after 3 seconds
        setTimeout(() => {
          speechBubble.classList.remove("show");
        }, 5000);

        return;
      }

      // Get the question data
      const questionData = questionsData.find(
        (q) => q.questionId === questionId
      );

      // Check if we have a hint for this question
      if (
        !questionData ||
        !questionData.hint ||
        questionData.hint.trim() === ""
      ) {
        speechBubble.textContent = "No hints available for this question.";
        speechBubble.classList.add("show");

        // Hide the bubble after 3 seconds
        setTimeout(() => {
          speechBubble.classList.remove("show");
        }, 5000);

        return;
      }

      // Hide all other speech bubbles first
      document.querySelectorAll(".speech-bubble").forEach((bubble) => {
        if (bubble.id !== `hint-bubble-${questionId}`) {
          bubble.classList.remove("show");
        }
      });

      // Switch to thinking character
      characterImg.src = "assets/thinking.png";

      // Display the hint from column H
      speechBubble.textContent = questionData.hint;
      speechBubble.classList.add("show");

      // Increment the total hint counter
      totalHintsUsed++;

      // Update the hint counter display
      updateHintCounter();

      // If this was the last allowed hint, update all characters to lying down
      if (totalHintsUsed >= MAX_TOTAL_HINTS) {
        setTimeout(() => {
          document.querySelectorAll(".hint-character").forEach((img) => {
            img.src = "assets/standing.png";
          });
        }, 5000);
      } else {
        // Otherwise, switch back to standing after 2 seconds
        setTimeout(() => {
          characterImg.src = "assets/standing.png";
        }, 5000);
      }

      // Hide the bubble after 5 seconds
      setTimeout(() => {
        speechBubble.classList.remove("show");
      }, 5000);
    });
  });

  // Hide all speech bubbles when clicking elsewhere
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".character-wrapper")) {
      document.querySelectorAll(".speech-bubble").forEach((bubble) => {
        bubble.classList.remove("show");
      });
    }
  });
}

// Check answers and calculate score
// Function to check answers with validation for unanswered questions
function checkAnswers() {
  // Get the submit button
  const submitBtn = document.querySelector(".submit-btn");

  // Display loading state
  submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
  submitBtn.disabled = true;

  // Clear the timer interval if it exists
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  // Get username from localStorage instead of form inputs
  const username = localStorage.getItem("userName") || "Unknown Student";

  // Proceed with calculating score and submitting
  let score = 0;
  const responses = [];
  const totalQuestions = questionsData.length;

  questionsData.forEach((q, index) => {
    const selected = document.querySelector(
      `input[name="q${index + 1}"]:checked`
    );
    const isCorrect = selected && selected.value === q.correctAnswer;
    if (isCorrect) score++;

    responses.push({
      questionNumber: index + 1,
      questionText: q.questionText || `Question ${index + 1}`,
      options: q.options || {},
      selectedAnswer: selected ? selected.value : null,
      correctAnswer: q.correctAnswer,
      correct: isCorrect,
      topic: q.topic || "General",
      explanation: q.explanation || "No explanation available.",
    });
  });

  // Prepare result data
  const resultData = {
    timestamp: new Date().toISOString(),
    name: username,
    subject:
      localStorage.getItem("examSubject") ||
      document.getElementById("subject").value,
    class:
      localStorage.getItem("examClass") ||
      document.getElementById("class").value,
    score: score,
    totalQuestions: totalQuestions,
    percentage: ((score / totalQuestions) * 100).toFixed(1),
    responses: responses,
  };

  // Save to appropriate sheet
  saveResult(resultData);
}

// Save result to Google Sheets
async function saveResult(resultData) {
  try {
    // Create a copy of resultData with stringified responses for the API
    const apiData = {
      ...resultData,
      responses: JSON.stringify(resultData.responses),
    };

    const response = await fetch(sheetURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `data=${encodeURIComponent(
        JSON.stringify({
          ...apiData,
          sheetName: getSheetName(resultData.subject, resultData.class),
        })
      )}`,
    });

    // Check response status
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Add a small delay to ensure data is saved
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Save exam data for analytics
    saveExamDataForAnalytics(resultData);

    displayResults(resultData);
  } catch (error) {
    console.error("Error saving result:", error);
    alert(
      "There was an issue displaying the results, but your answers have been recorded successfully."
    );
  }
}

// Save exam data for analytics
function saveExamDataForAnalytics(resultData) {
  // Get existing exam data array or initialize new one
  const examHistory = JSON.parse(localStorage.getItem("examHistory") || "[]");

  // Add new exam data
  examHistory.push({
    id: Date.now(), // Use timestamp as ID
    date: new Date().toISOString(),
    subject: resultData.subject,
    class: resultData.class,
    score: Number.parseInt(resultData.percentage),
    totalQuestions: resultData.totalQuestions,
    correctAnswers: resultData.score,
    timeSpent: document.getElementById("time-remaining")
      ? 30 * 60 -
        Number.parseInt(
          document.getElementById("time-remaining").textContent.split(":")[0]
        ) *
          60 -
        Number.parseInt(
          document.getElementById("time-remaining").textContent.split(":")[1]
        ) +
        ":00"
      : "25:00",
    responses: resultData.responses.map((response) => ({
      topic: response.topic || "General",
      correct: response.correct ? 1 : 0,
      total: 1,
    })),
  });

  // Save back to localStorage
  localStorage.setItem("examHistory", JSON.stringify(examHistory));
}

// Display final results
function displayResults(resultData) {
  const questionsDiv = document.getElementById("questions");

  // Calculate grade based on percentage
  const percentage = Number.parseFloat(resultData.percentage);
  let grade, gradeColor;

  if (percentage >= 81) {
    grade = "A+";
    gradeColor = "var(--success-green)";
  } else if (percentage >= 71) {
    grade = "A";
    gradeColor = "var(--success-greena)";
  } else if (percentage >= 66) {
    grade = "B+";
    gradeColor = "#4caf50";
  } else if (percentage >= 61) {
    grade = "B";
    gradeColor = "#8bc34a";
  } else if (percentage >= 56) {
    grade = "C+";
    gradeColor = "#cddc39";
  } else if (percentage >= 51) {
    grade = "C";
    gradeColor = "#ffeb3b";
  } else if (percentage >= 46) {
    grade = "D+";
    gradeColor = "#ffc107";
  } else if (percentage >= 41) {
    grade = "D";
    gradeColor = "#ff9800";
  } else if (percentage >= 36) {
    grade = "E+";
    gradeColor = "#ff5722";
  } else if (percentage >= 31) {
    grade = "E";
    gradeColor = "#f44336";
  } else {
    grade = "F";
    gradeColor = "var(--error-red)";
  }

  // Store responses in localStorage for review page
  localStorage.setItem("examResponses", JSON.stringify(resultData.responses));
  localStorage.setItem("examSubjectResult", resultData.subject);
  localStorage.setItem("examClassResult", resultData.class);

  questionsDiv.innerHTML = `
    <div class="results-container">
      <h2><strong>${resultData.name}</strong>, Well done on your exam!</h2>
      <div class="results-summary">
        <p>Keep going, you're doing great! Just take it one step at a time.</p>
        <div class="score-display">
        <h3 class="Grade"><span style="color: ${gradeColor};   text-shadow:${gradeColor} 2px 2px 5px;
font-weight: bold;">${grade}</span></h3>
          <h3>Your Score: <span>${resultData.score}/${resultData.totalQuestions}</span></h3>
          <h3>Percentage: <span>${resultData.percentage}%</span></h3>
        </div>
      </div>
      <div class="results-actions">
        <button onclick="window.location.href='review.html'" class="review-btn">Review Answers</button>
        <button onclick="window.location.href='index.html'" class="submit-btn">Take Another Exam</button>
      </div>
    </div>
  `;

  // Clear the stored exam details
  localStorage.removeItem("examDay");
  localStorage.removeItem("examClass");
  localStorage.removeItem("examSubject");

  // Make sure timer is stopped
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Timer functionality
const examDuration = 30 * 60; // 30 minutes in seconds
let timerInterval;

// Update the timer's time-up handler to ensure it properly submits
function startTimer() {
  const timerElement = document.getElementById("time-remaining");
  let timeLeft = examDuration;

  // Update timer immediately
  updateTimerDisplay(timeLeft);

  timerInterval = setInterval(() => {
    timeLeft--;

    // Update the timer display
    updateTimerDisplay(timeLeft);

    // Update progress bar
    const progressPercent = 100 - (timeLeft / examDuration) * 100;
    document.querySelector(
      ".progress-bar-fill"
    ).style.width = `${progressPercent}%`;

    // When time runs out
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      alert("Time's up! Your exam will be submitted now.");
      checkAnswers(); // This will now work even with unanswered questions
    }

    // Warning when 5 minutes remaining
    if (timeLeft === 600) {
      showTimerWarning("10 Minutes Remaining!");
    }
    if (timeLeft === 300) {
      showTimerWarning("5 minutes remaining!");
    }
  }, 1000);
}

function updateTimerDisplay(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  document.getElementById("time-remaining").textContent = `${minutes
    .toString()
    .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;

  // Change color when less than 10 minutes remaining
  if (seconds < 600) {
    document.getElementById("time-remaining").style.color = "orange";
  }
  // Change color when less than 5 minutes remaining
  if (seconds < 300) {
    document.getElementById("time-remaining").style.color = "#ef4444";
  }
}

function showTimerWarning() {
  // Create a warning toast
  const toast = document.createElement("div");
  toast.className = "toast toast-warning";
  toast.innerHTML = "Time is Ticking!!!";
  document.body.appendChild(toast);

  // Remove toast after 5 seconds
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// Add this to clear timer when exam is submitted
function addRadioChangeListeners() {
  document.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      // Find the question container
      const questionContainer = e.target.closest(".question-container");
      if (questionContainer) {
        questionContainer.classList.remove("unanswered");
      }
    });
  });
}

// Add this function to categorize questions by topic
function categorizeQuestionByTopic(questionText) {
  // Define topic keywords to look for in questions
  const topicKeywords = {
    Algebra: [
      "equation",
      "solve for",
      "expression",
      "variable",
      "formula",
      "algebraic",
    ],
    Geometry: [
      "shape",
      "angle",
      "triangle",
      "circle",
      "rectangle",
      "area",
      "perimeter",
      "volume",
    ],
    Arithmetic: [
      "add",
      "subtract",
      "multiply",
      "divide",
      "fraction",
      "decimal",
      "percentage",
    ],
    Grammar: [
      "noun",
      "verb",
      "adjective",
      "adverb",
      "pronoun",
      "preposition",
      "tense",
      "punctuation",
    ],
    Comprehension: [
      "passage",
      "read the",
      "according to the",
      "author",
      "paragraph",
      "text",
    ],
    Vocabulary: ["meaning", "synonym", "antonym", "define", "definition"],
    Biology: [
      "living",
      "organism",
      "cell",
      "plant",
      "animal",
      "body",
      "system",
    ],
    Chemistry: ["element", "compound", "reaction", "molecule", "acid", "base"],
    Physics: [
      "force",
      "motion",
      "energy",
      "light",
      "sound",
      "electricity",
      "magnet",
    ],
    History: [
      "past",
      "ancient",
      "century",
      "year",
      "event",
      "war",
      "leader",
      "kingdom",
    ],
    Geography: [
      "map",
      "country",
      "continent",
      "river",
      "mountain",
      "climate",
      "population",
    ],
    Civics: [
      "government",
      "citizen",
      "right",
      "law",
      "constitution",
      "democracy",
    ],
  };

  // Convert question to lowercase for case-insensitive matching
  const lowerQuestion = questionText.toLowerCase();

  // Check for each topic's keywords
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    for (const keyword of keywords) {
      if (lowerQuestion.includes(keyword.toLowerCase())) {
        return topic;
      }
    }
  }

  // Default topic if no match found
  return "General";
}
