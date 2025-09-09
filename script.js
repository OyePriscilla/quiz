let currentUser = null;
let questions = [];
let results = {}; // This variable is not actively used in the provided code for storing results

const users = {
    "student1": "12345678",
    "student2": "12345678",
    "admin": "admin123"
};

/**
 * Loads questions from a JSON file based on the current user.
 * If the user is 'student1', it loads 'questions.json'.
 * If the user is 'student2', it loads 'quiz2.json'.
 */
async function loadQuestions() {
    let file = "";
    if (currentUser === "student1") {
        file = "questions.json";
    } else if (currentUser === "student2") {
        file = "quiz2.json";
    }
    if (file) {
        try {
            const res = await fetch(file);
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            questions = await res.json();
        } catch (error) {
            console.error("Error loading questions:", error);
            document.getElementById("student-msg").textContent = "Error loading quiz questions. Please try again later.";
            questions = []; // Reset questions on error
        }
    }
}

/**
 * Handles the login process.
 * Validates username and password against the 'users' object.
 * Navigates to the appropriate screen (quiz or admin) upon successful login.
 */
async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const errorDiv = document.getElementById("login-error");

    errorDiv.textContent = ""; // Clear previous errors

    if (users[username] && users[username] === password) {
        currentUser = username;
        document.getElementById("login-screen").classList.add("hidden");

        if (username === "admin") {
            document.getElementById("admin-screen").classList.remove("hidden");
            showResults();
        } else {
            await loadQuestions(); // Load questions specific to the student
            if (questions.length > 0) { // Only display quiz if questions were loaded successfully
                displayQuiz();
                document.getElementById("quiz-screen").classList.remove("hidden");
            } else {
                // If questions failed to load, show an error and return to login
                document.getElementById("student-msg").textContent = "Failed to load quiz. Please contact administrator.";
                logout(); // Log out the user if quiz can't be loaded
            }
        }
    } else {
        errorDiv.textContent = "Invalid login details!";
    }
}

/**
 * Displays the quiz questions and options on the screen.
 * Dynamically creates HTML elements for each question and its answers.
 */
function displayQuiz() {
    const quizForm = document.getElementById("quiz-form");
    quizForm.innerHTML = ""; // Clear previous content

    if (questions.length === 0) {
        quizForm.innerHTML = "<p>No questions available for this quiz.</p>";
        return;
    }

    questions.forEach((q, index) => {
        const qDiv = document.createElement("div");
        qDiv.className = "question-card";
        qDiv.innerHTML = `<p><b>Q${index + 1}:</b> ${q.question ? q.question : "<i>No question text</i>"}</p>`;

        const optsDiv = document.createElement("div");
        optsDiv.className = "options";

        if (Array.isArray(q.options) && q.options.length > 0) {
            q.options.forEach((opt, optIdx) => {
                const id = `q${index}_${optIdx}`;
                optsDiv.innerHTML += `
                    <label>
                        <input type="radio" name="q${index}" value="${optIdx}" id="${id}"> ${opt}
                    </label>
                `;
            });
        } else {
            // For questions without predefined options, provide a text input
            optsDiv.innerHTML += `
                <input type="text" name="q${index}" placeholder="Type your answer here">
            `;
        }

        qDiv.appendChild(optsDiv);
        quizForm.appendChild(qDiv);
    });

    // Remove any existing submit button before adding a new one
    let oldBtn = document.getElementById("quiz-submit-btn");
    if (oldBtn) oldBtn.remove();

    // Add submit button and message area
    const submitBtn = document.createElement("button");
    submitBtn.type = "button"; // Important: prevents form submission
    submitBtn.textContent = "Submit Quiz";
    submitBtn.id = "quiz-submit-btn";
    submitBtn.onclick = submitQuiz;
    quizForm.appendChild(submitBtn);

    const msgDiv = document.createElement("div");
    msgDiv.id = "student-msg";
    quizForm.appendChild(msgDiv);
}

/**
 * Handles the submission of the quiz.
 * Calculates the score, records answers, and saves results to localStorage.
 */
async function submitQuiz() {
    let score = 0;
    let answers = [];

    questions.forEach((q, i) => {
        let selectedValue = null;
        let correctValue = q.answer !== undefined && q.answer !== null ? String(q.answer).toLowerCase().trim() : null;

        if (Array.isArray(q.options) && q.options.length > 0) {
            const selectedRadio = document.querySelector(`input[name="q${i}"]:checked`);
            if (selectedRadio) {
                selectedValue = q.options[parseInt(selectedRadio.value)].toLowerCase().trim();
            }
        } else {
            const selectedTextInput = document.querySelector(`input[name="q${i}"]`);
            if (selectedTextInput) {
                selectedValue = selectedTextInput.value.toLowerCase().trim();
            }
        }

        if (selectedValue && correctValue && selectedValue === correctValue) {
            score++;
        }

        answers.push({
            question: q.question ? q.question : "<i>No question text</i>",
            selected: selectedValue ? selectedValue : "<i>No answer selected</i>",
            correct: q.answer !== undefined && q.answer !== null ? q.answer : "<i>No correct answer defined</i>"
        });
    });

    let allResults = JSON.parse(localStorage.getItem("examResults") || "{}");
    allResults[currentUser] = {
        score: score,
        totalQuestions: questions.length,
        answers: answers
    };
    localStorage.setItem("examResults", JSON.stringify(allResults));

    // Prepare data for Formspree
    const formData = {
        student: currentUser,
        score: `${score} / ${questions.length}`,
        answers: answers.map((ans, idx) =>
            `Q${idx + 1}: ${ans.question}\nSelected: ${ans.selected}\nCorrect: ${ans.correct}`
        ).join('\n\n')
    };

    // Send result to Formspree
    try {
        await fetch("https://formspree.io/f/meqnnned", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        });
        document.getElementById("student-msg").textContent = "Your answers have been submitted successfully! (Result sent to admin)";
    } catch (error) {
        document.getElementById("student-msg").textContent = "Submission succeeded locally, but failed to send email.";
    }

    document.getElementById("quiz-form").innerHTML = "";
}

/**
 * Displays all student results on the admin screen.
 * Retrieves results from localStorage and formats them for display.
 */
function showResults() {
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "<h3>Students' Scores & Answers</h3>";

    let allResults = JSON.parse(localStorage.getItem("examResults") || "{}");

    // Check if there are any results to display
    const studentEntries = Object.entries(allResults);
    if (studentEntries.length === 0) {
        resultsDiv.innerHTML += "<p>No student results available yet.</p>";
        return;
    }

    // Sort results by student name alphabetically for better organization
    studentEntries.sort((a, b) => a[0].localeCompare(b[0]));

    studentEntries.forEach(([student, result]) => {
        const scorePercentage = result.totalQuestions > 0 ? (result.score / result.totalQuestions) * 100 : 0;
        resultsDiv.innerHTML += `
            <div class="student-result">
                <b>Student:</b> ${student}<br>
                <b>Score:</b> ${result.score} / ${result.totalQuestions} (${scorePercentage.toFixed(1)}%)
            </div>
        `;
        // Display individual answers for review
        result.answers.forEach((ans, idx) => {
            resultsDiv.innerHTML += `
                <div class="question-review">
                    <b>Q${idx + 1}:</b> ${ans.question}<br>
                    <b>Selected:</b> ${ans.selected}<br>
                    <b>Correct:</b> ${ans.correct}
                </div>
            `;
        });
        resultsDiv.innerHTML += `<hr>`; // Separator between student results
    });
}

/**
 * Logs the current user out and resets the application state.
 * Hides quiz/admin screens and shows the login screen.
 */
function logout() {
    currentUser = null;
    questions = []; // Clear questions
    document.getElementById("login-screen").classList.remove("hidden");
    document.getElementById("quiz-screen").classList.add("hidden");
    document.getElementById("admin-screen").classList.add("hidden");

    // Clear input fields on login screen
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    document.getElementById("login-error").textContent = ""; // Clear login error
}

// Initial setup: Ensure login screen is visible on page load
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("login-screen").classList.remove("hidden");
    document.getElementById("quiz-screen").classList.add("hidden");
    document.getElementById("admin-screen").classList.add("hidden");
});