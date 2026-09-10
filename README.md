# VantaGate

A lightweight browser verification and CAPTCHA security gate built with Node.js and Express.

VantaGate provides a simple security layer that verifies browser capabilities, presents a server-generated CAPTCHA challenge, and issues a short-lived signed verification token before granting access to a protected destination.

## ✨ Features

- Browser capability checks
- JavaScript verification
- Cookie support verification
- localStorage capability check
- Fetch/Crypto support check
- Arithmetic security challenge
- Server-generated CAPTCHA
- CAPTCHA expiration
- CAPTCHA refresh
- Failed-attempt protection
- IP-based rate limiting
- Short-lived HMAC-signed verification tokens
- HttpOnly authentication cookies
- SameSite cookie protection
- Configurable protected destination
- Simple Express architecture
- Lightweight and easy to customize

## 🧱 Project Structure

```text
VantaGate/
├── client/
│   ├── index.html
│   ├── style.css
│   └── gate.js
├── server/
│   └── server.js
├── captcha/
│   └── captcha.js
├── demo/
│   └── index.html
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
├── README.md
└── LICENSE
```

## 🚀 Installation

Clone the repository:

```bash
git clone https://github.com/ArezoPookie/VantaGate
cd VantaGate
```

Install dependencies:

```bash
npm install
```

Create a `.env` file based on `.env.example`.

Example:

```env
VANTAGATE_TARGET=/demo
VANTAGATE_SECRET=your-long-random-secret
VANTAGATE_PORT=3000
```

Start the server:

```bash
npm start
```

VantaGate will be available at:

```text
http://localhost:3000
```

## ⚙️ Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VANTAGATE_TARGET` | Destination after successful verification | `/demo` |
| `VANTAGATE_SECRET` | Secret used to sign verification tokens | Required |
| `VANTAGATE_PORT` | Server port | `3000` |

## 🔐 How It Works

```text
Visitor
   ↓
Browser capability checks
   ↓
Security challenge
   ↓
Server-generated CAPTCHA
   ↓
Verification
   ↓
Short-lived signed token
   ↓
HttpOnly cookie
   ↓
Protected destination
```

The CAPTCHA answer is kept on the server and is not sent to the browser as plain text.

Verification tokens are signed using HMAC-SHA256 and expire after a short period.

## 🛡️ Security Notes

VantaGate is designed as a lightweight verification layer, not as a replacement for a full enterprise security or anti-bot platform.

It does not use invasive browser fingerprinting or collect unnecessary visitor information.

For production deployments:

- Use HTTPS.
- Keep `VANTAGATE_SECRET` private.
- Set `NODE_ENV=production`.
- Do not commit `.env`.
- Consider placing VantaGate behind a reverse proxy.
- Review rate limits for your deployment.
- Use a persistent/shared rate limiter when running multiple server instances.

## ⚠️ Limitations

VantaGate is intentionally lightweight.

It should not be treated as a complete DDoS protection system, WAF, bot-management platform, or identity system.

Determined automated clients may still be able to bypass browser challenges.

## 🧪 Development

Run:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

The included `/demo` destination can be used to test successful verification.

## 📜 License

VantaGate is released under the MIT License.

See [LICENSE](LICENSE) for details.
