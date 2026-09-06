# Mock Test Backend - Data Models Reference

Complete reference for all MongoDB schemas used in the Mock Test Backend Service.

---

## 1. MockTest Schema

**Collection**: `mocktests`

```javascript
{
  _id: ObjectId,
  
  // Basic Info
  title: String (required, trimmed),
  description: String (required),
  slug: String (required, unique),
  category: String (required),
  difficulty: String (enum: ['Easy', 'Medium', 'Hard'], default: 'Medium'),
  
  // Test Configuration
  duration: Number (required, in minutes),
  totalMarks: Number (required),
  totalQuestions: Number (required),
  
  // Question Management
  questions: [ObjectId] (references to MCQQuestion),
  randomizeQuestions: Boolean (default: false),
  randomizeOptions: Boolean (default: false),
  
  // Scoring
  negativeMarking: Number (default: 0),
  passingPercentage: Number (default: 40),
  
  // Attempt Control
  totalAttempts: Number (default: 0, 0 = unlimited),
  
  // Publishing
  isPublished: Boolean (default: false),
  
  // Metadata
  instructions: String (optional),
  showResultAfterSubmission: Boolean (default: true),
  createdBy: ObjectId (ref: 'userModel'),
  
  // Timestamps
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes**:
- `slug` (unique)
- `category`
- `difficulty`
- `createdBy`

**Example Document**:
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "title": "JavaScript Fundamentals",
  "slug": "js-fundamentals",
  "category": "JavaScript",
  "difficulty": "Easy",
  "duration": 30,
  "totalMarks": 100,
  "totalQuestions": 20,
  "negativeMarking": 0.25,
  "passingPercentage": 40,
  "isPublished": true,
  "createdBy": ObjectId("507f1f77bcf86cd799439001"),
  "questions": [
    ObjectId("507f1f77bcf86cd799439021"),
    ObjectId("507f1f77bcf86cd799439022"),
    ...
  ]
}
```

---

## 2. MCQQuestion Schema

**Collection**: `mcqquestions`

```javascript
{
  _id: ObjectId,
  
  // Association
  testId: ObjectId (required, ref: 'MockTest'),
  
  // Question Content
  questionText: String (required, trimmed),
  description: String (optional),
  codeSnippet: String (optional, for programming questions),
  imageUrl: String (optional),
  
  // Options and Answer
  options: [
    {
      _id: ObjectId,
      text: String (required),
      isCorrect: Boolean (default: false)
    }
  ] (required, min 2 options),
  correctAnswer: String (required, matches option text or ID),
  
  // Scoring
  marks: Number (required, default: 1),
  
  // Categorization
  difficulty: String (enum: ['Easy', 'Medium', 'Hard'], default: 'Medium'),
  categoryTag: String (optional),
  
  // Learning Material
  explanation: String (optional, shown after submission),
  
  // Organization
  order: Number (question number in test),
  
  // Metadata
  createdBy: ObjectId (required, ref: 'userModel'),
  
  // Timestamps
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes**:
- `testId`
- `testId` + `order`

**Example Document**:
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439021"),
  "testId": ObjectId("507f1f77bcf86cd799439011"),
  "questionText": "What is the correct way to declare a variable?",
  "options": [
    {
      "_id": ObjectId("507f1f77bcf86cd799439031"),
      "text": "var x = 5;",
      "isCorrect": true
    },
    {
      "_id": ObjectId("507f1f77bcf86cd799439032"),
      "text": "variable x = 5;",
      "isCorrect": false
    },
    {
      "_id": ObjectId("507f1f77bcf86cd799439033"),
      "text": "declare x = 5;",
      "isCorrect": false
    }
  ],
  "correctAnswer": "var x = 5;",
  "marks": 1,
  "difficulty": "Easy",
  "explanation": "In JavaScript, variables are declared using var, let, or const keywords.",
  "order": 1,
  "createdBy": ObjectId("507f1f77bcf86cd799439001")
}
```

---

## 3. TestAttempt Schema

**Collection**: `testattempts`

```javascript
{
  _id: ObjectId,
  
  // User & Test Association
  userId: ObjectId (required, ref: 'userModel'),
  testId: ObjectId (required, ref: 'MockTest'),
  
  // Attempt Info
  attemptNumber: Number (default: 1),
  status: String (enum: ['in-progress', 'submitted', 'evaluated'], default: 'in-progress'),
  
  // Answers
  answers: [
    {
      questionId: ObjectId (required, ref: 'MCQQuestion'),
      selectedAnswer: String (user's choice),
      isCorrect: Boolean (set during evaluation),
      marksObtained: Number (default: 0, set during evaluation),
      timeTaken: Number (in seconds, optional)
    }
  ] (default: []),
  
  // Timing
  startedAt: Date (required, default: now),
  submittedAt: Date (when user submitted),
  totalTimeSpent: Number (in seconds, calculated on submission),
  
  // Metadata
  isSubmitted: Boolean (default: false),
  
  // Timestamps
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes**:
- `userId` + `testId` + `status` (compound, for preventing simultaneous attempts)
- `userId`
- `testId`

**Example Document**:
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439041"),
  "userId": ObjectId("507f1f77bcf86cd799439001"),
  "testId": ObjectId("507f1f77bcf86cd799439011"),
  "attemptNumber": 1,
  "status": "evaluated",
  "answers": [
    {
      "questionId": ObjectId("507f1f77bcf86cd799439021"),
      "selectedAnswer": "var x = 5;",
      "isCorrect": true,
      "marksObtained": 1,
      "timeTaken": 45
    },
    {
      "questionId": ObjectId("507f1f77bcf86cd799439022"),
      "selectedAnswer": "Wrong Answer",
      "isCorrect": false,
      "marksObtained": 0,
      "timeTaken": 60
    }
  ],
  "startedAt": ISODate("2024-01-08T10:00:00.000Z"),
  "submittedAt": ISODate("2024-01-08T10:35:00.000Z"),
  "totalTimeSpent": 2100,
  "isSubmitted": true
}
```

---

## 4. TestResult Schema

**Collection**: `testresults`

```javascript
{
  _id: ObjectId,
  
  // User & Test Association
  userId: ObjectId (required, ref: 'userModel'),
  testId: ObjectId (required, ref: 'MockTest'),
  attemptId: ObjectId (required, unique, ref: 'TestAttempt'),
  
  // Marks & Scores
  totalMarks: Number (required),
  marksObtained: Number (required),
  percentage: Number (required, 0-100),
  
  // Question Statistics
  totalQuestions: Number (required),
  correctCount: Number (required),
  wrongCount: Number (required),
  unattemptedCount: Number (required),
  
  // Result Status
  isPassed: Boolean (default: false),
  passingPercentage: Number (required),
  
  // Time Statistics
  totalTimeSpent: Number (required, in seconds),
  averageTimePerQuestion: Number (optional, in seconds),
  
  // Ranking (populated later)
  rank: Number (optional, among all attempts for this test),
  
  // Category-wise Breakdown
  categoryWiseScore: [
    {
      category: String,
      obtained: Number,
      total: Number,
      percentage: Number
    }
  ] (default: []),
  
  // Difficulty-wise Breakdown
  difficultyWiseScore: [
    {
      difficulty: String,
      obtained: Number,
      total: Number,
      percentage: Number
    }
  ] (default: []),
  
  // Timestamps
  submittedAt: Date (required, when test was submitted),
  evaluatedAt: Date (default: now, when result was created),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes**:
- `userId` + `testId` (for finding user's results for a test)
- `testId` + `percentage` descending (for leaderboard)
- `userId`

**Example Document**:
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439051"),
  "userId": ObjectId("507f1f77bcf86cd799439001"),
  "testId": ObjectId("507f1f77bcf86cd799439011"),
  "attemptId": ObjectId("507f1f77bcf86cd799439041"),
  "totalMarks": 100,
  "marksObtained": 75,
  "percentage": 75.5,
  "totalQuestions": 20,
  "correctCount": 15,
  "wrongCount": 5,
  "unattemptedCount": 0,
  "isPassed": true,
  "passingPercentage": 40,
  "totalTimeSpent": 2100,
  "averageTimePerQuestion": 105,
  "rank": 42,
  "categoryWiseScore": [
    {
      "category": "Basics",
      "obtained": 40,
      "total": 50,
      "percentage": 80
    }
  ],
  "difficultyWiseScore": [
    {
      "difficulty": "Easy",
      "obtained": 20,
      "total": 20,
      "percentage": 100
    },
    {
      "difficulty": "Medium",
      "obtained": 15,
      "total": 20,
      "percentage": 75
    }
  ],
  "submittedAt": ISODate("2024-01-08T10:35:00.000Z"),
  "evaluatedAt": ISODate("2024-01-08T10:35:05.000Z")
}
```

---

## Schema Relationships

```
User
  │
  ├─→ MockTest (1:M) [createdBy]
  ├─→ TestAttempt (1:M)
  ├─→ TestResult (1:M)
  └─→ MCQQuestion (1:M) [createdBy]

MockTest
  │
  ├─→ MCQQuestion (1:M) [testId]
  ├─→ TestAttempt (1:M)
  └─→ TestResult (1:M)

TestAttempt
  │
  ├─→ TestResult (1:1) [attemptId]
  └─→ MCQQuestion (referenced in answers)

MCQQuestion
  └─→ TestAttempt (referenced in answers.questionId)
```

---

## Field Validation Rules

### MockTest
- `title`: Required, string, 1-200 chars
- `duration`: Required, positive number
- `totalMarks`: Required, positive number
- `slug`: Required, unique, lowercase
- `category`: Required, string
- `passingPercentage`: 0-100
- `totalAttempts`: 0 (unlimited) or positive

### MCQQuestion
- `questionText`: Required, min 5 chars
- `options`: Required, min 2, max 10
- `marks`: Required, positive number
- `correctAnswer`: Must match one of the options

### TestAttempt
- `userId`: Required, valid ObjectId
- `testId`: Required, valid ObjectId
- `status`: Only valid enum values allowed

### TestResult
- `percentage`: 0-100
- `isPassed`: Boolean based on percentage >= passingPercentage
- `correctCount + wrongCount + unattemptedCount === totalQuestions`

---

## Data Types Reference

| Type | Description |
|------|-------------|
| ObjectId | MongoDB document ID |
| String | Text data |
| Number | Integer or decimal |
| Boolean | true/false |
| Date | ISO 8601 timestamp |
| Array | Collection of values |
| Enum | Predefined values |

---

## Timestamps

All models include automatic timestamps:
- `createdAt`: Document creation time
- `updatedAt`: Last modification time

Format: ISO 8601 (e.g., "2024-01-08T10:00:00.000Z")

---

## Enum Values

### Difficulty
- `Easy`
- `Medium`
- `Hard`

### Attempt Status
- `in-progress` - User is currently taking the test
- `submitted` - User submitted but not yet evaluated
- `evaluated` - Results have been calculated

### Publication Status
- `true` - Test is available for users
- `false` - Test is in draft

---

## Database Constraints

### Unique Constraints
- `MockTest.slug` - Each test must have unique slug
- `TestResult.attemptId` - Each result linked to one attempt

### Compound Indexes
- `TestAttempt`: userId + testId + status
  - Prevents multiple simultaneous attempts
  - Fast lookup of in-progress attempts

- `TestResult`: testId + percentage (descending)
  - Optimizes leaderboard queries

### Reference Integrity
- MCQQuestion references MockTest
- TestAttempt references User and MockTest
- TestResult references User, MockTest, and TestAttempt
- All references use ObjectId type

---

## Pagination Guidelines

| Endpoint | Default Limit | Max Limit |
|----------|---------------|-----------|
| /tests | 10 | 50 |
| /questions | 20 | 100 |
| /attempts | 10 | 50 |
| /results | 20 | 100 |
| /leaderboard | 50 | 500 |

---

## Storage Estimation

Approximate document sizes:

| Model | Avg Size | Notes |
|-------|----------|-------|
| MockTest | 1-2 KB | Plus questions array |
| MCQQuestion | 1-3 KB | Depends on option count |
| TestAttempt | 2-5 KB | Grows with answers |
| TestResult | 2-3 KB | Includes analytics |

**Example**: 1000 tests × 20 questions = ~60 MB for questions collection

---

## Migration Notes

If upgrading from previous versions:

1. Ensure all indexes are created
2. Validate existing test data
3. Set default values for new fields
4. Backup database before migration
5. Run index optimization

---

## Best Practices

✅ Always use pagination for list endpoints
✅ Index frequently queried fields
✅ Validate enum values before storage
✅ Use compound indexes for common filters
✅ Regularly analyze slow queries
✅ Archive old results for performance
✅ Monitor collection sizes
✅ Use TTL indexes for temporary data

---

## Performance Tuning

### Read Optimization
- Use projection to fetch only needed fields
- Index all filter fields
- Compound indexes for multi-field queries

### Write Optimization
- Batch insert questions
- Prepare indexes before bulk operations
- Use updateOne for single updates

### Query Examples

**Fast Query** (with index):
```javascript
TestAttempt.find({ userId, testId, status: 'in-progress' })
```

**Slow Query** (no index):
```javascript
TestAttempt.find({ submittedAt: { $gt: date } })
// Need: index on submittedAt
```

---

End of Models Reference.
