import express from "express";
import {
    postTextToLinkedIn,

} from "../../controllers/blog/linkdlnController.js";
import axios from "axios";

const linkdlnAutomationRouter = express.Router();

// linkdlnAutomationRouter.post("/create", postTextToLinkedIn);
linkdlnAutomationRouter.get('/auth', (req, res) => {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.LINKEDIN_CLIENT_ID,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
        scope: 'openid profile w_member_social',
    });
    res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
});

// Step 2: OAuth callback — exchange code for token
linkdlnAutomationRouter.get('/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const tokenRes = await axios.post(
            'https://www.linkedin.com/oauth/v2/accessToken',
            new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
                client_id: process.env.LINKEDIN_CLIENT_ID,
                client_secret: process.env.LINKEDIN_CLIENT_SECRET,
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const { access_token } = tokenRes.data;
        // Save this to your DB or .env — it's valid for 60 days
        res.json({ access_token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /linkedin/post — publish a post
linkdlnAutomationRouter.post('/post', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    try {
        const postUrn = await postTextToLinkedIn(text);
        res.json({ success: true, postUrn });
    } catch (err) {
        res.status(500).json({ error: err.response?.data || err.message });
    }
});


export default linkdlnAutomationRouter;
