import mongoose from "mongoose";
import userModel from "../../models/userModel.js";
import admin from "../../firebase/firebaseAdmin.js";
import { sendEmail as sendEmailUtil, buildCloudvynEmail } from "../../utils/sendEmail.js";



export const getAlluser = async (req, res) => {
    try {
        const allUsers = await userModel.find({}).sort({ createdAt: -1 });

        return res.status(200).json({ 
            success: true,
            message: "fetched all users", 
            data: allUsers 
        });

    } catch (error) {
        console.log("server error in getAlluseradmin", error);
        return res.status(500).json({ success: false, message: "internal server error" });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        let user = await userModel.findOne({ $or: [{ firebaseUid: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }] });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const updateData = {};
        const fields = ['username', 'email', 'role', 'designation', 'dob', 'interestedIn', 'skills', 'socials', 'location', 'company', 'education', 'experience', 'profileImage', 'isActive', 'interviewCount'];

        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        // Sync role with Firebase Custom Claims if role is updated
        if (updateData.role && user.firebaseUid) {
            const isAdmin = updateData.role === 'admin' || updateData.role === 'Admin';
            try {
                await admin.auth().setCustomUserClaims(user.firebaseUid, {
                    admin: isAdmin,
                    role: updateData.role
                });
            } catch (fbErr) {
                console.warn(`Failed to set Firebase custom claims for user ${user.firebaseUid}:`, fbErr.message);
            }
        }

        const updatedUser = await userModel.findOneAndUpdate(
            { _id: user._id },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        return res.status(200).json({ success: true, message: "User updated successfully", data: updatedUser });
    } catch (error) {
        console.log("server error in updateUseradmin", error);
        return res.status(500).json({ success: false, message: "internal server error" });
    }
};

export const getUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        const user = await userModel.findOne({ $or: [{ firebaseUid: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }] });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({ success: true, message: "User fetched successfully", data: user });
    } catch (error) {
        console.log("server error in getUseradmin", error);
        return res.status(500).json({ success: false, message: "internal server error" });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        const user = await userModel.findOneAndDelete({ $or: [{ firebaseUid: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }] });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({ success: true, message: "User deleted successfully", data: user });
    } catch (error) {
        console.log("server error in deleteUseradmin", error);
        return res.status(500).json({ success: false, message: "internal server error" });
    }
};

export const sendEmail = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }
        const user = await userModel.findOne({ $or: [{ firebaseUid: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }] });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        return res.status(200).json({ success: true, message: "User fetched successfully", data: user });
    } catch (error) {
        console.log("server error in sendEmailAdmin", error);
        return res.status(500).json({ success: false, message: "internal server error" });
    }
};

export const sendBulkEmailAdmin = async (req, res) => {
    try {
        const { candidateIds, subject, customMessage, templateKey, ctaText, ctaLink } = req.body;

        if (!subject || (!customMessage && !templateKey)) {
            return res.status(400).json({ success: false, message: "Subject and content are required." });
        }

        let candidates = [];
        if (!candidateIds || candidateIds === 'all' || (Array.isArray(candidateIds) && candidateIds.length === 0)) {
            candidates = await userModel.find({});
        } else {
            const validObjectIds = candidateIds.filter(id => mongoose.Types.ObjectId.isValid(id));
            candidates = await userModel.find({
                $or: [
                    { firebaseUid: { $in: candidateIds } },
                    { _id: { $in: validObjectIds } }
                ]
            });
        }

        if (candidates.length === 0) {
            return res.status(404).json({ success: false, message: "No target candidates found." });
        }

        let sentCount = 0;
        let failedCount = 0;

        for (const candidate of candidates) {
            try {
                const recipientEmail = candidate.email;
                if (!recipientEmail) continue;

                const replaceVariables = (text) => {
                    if (!text) return "";
                    return text
                        .replace(/\{\{username\}\}/gi, candidate.username || "Candidate")
                        .replace(/\{\{name\}\}/gi, candidate.name || candidate.username || "Candidate")
                        .replace(/\{\{email\}\}/gi, candidate.email || "")
                        .replace(/\{\{designation\}\}/gi, candidate.designation || "Software Engineer")
                        .replace(/\{\{company\}\}/gi, candidate.company || "Company")
                        .replace(/\{\{interviewCount\}\}/gi, String(candidate.interviewCount || 0));
                };

                const interpolatedSubject = replaceVariables(subject);
                const interpolatedBody = replaceVariables(customMessage || "Update from Cloudvyn");

                const htmlContent = buildCloudvynEmail({
                    preheader: interpolatedSubject,
                    greeting: `Hello ${candidate.username || 'Candidate'},`,
                    heading: interpolatedSubject,
                    message: interpolatedBody,
                    ctaText: ctaText || "Go to Dashboard",
                    ctaLink: ctaLink || "https://cloudvyn.com",
                });

                await sendEmailUtil({
                    to: recipientEmail,
                    subject: interpolatedSubject,
                    html: htmlContent,
                });

                sentCount++;
            } catch (err) {
                console.error(`Failed to send email to ${candidate.email}:`, err.message);
                failedCount++;
            }
        }

        return res.status(200).json({
            success: true,
            message: `Successfully sent bulk email to ${sentCount} candidate(s).`,
            data: { sentCount, failedCount, totalTargets: candidates.length },
        });
    } catch (error) {
        console.error("Error in sendBulkEmailAdmin:", error);
        return res.status(500).json({ success: false, message: "Server error sending bulk emails." });
    }
};

    
