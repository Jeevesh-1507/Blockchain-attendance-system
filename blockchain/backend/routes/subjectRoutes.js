const express = require("express");
const router = express.Router();
const db = require("../../database");
const { requireAuth } = require("../middleware/authMiddleware");

/**
 * GET /api/subjects
 * Retrieves subjects catalog. If user is authenticated as teacher,
 * includes their assigned subjects or filters accordingly.
 */
router.get("/", requireAuth, (req, res) => {
  try {
    const allSubjects = db.getAllSubjects();
    const myOnly = req.query.myOnly === "true";

    const mapped = allSubjects.map((sub) => {
      const isAssigned =
        req.user.role === "admin" ||
        (Array.isArray(req.user.assignedSubjects) &&
          req.user.assignedSubjects.includes(sub.name));
      return {
        ...sub,
        isAssigned
      };
    });

    const result = myOnly ? mapped.filter((s) => s.isAssigned) : mapped;

    return res.status(200).json({
      success: true,
      subjects: result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve subjects: " + err.message
    });
  }
});

module.exports = router;
