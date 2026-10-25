const jwt = require("jsonwebtoken");
const db = require("../../database");

const JWT_SECRET = process.env.JWT_SECRET || "blockchain_attendance_dev_jwt_secret_key_2026";
const TOKEN_EXPIRY = "12h";

/**
 * Generates a signed JWT token for an authenticated teacher/admin.
 */
function generateToken(teacher) {
  return jwt.sign(
    {
      id: teacher.id,
      username: teacher.username,
      name: teacher.name,
      role: teacher.role,
      assignedSubjects: teacher.assignedSubjects
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

/**
 * Authentication Middleware: Verifies Bearer JWT token, checks revocation, and attaches user.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please provide a valid Bearer token."
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication token missing."
    });
  }

  // Check if token was revoked via logout
  if (db.isTokenRevoked(token)) {
    return res.status(401).json({
      success: false,
      message: "Session has been invalidated. Please log in again."
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user exists and is active in database
    const teacher = db.getTeacherById(decoded.id);
    if (!teacher) {
      return res.status(401).json({
        success: false,
        message: "Authenticated account no longer exists."
      });
    }

    if (!teacher.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your teacher account has been deactivated. Contact an administrator."
      });
    }

    // Attach active teacher identity and raw token to request
    req.user = teacher;
    req.token = token;
    req.tokenDecoded = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token expired. Please log in again."
      });
    }
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token."
    });
  }
}

/**
 * Role Authorization: Requires 'admin' role.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Administrator privileges required."
    });
  }
  next();
}

/**
 * Helper to check if authenticated teacher is authorized for a subject.
 * Admins are authorized for all subjects.
 */
function isTeacherAuthorizedForSubject(teacher, subject) {
  if (!teacher || !subject) return false;
  if (teacher.role === "admin") return true;
  if (!Array.isArray(teacher.assignedSubjects)) return false;

  const target = subject.trim().toLowerCase();
  return teacher.assignedSubjects.some(
    (s) => s.trim().toLowerCase() === target
  );
}

module.exports = {
  JWT_SECRET,
  generateToken,
  requireAuth,
  requireAdmin,
  isTeacherAuthorizedForSubject
};
