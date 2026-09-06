import express from "express";
import { sendEmail, buildCloudvynEmail } from "../utils/sendEmail.js";
import queryModel from "../models/queryModel.js";
// import { contactEmailTemplate } from "../utils/emailTemplates";

const queryRouter = express.Router();

queryRouter.post("/contact", async (req, res) => {
    try {
        console.log(req.body);
        const { name, email, subject, message } = req.body;


        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
            });
        }

        const newQuery = new queryModel({
            name,
            email,
            subject,
            message
        })

        newQuery.save();

        // 1. Send Confirmation Email to Candidate
        const candidateHtml = buildCloudvynEmail({
          preheader: "We've received your message",
          greeting: `Hello ${name}`,
          heading: "Message Received",
          message: `
            <p style="margin-bottom: 16px;">Thank you for reaching out to Cloudvyn.</p>
            <p>We have successfully received your query regarding <strong>"${subject || 'General Inquiry'}"</strong>.</p>
            <blockquote style="background:#f4f4f4; padding:16px; border-left:4px solid #4f46e5; border-radius:0 8px 8px 0; text-align:left; font-style:italic;">
              ${message}
            </blockquote>
            <p style="margin-top: 16px;">Our support team is reviewing your request and will get back to you shortly.</p>
          `,
          ctaText: "Return to Site",
          ctaLink: process.env.FRONTEND_URL || 'https://www.cloudvyn.com'
        });

        await sendEmail({
            to: email,
            subject: "Cloudvyn: We've received your query",
            html: candidateHtml,
        });

        // 2. Send Notification Email to Admin
        const adminHtml = buildCloudvynEmail({
          preheader: "New Support Request",
          greeting: `Query from ${name}`,
          heading: "New Contact Request",
          message: `
            <p style="margin-bottom: 16px;">A new message was submitted via the contact form.</p>
            <table style="border-collapse: collapse; width: 100%; max-width: 500px; margin: 0 auto; text-align: left; margin-bottom: 16px;">
              <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Name</td><td style="padding: 8px; border: 1px solid #ddd;">${name}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email</td><td style="padding: 8px; border: 1px solid #ddd;">${email}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Subject</td><td style="padding: 8px; border: 1px solid #ddd;">${subject || 'N/A'}</td></tr>
            </table>
            <blockquote style="background:#f4f4f4; padding:16px; border-left:4px solid #db2777; border-radius:0 8px 8px 0; text-align:left; font-style:italic;">
              ${message}
            </blockquote>
          `,
          ctaText: "Reply to User",
          ctaLink: `mailto:${email}?subject=Re: ${subject || 'Your Cloudvyn Query'}`
        });

        await sendEmail({
            to: process.env.EMAIL_USER || "abhishekmadoliya@gmail.com",
            subject: `New Contact Request: ${name}`,
            html: adminHtml,
        });

        return res.status(200).json({
            success: true,
            message: "Email sent successfully",
        });
    } catch (error) {
        console.error("Email error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to send email",
        });
    }
});



queryRouter.get('/allQuery', async (req, res) => {
    try {
        const queries = await queryModel.find({});

        if (queries.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No queries found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Queries found",
            data: queries
        });
    } catch (error) {
        console.log("Got error in getting allQuery", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});


export default queryRouter;
