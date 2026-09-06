import express from 'express';
import { deleteUser, getAlluser, getUser, sendEmail, updateUser, sendBulkEmailAdmin } from '../../controllers/admin/userManagementController.js';
import { requireAdminAuth } from '../../middleware/requireAuth.js';


export const userManagementRoutes = express.Router();

// Enforce Admin Authentication middleware on all user management routes
userManagementRoutes.use(requireAdminAuth);



/**
 * @swagger
 * /api/admin/users/get-all-users:
 *   get:
 *     tags:
 *       - User Management
 *     summary: Get all users
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       404:
 *         description: Not Found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
userManagementRoutes.get('/get-all-users', getAlluser);


/**
 * @swagger
 * /api/admin/users/get-user/{id}:
 *   get:
 *     tags:
 *       - User Management
 *     summary: Get user by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: User ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: Not Found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
userManagementRoutes.get('/getUser/:id',getUser );


/**
 * @swagger
 * /api/admin/users/update-user/{id}:
 *   put:
 *     tags:
 *       - User Management
 *     summary: Update user by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: User ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *               designation:
 *                 type: string
 *               dob:
 *                 type: string
 *                 format: date
 *               interestedIn:
 *                 type: array
 *                 items:
 *                   type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               socials:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     platform:
 *                       type: string
 *                       enum: [instagram, tiktok, twitter, youtube, github, stackoverflow, codeforces, leetcode, geeksforgeeks, linkedin]
 *                     url:
 *                       type: string
 *               location:
 *                 type: string
 *               company:
 *                 type: string
 *               education:
 *                 type: string
 *               experience:
 *                 type: number
 *               profileImage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: Not Found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
userManagementRoutes.put('/update-user/:id', updateUser);


/**
 * @swagger
 * /api/admin/users/delete-user/{id}:
 *   delete:
 *     tags:
 *       - User Management
 *     summary: Delete user by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: User ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: Not Found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
userManagementRoutes.delete('/delete-user/:id',deleteUser);


//send email to multiple users
userManagementRoutes.post('/send-email',sendEmail);
userManagementRoutes.post('/send-bulk-email', sendBulkEmailAdmin);

