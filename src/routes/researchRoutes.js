import express from 'express';
import { uploadSource, chatWithResearch, getModels, studioTask } from '../controllers/researchController.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/upload', upload.single('file'), uploadSource);
router.post('/chat', chatWithResearch);
router.get('/models', getModels);
router.post('/studio', studioTask);



export default router;
