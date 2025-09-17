const express = require("express");
const app = express();
app.use(express.json());

// Hardcoded questions with 5-digit IDs and different fetch styles
const questions = [
  { id: 10001, question: "What is 5 + 7?", answer: "12", method: "query" },
  { id: 10002, question: "Capital of France?", answer: "Paris", method: "params" },
  { id: 10003, question: "HTTP method for fetching data?", answer: "GET", method: "header" },
  { id: 10004, question: "2 * 6 = ?", answer: "12", method: "body" },
];

// In-memory user storage
let users = {
  "kamriyamanoj@gmail.com": {
    progress: 0,
    answers: []
  }
};


// Welcome route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the Step-by-Step Quiz",
    instructions: "POST your email to /start to begin",
  });
});


app.get("/start", (req, res) => {
  res.json({
    message: "Wrong Method type, Try again",
    
  });
});

// Start quiz


app.post("/start", (req, res) => {
    if (!req.body) return res.status(400).json({ error: "Please include email in request body" });
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  if (!users[email]) {
    users[email] = { progress: 0, answers: [] };
  }

  res.json({
    message: "Quiz started!",
    token: email,
    instructions: "Use Authorization: Bearer <your_email> and use /next route to get question",
  });
});

// Middleware for auth
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }
  const token = authHeader.split(" ")[1];
  if (!users[token]) {
    return res.status(401).json({ error: "User not found, use /start" });
  }
  req.user = token;
  next();
}


// Get next question (one by one)
app.get("/next", auth, (req, res) => {
  const user = users[req.user];
  if (user.progress >= questions.length) {
    return res.json({ message: "🎉 Quiz completed!", answers: user.answers });
  }

  const q = questions[user.progress];
  let fetchInstruction = "";
  let answerInstruction = "";

  switch (q.method) {
    case "query":
      fetchInstruction = `GET /question?id=${q.id}`;
      answerInstruction = `POST /questions/${q.id}/submit with body { "answer": "..." }`;
      break;
    case "params":
      fetchInstruction = `GET /question/${q.id}`;
      answerInstruction = `POST /questions/${q.id}/submit with body { "answer": "..." }`;
      break;
    case "header":
      fetchInstruction = `GET /question with header X-Quiz-ID: ${q.id}`;
      answerInstruction = `POST /questions/${q.id}/submit with body { "answer": "..." }`;
      break;
    case "body":
      fetchInstruction = `POST /question with JSON body { "id": ${q.id} }`;
      answerInstruction = `POST /questions/${q.id}/submit with body { "answer": "..." }`;
      break;
  }

  res.json({
    id: q.id,
    fetchStyle: q.method,
    instructions: {
      fetch: fetchInstruction,
      answer: answerInstruction
    }
  });
});


// Route for query param style
app.get("/question", auth, (req, res) => {
  const qId = parseInt(req.query.id);
  const q = questions.find((x) => x.id === qId && x.method === "query");
  if (!q) return res.status(404).json({ error: "Invalid query param" });

  res.json({
    id: q.id,
    question: q.question,
    answerMethod: `POST /questions/${q.id}/submit with body { "answer": "..." }`
  });
});

// Route for params style
app.get("/question/:id", auth, (req, res) => {
  const qId = parseInt(req.params.id);
  const q = questions.find((x) => x.id === qId && x.method === "params");
  if (!q) return res.status(404).json({ error: "Invalid route param" });

  res.json({
    id: q.id,
    question: q.question,
    answerMethod: `POST /questions/${q.id}/submit with body { "answer": "..." }`
  });
});

// Route for header style
app.get("/question", auth, (req, res, next) => {
  const qId = parseInt(req.headers["x-quiz-id"]);
  const q = questions.find((x) => x.id === qId && x.method === "header");
  if (!q) return next();

  res.json({
    id: q.id,
    question: q.question,
    answerMethod: `POST /questions/${q.id}/submit with body { "answer": "..." }`
  });
});

// Route for body style
app.post("/question", auth, (req, res) => {
  const { id } = req.body;
  const q = questions.find((x) => x.id === id && x.method === "body");
  if (!q) return res.status(404).json({ error: "Invalid body param" });

  res.json({
    id: q.id,
    question: q.question,
    answerMethod: `POST /questions/${q.id}/submit with body { "answer": "..." }`
  });
});


// Submit answer
app.post("/questions/:id/submit", auth, (req, res) => {
  const qId = parseInt(req.params.id);
  const { answer } = req.body;

  const q = questions.find((x) => x.id === qId);
  if (!q) return res.status(404).json({ error: "Question not found" });

  const user = users[req.user];

  if (String(answer).trim().toLowerCase() === q.answer.toLowerCase()) {
    if (!user.answers.find((a) => a.id === qId)) {
      user.answers.push({ id: qId, correct: true });
      user.progress++;
    }
    return res.json({ correct: true, message: "Correct!" });
  } else {
    return res.json({ correct: false, message: "Wrong, try again!" });
  }
});

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`Quiz API running at http://localhost:${PORT}`)
);
