const express = require("express")
const router = express.Router();
const axios = require("axios");
const UserQuiz = require("../models/userquiz");
const {isLoggedIn} = require("../middleware");
async function generateQuiz(topic) {
    try {
        console.log(process.env.qapi);
        console.log(topic);
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "deepseek/deepseek-r1-zero:free",
            messages: [
                { role: "system", content: "You are a quiz generator. Provide quiz questions in JSON format only, without additional text." },
                {
                    role: "user", content: `Generate 5 multiple-choice quiz questions on ${topic}.Each question should have exactly 4 options and indicate the correct option index (0-based).
                    Example response : [{"question": "Sample?", "options": ["A", "B", "C", "D"], "correctoption": 1}]` }
            ],
            max_tokens: 10000
        }, {
            headers: {
                "Authorization": `Bearer ${process.env.qapi}`,
                "Content-Type": "application/json"
            }
        });
        const jsonString = response.data.choices[0].message.content.trim();
        const questions = JSON.parse(jsonString.slice(jsonString.indexOf('['), jsonString.lastIndexOf(']') + 1));
        console.log(questions);
        return questions.map((q, index) => ({
            id: index + 1,
            question: q.question,
            options: q.options,
            correctoption: q.correctoption
        }));

    } catch (error) {
        console.error("Error generating quiz:", error.message);
        return null;
    }
}

router.post("/", isLoggedIn,async (req, res) => {
    const quiztopic = req.session.quiztopic;
    console.log("inside generate quiz : ", quiztopic);
    try {
        const question = await generateQuiz(quiztopic);
        if (!question) {
            return res.status(500).json({ error: "Failed to generate quiz" });
        }
        const newQuiz = new UserQuiz({ author: req.user._id, questions: question,topic:quiztopic });
        await newQuiz.save();
        req.session.newQuiz = newQuiz;
        return res.json({ success: true });
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Failed to generate quiz" });
    }
})

module.exports=router;