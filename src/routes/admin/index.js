import express from 'express';
import { requireAdminAuth } from '../../middleware/requireAuth.js';
import { userManagementRoutes } from './userManagementRoutes.js';
import automationAdminRouter from './automationAdminRoutes.js';
import feedAdminRouter from './feedAdminRoutes.js';
import paymentAdminRouter from './paymentAdminRouter.js';
import blogAdminRouter from './blogAdminRouter.js';
import mockTestAdminRouter from './mockTestAdminRouter.js';
import overviewAdminRouter from './overviewAdminRouter.js';
import interviewAdminRouter from './interviewAdminRouter.js';
import roadmapAdminRouter from './roadmapAdminRoutes.js';
import resourceAdminRouter from './resourceAdminRouter.js';
import questionBankAdminRouter from './questionBankAdminRouter.js';
import analyticsAdminRouter from './analyticsAdminRouter.js';

const adminRouter = express.Router();

// Enforce Global Admin Authentication Guard across all /api/admin/* endpoints
adminRouter.use(requireAdminAuth);

adminRouter.use('/users', userManagementRoutes);
adminRouter.use('/automations', automationAdminRouter);
adminRouter.use('/feed', feedAdminRouter);
adminRouter.use('/payments', paymentAdminRouter);
adminRouter.use('/blogs', blogAdminRouter);
adminRouter.use('/mock-tests', mockTestAdminRouter);
adminRouter.use('/overview', overviewAdminRouter);
adminRouter.use('/interviews', interviewAdminRouter);
adminRouter.use('/roadmaps', roadmapAdminRouter);
adminRouter.use('/resources', resourceAdminRouter);
adminRouter.use('/question-bank', questionBankAdminRouter);
adminRouter.use('/analytics', analyticsAdminRouter);

export default adminRouter;

