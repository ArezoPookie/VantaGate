require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const {
    generateCaptcha,
    verifyCaptcha
} = require("../captcha/captcha");

const app = express();
const PORT = Number(process.env.VANTAGATE_PORT) || 3000;
const TARGET_URL = process.env.VANTAGATE_TARGET || "/demo";

const TOKEN_SECRET = process.env.VANTAGATE_SECRET;

if (!TOKEN_SECRET) {
    throw new Error("VANTAGATE_SECRET is missing from .env");
}

app.use(express.json());
app.use(cookieParser());

app.use(express.static("client"));
app.use("/demo", express.static("demo"));

const challenges = new Map();
const captchas = new Map();

const rateLimits = new Map();

const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS = 20;

setInterval(() => {
    const now = Date.now();

    for (const [id, challenge] of challenges) {
        if (now > challenge.expires) {
            challenges.delete(id);
        }
    }

    for (const [ip, record] of rateLimits) {
        if (now - record.start > RATE_LIMIT_WINDOW) {
            rateLimits.delete(ip);
        }
    }
}, 60000);



function checkRateLimit(ip) {
    const now = Date.now();
    const record = rateLimits.get(ip);

    if (!record || now - record.start > RATE_LIMIT_WINDOW) {
        rateLimits.set(ip, {
            start: now,
            count: 1
        });

        return true;
    }

    record.count++;

    if (record.count > MAX_REQUESTS) {
        return false;
    }

    return true;
}

function createToken() {
    const payload = {
        issued: Date.now(),
        expires: Date.now() + 5 * 60 * 1000
    };

    const encodedPayload = Buffer
        .from(JSON.stringify(payload))
        .toString("base64url");

    const signature = crypto
        .createHmac("sha256", TOKEN_SECRET)
        .update(encodedPayload)
        .digest("base64url");

    return `${encodedPayload}.${signature}`;
}

function verifyToken(token) {
    if (!token || !token.includes(".")) {
        return false;
    }

    const [payload, signature] = token.split(".");

    const expectedSignature = crypto
        .createHmac("sha256", TOKEN_SECRET)
        .update(payload)
        .digest("base64url");

        const signatureBuffer = Buffer.from(signature);
        const expectedSignatureBuffer = Buffer.from(expectedSignature);
        
        if (
            signatureBuffer.length !== expectedSignatureBuffer.length ||
            !crypto.timingSafeEqual(
                signatureBuffer,
                expectedSignatureBuffer
            )
        ) {
            return false;
        }

    try {
        const data = JSON.parse(
            Buffer.from(payload, "base64url").toString()
        );

        if (Date.now() > data.expires) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

app.get("/verify", (req, res) => {
    const ip = req.ip;

    if (!checkRateLimit(ip)) {
        return res.status(429).json({
            success: false,
            message: "Too many verification requests"
        });
    }

    const id = crypto.randomBytes(16).toString("hex");
    const numberA = Math.floor(Math.random() * 20) + 1;
    const numberB = Math.floor(Math.random() * 20) + 1;

    challenges.set(id, {
        answer: numberA + numberB,
        expires: Date.now() + 60000,
        attempts: 0
    });

    res.json({
        success: true,
        challenge: {
            id,
            question: `${numberA} + ${numberB}`
        }
    });
});

app.get("/captcha", async (req, res) => {
    try {
        const captcha = await generateCaptcha();

        captchas.set(captcha.id, captcha);

        res.json({
            success: true,
            captcha: {
                id: captcha.id,
                image: `data:image/png;base64,${captcha.image.toString("base64")}`
            }
        });

    } catch {
        res.status(500).json({
            success: false,
            message: "Unable to generate CAPTCHA"
        });
    }
});

app.post("/verify", (req, res) => {
    const {
        id,
        answer,
        browserChecks,
        captchaId,
        captchaAnswer
    } = req.body;

    if (!id || answer === undefined || !browserChecks) {
        return res.status(400).json({
            success: false,
            message: "Missing verification information"
        });
    }

    const challenge = challenges.get(id);

    if (!challenge) {
        return res.status(400).json({
            success: false,
            message: "Invalid challenge"
        });
    }

    if (Date.now() > challenge.expires) {
        challenges.delete(id);

        return res.status(400).json({
            success: false,
            message: "Challenge expired"
        });
    }

    const requiredChecks = [
        "javascript",
        "cookies",
        "localStorage",
        "browser"
    ];

    const browserPassed = requiredChecks.every(
        check => browserChecks[check] === true
    );
    
    if (!browserPassed) {
        return res.status(403).json({
            success: false,
            message: "Browser verification failed"
        });
    }
    
    if (captchaId) {
        const captcha = captchas.get(captchaId);
    
        if (!captcha) {
            return res.status(400).json({
                success: false,
                message: "Invalid CAPTCHA"
            });
        }
    
        if (!verifyCaptcha(captcha, captchaAnswer)) {
            return res.status(403).json({
                success: false,
                message: "CAPTCHA verification failed"
            });
        }
    
        captchas.delete(captchaId);
    }
    
    if (Number(answer) !== challenge.answer) {
        challenge.attempts++;
    
        if (challenge.attempts >= 5) {
            challenges.delete(id);
    
            return res.status(403).json({
                success: false,
                message: "Too many failed attempts"
            });
        }
    
        return res.status(403).json({
            success: false,
            message: "Challenge failed"
        });
    }

    challenges.delete(id);

    const token = createToken();

    res.cookie("vantagate_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 5 * 60 * 1000
    });
    
    res.json({
        success: true,
        message: "Verification successful"
    });
});

app.get("/access", (req, res) => {
    const token = req.cookies.vantagate_token;

    if (!verifyToken(token)) {
        return res.status(403).json({
            success: false,
            message: "Verification required"
        });
    }

    res.json({
        success: true,
        redirect: TARGET_URL
    });
});

app.listen(PORT, () => {
    console.log(`VantaGate running at http://localhost:${PORT}`);
});