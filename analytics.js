import { Chart } from "@/components/ui/chart";
// BINA Pro Analytics Dashboard JavaScript

// DOM Elements
const sidebarToggle = document.getElementById("sidebar-toggle");
const body = document.body;
const dateRangeSelect = document.getElementById("date-range");
const userName = document.getElementById("user-name");

// Initialize the dashboard
document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  const storedUserName = localStorage.getItem("userName");
  if (!storedUserName) {
    window.location.href = "../Entrance/login.html";
    return;
  }

  // Set user name
  userName.textContent = storedUserName;

  // Initialize sidebar toggle
  sidebarToggle.addEventListener("click", () => {
    body.classList.toggle("sidebar-collapsed");
    body.classList.toggle("sidebar-visible");
  });

  // Initialize date range filter
  dateRangeSelect.addEventListener("change", function () {
    updateDashboard(this.value);
  });

  // Initial dashboard update
  updateDashboard("all");
});

// Update dashboard based on date range
function updateDashboard(dateRange) {
  // Get exam history from localStorage
  const examHistory = JSON.parse(localStorage.getItem("examHistory") || "[]");

  // Filter exams by date range
  const filteredExams = filterExamsByDateRange(examHistory, dateRange);

  // Update stats
  updateStats(filteredExams);

  // Update charts
  updatePerformanceChart(filteredExams);
  updateSubjectsChart(filteredExams);
  createTopicPerformanceChart(filteredExams);

  // Update recent exams table
  updateRecentExamsTable(filteredExams);

  // Update strengths and weaknesses
  updateStrengthsWeaknesses(filteredExams);

  // Update recommendations
  updateRecommendations(filteredExams);
}

// Filter exams by date range
function filterExamsByDateRange(exams, dateRange) {
  if (dateRange === "all") {
    return exams;
  }

  const now = new Date();
  let cutoffDate;

  if (dateRange === "month") {
    cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
  } else if (dateRange === "week") {
    cutoffDate = new Date(now.setDate(now.getDate() - 7));
  }

  return exams.filter((exam) => new Date(exam.date) >= cutoffDate);
}

// Update stats cards
function updateStats(exams) {
  // Calculate average score
  const totalScore = exams.reduce((sum, exam) => sum + exam.score, 0);
  const averageScore =
    exams.length > 0 ? Math.round(totalScore / exams.length) : 0;

  // Calculate score change
  const allExams = JSON.parse(localStorage.getItem("examHistory") || "[]");
  const previousExams = allExams.filter(
    (exam) => !exams.some((e) => e.id === exam.id)
  );
  const previousTotalScore = previousExams.reduce(
    (sum, exam) => sum + exam.score,
    0
  );
  const previousAverageScore =
    previousExams.length > 0
      ? Math.round(previousTotalScore / previousExams.length)
      : 0;
  const scoreChange = averageScore - previousAverageScore;

  // Find best and worst subjects
  const subjectPerformance = {};
  exams.forEach((exam) => {
    if (!subjectPerformance[exam.subject]) {
      subjectPerformance[exam.subject] = {
        totalScore: 0,
        count: 0,
      };
    }
    subjectPerformance[exam.subject].totalScore += exam.score;
    subjectPerformance[exam.subject].count += 1;
  });

  let bestSubject = { name: "-", score: 0 };
  let worstSubject = { name: "-", score: 100 };

  for (const subject in subjectPerformance) {
    const avgScore = Math.round(
      subjectPerformance[subject].totalScore / subjectPerformance[subject].count
    );
    if (avgScore > bestSubject.score) {
      bestSubject = { name: subject, score: avgScore };
    }
    if (avgScore < worstSubject.score) {
      worstSubject = { name: subject, score: avgScore };
    }
  }

  // Update DOM
  document.getElementById("average-score").textContent = `${averageScore}%`;
  document.getElementById("score-change").textContent = `${
    scoreChange >= 0 ? "+" : ""
  }${scoreChange}% from previous`;
  document.getElementById("score-change").className = `stat-change ${
    scoreChange >= 0 ? "positive" : "negative"
  }`;

  document.getElementById("exams-taken").textContent = exams.length;
  document.getElementById("exams-change").textContent = `+${
    exams.length - previousExams.length
  } from previous`;

  document.getElementById("best-subject").textContent = bestSubject.name;
  document.getElementById(
    "best-subject-score"
  ).textContent = `${bestSubject.score}%`;

  document.getElementById("worst-subject").textContent = worstSubject.name;
  document.getElementById(
    "worst-subject-score"
  ).textContent = `${worstSubject.score}%`;
}

// Update performance chart
function updatePerformanceChart(exams) {
  const sortedExams = [...exams].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const labels = sortedExams.map((exam) => {
    const date = new Date(exam.date);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  });

  const scores = sortedExams.map((exam) => exam.score);

  const ctx = document.getElementById("performance-chart").getContext("2d");

  // Destroy existing chart if it exists
  if (window.performanceChart) {
    window.performanceChart.destroy();
  }

  window.performanceChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Score (%)",
          data: scores,
          backgroundColor: "rgba(247, 181, 0, 0.2)",
          borderColor: "#f7b500",
          borderWidth: 2,
          tension: 0.3,
          pointBackgroundColor: "#f7b500",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          titleFont: {
            size: 14,
          },
          bodyFont: {
            size: 13,
          },
          callbacks: {
            title: (tooltipItems) => {
              const index = tooltipItems[0].dataIndex;
              return sortedExams[index].subject;
            },
          },
        },
      },
    },
  });
}

// Update subjects chart
function updateSubjectsChart(exams) {
  const subjectPerformance = {};

  exams.forEach((exam) => {
    if (!subjectPerformance[exam.subject]) {
      subjectPerformance[exam.subject] = {
        totalScore: 0,
        count: 0,
      };
    }
    subjectPerformance[exam.subject].totalScore += exam.score;
    subjectPerformance[exam.subject].count += 1;
  });

  const subjects = Object.keys(subjectPerformance);
  const averageScores = subjects.map((subject) =>
    Math.round(
      subjectPerformance[subject].totalScore / subjectPerformance[subject].count
    )
  );

  const ctx = document.getElementById("subjects-chart").getContext("2d");

  // Destroy existing chart if it exists
  if (window.subjectsChart) {
    window.subjectsChart.destroy();
  }

  // Generate colors
  const colors = subjects.map((_, index) => {
    const hue = (index * 50) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  });

  window.subjectsChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: subjects,
      datasets: [
        {
          label: "Average Score (%)",
          data: averageScores,
          backgroundColor: colors,
          borderColor: colors.map((color) => color.replace("60%", "50%")),
          borderWidth: 1,
          borderRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
}

// Update recent exams table
function updateRecentExamsTable(exams) {
  const tableBody = document.getElementById("recent-exams-table");
  tableBody.innerHTML = "";

  if (exams.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="6" class="loading-data">No exams found for the selected period.</td></tr>';
    return;
  }

  // Sort exams by date (most recent first)
  const sortedExams = [...exams].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // Display only the 5 most recent exams
  const recentExams = sortedExams.slice(0, 5);

  recentExams.forEach((exam) => {
    const row = document.createElement("tr");

    // Format date
    const examDate = new Date(exam.date);
    const formattedDate = `${examDate.getDate()}/${
      examDate.getMonth() + 1
    }/${examDate.getFullYear()}`;

    // Determine grade
    const grade = getGradeFromScore(exam.score);
    const gradeClass = `grade-${grade.toLowerCase().replace("+", "-plus")}`;

    row.innerHTML = `
      <td>${formattedDate}</td>
      <td>${exam.subject}</td>
      <td>Primary ${exam.class.substring(1)}</td>
      <td class="score-cell">${exam.score}%</td>
      <td><span class="grade-cell ${gradeClass}">${grade}</span></td>
      <td>
        <button class="action-btn" onclick="viewExamDetails(${exam.id})">
          <i class="fas fa-eye"></i> View
        </button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

// Get grade from score
function getGradeFromScore(score) {
  if (score >= 81) return "A+";
  if (score >= 71) return "A";
  if (score >= 66) return "B+";
  if (score >= 61) return "B";
  if (score >= 56) return "C+";
  if (score >= 51) return "C";
  if (score >= 46) return "D+";
  if (score >= 41) return "D";
  if (score >= 36) return "E+";
  if (score >= 31) return "E";
  return "F";
}

// Add this function to analyze topic performance
function analyzeTopicPerformance(exams) {
  const topicPerformance = {};

  exams.forEach((exam) => {
    exam.responses.forEach((response) => {
      const topic = response.topic || "General";
      const topicKey = `${topic} (${exam.subject})`;

      if (!topicPerformance[topicKey]) {
        topicPerformance[topicKey] = {
          correct: 0,
          total: 0,
          subject: exam.subject,
          topic: topic,
        };
      }

      topicPerformance[topicKey].correct += response.correct;
      topicPerformance[topicKey].total += response.total;
    });
  });

  // Calculate percentages and create array
  const topicAnalysis = Object.keys(topicPerformance).map((key) => {
    const data = topicPerformance[key];
    return {
      topicKey: key,
      topic: data.topic,
      subject: data.subject,
      correct: data.correct,
      total: data.total,
      percentage: Math.round((data.correct / data.total) * 100),
    };
  });

  return topicAnalysis;
}

// Add a new function to create a topic performance chart
function createTopicPerformanceChart(exams) {
  const topicAnalysis = analyzeTopicPerformance(exams);

  // Sort by percentage
  topicAnalysis.sort((a, b) => b.percentage - a.percentage);

  // Take top 10 topics for readability
  const topTopics = topicAnalysis.slice(0, 10);

  // Create chart data
  const labels = topTopics.map((item) => item.topicKey);
  const data = topTopics.map((item) => item.percentage);
  const colors = topTopics.map((_, index) => {
    const hue = (index * 30) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  });

  // Create chart if container exists
  const topicChartContainer = document.getElementById(
    "topic-performance-chart"
  );
  if (topicChartContainer) {
    const ctx = topicChartContainer.getContext("2d");

    // Destroy existing chart if it exists
    if (window.topicChart) {
      window.topicChart.destroy();
    }

    window.topicChart = new Chart(ctx, {
      type: "horizontalBar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Performance (%)",
            data: data,
            backgroundColor: colors,
            borderColor: colors.map((color) => color.replace("60%", "50%")),
            borderWidth: 1,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const item = topTopics[context.dataIndex];
                return `${item.percentage}% (${item.correct}/${item.total})`;
              },
            },
          },
        },
      },
    });
  }
}

// Update strengths and weaknesses
function updateStrengthsWeaknesses(exams) {
  const strengthsList = document.getElementById("strengths-list");
  const weaknessesList = document.getElementById("weaknesses-list");

  strengthsList.innerHTML = "";
  weaknessesList.innerHTML = "";

  if (exams.length === 0) {
    strengthsList.innerHTML =
      '<li class="loading-data">No data available for the selected period.</li>';
    weaknessesList.innerHTML =
      '<li class="loading-data">No data available for the selected period.</li>';
    return;
  }

  // Get topic analysis
  const topicAnalysis = analyzeTopicPerformance(exams);

  // Sort for strengths (highest percentage first)
  const topTopics = [...topicAnalysis]
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5);

  // Sort for weaknesses (lowest percentage first)
  const bottomTopics = [...topicAnalysis]
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 5);

  // Display strengths
  topTopics.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `<i class="fas fa-check-circle"></i> <strong>${item.topicKey}:</strong> ${item.percentage}% correct (${item.correct}/${item.total})`;
    strengthsList.appendChild(li);
  });

  // Display weaknesses
  bottomTopics.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `<i class="fas fa-exclamation-circle"></i> <strong>${item.topicKey}:</strong> ${item.percentage}% correct (${item.correct}/${item.total})`;
    weaknessesList.appendChild(li);
  });
}

// Update recommendations
function updateRecommendations(exams) {
  const recommendationsContainer = document.getElementById(
    "recommendations-container"
  );
  recommendationsContainer.innerHTML = "";

  if (exams.length === 0) {
    recommendationsContainer.innerHTML =
      '<p class="loading-data">No data available for the selected period.</p>';
    return;
  }

  // Analyze subject performance
  const subjectPerformance = {};

  exams.forEach((exam) => {
    if (!subjectPerformance[exam.subject]) {
      subjectPerformance[exam.subject] = {
        totalScore: 0,
        count: 0,
      };
    }
    subjectPerformance[exam.subject].totalScore += exam.score;
    subjectPerformance[exam.subject].count += 1;
  });

  // Find weakest subject
  let weakestSubject = { name: "", score: 100 };

  for (const subject in subjectPerformance) {
    const avgScore = Math.round(
      subjectPerformance[subject].totalScore / subjectPerformance[subject].count
    );
    if (avgScore < weakestSubject.score) {
      weakestSubject = { name: subject, score: avgScore };
    }
  }

  // Generate recommendations
  const recommendations = [];

  // Recommendation based on weakest subject
  if (weakestSubject.name) {
    recommendations.push({
      title: `Focus on ${weakestSubject.name}`,
      icon: "fas fa-book",
      content: `Your average score in ${weakestSubject.name} is ${weakestSubject.score}%. We recommend spending more time studying this subject to improve your overall performance.`,
    });
  }

  // Recommendation based on exam frequency
  const daysPerExam =
    exams.length > 1
      ? Math.round(
          (new Date(exams[exams.length - 1].date) - new Date(exams[0].date)) /
            (86400000 * (exams.length - 1))
        )
      : 0;

  if (daysPerExam > 5 || exams.length === 1) {
    recommendations.push({
      title: "Increase Practice Frequency",
      icon: "fas fa-calendar-alt",
      content:
        "Regular practice leads to better retention. Try to take at least 2-3 practice exams per week to maximize your learning and improve your scores.",
    });
  }

  // General recommendation
  recommendations.push({
    title: "Review Incorrect Answers",
    icon: "fas fa-sync-alt",
    content:
      "Make sure to review all incorrect answers after each exam. Understanding your mistakes is one of the most effective ways to improve your knowledge and prevent similar errors in the future.",
  });

  // Display recommendations
  recommendations.forEach((recommendation) => {
    const card = document.createElement("div");
    card.className = "recommendation-card";
    card.innerHTML = `
      <h4><i class="${recommendation.icon}"></i> ${recommendation.title}</h4>
      <p>${recommendation.content}</p>
    `;
    recommendationsContainer.appendChild(card);
  });
}

// View exam details (placeholder function)
function viewExamDetails(examId) {
  // Get exam history from localStorage
  const examHistory = JSON.parse(localStorage.getItem("examHistory") || "[]");
  const exam = examHistory.find((e) => e.id === examId);

  if (!exam) {
    alert("Exam details not found");
    return;
  }

  // Redirect to review page with this exam's data
  localStorage.setItem("examResponses", JSON.stringify(exam.responses));
  localStorage.setItem("examSubjectResult", exam.subject);
  localStorage.setItem("examClassResult", exam.class);

  window.location.href = "review.html";
}
