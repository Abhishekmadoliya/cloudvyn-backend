// import express from 'express';

// export const interviewRoutes = express.Router();

// // interviewRoutes.get('/',)
// // GET /categories/:stackId

// interviewRoutes.get('/categories/:stackId')
// // ex res:
// // {
// //   "id": "mern",
// //   "name": "MERN Stack",
// //   "description": "Master Full-Stack JavaScript Development",
// //   "topSkills": [
// //     {
// //       "name": "React Hooks",
// //       "trend": "+23%",
// //       "demand": "High",
// //       "lastUpdated": "2024-12-07T10:00:00Z"
// //     }
// //   ],
// //   "trendingTopics": [
// //     {
// //       "name": "Next.js 14 Server Actions",
// //       "mentions": 1250,
// //       "growthRate": 45.2,
// //       "sources": ["github", "stackoverflow", "job_boards"]
// //     }
// //   ],
// //   "topCompanies": [
// //     {
// //       "name": "Netflix",
// //       "openings": 45,
// //       "avgSalary": "$150k-$200k"
// //     }
// //   ],
// //   "stats": {
// //     "totalQuestions": 342,
// //     "totalUsers": 45230,
// //     "avgSuccessRate": 67.5
// //   }
// // }



// // GET /categories/:stackId/trends

// interviewRoutes.get('/categories/:stackId/trends')

// // {
// //   "trends": [
// //     {
// //       "topic": "GraphQL",
// //       "score": 85,
// //       "change": "+12%",
// //       "timeSeries": [
// //         { "date": "2024-11-07", "value": 73 },
// //         { "date": "2024-12-07", "value": 85 }
// //       ]
// //     }
// //   ],
// //   "jobMarket": {
// //     "newPostings": 234,
// //     "avgSalary": "$145k",
// //     "topLocations": ["San Francisco", "New York", "Remote"]
// //   }
// // }



// interviewRoutes.get("/categories/:stackId/questions")


// // GET /categories/:stackId/questions
