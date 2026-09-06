# AI Interview Context & Personalization Analysis

Based on the frontend (`InterviewInterface.jsx`) and backend (`wshandler.js`), this document details the current data available from the candidate, and how that information can be utilized to highly personalize the AI Interview.

## 1. Information Currently Collected from the Candidate
When a candidate sets up an interview via the `InterviewDetailsModel` modal, the frontend collects the following structured data into the `interviewContext` state object:

- **`category`**: The target industry or domain (e.g., "Software Development", "Human Resources", "Product Management"). This is fetched from the backend categories.
- **`skills`**: An array of specific target skills injected by the user (e.g., `["React", "Node.js", "System Design"]`).
- **`interviewType`**: 
  - `oral`: Focuses on verbal/behavioral logic.
  - `technical`: Focuses on technical core knowledge (and requires camera access).
- **`difficulty`**: The intensity level (`beginner`, `intermediate`, or `advanced`).
- **`experience`**: The candidate's career experience vector in years (`0-1`, `1-2`, `2-5`, or `5+`).
- **`duration`**: Target length of the session (adjustable from 5 to 60 minutes).
- **`userId` / `firebaseUid`**: The authenticated user's unique identifier (injected right before establishing the WebSocket).

## 2. How the Backend Can Utilize This Data
Currently, this `context` object is sent to the backend via the `init_context` WebSocket message. 

To make the AI Interview truly personalized, the backend prompts (specifically the `firstQuestionPrompt` and `responsePrompt` in `wshandler.js`) should be dynamically constructed using these exact parameters:

### A. Shaping the Interviewer Persona & Strictness
- **Experience (`experience`) & Difficulty (`difficulty`)**: 
  - If a candidate selects `0-1` years and `beginner`, the AI should act as a friendly, guiding mentor asking fundamental questions.
  - If a candidate selects `5+` years and `advanced`, the AI should adopt a stringent, senior engineering manager persona, drilling deep into system limits, tradeoffs, and architectural failures.

### B. Tailoring the Question Bank
- **Domain (`category`) & Skills (`skills`)**: 
  - The AI should exclusively pull scenarios based on the `target skills`. 
  - For example, if category is "Software" and skills are `["React", "Redux"]`, the AI should ask specific questions about React concurrent mode, Redux thunks, or state management tradeoffs, rather than generic coding trivia.

### C. Adapting the Evaluation Criteria
- **Interview Type (`interviewType`)**:
  - `oral` setting: The backend grading prompt should heavily penalize poor communication, lack of STAR method structure (Situation, Task, Action, Result), and unclear explanations.
  - `technical` setting: The grading prompt should weigh technical accuracy, algorithm efficiency, and edge-case handling above soft skills.

## 3. Recommended Prompt Architecture Updates in Backend

In `wshandler.js`, modify the LLM system prompts to explicitly inject these context variables.

**Example Updated System Prompt:**
```text
You are an expert technical interviewer conducting a {interviewType} interview for a {category} role. 
The candidate has {experience} years of experience and requested an {difficulty} difficulty level.

Target Assessment Skills: {skills.join(", ")}

Guidelines:
1. Act strictly as the interviewer. Ask one challenging question at a time related to {skills}.
2. Since the difficulty is {difficulty}, calibrate your expected answers accordingly.
3. If the candidate gives a shallow answer, probe deeper into their technical reasoning.
4. Keep your responses under 100 words, conversational, and without markdown.
```

By explicitly mapping the frontend state to the LLM's system prompt, the platform will offer a highly adaptive, bespoke interview experience for every candidate.
