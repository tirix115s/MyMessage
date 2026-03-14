"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const messages_1 = require("../services/messages");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    const messages = await (0, messages_1.getRecentMessages)(50);
    return res.json({ messages });
});
exports.default = router;
