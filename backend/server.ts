import dotenv from "dotenv";
import express from "express";
import cors from "cors";
// import { OpenAI } from "openai";
import process from "process";
import helmet from "helmet";
import { body, validationResult } from "express-validator";
import Anthropic from "@anthropic-ai/sdk";

import "./sentry";
import * as Sentry from "@sentry/node";
import findSolution from "./findSolution";

const IS_DEV = process.env.NODE_ENV === "development";
console.log(IS_DEV);

dotenv.config();

const app = express();
app.use(cors());
app.use(helmet()); // Add basic security
app.use(express.json());

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

const claude = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"], // This is the default and can be omitted
});

app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

app.get("/health", function healthzHandler(req, res) {
  // healthcheck
  res.status(200).send("OK");
});

app.post(
  "/api/chat",
  body("message")
    .isString()
    .notEmpty()
    .withMessage("Invalid request format.")
    .isLength({ max: 4000 })
    .withMessage("Message must not exceed 4000 characters."),
  body("problemTitle")
    .isString()
    .notEmpty()
    .withMessage("Invalid request format.")
    .isLength({ max: 200 })
    .withMessage("Problem title must not exceed 200 characters."),
  body("language")
    .isString()
    .notEmpty()
    .withMessage("Language is required.")
    .isLength({ max: 50 })
    .withMessage("Language must not exceed 50 characters."), // Validate request body
  async (req, res) => {
    console.log(JSON.stringify({ headers: req.headers }));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { message, problemTitle, language } = req.body;
      if (!IS_DEV) {
        console.log(JSON.stringify({ message, problemTitle }));
      } else {
        console.log(message);
      }

      const [problemNumber, ..._problemName] = problemTitle.split(".");
      const problemName = _problemName.join(" ");
      const solution = findSolution({
        problemName: problemName.toLowerCase().trim(),
        problemNumber: problemNumber.trim(),
        language: language.toLowerCase().trim(),
      });

      const SYSTEM_PROMPT =
        "You are a Leetcode expert designed to provide brief hints or ask questions for coding problems. You are proficient at all competitive programming data structures and algorithms. You are skilled at optimization using techniques like memoization and dynamic programming. You know about algorithms for string searching and pattern matching, linked lists, arrays, stacks, queues, trees, graphs, and more. Your response should be concise, (ideally one or two sentences) that is directly relevant to the student's current code and problem. Use the Socratic method and never give the student the full answer immediately. Instead guide the student to the provided correct solution gradually, providing only a hint for the next step. Whenever relevant, reference the student's code to give them the specific location that can be improved. In the beginning, if the student has not written any code, suggest using a brute force method that can be optimized in the future, or suggest solving a simpler subset of the problem that can be generalized later. When you are pointing out bugs or edge cases, give a specific example that the current code would not solve. It is EXTREMELY IMPORTANT to keep your response as short as possible.";

      const solutionText = solution
        ? `The BEST correct solution (language is ${solution.lang}) is:\n ${solution.fileContent}. Guide the student to use the same approach as that code.`
        : "Think of the correct solution, and then start to guide the student to it.";

      const content = `The Leetcode problem being solved is:\n ${problemTitle}. \n ${solutionText}\nThe student's message is:\n ${message}.`;

      console.log(content);

      const completion = await claude.messages.create({
        max_tokens: 4096,
        temperature: 0.3, // Added temperature parameter
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content,
          },
        ],
        model: "claude-3-5-sonnet-20240620",
      });

      // console.log(message.content);
      if (!IS_DEV) {
        console.log(JSON.stringify({ response: completion.content[0].text }));
      } else {
        console.log(completion.content[0].text);
      }
      res.json({ reply: completion.content[0].text });

      // const completion = await openai.chat.completions.create({
      //   model: "gpt-4o-mini-2024-07-18",
      //   messages: [
      //     {
      //       role: "system",
      //       content: SYSTEM_PROMPT,
      //     },
      //     { role: "user", content: message },
      //   ],
      // });
      // res.json({ reply: completion.choices[0].message.content });
    } catch (error) {
      Sentry.captureException(error);
      console.log(error);
      res.status(500).json({ error: "An error occurred." });
    }
  }
);

// The error handler must be registered before any other error middleware and after all controllers
Sentry.setupExpressErrorHandler(app);
// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
