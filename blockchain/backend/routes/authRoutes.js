const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../../database");
const { generateToken, requireAuth } = require("../middleware/authMiddleware");

/**
 * POST /api/auth/login
 * Authenticates a teacher or administrator and returns a JWT Bearer token.
 */
router.post("/login", (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || typeof username !== "string" || username.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Teacher ID or username is required"
      });
    }

    if (!password || typeof password !== "string" || password.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Password is required"
      });
    }

    const teacher = db.getTeacherByUsername(username.trim());
    if (!teacher) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials. Please verify your Teacher ID / username and password."
      });
    }

    if (!teacher.isActive) {
      return res.status(403).json({
        success: false,
        message: "This account has been deactivated. Please contact an administrator."
      });
    }

    const isMatch = bcrypt.compareSync(password.trim(), teacher.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials. Please verify your Teacher ID / username and password."
      });
    }

    const token = generateToken(teacher);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      teacher: {
        id: teacher.id,
        username: teacher.username,
        name: teacher.name,
        role: teacher.role,
        assignedSubjects: teacher.assignedSubjects
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authentication error: " + error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * Revokes the current session token so it cannot be reused.
 */
router.post("/logout", requireAuth, (req, res) => {
  try {
    const token = req.token;
    const exp = req.tokenDecoded && req.tokenDecoded.exp ? req.tokenDecoded.exp * 1000 : null;

    db.revokeToken(token, exp);

    return res.status(200).json({
      success: true,
      message: "Successfully logged out. Session has been revoked."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Logout error: " + error.message
    });
  }
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile.
 */
router.get("/me", requireAuth, (req, res) => {
  return res.status(200).json({
    success: true,
    teacher: {
      id: req.user.id,
      username: req.user.username,
      name: req.user.name,
      role: req.user.role,
      assignedSubjects: req.user.assignedSubjects
    }
  });
});

module.exports = router;
