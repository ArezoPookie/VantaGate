const crypto = require("crypto");
const sharp = require("sharp");

const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function generateCaptcha() {
    let text = "";

    for (let i = 0; i < 6; i++) {
        const index = crypto.randomInt(0, characters.length);
        text += characters[index];
    }

    const width = 320;
    const height = 100;

    const svg = `
        <svg
            width="${width}"
            height="${height}"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect
                width="100%"
                height="100%"
                fill="#17121f"
            />

            <path
                d="M0 20 C80 80 160 0 240 60 S320 20 360 70"
                stroke="#8f5cff"
                stroke-width="3"
                fill="none"
                opacity="0.35"
            />

            <path
                d="M-20 75 C70 20 130 100 210 35 S300 70 340 25"
                stroke="#d7b8ff"
                stroke-width="2"
                fill="none"
                opacity="0.3"
            />

            <text
                x="160"
                y="66"
                text-anchor="middle"
                font-family="Arial, sans-serif"
                font-size="42"
                font-weight="700"
                letter-spacing="8"
                fill="#d7c2ff"
            >
                ${text}
            </text>
        </svg>
    `;

    const image = await sharp(Buffer.from(svg))
        .png()
        .toBuffer();

    return {
        id: crypto.randomBytes(16).toString("hex"),
        text,
        image,
        expires: Date.now() + 2 * 60 * 1000
    };
}

function verifyCaptcha(captcha, answer) {
    if (!captcha || !answer) {
        return false;
    }

    if (Date.now() > captcha.expires) {
        return false;
    }

    return captcha.text === String(answer).trim().toUpperCase();
}

module.exports = {
    generateCaptcha,
    verifyCaptcha
};