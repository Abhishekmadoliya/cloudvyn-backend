import axios from "axios";
import { configDotenv } from "dotenv";

configDotenv();

const LINKEDIN_API = 'https://api.linkedin.com/rest';

export const postTextToLinkedIn = async (text) => {
    console.log('LinkedIn-Version being sent: 202501'); // add this line
    const authorUrn = process.env.LINKEDIN_USER_URN; // urn:li:person:XXXX or urn:li:organization:XXXX

    const body = {
        author: authorUrn,
        commentary: text,
        visibility: 'PUBLIC',
        distribution: {
            feedDistribution: 'MAIN_FEED',
            targetEntities: [],
            thirdPartyDistributionChannels: [],
        },
        lifecycleState: 'PUBLISHED',
    };

    const response = await axios.post(`${LINKEDIN_API}/posts`, body, {
        headers: {
            'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
            'LinkedIn-Version': '202408',
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
        },
    });

    return response.headers['x-restli-id']; // returns the post URN
}