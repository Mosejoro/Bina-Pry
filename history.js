import { Chart } from "@/components/ui/chart"
// BINA Pro Exam History JavaScript

// DOM Elements
const sidebarToggle = document.getElementById("sidebar-toggle")
const body = document.body
const userName = document.getElementById("user-name")
const subjectFilter = document.getElementById("subject-filter")
const classFilter = document.getElementById("class-filter")
const dateFilter = document.getElementById("date-filter")
const applyFiltersBtn = document.getElementById("apply-filters")
const historyTable = document.getElementById("history-table")
const prevPageBtn = document.getElementById("prev-page")
const nextPageBtn = document.getElementById("next-page")
const pageInfo = document.getElementById("page-info")
const exportPdfBtn = document.getElementById("export-pdf")
const exportCsvBtn = document.getElementById("export-csv")
const examModal = document.getElementById("exam-modal")
const closeModal = document.getElementById("close-modal")
const modalBody = document.getElementById("modal-body")

// Sample data - In a real application, this would come from a database
const mockUserData = {
  name: "Student Name",
  class: "Primary 6",
  exams: [
    {
      id: 1,
      date: "2023-11-01",
      subject: "Mathematics",
      class: "P6",
      score: 85,
      totalQuestions: 20,
      correctAnswers: 17,
      timeSpent: "25:30",
      responses: [
        { topic: "Algebra", correct: 5, total: 6 },
        { topic: "Geometry", correct: 4, total: 5 },
        { topic: "Arithmetic", correct: 8, total: 9 },
      ],
    },
    {
      id: 2,
      date: "2023-11-05",
      subject: "English",
      class: "P6",
      score: 75,
      totalQuestions: 20,
      correctAnswers: 15,
      timeSpent: "28:15",
      responses: [
        { topic: "Grammar", correct: 7, total: 8 },
        { topic: "Comprehension", correct: 5, total: 8 },
        { topic: "Vocabulary", correct: 3, total: 4 },
      ],
    },
    {
      id: 3,
      date: "2023-11-10",
      subject: "Science",
      class: "P6",
      score: 90,
      totalQuestions: 20,
      correctAnswers: 18,
      timeSpent: "22:45",
      responses: [
        { topic: "Biology", correct: 6, total: 7 },
        { topic: "Chemistry", correct: 5, total: 5 },
        { topic: "Physics", correct: 7, total: 8 },
      ],
    },
    {
      id: 4,
      date: "2023-11-15",
      subject: "Social Studies",
      class: "P6",
      score: 70,
      totalQuestions: 20,
      correctAnswers: 14,
      timeSpent: "29:10",
      responses: [
        { topic: "History", correct: 4, total: 6 },
        { topic: "Geography", correct: 5, total: 7 },
        { topic: "Civics", correct: 5, total: 7 },
      ],
    },
    {
      id: 5,
      date: "2023-11-20",
      subject: "Mathematics",
      class: "P6",
      score: 95,
      totalQuestions: 20,
      correctAnswers: 19,
      timeSpent: "24:30",
      responses: [
        { topic: "Algebra", correct: 6, total: 6 },
        { topic: "Geometry", correct: 5, total: 6 },
        { topic: "Arithmetic", correct: 8, total: 8 },
      ],
    },
    {
      id: 6,
      date: "2023-11-25",
      subject: "English",
      class: "P6",
      score: 80,
      totalQuestions: 20,
      correctAnswers: 16,
      timeSpent: "26:45",
      responses: [
        { topic: "Grammar", correct: 6, total: 7 },
        { topic: "Comprehension", correct: 6, total: 8 },
        { topic: "Vocabulary", correct: 4, total: 5 },
      ],
    },
    {
      id: 7,
      date: "2023-11-30",
      subject: "Science",
      class: "P6",
      score: 85,
      totalQuestions: 20,
      correctAnswers: 17,
      timeSpent: "23:15",
      responses: [
        { topic: "Biology", correct: 5, total: 6 },
        { topic: "Chemistry", correct: 6, total: 7 },
        { topic: "Physics", correct: 6, total: 7 },
      ],
    },
  ],
}

// Pagination variables
let currentPage = 1
const itemsPerPage = 5
let filteredExams = []

// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
  // Set user name
  userName.textContent = mockUserData.name

  // Initialize sidebar toggle
  sidebarToggle.addEventListener("click", () => {
    body.classList.toggle("sidebar-collapsed")
    body.classList.toggle("sidebar-visible")
  })

  // Initialize filters
  applyFiltersBtn.addEventListener("click", applyFilters)

  // Initialize pagination
  prevPageBtn.addEventListener("click", goToPrevPage)
  nextPageBtn.addEventListener("click", goToNextPage)

  // Initialize export buttons
  exportPdfBtn.addEventListener("click", exportToPdf)
  exportCsvBtn.addEventListener("click", exportToCsv)

  // Initialize modal
  closeModal.addEventListener("click", closeExamModal)
  window.addEventListener("click", (event) => {
    if (event.target === examModal) {
      closeExamModal()
    }
  })

  // Initial load
  applyFilters()
})

// Apply filters and update the table
function applyFilters() {
  const subject = subjectFilter.value
  const cls = classFilter.value
  const dateRange = dateFilter.value

  // Filter exams
  filteredExams = mockUserData.exams.filter((exam) => {
    // Subject filter
    if (subject !== "all" && exam.subject !== subject) {
      return false
    }

    // Class filter
    if (cls !== "all" && exam.class !== cls) {
      return false
    }

    // Date filter
    if (dateRange !== "all") {
      const examDate = new Date(exam.date)
      const now = new Date()
      let cutoffDate

      if (dateRange === "month") {
        cutoffDate = new Date(now.setMonth(now.getMonth() - 1))
      } else if (dateRange === "week") {
        cutoffDate = new Date(now.setDate(now.getDate() - 7))
      }

      if (examDate < cutoffDate) {
        return false
      }
    }

    return true
  })

  // Sort by date (most recent first)
  filteredExams.sort((a, b) => new Date(b.date) - new Date(a.date))

  // Reset pagination
  currentPage = 1

  // Update table and summary
  updateHistoryTable()
  updateHistorySummary()
  updateHistoryChart()
}

// Update history table with pagination
function updateHistoryTable() {
  historyTable.innerHTML = ""

  if (filteredExams.length === 0) {
    historyTable.innerHTML =
      '<tr><td colspan="7" class="loading-data">No exams found matching the selected filters.</td></tr>'
    updatePagination(0)
    return
  }

  // Calculate pagination
  const totalPages = Math.ceil(filteredExams.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, filteredExams.length)

  // Display exams for current page
  for (let i = startIndex; i < endIndex; i++) {
    const exam = filteredExams[i]

    // Format date
    const examDate = new Date(exam.date)
    const formattedDate = `${examDate.getDate()}/${examDate.getMonth() + 1}/${examDate.getFullYear()}`

    // Determine grade
    const grade = getGradeFromScore(exam.score)
    const gradeClass = `grade-${grade.toLowerCase().replace("+", "-plus")}`

    const row = document.createElement("tr")
    row.innerHTML = `
      <td>${formattedDate}</td>
      <td>${exam.subject}</td>
      <td>Primary ${exam.class.substring(1)}</td>
      <td class="score-cell">${exam.score}%</td>
      <td><span class="grade-cell ${gradeClass}">${grade}</span></td>
      <td>${exam.timeSpent}</td>
      <td>
        <button class="action-btn" onclick="viewExamDetails(${exam.id})">
          <i class="fas fa-eye"></i> View
        </button>
        <button class="action-btn" onclick="downloadCertificate(${exam.id})">
          <i class="fas fa-certificate"></i> Certificate
        </button>
      </td>
    `

    historyTable.appendChild(row)
  }

  // Update pagination controls
  updatePagination(totalPages)
}

// Update pagination controls
function updatePagination(totalPages) {
  pageInfo.textContent = totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : "No results"

  prevPageBtn.disabled = currentPage <= 1
  nextPageBtn.disabled = currentPage >= totalPages
}

// Go to previous page
function goToPrevPage() {
  if (currentPage > 1) {
    currentPage--
    updateHistoryTable()
  }
}

// Go to next page
function goToNextPage() {
  const totalPages = Math.ceil(filteredExams.length / itemsPerPage)
  if (currentPage < totalPages) {
    currentPage++
    updateHistoryTable()
  }
}

// Update history summary
function updateHistorySummary() {
  const totalExams = filteredExams.length
  document.getElementById("total-exams").textContent = totalExams

  if (totalExams === 0) {
    document.getElementById("average-score-history").textContent = "0%"
    document.getElementById("highest-score").textContent = "0%"
    return
  }

  // Calculate average score
  const totalScore = filteredExams.reduce((sum, exam) => sum + exam.score, 0)
  const averageScore = Math.round(totalScore / totalExams)
  document.getElementById("average-score-history").textContent = `${averageScore}%`

  // Find highest score
  const highestScore = Math.max(...filteredExams.map((exam) => exam.score))
  document.getElementById("highest-score").textContent = `${highestScore}%`
}

// Update history chart
function updateHistoryChart() {
  const ctx = document.getElementById("history-chart").getContext("2d")

  // Destroy existing chart if it exists
  if (window.historyChart) {
    window.historyChart.destroy()
  }

  if (filteredExams.length === 0) {
    return
  }

  // Sort exams by date (oldest first for chart)
  const sortedExams = [...filteredExams].sort((a, b) => new Date(a.date) - new Date(b.date))

  // Prepare data for chart
  const labels = sortedExams.map((exam) => {
    const date = new Date(exam.date)
    return `${date.getDate()}/${date.getMonth() + 1}`
  })

  const scores = sortedExams.map((exam) => exam.score)

  // Create datasets by subject
  const subjects = [...new Set(sortedExams.map((exam) => exam.subject))]
  const datasets = subjects.map((subject, index) => {
    const subjectExams = sortedExams.filter((exam) => exam.subject === subject)
    const hue = (index * 50) % 360
    const color = `hsl(${hue}, 70%, 60%)`

    return {
      label: subject,
      data: subjectExams.map((exam) => exam.score),
      borderColor: color,
      backgroundColor: color.replace("60%", "20%"),
      borderWidth: 2,
      tension: 0.3,
      pointBackgroundColor: color,
      pointBorderColor: "#fff",
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      fill: false,
    }
  })

  // Create chart
  window.historyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: datasets,
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
          position: "top",
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          titleFont: {
            size: 14,
          },
          bodyFont: {
            size: 13,
          },
        },
      },
    },
  })
}

// View exam details
function viewExamDetails(examId) {
  const exam = mockUserData.exams.find((exam) => exam.id === examId)

  if (!exam) {
    alert("Exam not found")
    return
  }

  // Format date
  const examDate = new Date(exam.date)
  const formattedDate = `${examDate.getDate()}/${examDate.getMonth() + 1}/${examDate.getFullYear()}`

  // Determine grade
  const grade = getGradeFromScore(exam.score)

  // Calculate topic performance
  const topicPerformance = exam.responses.map((response) => {
    const percentage = Math.round((response.correct / response.total) * 100)
    return {
      topic: response.topic,
      percentage: percentage,
      correct: response.correct,
      total: response.total,
    }
  })

  // Sort topics by performance
  topicPerformance.sort((a, b) => b.percentage - a.percentage)

  // Update modal title
  document.getElementById("modal-title").textContent = `${exam.subject} Exam Details`

  // Update modal body
  modalBody.innerHTML = `
    <div class="exam-details">
      <div class="exam-details-header">
        <div class="exam-info">
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Subject:</strong> ${exam.subject}</p>
          <p><strong>Class:</strong> Primary ${exam.class.substring(1)}</p>
        </div>
        <div class="exam-score">
          <div class="score-circle">
            <span class="score-value">${exam.score}%</span>
            <span class="grade-value">${grade}</span>
          </div>
        </div>
      </div>
      
      <div class="exam-stats">
        <div class="stat-item">
          <span class="stat-label">Questions</span>
          <span class="stat-value">${exam.totalQuestions}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Correct</span>
          <span class="stat-value">${exam.correctAnswers}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Time Spent</span>
          <span class="stat-value">${exam.timeSpent}</span>
        </div>
      </div>
      
      <h3>Topic Performance</h3>
      <div class="topic-performance">
        ${topicPerformance
          .map(
            (topic) => `
          <div class="topic-item">
            <div class="topic-header">
              <span class="topic-name">${topic.topic}</span>
              <span class="topic-score">${topic.percentage}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${topic.percentage}%; background-color: ${getColorForPercentage(topic.percentage)}"></div>
            </div>
            <div class="topic-details">
              <span>${topic.correct}/${topic.total} correct</span>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
      
      <div class="exam-actions">
        <button class="action-btn" onclick="downloadCertificate(${exam.id})">
          <i class="fas fa-certificate"></i> Download Certificate
        </button>
        <button class="action-btn" onclick="printExamReport(${exam.id})">
          <i class="fas fa-print"></i> Print Report
        </button>
      </div>
    </div>
  `

  // Show modal
  examModal.style.display = "block"
}

// Close exam modal
function closeExamModal() {
  examModal.style.display = "none"
}

// Get grade from score
function getGradeFromScore(score) {
  if (score >= 81) return "A+"
  if (score >= 71) return "A"
  if (score >= 66) return "B+"
  if (score >= 61) return "B"
  if (score >= 56) return "C+"
  if (score >= 51) return "C"
  if (score >= 46) return "D+"
  if (score >= 41) return "D"
  if (score >= 36) return "E+"
  if (score >= 31) return "E"
  return "F"
}

// Get color for percentage
function getColorForPercentage(percentage) {
  if (percentage >= 80) return "#27ae60"
  if (percentage >= 60) return "#3498db"
  if (percentage >= 40) return "#f39c12"
  return "#e74c3c"
}

// Export to PDF (placeholder function)
function exportToPdf() {
  alert("This feature would generate a PDF report of your exam history.")
}

// Export to CSV (placeholder function)
function exportToCsv() {
  alert("This feature would export your exam history to a CSV file.")
}

// Download certificate (placeholder function)
function downloadCertificate(examId) {
  alert(`This feature would generate a certificate for exam #${examId}.`)
}

// Print exam report (placeholder function)
function printExamReport(examId) {
  alert(`This feature would print a detailed report for exam #${examId}.`)
}

