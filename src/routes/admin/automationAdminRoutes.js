import express from 'express';
import { verifyFirebaseToken } from '../../middleware/requireAuth.js';
import userModel from '../../models/userModel.js';
import {
    getAllAutomationsAdmin,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomationStatus
} from '../../controllers/automationController.js';

const automationAdminRouter = express.Router();

/**
 * Middleware: verifies the Firebase token, then looks up the user in MongoDB
 * by their firebaseUid and checks that their role === 'admin'.
 */
const requireAdmin = async (req, res, next) => {
    try {
        // req.user is set by verifyFirebaseToken with the decoded Firebase token
        const firebaseUid = req.user?.uid;
        if (!firebaseUid) {
            return res.status(401).json({ success: false, message: 'Unauthorized: no Firebase UID' });
        }

        const dbUser = await userModel.findOne({ firebaseUid }).select('role');
        if (!dbUser) {
            return res.status(401).json({ success: false, message: 'Unauthorized: user not found' });
        }
        if (dbUser.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Forbidden: admin access required' });
        }

        // Attach the DB user for downstream use if needed
        req.dbUser = dbUser;
        next();
    } catch (err) {
        console.error('requireAdmin error:', err.message);
        return res.status(500).json({ success: false, message: 'Server error during authorization' });
    }
};

// All admin automation routes require a valid Firebase token + admin claim
automationAdminRouter.use(verifyFirebaseToken, requireAdmin);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// GET  /api/admin/automations/all              — list all (any status) + pagination
automationAdminRouter.get('/all', getAllAutomationsAdmin);

// POST /api/admin/automations/create           — create a new automation
automationAdminRouter.post('/create', createAutomation);

// PUT  /api/admin/automations/update/:id       — update an automation by id
automationAdminRouter.put('/update/:id', updateAutomation);

// DELETE /api/admin/automations/delete/:id     — hard-delete an automation
automationAdminRouter.delete('/delete/:id', deleteAutomation);

// PATCH /api/admin/automations/status/:id      — toggle published <-> draft
automationAdminRouter.patch('/status/:id', toggleAutomationStatus);

export default automationAdminRouter;
