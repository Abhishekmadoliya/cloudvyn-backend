// const mongoose = require('mongoose');
// const { Schema } = mongoose;

// // =====================================================
// // 1. USER SCHEMA
// // =====================================================
// const userSchema = new Schema({
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//     lowercase: true,
//     trim: true
//   },
//   password: {
//     type: String,
//     required: true,
//     select: false // Don't return password by default
//   },
//   profile: {
//     firstName: String,
//     lastName: String,
//     displayName: String,
//     avatar: String,
//     bio: String,
//     location: String,
//     timezone: String
//   },
//   experience: {
//     type: String,
//     enum: ['entry', 'mid', 'senior', 'staff'],
//     default: 'entry'
//   },
//   targetRole: {
//     type: String,
//     enum: ['frontend', 'backend', 'full-stack', 'devops', 'mobile']
//   },
//   preferences: {
//     theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
//     emailNotifications: { type: Boolean, default: true },
//     practiceReminders: { type: Boolean, default: true },
//     language: { type: String, default: 'javascript' }
//   },
//   subscription: {
//     plan: { type: String, enum: ['free', 'premium', 'enterprise'], default: 'free' },
//     status: { type: String, enum: ['active', 'cancelled', 'expired'], default: 'active' },
//     startDate: Date,
//     endDate: Date,
//     stripeCustomerId: String,
//     stripeSubscriptionId: String
//   },
//   stats: {
//     questionsAttempted: { type: Number, default: 0 },
//     questionsCompleted: { type: Number, default: 0 },
//     totalPracticeTime: { type: Number, default: 0 }, // in minutes
//     currentStreak: { type: Number, default: 0 },
//     longestStreak: { type: Number, default: 0 },
//     lastActivityDate: Date
//   },
//   skillProgress: {
//     algorithms: { type: Number, default: 0, min: 0, max: 100 },
//     frontend: { type: Number, default: 0, min: 0, max: 100 },
//     backend: { type: Number, default: 0, min: 0, max: 100 },
//     systemDesign: { type: Number, default: 0, min: 0, max: 100 },
//     devops: { type: Number, default: 0, min: 0, max: 100 },
//     databases: { type: Number, default: 0, min: 0, max: 100 }
//   },
//   achievements: [{
//     achievementId: { type: Schema.Types.ObjectId, ref: 'Achievement' },
//     earnedAt: { type: Date, default: Date.now }
//   }],
//   socialLinks: {
//     github: String,
//     linkedin: String,
//     twitter: String,
//     portfolio: String
//   },
//   isVerified: { type: Boolean, default: false },
//   isActive: { type: Boolean, default: true },
//   lastLogin: Date,
//   refreshTokens: [{
//     token: String,
//     expiresAt: Date
//   }]
// }, {
//   timestamps: true
// });

// // Indexes
// userSchema.index({ email: 1 });
// userSchema.index({ 'stats.currentStreak': -1 });
// userSchema.index({ createdAt: -1 });

// const User = mongoose.model('User', userSchema);

// // =====================================================
// // 2. CATEGORY SCHEMA
// // =====================================================
// const categorySchema = new Schema({
//   id: {
//     type: String,
//     required: true,
//     unique: true,
//     lowercase: true
//   },
//   name: {
//     type: String,
//     required: true
//   },
//   slug: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   description: String,
//   icon: String,
//   color: String,
//   topSkills: [{
//     name: String,
//     trend: String, // e.g., "+23%"
//     demand: { type: String, enum: ['Low', 'Medium', 'High', 'Very High'] },
//     lastUpdated: { type: Date, default: Date.now }
//   }],
//   trendingTopics: [{
//     name: String,
//     mentions: Number,
//     growthRate: Number,
//     sources: [{ type: String, enum: ['github', 'stackoverflow', 'job_boards', 'news'] }],
//     lastUpdated: { type: Date, default: Date.now }
//   }],
//   topCompanies: [{
//     name: String,
//     slug: String,
//     openings: Number,
//     avgSalary: String,
//     logo: String,
//     lastUpdated: Date
//   }],
//   stats: {
//     totalQuestions: { type: Number, default: 0 },
//     totalUsers: { type: Number, default: 0 },
//     avgSuccessRate: { type: Number, default: 0 },
//     totalAttempts: { type: Number, default: 0 }
//   },
//   tags: [String],
//   relatedCategories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
//   isActive: { type: Boolean, default: true },
//   order: { type: Number, default: 0 }
// }, {
//   timestamps: true
// });

// categorySchema.index({ slug: 1 });
// categorySchema.index({ isActive: 1, order: 1 });

// const Category = mongoose.model('Category', categorySchema);

// // =====================================================
// // 3. QUESTION SCHEMA
// // =====================================================
// const questionSchema = new Schema({
//   title: {
//     type: String,
//     required: true
//   },
//   slug: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   description: {
//     type: String,
//     required: true
//   },
//   difficulty: {
//     type: String,
//     enum: ['easy', 'medium', 'hard'],
//     required: true
//   },
//   category: {
//     type: String,
//     enum: ['frontend', 'backend', 'algorithms', 'system-design', 'devops', 'databases'],
//     required: true
//   },
//   categoryRef: {
//     type: Schema.Types.ObjectId,
//     ref: 'Category'
//   },
//   frequency: {
//     type: Number,
//     min: 0,
//     max: 100,
//     default: 0
//   },
//   timeEstimate: {
//     type: Number, // in minutes
//     required: true
//   },
//   requirements: [String],
//   constraints: [String],
//   starterCode: {
//     javascript: String,
//     typescript: String,
//     python: String,
//     java: String,
//     cpp: String
//   },
//   testCases: [{
//     id: String,
//     input: Schema.Types.Mixed,
//     expected: Schema.Types.Mixed,
//     explanation: String,
//     isHidden: { type: Boolean, default: false },
//     weight: { type: Number, default: 1 }
//   }],
//   hints: [{
//     level: Number,
//     text: String,
//     isPremium: { type: Boolean, default: false }
//   }],
//   companies: [{
//     companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
//     name: String,
//     slug: String,
//     frequency: { type: String, enum: ['low', 'medium', 'high', 'very-high'] },
//     interviewRound: String,
//     notes: String,
//     lastAsked: Date
//   }],
//   tags: [String],
//   topics: [String],
//   relatedQuestions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
//   microLessons: [{
//     lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
//     title: String,
//     type: { type: String, enum: ['video', 'article', 'interactive'] },
//     duration: Number,
//     isPremium: Boolean
//   }],
//   stats: {
//     attemptCount: { type: Number, default: 0 },
//     successRate: { type: Number, default: 0 },
//     avgTime: { type: Number, default: 0 },
//     avgScore: { type: Number, default: 0 },
//     completionRate: { type: Number, default: 0 }
//   },
//   isPremium: { type: Boolean, default: false },
//   hasVideoSolution: { type: Boolean, default: false },
//   videoSolutionUrl: String,
//   discussionCount: { type: Number, default: 0 },
//   solutionCount: { type: Number, default: 0 },
//   upvotes: { type: Number, default: 0 },
//   downvotes: { type: Number, default: 0 },
//   isActive: { type: Boolean, default: true },
//   createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
//   lastUpdated: Date
// }, {
//   timestamps: true
// });

// // Indexes
// questionSchema.index({ slug: 1 });
// questionSchema.index({ category: 1, difficulty: 1 });
// questionSchema.index({ frequency: -1 });
// questionSchema.index({ 'companies.slug': 1 });
// questionSchema.index({ tags: 1 });
// questionSchema.index({ isActive: 1, isPremium: 1 });
// questionSchema.index({ 'stats.attemptCount': -1 });

// // Text search
// questionSchema.index({ title: 'text', description: 'text', tags: 'text' });

// const Question = mongoose.model('Question', questionSchema);

// // =====================================================
// // 4. PRACTICE SESSION SCHEMA
// // =====================================================
// const practiceSessionSchema = new Schema({
//   sessionId: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   userId: {
//     type: Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   sessionId: { type: Schema.Types.ObjectId, ref: 'PracticeSession' },
//   type: {
//     type: String,
//     enum: ['technical', 'behavioral', 'system-design', 'mixed'],
//     required: true
//   },
//   role: {
//     type: String,
//     enum: ['full-stack', 'backend', 'frontend', 'devops', 'mobile']
//   },
//   difficulty: {
//     type: String,
//     enum: ['entry', 'mid', 'senior', 'staff'],
//     default: 'mid'
//   },
//   duration: Number,
//   focus: [String],
//   interviewerPersona: {
//     name: String,
//     role: String,
//     company: String,
//     avatar: String,
//     personality: { type: String, enum: ['friendly', 'neutral', 'challenging'] }
//   },
//   schedule: [{
//     type: { type: String, enum: ['introduction', 'coding-question', 'system-design', 'behavioral', 'questions'] },
//     duration: Number,
//     questionId: { type: Schema.Types.ObjectId, ref: 'Question' },
//     completed: { type: Boolean, default: false }
//   }],
//   status: {
//     type: String,
//     enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
//     default: 'scheduled'
//   },
//   startedAt: Date,
//   completedAt: Date,
//   conversation: [{
//     timestamp: Date,
//     speaker: { type: String, enum: ['ai', 'user'] },
//     messageType: { type: String, enum: ['text', 'code', 'diagram', 'question'] },
//     content: String,
//     metadata: Schema.Types.Mixed
//   }],
//   scores: {
//     technical: Number,
//     communication: Number,
//     problemSolving: Number,
//     systemDesign: Number,
//     overall: Number
//   },
//   feedback: {
//     summary: String,
//     strengths: [String],
//     improvements: [String],
//     detailedFeedback: Schema.Types.Mixed
//   },
//   aiModel: String,
//   aiVersion: String,
//   websocketUrl: String
// }, {
//   timestamps: true
// });

// // Indexes
// aiInterviewSchema.index({ interviewId: 1 });
// aiInterviewSchema.index({ userId: 1, createdAt: -1 });
// aiInterviewSchema.index({ status: 1 });

// const AIInterview = mongoose.model('AIInterview', aiInterviewSchema);

// // =====================================================
// // 13. ACTIVITY SCHEMA
// // =====================================================
// const activitySchema = new Schema({
//   userId: {
//     type: Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   type: {
//     type: String,
//     enum: [
//       'question-attempted',
//       'question-completed',
//       'streak-milestone',
//       'achievement-earned',
//       'lesson-completed',
//       'mock-interview-completed',
//       'peer-session-completed',
//       'solution-posted',
//       'discussion-created',
//       'level-up'
//     ],
//     required: true
//   },
//   data: Schema.Types.Mixed,
//   isPublic: { type: Boolean, default: true },
//   timestamp: {
//     type: Date,
//     default: Date.now
//   }
// }, {
//   timestamps: true
// });

// // Indexes
// activitySchema.index({ userId: 1, timestamp: -1 });
// activitySchema.index({ type: 1, timestamp: -1 });
// activitySchema.index({ timestamp: -1 });

// const Activity = mongoose.model('Activity', activitySchema);

// // =====================================================
// // 14. ACHIEVEMENT SCHEMA
// // =====================================================
// const achievementSchema = new Schema({
//   name: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   slug: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   description: String,
//   icon: String,
//   badge: String,
//   category: {
//     type: String,
//     enum: ['practice', 'streak', 'social', 'mastery', 'milestone']
//   },
//   criteria: {
//     type: { type: String, enum: ['questions-completed', 'streak-days', 'skill-level', 'peer-sessions', 'custom'] },
//     threshold: Number,
//     metadata: Schema.Types.Mixed
//   },
//   rarity: {
//     type: String,
//     enum: ['common', 'rare', 'epic', 'legendary'],
//     default: 'common'
//   },
//   points: { type: Number, default: 0 },
//   isActive: { type: Boolean, default: true }
// }, {
//   timestamps: true
// });

// achievementSchema.index({ slug: 1 });
// achievementSchema.index({ category: 1 });

// const Achievement = mongoose.model('Achievement', achievementSchema);

// // =====================================================
// // 15. NOTIFICATION SCHEMA
// // =====================================================
// const notificationSchema = new Schema({
//   userId: {
//     type: Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   type: {
//     type: String,
//     enum: [
//       'practice-reminder',
//       'peer-session-scheduled',
//       'peer-session-reminder',
//       'feedback-ready',
//       'achievement-earned',
//       'streak-reminder',
//       'reply-received',
//       'solution-upvoted',
//       'study-plan-update'
//     ],
//     required: true
//   },
//   title: String,
//   message: String,
//   data: Schema.Types.Mixed,
//   isRead: { type: Boolean, default: false },
//   readAt: Date,
//   actionUrl: String,
//   priority: {
//     type: String,
//     enum: ['low', 'medium', 'high'],
//     default: 'medium'
//   },
//   expiresAt: Date
// }, {
//   timestamps: true
// });

// // Indexes
// notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
// notificationSchema.index({ createdAt: 1, expiresAt: 1 });

// const Notification = mongoose.model('Notification', notificationSchema);

// // =====================================================
// // 16. REPLAY SCHEMA
// // =====================================================
// const replaySchema = new Schema({
//   replayId: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   sessionId: {
//     type: Schema.Types.ObjectId,
//     ref: 'PracticeSession',
//     required: true
//   },
//   userId: {
//     type: Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   questionId: {
//     type: Schema.Types.ObjectId,
//     ref: 'Question'
//   },
//   type: {
//     type: String,
//     enum: ['solo', 'ai-mock', 'peer'],
//     required: true
//   },
//   events: [{
//     timestamp: Number, // milliseconds from start
//     type: { type: String, enum: ['code-change', 'test-run', 'message', 'cursor-move'] },
//     data: Schema.Types.Mixed
//   }],
//   metadata: {
//     duration: Number,
//     language: String,
//     finalCode: String,
//     score: Number,
//     testsPassed: Number,
//     testsTotal: Number
//   },
//   shareSettings: {
//     isPublic: { type: Boolean, default: false },
//     allowComments: { type: Boolean, default: true },
//     shareableLink: String
//   },
//   views: { type: Number, default: 0 },
//   expiresAt: Date
// }, {
//   timestamps: true
// });

// // Indexes
// replaySchema.index({ replayId: 1 });
// replaySchema.index({ userId: 1, createdAt: -1 });
// replaySchema.index({ questionId: 1 });
// replaySchema.index({ 'shareSettings.isPublic': 1, views: -1 });

// const Replay = mongoose.model('Replay', replaySchema);

// // =====================================================
// // 17. SUBSCRIPTION SCHEMA
// // =====================================================
// const subscriptionSchema = new Schema({
//   userId: {
//     type: Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//     unique: true
//   },
//   plan: {
//     type: String,
//     enum: ['free', 'premium', 'enterprise'],
//     default: 'free'
//   },
//   status: {
//     type: String,
//     enum: ['active', 'cancelled', 'expired', 'past_due', 'trialing'],
//     default: 'active'
//   },
//   billing: {
//     interval: { type: String, enum: ['monthly', 'yearly'] },
//     amount: Number,
//     currency: { type: String, default: 'USD' },
//     nextBillingDate: Date,
//     lastBillingDate: Date
//   },
//   stripe: {
//     customerId: String,
//     subscriptionId: String,
//     priceId: String,
//     paymentMethodId: String
//   },
//   trial: {
//     isTrialing: { type: Boolean, default: false },
//     trialStart: Date,
//     trialEnd: Date
//   },
//   features: {
//     maxPracticeSessionsPerDay: { type: Number, default: 5 },
//     aiMockInterviews: { type: Boolean, default: false },
//     peerSessions: { type: Boolean, default: false },
//     videoLessons: { type: Boolean, default: false },
//     detailedFeedback: { type: Boolean, default: false },
//     companyGuides: { type: Boolean, default: false },
//     codeReplay: { type: Boolean, default: false }
//   },
//   history: [{
//     action: { type: String, enum: ['created', 'upgraded', 'downgraded', 'cancelled', 'renewed', 'expired'] },
//     fromPlan: String,
//     toPlan: String,
//     timestamp: { type: Date, default: Date.now },
//     reason: String
//   }],
//   cancelledAt: Date,
//   cancellationReason: String,
//   expiresAt: Date
// }, {
//   timestamps: true
// });

// // Indexes
// subscriptionSchema.index({ userId: 1 });
// subscriptionSchema.index({ status: 1 });
// subscriptionSchema.index({ 'stripe.customerId': 1 });
// subscriptionSchema.index({ expiresAt: 1 });

// const Subscription = mongoose.model('Subscription', subscriptionSchema);

// // =====================================================
// // EXPORT ALL MODELS
// // =====================================================
// module.exports = {
//   User,
//   Category,
//   Question,
//   PracticeSession,
//   Feedback,
//   StudyPlan,
//   Company,
//   Lesson,
//   Discussion,
//   Solution,
//   PeerSession,
//   AIInterview,
//   Activity,
//   Achievement,
//   Notification,
//   Replay,
//   Subscription
// };Id,
//     ref: 'User',
//     required: true
//   },
//   questionId: {
//     type: Schema.Types.ObjectId,
//     ref: 'Question',
//     required: true
//   },
//   mode: {
//     type: String,
//     enum: ['solo', 'ai-mock', 'peer', 'guided'],
//     required: true
//   },
//   language: {
//     type: String,
//     enum: ['javascript', 'typescript', 'python', 'java', 'cpp'],
//     default: 'javascript'
//   },
//   status: {
//     type: String,
//     enum: ['active', 'completed', 'expired', 'abandoned'],
//     default: 'active'
//   },
//   code: {
//     current: String,
//     snapshots: [{
//       timestamp: Date,
//       code: String
//     }]
//   },
//   startedAt: {
//     type: Date,
//     default: Date.now
//   },
//   completedAt: Date,
//   duration: Number, // planned duration in minutes
//   actualDuration: Number, // actual time spent in minutes
//   settings: {
//     hints: { type: Boolean, default: true },
//     timer: { type: Boolean, default: true },
//     autoSave: { type: Boolean, default: true }
//   },
//   testResults: [{
//     testId: String,
//     passed: Boolean,
//     executionTime: Number,
//     memory: Number,
//     output: Schema.Types.Mixed,
//     error: String,
//     timestamp: { type: Date, default: Date.now }
//   }],
//   executions: [{
//     executionId: String,
//     code: String,
//     language: String,
//     timestamp: Date,
//     results: Schema.Types.Mixed,
//     performance: {
//       avgExecutionTime: Number,
//       peakMemory: Number
//     }
//   }],
//   transcript: [{
//     timestamp: Date,
//     speaker: { type: String, enum: ['user', 'ai-interviewer', 'peer'] },
//     message: String,
//     metadata: Schema.Types.Mixed
//   }],
//   interviewerConfig: {
//     aiPersona: String,
//     followUpQuestions: Boolean,
//     difficulty: String
//   },
//   peerId: { type: Schema.Types.ObjectId, ref: 'User' },
//   submission: {
//     submittedAt: Date,
//     code: String,
//     notes: String,
//     submissionId: String
//   },
//   expiresAt: Date,
//   websocketUrl: String
// }, {
//   timestamps: true
// });

// // Indexes
// practiceSessionSchema.index({ sessionId: 1 });
// practiceSessionSchema.index({ userId: 1, createdAt: -1 });
// practiceSessionSchema.index({ questionId: 1 });
// practiceSessionSchema.index({ status: 1, expiresAt: 1 });

// const PracticeSession = mongoose.model('PracticeSession', practiceSessionSchema);

// // =====================================================
// // 5. FEEDBACK SCHEMA
// // =====================================================
// const feedbackSchema = new Schema({
//   sessionId: {
//     type: Schema.Types.ObjectId,
//     ref: 'PracticeSession',
//     required: true
//   },
//   submissionId: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   userId: {
//     type: Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   questionId: {
//     type: Schema.Types.ObjectId,
//     ref: 'Question',
//     required: true
//   },
//   overallScore: {
//     type: Number,
//     min: 0,
//     max: 100
//   },
//   scores: {
//     correctness: { type: Number, min: 0, max: 100 },
//     complexity: { type: Number, min: 0, max: 100 },
//     style: { type: Number, min: 0, max: 100 },
//     explanation: { type: Number, min: 0, max: 100 },
//     edgeCases: { type: Number, min: 0, max: 100 },
//     testing: { type: Number, min: 0, max: 100 }
//   },
//   feedback: {
//     quickWins: [{
//       title: String,
//       description: String,
//       codeSuggestion: String,
//       impact: { type: String, enum: ['low', 'medium', 'high'] },
//       lineNumbers: [Number]
//     }],
//     strengths: [String],
//     improvements: [{
//       category: String,
//       description: String,
//       priority: { type: String, enum: ['low', 'medium', 'high'] },
//       resources: [String]
//     }],
//     codeHighlights: [{
//       line: Number,
//       type: { type: String, enum: ['info', 'warning', 'error', 'success'] },
//       message: String,
//       suggestion: String
//     }]
//   },
//   complexity: {
//     time: String, // e.g., "O(n log n)"
//     space: String,
//     explanation: String
//   },
//   nextSteps: {
//     recommendedQuestions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
//     microLessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
//     studyTopics: [String]
//   },
//   comparison: {
//     percentile: Number,
//     avgScore: Number,
//     topSolution: {
//       score: Number,
//       approach: String,
//       complexity: String
//     }
//   },
//   aiModel: String,
//   aiVersion: String,
//   processingTime: Number,
//   generatedAt: {
//     type: Date,
//     default: Date.now
//   }
// }, {
//   timestamps: true
// });

// // Indexes
// feedbackSchema.index({ submissionId: 1 });
// feedbackSchema.index({ userId: 1, createdAt: -1 });
// feedbackSchema.index({ questionId: 1 });
// feedbackSchema.index({ sessionId: 1 });

// const Feedback = mongoose.model('Feedback', feedbackSchema);

// // =====================================================
// // 6. STUDY PLAN SCHEMA
// // =====================================================
// const studyPlanSchema = new Schema({
//   userId: {
//     type: Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   planId: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   name: String,
//   goal: String,
//   stackId: {
//     type: Schema.Types.ObjectId,
//     ref: 'Category'
//   },
//   targetRole: String,
//   experience: String,
//   targetDate: Date,
//   availableHoursPerWeek: Number,
//   focusAreas: [String],
//   weaknesses: [String],
//   weeks: [{
//     weekNumber: Number,
//     startDate: Date,
//     endDate: Date,
//     focus: String,
//     description: String,
//     tasks: [{
//       id: String,
//       type: { type: String, enum: ['question', 'lesson', 'project', 'review', 'mock-interview'] },
//       title: String,
//       description: String,
//       questionId: { type: Schema.Types.ObjectId, ref: 'Question' },
//       lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
//       estimatedTime: Number,
//       priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
//       completed: { type: Boolean, default: false },
//       completedAt: Date,
//       score: Number,
//       notes: String
//     }],
//     progress: {
//       completed: { type: Number, default: 0 },
//       total: Number,
//       percentage: { type: Number, default: 0 }
//     }
//   }],
//   milestones: [{
//     name: String,
//     description: String,
//     dueDate: Date,
//     completed: { type: Boolean, default: false },
//     completedAt: Date
//   }],
//   status: {
//     type: String,
//     enum: ['active', 'completed', 'paused', 'abandoned'],
//     default: 'active'
//   },
//   overallProgress: {
//     type: Number,
//     min: 0,
//     max: 100,
//     default: 0
//   },
//   generatedBy: { type: String, enum: ['ai', 'manual', 'template'], default: 'ai' },
//   isCustom: { type: Boolean, default: false },
//   lastActivityDate: Date
// }, {
//   timestamps: true
// });

// // Indexes
// studyPlanSchema.index({ userId: 1, status: 1 });
// studyPlanSchema.index({ planId: 1 });
// studyPlanSchema.index({ targetDate: 1 });

// const StudyPlan = mongoose.model('StudyPlan', studyPlanSchema);

// // =====================================================
// // 7. COMPANY SCHEMA
// // =====================================================
// const companySchema = new Schema({
//   name: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   slug: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   logo: String,
//   website: String,
//   description: String,
//   size: { type: String, enum: ['startup', 'small', 'medium', 'large', 'enterprise'] },
//   industry: [String],
//   overview: {
//     process: String,
//     duration: String,
//     difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'very-hard'] },
//     interviewStyle: String
//   },
//   rounds: [{
//     name: String,
//     type: { type: String, enum: ['phone-screen', 'technical', 'system-design', 'behavioral', 'onsite', 'take-home'] },
//     duration: Number,
//     focus: [String],
//     description: String,
//     commonQuestions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
//     tips: [String]
//   }],
//   topQuestions: [{
//     questionId: { type: Schema.Types.ObjectId, ref: 'Question' },
//     frequency: Number,
//     round: String,
//     lastAsked: Date
//   }],
//   tips: [String],
//   stats: {
//     avgSalary: String,
//     salaryRange: {
//       min: Number,
//       max: Number,
//       currency: { type: String, default: 'USD' }
//     },
//     offerRate: Number,
//     prepTime: String,
//     totalInterviews: { type: Number, default: 0 },
//     avgRating: { type: Number, default: 0 }
//   },
//   reviews: [{
//     userId: { type: Schema.Types.ObjectId, ref: 'User' },
//     role: String,
//     level: String,
//     result: { type: String, enum: ['offer', 'rejected', 'in-progress', 'withdrew'] },
//     date: Date,
//     rating: { type: Number, min: 1, max: 5 },
//     review: String,
//     difficulty: { type: Number, min: 1, max: 5 },
//     experience: { type: Number, min: 1, max: 5 },
//     isVerified: { type: Boolean, default: false },
//     isAnonymous: { type: Boolean, default: true },
//     upvotes: { type: Number, default: 0 }
//   }],
//   techStack: [String],
//   benefits: [String],
//   culture: {
//     workLifeBalance: Number,
//     diversity: Number,
//     growth: Number
//   },
//   locations: [String],
//   openings: { type: Number, default: 0 },
//   isActive: { type: Boolean, default: true }
// }, {
//   timestamps: true
// });

// // Indexes
// companySchema.index({ slug: 1 });
// companySchema.index({ name: 1 });
// companySchema.index({ 'stats.avgRating': -1 });
// companySchema.index({ isActive: 1 });

// const Company = mongoose.model('Company', companySchema);

// // =====================================================
// // 8. LESSON SCHEMA
// // =====================================================
// const lessonSchema = new Schema({
//   title: {
//     type: String,
//     required: true
//   },
//   slug: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   description: String,
//   type: {
//     type: String,
//     enum: ['video', 'article', 'interactive', 'quiz'],
//     required: true
//   },
//   content: {
//     videoUrl: String,
//     videoProvider: { type: String, enum: ['youtube', 'vimeo', 'self-hosted'] },
//     articleContent: String,
//     markdown: String,
//     interactiveUrl: String,
//     codeExamples: [{
//       language: String,
//       code: String,
//       explanation: String
//     }]
//   },
//   duration: Number, // in minutes
//   difficulty: {
//     type: String,
//     enum: ['beginner', 'intermediate', 'advanced'],
//     default: 'beginner'
//   },
//   topics: [String],
//   tags: [String],
//   category: {
//     type: Schema.Types.ObjectId,
//     ref: 'Category'
//   },
//   relatedQuestions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
//   relatedLessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
//   prerequisites: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
//   thumbnail: String,
//   isPremium: { type: Boolean, default: false },
//   stats: {
//     views: { type: Number, default: 0 },
//     completions: { type: Number, default: 0 },
//     avgRating: { type: Number, default: 0 },
//     totalRatings: { type: Number, default: 0 }
//   },
//   author: {
//     userId: { type: Schema.Types.ObjectId, ref: 'User' },
//     name: String,
//     title: String,
//     avatar: String
//   },
//   isPublished: { type: Boolean, default: false },
//   publishedAt: Date
// }, {
//   timestamps: true
// });

// // Indexes
// lessonSchema.index({ slug: 1 });
// lessonSchema.index({ type: 1, difficulty: 1 });
// lessonSchema.index({ topics: 1 });
// lessonSchema.index({ 'stats.views': -1 });
// lessonSchema.index({ isPublished: 1 });

// const Lesson = mongoose.model('Lesson', lessonSchema);

// // =====================================================
// // 9. DISCUSSION SCHEMA
// // =====================================================
// const discussionSchema = new Schema({
//   questionId: {
//     type: Schema.Types.ObjectId,
//     ref: 'Question',
//     required: true
//   },
//   userId: {
//     type: Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   title: String,
//   content: {
//     type: String,
//     required: true
//   },
//   type: {
//     type: String,
//     enum: ['question', 'solution', 'discussion', 'bug-report'],
//     default: 'discussion'
//   },
//   tags: [String],
//   code: String,
//   language: String,
//   votes: { type: Number, default: 0 },
//   votedBy: [{
//     userId: { type: Schema.Types.ObjectId, ref: 'User' },
//     vote: { type: Number, enum: [-1, 1] }
//   }],
//   replies: [{
//     userId: { type: Schema.Types.ObjectId, ref: 'User' },
//     content: String,
//     code: String,
//     votes: { type: Number, default: 0 },
//     votedBy: [{
//       userId: { type: Schema.Types.ObjectId, ref: 'User' },
//       vote: { type: Number, enum: [-1, 1] }
//     }],
//     isAccepted: { type: Boolean, default: false },
//     createdAt: { type: Date, default: Date.now },
//     updatedAt: Date
//   }],
//   isResolved: { type: Boolean, default: false },
//   resolvedAt: Date,
//   isPinned: { type: Boolean, default: false },
//   isLocked: { type: Boolean, default: false },
//   views: { type: Number, default: 0 }
// }, {
//   timestamps: true
// });

// // Indexes
// discussionSchema.index({ questionId: 1, createdAt: -1 });
// discussionSchema.index({ userId: 1 });
// discussionSchema.index({ votes: -1 });
// discussionSchema.index({ isPinned: -1, votes: -1 });

// const Discussion = mongoose.model('Discussion', discussionSchema);

// // =====================================================
// // 10. SOLUTION SCHEMA
// // =====================================================
// const solutionSchema = new Schema({
//   questionId: {
//     type: Schema.Types.ObjectId,
//     ref: 'Question',
//     required: true
//   },
//   userId: {
//     type: Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   title: String,
//   language: {
//     type: String,
//     enum: ['javascript', 'typescript', 'python', 'java', 'cpp'],
//     required: true
//   },
//   code: {
//     type: String,
//     required: true
//   },
//   explanation: String,
//   approach: String,
//   complexity: {
//     time: String,
//     space: String,
//     explanation: String
//   },
//   votes: { type: Number, default: 0 },
//   votedBy: [{
//     userId: { type: Schema.Types.ObjectId, ref: 'User' },
//     vote: { type: Number, enum: [-1, 1] }
//   }],
//   comments: [{
//     userId: { type: Schema.Types.ObjectId, ref: 'User' },
//     content: String,
//     createdAt: { type: Date, default: Date.now }
//   }],
//   isVerified: { type: Boolean, default: false },
//   verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
//   isOptimal: { type: Boolean, default: false },
//   tags: [String],
//   performance: {
//     runtime: String,
//     memory: String,
//     percentile: Number
//   },
//   views: { type: Number, default: 0 }
// }, {
//   timestamps: true
// });

// // Indexes
// solutionSchema.index({ questionId: 1, votes: -1 });
// solutionSchema.index({ userId: 1 });
// solutionSchema.index({ isVerified: 1, votes: -1 });
// solutionSchema.index({ language: 1 });

// const Solution = mongoose.model('Solution', solutionSchema);

// // =====================================================
// // 11. PEER SESSION SCHEMA
// // =====================================================
// const peerSessionSchema = new Schema({
//   sessionId: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   matchId: String,
//   participants: [{
//     userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//     role: { type: String, enum: ['interviewer', 'interviewee', 'observer'] },
//     status: { type: String, enum: ['invited', 'joined', 'left', 'completed'] },
//     joinedAt: Date,
//     leftAt: Date
//   }],
//   questionIds: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
//   scheduledStart: Date,
//   actualStart: Date,
//   endTime: Date,
//   duration: Number,
//   status: {
//     type: String,
//     enum: ['scheduled', 'active', 'completed', 'cancelled', 'no-show'],
//     default: 'scheduled'
//   },
//   roomUrl: String,
//   websocketUrl: String,
//   recording: {
//     isRecorded: { type: Boolean, default: false },
//     recordingUrl: String,
//     duration: Number
//   },
//   feedback: [{
//     fromUserId: { type: Schema.Types.ObjectId, ref: 'User' },
//     toUserId: { type: Schema.Types.ObjectId, ref: 'User' },
//     rating: { type: Number, min: 1, max: 5 },
//     categories: {
//       communication: { type: Number, min: 1, max: 5 },
//       technicalDepth: { type: Number, min: 1, max: 5 },
//       helpfulness: { type: Number, min: 1, max: 5 },
//       professionalism: { type: Number, min: 1, max: 5 }
//     },
//     comment: String,
//     isAnonymous: { type: Boolean, default: false },
//     submittedAt: { type: Date, default: Date.now }
//   }],
//   notes: String,
//   reminders: [{
//     sentAt: Date,
//     type: { type: String, enum: ['1-hour', '1-day', 'follow-up'] }
//   }]
// }, {
//   timestamps: true
// });

// // Indexes
// peerSessionSchema.index({ sessionId: 1 });
// peerSessionSchema.index({ 'participants.userId': 1 });
// peerSessionSchema.index({ scheduledStart: 1, status: 1 });
// peerSessionSchema.index({ status: 1 });

// const PeerSession = mongoose.model('PeerSession', peerSessionSchema);

// // =====================================================
// // 12. AI INTERVIEW SCHEMA
// // =====================================================
// // const aiInterviewSchema = new Schema({
// //   interviewId: {
// //     type: String,
// //     required: true,
// //     unique: true
// //   },
// //   userId: {
// //     type: Schema.Types.Object