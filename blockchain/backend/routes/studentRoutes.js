const express = require("express");
const router = express.Router();
const db = require("../../database");
const { requireAuth, isTeacherAuthorizedForSubject } = require("../middleware/authMiddleware");

/**
 * GET /api/students
 * Retrieves demonstration student roster, optionally filtered by subject.
 * Teacher must be authorized for requested subject.
 */
router.get("/", requireAuth, (req, res) => {
  try {
    const { subject } = req.query;

    if (subject) {
      if (!isTeacherAuthorizedForSubject(req.user, subject)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You are not authorized to view student rosters for '${subject}'.`
        });
      }
      const enrolled = db.getStudentsBySubject(subject);
      return res.status(200).json({
        success: true,
        subject,
        students: enrolled
      });
    }

    // All students (for teachers/admins)
    const allStudents = db.getAllStudents();
    return res.status(200).json({
      success: true,
      students: allStudents
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve students: " + err.message
    });
  }
});

module.exports = router;
