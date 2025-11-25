import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import fs from 'fs';
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const pdfParse = require("pdf-parse");  // ← THIS EXACT STRING
console.log("TYPE OF pdfParse:", typeof pdfParse);
  // correct package


const AI = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

export const generateArticle = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt, length } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if (plan !== 'premium' && free_usage >= 10) {
            return res.json({ success: false, message: "Limit reached. Update to continue." })
        }

        const response = await AI.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [{
                role: "user",
                content: prompt,
            },],
            temperature: 0.7,
            max_tokens: length,
        });

        const content = response.choices[0].message.content

        await sql` INSERT INTO creations (user_id,prompt,content,type) VALUES 
        (${userId}, ${prompt}, ${content},'article')`;

        if (plan !== 'premium') {
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: free_usage + 1
                }
            })
        }

        res.json({ success: true, content })

    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

export const generateBlogTitle = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if (plan !== 'premium' && free_usage >= 10) {
            return res.json({ success: false, message: "Limit reached. Upgrade to continue." })
        }

        const response = await AI.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [{ role: "user", content: prompt, }],
            temperature: 0.7,
            max_tokens: 100,
        });

        const content = response.choices[0].message.content

        await sql` INSERT INTO creations (user_id,prompt,content,type) VALUES 
        (${userId}, ${prompt}, ${content},'blog-title')`;

        if (plan !== 'premium') {
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: free_usage + 1
                }
            })
        }

        res.json({ success: true, content })

    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

export const generateImage = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt, publish } = req.body;
        const plan = req.plan;

        if (plan !== 'premium') {
            return res.json({ success: false, message: "This feature is only available for premium subscriptions." })
        }

        const formData = new FormData()
        formData.append('prompt', prompt)
        const { data } = await axios.post("https://clipdrop-api.co/text-to-image/v1",formData, {
            headers:{'x-api-key': process.env.CLIPDROP_API_KEY,}, responseType: "arraybuffer",
        })

        const base64Image = `data:image/png;base64,${Buffer.from(data, 'binary').toString('base64')}`;

        const {secure_url} = await cloudinary.uploader.upload(base64Image)

        await sql`INSERT INTO creations (user_id, prompt,content,type,publish) VALUES 
        (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})`;

        res.json({ success:false,content:secure_url})

    } catch (error) {
       console.log(error.message)
       res.json({success: false, message:error.message})
    }
}
export const removeImageBackground = async (req, res) => {
    try {
        const { userId } = req.auth();
        const image = req.file;
        const plan = req.plan;

        if (plan !== 'premium') {
            return res.json({ success: false, message: "This feature is only available for premium subscriptions" })
        }

        const { secure_url } = await cloudinary.uploader.upload(image.path, {
            transformation: [
                {
                    effect: "background_removal",
                    background_removal: 'remove_the_background'
                }
            ]
        })

        await sql` INSERT INTO creations (user_id,prompt,content,type) VALUES 
        (${userId}, 'Remove background from image', ${secure_url},'image')`;

        res.json({ success: true, content: secure_url })

    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

export const removeImageObject = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { object } = req.body;
        const  image  = req.file;
        const plan = req.plan;

        if (plan !== 'premium') {
            return res.json({ success: false, message: "This feature is only available for premium subscriptions" })
        }

        const { public_id } = await cloudinary.uploader.upload(image.path)

        const imageUrl = cloudinary.url(public_id, {
            transformation: [{ effect: `gen_remove:${object}`, }],
            resource_type: 'image'
        })

        await sql` INSERT INTO creations (user_id,prompt,content,type) VALUES 
        (${userId}, ${`Remove ${object} from image`}, ${imageUrl},'image')`;

        res.json({ success: true, content: imageUrl })

    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

export const resumeReview = async (req, res) => {
    console.log("pdfParse loaded as:", pdfParse);
    console.log("TYPE OF pdfParse:", typeof pdfParse);


    let resumeFile; // make accessible in catch block

    try {
        const { userId } = req.auth();
        resumeFile = req.file;
        const plan = req.plan;

        if (plan !== "premium") {
            return res.json({
                success: false,
                message: "This feature is only available for premium subscriptions"
            });
        }

        if (!resumeFile) {
            return res.json({
                success: false,
                message: "No resume file uploaded."
            });
        }

        if (resumeFile.size > 5 * 1024 * 1024) {
            return res.json({
                success: false,
                message: "Resume file size exceeds allowed size (5MB)."
            });
        }

        if (!resumeFile.mimetype.includes("pdf")) {
            return res.json({
                success: false,
                message: "Please upload a PDF file."
            });
        }

        const dataBuffer = fs.readFileSync(resumeFile.path);

        // pdf-parse FIXED (using require)
        const pdfData = await pdfParse(dataBuffer);


        const prompt = `
Review the following resume and provide constructive feedback focusing on:
1. Formatting and structure
2. Content clarity and impact
3. Grammar and spelling
4. Overall effectiveness

Resume Content:
${pdfData.text}
        `;

        const response = await AI.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 1000
        });

        const content = response.choices[0].message.content;

        await sql`
            INSERT INTO creations (user_id, prompt, content, type)
            VALUES (${userId}, 'Review uploaded resume', ${content}, 'resume-review')
        `;

        fs.unlinkSync(resumeFile.path);

        return res.json({ success: true, content });

    } catch (error) {
        console.log("Resume Review Error:", error.message);

        if (resumeFile?.path) {
            try {
                fs.unlinkSync(resumeFile.path);
            } catch (cleanupError) {
                console.log("File cleanup error:", cleanupError.message);
            }
        }

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
