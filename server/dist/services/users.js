"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByUsername = findUserByUsername;
exports.getAllUsersExcept = getAllUsersExcept;
exports.createUser = createUser;
exports.verifyPassword = verifyPassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const mysql_1 = require("../db/mysql");
async function findUserByUsername(username) {
    const [rows] = await mysql_1.pool.query('SELECT id, username, password_hash, created_at FROM users WHERE username = ? LIMIT 1', [username]);
    const list = rows;
    return list[0] ?? null;
}
async function getAllUsersExcept(userId) {
    const [rows] = await mysql_1.pool.query('SELECT id, username, created_at FROM users WHERE id <> ? ORDER BY username ASC', [userId]);
    return rows;
}
async function createUser(username, password) {
    const id = (0, uuid_1.v4)();
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    await mysql_1.pool.query('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', [id, username, passwordHash]);
    return { id, username };
}
async function verifyPassword(password, hash) {
    return bcryptjs_1.default.compare(password, hash);
}
