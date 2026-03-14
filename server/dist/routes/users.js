"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const users_1 = require("../services/users");
const router = (0, express_1.Router)();
router.get('/', auth_1.requireAuth, async (req, res) => {
    const users = await (0, users_1.getAllUsersExcept)(req.user.userId);
    return res.json({ users });
});
exports.default = router;
