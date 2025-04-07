// This is the JavaScript file for the review page

document.addEventListener("DOMContentLoaded", () => {
  // Get stored responses from localStorage
  const responses = JSON.parse(localStorage.getItem("examResponses") || "[]");
  const subject =
    localStorage.getItem("examSubjectResult") || "Unknown Subject";
  const classLevel = localStorage.getItem("examClassResult") || "Unknown Class";

  // Display review header
  document.getElementById("review-container").innerHTML = `
      <div class="review-header">
        <div>
          <h2>Exam Review</h2>
          <h3>Subject: ${subject}</h3>
        </div>
        <div class="filter-options">
        <button class="filter-btn active" data-filter="incorrect">Incorrect</button>
          <button class="filter-btn " data-filter="all">All Questions</button>
          <button class="filter-btn" data-filter="correct">Correct</button>
        </div>
      </div>
      <div id="questions-review"></div>
      <div class="review-actions">
        <button onclick="window.location.href='index.html'" class="submit-btn">Take Another Exam</button>
      </div>
    `;

  // Display questions
  displayReviewQuestions(responses);

  // Set up filter buttons
  setupFilterButtons();
});

function displayReviewQuestions(responses) {
  const questionsReviewDiv = document.getElementById("questions-review");
  questionsReviewDiv.innerHTML = "";

  if (!responses || responses.length === 0) {
    questionsReviewDiv.innerHTML = "<p>No responses found.</p>";
    return;
  }

  responses.forEach((response, index) => {
    const questionClass = response.correct ? "correct" : "incorrect";
    const statusText = response.correct ? "Correct" : "Incorrect";
    const statusClass = response.correct
      ? "correct-answer"
      : "incorrect-answer";

    // Create options HTML
    let optionsHTML = "";
    for (const [key, value] of Object.entries(response.options)) {
      const isSelected = key === response.selectedAnswer;
      const isCorrect = key === response.correctAnswer;

      let optionClass = "";
      if (isSelected) optionClass += " selected-option";
      if (isCorrect) optionClass += " correct-option";

      optionsHTML += `
          <div class="option-item${optionClass}">
            ${value}
            ${
              isSelected
                ? ' <span class="selected-marker">(Your Answer)</span>'
                : ""
            }
            ${
              isCorrect
                ? ' <span class="correct-marker">(Correct Answer)</span>'
                : ""
            }
          </div>
        `;
    }

    // Add explanation section for incorrect answers
    let explanationHTML = "";
    if (!response.correct && response.explanation) {
      explanationHTML = `
          <div class="explanation">
            <h4 class="explanation-title">Explanation:</h4>
            <p>${response.explanation}</p>
          </div>
        `;
    }

    const questionHTML = `
        <div class="question-review ${questionClass}" data-status="${questionClass}">
          <p class="question-text"><strong>Question ${response.questionNumber}:</strong> ${response.questionText}</p>
          <div class="options-container">
            ${optionsHTML}
          </div>
          <div class="answer-status">
            <p class="${statusClass}">✓ ${statusText}</p>
          </div>
          ${explanationHTML}
        </div>
      `;

    questionsReviewDiv.innerHTML += questionHTML;
  });
}

function setupFilterButtons() {
  const filterButtons = document.querySelectorAll(".filter-btn");

  filterButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // Remove active class from all buttons
      filterButtons.forEach((btn) => btn.classList.remove("active"));

      // Add active class to clicked button
      this.classList.add("active");

      // Get filter value
      const filter = this.getAttribute("data-filter");

      // Filter questions
      const questions = document.querySelectorAll(".question-review");

      questions.forEach((question) => {
        if (filter === "all") {
          question.style.display = "block";
        } else {
          if (question.getAttribute("data-status") === filter) {
            question.style.display = "block";
          } else {
            question.style.display = "none";
          }
        }
      });
    });
  });
}
