const status = document.getElementById("status");
const challengeBox = document.getElementById("challenge");
const question = document.getElementById("question");
const answer = document.getElementById("answer");
const verifyButton = document.getElementById("verify");
const error = document.getElementById("error");
const loader = document.getElementById("loader");

const captcha = document.getElementById("captcha");
const captchaImage = document.getElementById("captchaImage");
const captchaAnswer = document.getElementById("captchaAnswer");
const captchaRefresh = document.getElementById("captchaRefresh");

let challengeId = null;
let captchaId = null;

function runBrowserChecks() {
    return {
        javascript: true,

        cookies: navigator.cookieEnabled,

        localStorage: (() => {
            try {
                const test = "__vantagate_test__";

                localStorage.setItem(test, "1");
                localStorage.removeItem(test);

                return true;
            } catch {
                return false;
            }
        })(),

        browser: !!window.fetch && !!window.crypto
    };
}

async function checkExistingToken() {
    try {
        const response = await fetch("/access");
        const data = await response.json();

        return data.success === true;
    } catch {
        return false;
    }
}

async function loadCaptcha() {
    try {
        captchaAnswer.value = "";
        error.textContent = "";

        captchaImage.innerHTML = "Loading...";

        const response = await fetch("/captcha");
        const data = await response.json();

        if (!data.success) {
            throw new Error("Unable to load CAPTCHA");
        }

        captchaId = data.captcha.id;
        captchaImage.innerHTML = "";

        const image = document.createElement("img");
        
        image.src = data.captcha.image;
        image.alt = "CAPTCHA";
        
        captchaImage.appendChild(image);

        captcha.classList.remove("hidden");

    } catch {
        captchaImage.innerHTML = "CAPTCHA unavailable";
        error.textContent = "Unable to load CAPTCHA.";
    }
}

async function getChallenge() {
    try {
        status.textContent = "Checking your browser...";

        const browserChecks = runBrowserChecks();

        const response = await fetch("/verify");
        const data = await response.json();

        if (!data.success) {
            throw new Error("Unable to start verification");
        }

        challengeId = data.challenge.id;
        question.textContent = data.challenge.question;

        const browserPassed = Object.values(browserChecks).every(Boolean);

        status.textContent = browserPassed
            ? "Complete the security checks."
            : "Please complete the security checks.";

        loader.classList.add("hidden");
        challengeBox.classList.remove("hidden");

        await loadCaptcha();

        answer.focus();

    } catch {
        status.textContent = "Security check unavailable.";
        loader.classList.add("hidden");
        error.textContent = "Please refresh the page and try again.";
    }
}

async function verifyChallenge() {
    const userAnswer = answer.value.trim();
    const userCaptcha = captchaAnswer.value.trim();

    if (!userAnswer) {
        error.textContent = "Please answer the security question.";
        return;
    }

    if (!userCaptcha) {
        error.textContent = "Please complete the CAPTCHA.";
        captchaAnswer.focus();
        return;
    }

    verifyButton.disabled = true;
    verifyButton.textContent = "Verifying...";
    error.textContent = "";

    try {
        const browserChecks = runBrowserChecks();

        const response = await fetch("/verify", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                id: challengeId,
                answer: userAnswer,
                browserChecks,
                captchaId,
                captchaAnswer: userCaptcha
            })
        });

        const data = await response.json();

        if (!data.success) {
            error.textContent = data.message;

            verifyButton.disabled = false;
            verifyButton.textContent = "Verify";

            if (
                data.message === "CAPTCHA verification failed" ||
                data.message === "Invalid CAPTCHA"
            ) {
                await loadCaptcha();
            }

            return;
        }

        showVerified();

    } catch {
        error.textContent = "Something went wrong. Please try again.";

        verifyButton.disabled = false;
        verifyButton.textContent = "Verify";
    }
}

async function redirectToProtectedSite() {
    try {
        const response = await fetch("/access");
        const data = await response.json();

        if (!data.success) {
            status.textContent = "Verification required.";
            return;
        }

        status.textContent = "Access granted.";

        setTimeout(() => {
            window.location.href = data.redirect;
        }, 700);

    } catch {
        status.textContent = "Unable to access the protected site.";
    }
}

function showVerified() {
    challengeBox.classList.add("hidden");
    loader.classList.add("hidden");

    status.textContent = "Verification successful.";

    document.querySelector(".icon").textContent = "✓";

    setTimeout(() => {
        redirectToProtectedSite();
    }, 800);
}

async function initialize() {
    const alreadyVerified = await checkExistingToken();

    if (alreadyVerified) {
        showVerified();
        return;
    }

    await getChallenge();
}

captchaRefresh.addEventListener("click", loadCaptcha);

verifyButton.addEventListener("click", verifyChallenge);

answer.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        verifyChallenge();
    }
});

captchaAnswer.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        verifyChallenge();
    }
});

initialize();