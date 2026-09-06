import interviewModel from "../../models/interviewModel.js";
import crypto from "crypto";

export async function createInterviewConfig(req, res) {
    try {
        const { category, type, duration, difficultyLevel } = req.body;

        console.log("req user", req.user);


        if (!category || !type || !duration || !difficultyLevel) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const interviewConfig = await interviewModel.create({
            userId: req.user.uid,
            interviewId: crypto.randomBytes(16).toString("hex"),
            category,
            interviewType: type,
            duration,
            difficultyLevel,
            status: "practice"
        });

        res.status(201).json({ success: true, data: interviewConfig });
    } catch (error) {
        console.error("Error creating interview config:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function getAllInterviewConfigs(req, res) {
    try {

        console.log("req user", req.user);

        if (!req.user || !req.user.uid) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }
        // req.user is attached by verifyFirebaseToken
        const interviewConfigs = await interviewModel.find(
            {
                userId: req.user.uid,
                status: "practice" // Only fetch recruiter configurations
            }
        );
        res.status(200).json({ success: true, data: interviewConfigs });
    } catch (error) {
        console.error("Error fetching all interview configs:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function getInterviewConfigById(req, res) {
    try {
        const interviewConfig = await interviewModel.findById(req.params.id);
        if (!interviewConfig) {
            return res.status(404).json({ success: false, message: "Configuration not found" });
        }
        res.status(200).json({ success: true, data: interviewConfig });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function updateInterviewConfig(req, res) {
    try {
        const interviewConfig = await interviewModel.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!interviewConfig) {
            return res.status(404).json({ success: false, message: "Configuration not found to update" });
        }
        res.status(200).json({ success: true, data: interviewConfig });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function deleteInterviewConfig(req, res) {
    try {
        const interviewConfig = await interviewModel.findByIdAndDelete(req.params.id);
        if (!interviewConfig) {
            return res.status(404).json({ success: false, message: "Configuration not found to delete" });
        }
        res.status(200).json({ success: true, message: "Configuration deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}
