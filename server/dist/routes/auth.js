"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const users_1 = require("../services/users");
const env_1 = require("../config/env");
const router = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
    password: zod_1.z.string().min(6).max(128),
});
function createAccessToken(payload) {
    const secret = env_1.env.jwtAccessSecret;
    const expiresIn = env_1.env.jwtAccessExpiresIn;
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn });
}
router.post('/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }
    const { username, password } = parsed.data;
    const existing = await (0, users_1.findUserByUsername)(username);
    if (existing) {
        return res.status(409).json({ error: 'Username already taken' });
    }
    const user = await (0, users_1.createUser)(username, password);
    const token = createAccessToken({ userId: user.id, username: user.username });
    return res.json({ token, user });
});
const loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(32),
    password: zod_1.z.string().min(1).max(128),
});
router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }
    const { username, password } = parsed.data;
    const user = await (0, users_1.findUserByUsername)(username);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await (0, users_1.verifyPassword)(password, user.password_hash);
    if (!ok) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = createAccessToken({ userId: user.id, username: user.username });
    return res.json({
        token,
        user: { id: user.id, username: user.username },
    });
});
exports.default = router;
