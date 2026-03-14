"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
function requireAuth(req, res, next) {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const token = header.slice('Bearer '.length);
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.jwtAccessSecret);
        req.user = payload;
        next();
    }
    catch {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}
