# Mock Test Backend - Setup & Integration Guide

## Quick Start

### Step 1: Route Integration
Add the mock test router to your main `index.js` or `app.js`:

```javascript
import mockTestRouter from './src/routes/mockTestToutes.js';

// After other route definitions
app.use('/api/mock-tests', mockTestRouter);
```

### Step 2: Database Connection
Ensure MongoDB is connected in your config:

```javascript
import mongoose from 'mongoose';

// In your initialization
await mongoose.connect(process.env.MONGO_URI);
console.log('✅ MongoDB connected');
```

### Step 3: Firebase Middleware
The service expects Firebase UID from `req.user.uid`. Ensure your auth middleware sets this:

```javascript
// In your auth middleware
req.user = {
  uid: decodedToken.uid,  // From Firebase token
  // ... other user data
};
```

---

## Testing the Service

### 1. Create a Test (Admin)
```bash
curl -X POST http://localhost:4001/api/mock-tests/tests \
  -H "Authorization: Bearer <firebase_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "JavaScript Fundamentals",
    "description": "Test your JS knowledge",
    "category": "JavaScript",
    "difficulty": "Medium",
    "duration": 30,
    "totalMarks": 100,
    "totalQuestions": 20,
    "slug": "js-fundamentals",
    "passingPercentage": 40
  }'
```

### 2. Add Questions
```bash
curl -X POST http://localhost:4001/api/mock-tests/questions \
  -H "Authorization: Bearer <firebase_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "testId": "<test_id>",
    "questionText": "What is JavaScript?",
    "options": [
      { "text": "Programming Language", "isCorrect": true },
      { "text": "Markup Language" },
      { "text": "Style Language" }
    ],
    "correctAnswer": "Programming Language",
    "marks": 1,
    "difficulty": "Easy"
  }'
```

### 3. Publish Test
```bash
curl -X PATCH http://localhost:4001/api/mock-tests/tests/<test_id>/publish \
  -H "Authorization: Bearer <firebase_token>" \
  -H "Content-Type: application/json" \
  -d '{"isPublished": true}'
```

### 4. Start Test Attempt
```bash
curl -X POST http://localhost:4001/api/mock-tests/attempts/start \
  -H "Authorization: Bearer <firebase_token>" \
  -H "Content-Type: application/json" \
  -d '{"testId": "<test_id>"}'
```

### 5. Submit Test
```bash
curl -X POST http://localhost:4001/api/mock-tests/attempts/<attempt_id>/submit \
  -H "Authorization: Bearer <firebase_token>"
```

---

## API Endpoint Summary

### Test Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tests` | Create test |
| GET | `/tests` | List tests |
| GET | `/tests/:id` | Get test details |
| PUT | `/tests/:id` | Update test |
| PATCH | `/tests/:id/publish` | Publish test |
| DELETE | `/tests/:id` | Delete test |

### Questions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/questions` | Add question |
| POST | `/questions/bulk/add` | Bulk add |
| GET | `/questions/:testId` | Get questions |
| PUT | `/questions/:id` | Update question |
| DELETE | `/questions/:id` | Delete question |

### Attempts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/attempts/start` | Start attempt |
| POST | `/attempts/:attemptId/save-answer` | Save answer |
| POST | `/attempts/:attemptId/submit` | Submit test |
| GET | `/attempts/:attemptId` | Get attempt details |

### Results
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/results/:resultId` | Get result |
| GET | `/results/test/:testId` | Test results |
| GET | `/leaderboard/:testId` | Leaderboard |
| GET | `/analytics/user` | User analytics |

---

## Response Examples

### Test Created
```json
{
  "success": true,
  "message": "Mock test created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "JavaScript Fundamentals",
    "category": "JavaScript",
    "difficulty": "Medium",
    "duration": 30,
    "totalMarks": 100,
    "slug": "js-fundamentals",
    "isPublished": false,
    "createdAt": "2024-01-08T10:00:00Z"
  }
}
```

### Attempt Started
```json
{
  "success": true,
  "message": "Test attempt started successfully",
  "data": {
    "attemptId": "507f1f77bcf86cd799439012",
    "testId": "507f1f77bcf86cd799439011",
    "title": "JavaScript Fundamentals",
    "duration": 30,
    "totalQuestions": 20,
    "totalMarks": 100,
    "startedAt": "2024-01-08T10:05:00Z",
    "questions": [...]
  }
}
```

### Test Submitted (Result)
```json
{
  "success": true,
  "message": "Test submitted successfully",
  "data": {
    "attemptId": "507f1f77bcf86cd799439012",
    "marksObtained": 75,
    "totalMarks": 100,
    "percentage": 75,
    "correctCount": 15,
    "wrongCount": 5,
    "unattemptedCount": 0,
    "isPassed": true,
    "passingPercentage": 40,
    "submittedAt": "2024-01-08T10:35:00Z"
  }
}
```

---

## Environment Variables

Ensure these are set in your `.env`:

```env
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
NODE_ENV=development
PORT=4001
```

---

## Error Handling

### Common Errors

**Missing testId**
```json
{
  "success": false,
  "message": "testId is required",
  "error": "testId is required"
}
```

**Test not found**
```json
{
  "success": false,
  "message": "Mock test not found"
}
```

**Attempt in progress**
```json
{
  "success": false,
  "message": "You already have an in-progress attempt for this test",
  "data": { "attemptId": "..." }
}
```

**Time limit exceeded**
```json
{
  "success": false,
  "message": "Time limit exceeded. Test auto-submitted"
}
```

---

## Database Indexes

The models automatically create indexes for:
- `MockTest`: slug (unique)
- `MCQQuestion`: testId
- `TestAttempt`: userId + testId + status (compound)
- `TestResult`: userId + testId, testId + percentage (for leaderboard)

---

## File Structure Reference

```
src/
├── models/
│   ├── mockTestModel.js          ✅ NEW
│   ├── mcqQuestionModel.js       ✅ NEW
│   ├── testAttemptModel.js       ✅ NEW
│   ├── testResultModel.js        ✅ NEW
│   └── userModel.js              (existing)
├── controllers/
│   ├── mockTestController.js     ✅ ENHANCED
│   ├── mcqQuestionController.js  ✅ NEW
│   ├── testAttemptController.js  ✅ NEW
│   └── testResultController.js   ✅ NEW
└── routes/
    └── mockTestToutes.js         ✅ ENHANCED
```

---

## Performance Tips

1. **Pagination**: Always use pagination for list endpoints
   ```javascript
   GET /api/mock-tests/tests?page=1&limit=20
   ```

2. **Caching**: Cache test details client-side during attempt
   ```javascript
   // After starting attempt
   sessionStorage.setItem('currentTest', JSON.stringify(testData));
   ```

3. **Batch Operations**: Use bulk add for many questions
   ```javascript
   POST /api/mock-tests/questions/bulk/add
   // Add 50+ questions at once
   ```

4. **Indexes**: Already configured for common queries

---

## Security Considerations

✅ **User Validation**: Every endpoint validates `req.user.uid`
✅ **Data Ownership**: Results can only be viewed by the user
✅ **Answer Hiding**: Correct answers hidden until submission
✅ **Attempt Locking**: Prevents modification after submission
✅ **Firebase Auth**: All routes require valid JWT

---

## Troubleshooting

### Issue: "Cannot find module MCQQuestion"
**Solution**: Ensure model files are in `src/models/` directory

### Issue: "Cast to ObjectId failed"
**Solution**: Verify testId/attemptId are valid MongoDB ObjectIds

### Issue: "Cannot save answer - connection lost"
**Solution**: Check MongoDB connection and Redis cache

### Issue: "User is unauthorized"
**Solution**: Verify Firebase token in Authorization header

---

## Next: Frontend Integration

### Start Test
```javascript
const response = await fetch('/api/mock-tests/attempts/start', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ testId: testId })
});
const { data } = await response.json();
```

### Save Answer
```javascript
await fetch(`/api/mock-tests/attempts/${attemptId}/save-answer`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    questionId: questionId,
    selectedAnswer: 'Option A'
  })
});
```

### Submit Test
```javascript
const response = await fetch(`/api/mock-tests/attempts/${attemptId}/submit`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`
  }
});
const { data: result } = await response.json();
```

---

## Support & Documentation

- **API Docs**: See `API_DOCUMENTATION.md`
- **Implementation**: See `IMPLEMENTATION_SUMMARY.md`
- **Code Comments**: Inline documentation in each controller

---

## Checklist for Production

- [ ] MongoDB connection verified
- [ ] Firebase authentication configured
- [ ] All environment variables set
- [ ] Routes registered in main app
- [ ] CORS configured if needed
- [ ] Rate limiting enabled
- [ ] Error logging setup
- [ ] Input validation in place
- [ ] Tested all endpoints
- [ ] Database backups configured

---

Ready to integrate! Start with the route registration and test the endpoints.
