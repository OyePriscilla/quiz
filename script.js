let currentUser = null;
let questions = [];
let results = {};

const users = {
    "student1": "12345678",
    "student2": "12345678",
    "admin": "admin123"
};

async function loadQuestions() {
    let file = "";
    if (currentUser === "student1") {
        file = "questions.json";
    } else if (currentUser === "student2") {
        file = "quiz2.json";
    }
    if (file) {
        const res = await fetch(file);
        questions = await res.json();
    }
}

async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const error = document.getElementById("login-error");

    if (users[username] && users[username] === password) {
        currentUser = username;
        document.getElementById("login-screen").classList.add("hidden");

        if (username === "admin") {
            document.getElementById("admin-screen").classList.remove("hidden");
            showResults();
        } else {
            await loadQuestions();
            displayQuiz();
            document.getElementById("quiz-screen").classList.remove("hidden");
        }
    } else {
        error.textContent = "Invalid login details!";
    }
}

function displayQuiz() {
    const quizForm = document.getElementById("quiz-form");
    quizForm.innerHTML = "";

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
            optsDiv.innerHTML += `
                <input type="text" name="q${index}" placeholder="Type your answer here">
            `;
        }

        qDiv.appendChild(optsDiv);
        quizForm.appendChild(qDiv);
    });

    const submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.textContent = "Submit";
    submitBtn.onclick = submitQuiz;
    quizForm.appendChild(submitBtn);

    const msgDiv = document.createElement("div");
    msgDiv.id = "student-msg";
    quizForm.appendChild(msgDiv);
}

function submitQuiz() {
    let score = 0;
    let answers = [];

    questions.forEach((q, i) => {
        let selectedIdx = null;
        let selectedText = null;
        let correctIdx = null;
        let correctText = null;

        if (Array.isArray(q.options) && q.options.length > 0) {
            const answer = document.querySelector(`input[name="q${i}"]:checked`);
            selectedIdx = answer ? parseInt(answer.value) : null;
            selectedText = selectedIdx !== null ? q.options[selectedIdx] : null;
            correctIdx = q.options.findIndex(opt => String(opt).toLowerCase().trim() === String(q.answer).toLowerCase().trim());
            correctText = correctIdx !== -1 ? q.options[correctIdx] : q.answer;

            if (selectedIdx !== null && selectedIdx === correctIdx) {
                score++;
            }
        } else {
            const answer = document.querySelector(`input[name="q${i}"]`);
            selectedText = answer ? answer.value.trim() : null;
            correctText = q.answer ? q.answer : "<i>No correct answer</i>";
            if (
                selectedText !== null &&
                q.answer !== undefined &&
                selectedText.toLowerCase().trim() === String(q.answer).toLowerCase().trim()
            ) {
                score++;
            }
        }

        answers.push({
            question: q.question ? q.question : "<i>No question text</i>",
            selected: selectedText,
            correct: correctText
        });
    });

    let allResults = JSON.parse(localStorage.getItem("examResults") || "{}");
    allResults[currentUser] = {
        score: score,
        answers: answers
    };
    localStorage.setItem("examResults", JSON.stringify(allResults));

    document.getElementById("student-msg").textContent =
        "Your answers have been submitted successfully.";
    document.getElementById("quiz-form").innerHTML = "";
}

function showResults() {
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "<h3>Students' Scores & Answers</h3>";

    let allResults = JSON.parse(localStorage.getItem("examResults") || "{}");
    for (let student in allResults) {
        const result = allResults[student];
        resultsDiv.innerHTML += `<div class="student-result"><b>${student}</b>: Score = ${result.score}</div>`;
        result.answers.forEach((ans, idx) => {
            resultsDiv.innerHTML += `
                <div class="question-review">
                    <b>Q${idx + 1}:</b> ${ans.question}<br>
                    <b>Selected:</b> ${ans.selected ? ans.selected : "<i>No answer</i>"}<br>
                    <b>Correct:</b> ${ans.correct}
                </div>
            `;
        });
        resultsDiv.innerHTML += `<hr>`;
    }
}