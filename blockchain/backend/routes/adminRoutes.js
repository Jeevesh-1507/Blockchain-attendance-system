const express = require("express");
const router = express.Router();
const db = require("../../database");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");

// All admin routes require authenticated administrator
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/teachers
 * Lists all registered teacher and admin accounts.
 */
router.get("/teachers", (req, res) => {
  try {
    const teachers = db.getAllTeachers().map((t) => ({
      id: t.id,
      username: t.username,
      name: t.name,
      role: t.role,
      assignedSubjects: t.assignedSubjects,
      isActive: t.isActive,
      createdAt: t.createdAt
    }));

    return res.status(200).json({
      success: true,
      teachers
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve teachers: " + err.message
    });
  }
});

/**
 * POST /api/admin/teachers
 * Creates a new teacher account with assigned subjects.
 */
router.post("/teachers", (req, res) => {
  try {
    const { id, username, name, password, role, assignedSubjects } = req.body || {};

    if (!id || typeof id !== "string" || id.trim() === "") {
      return res.status(400).json({ success: false, message: "Teacher ID is required" });
    }
    if (!username || typeof username !== "string" || username.trim() === "") {
      return res.status(400).json({ success: false, message: "Username is required" });
    }
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ success: false, message: "Teacher name is required" });
    }
    if (!password || typeof password !== "string" || password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    const created = db.createTeacher({
      id,
      username,
      name,
      password,
      role: role === "admin" ? "admin" : "teacher",
      assignedSubjects: Array.isArray(assignedSubjects) ? assignedSubjects : []
    });

    return res.status(201).json({
      success: true,
      message: "Teacher account created successfully",
      teacher: {
        id: created.id,
        username: created.username,
        name: created.name,
        role: created.role,
        assignedSubjects: created.assignedSubjects,
        isActive: created.isActive
      }
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * PUT /api/admin/teachers/:id
 * Updates teacher details, subject assignments, or active status.
 */
router.put("/teachers/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { name, assignedSubjects, isActive, password } = req.body || {};

    const updated = db.updateTeacher(id, {
      name,
      assignedSubjects,
      isActive,
      password
    });

    return res.status(200).json({
      success: true,
      message: "Teacher updated successfully",
      teacher: {
        id: updated.id,
        username: updated.username,
        name: updated.name,
        role: updated.role,
        assignedSubjects: updated.assignedSubjects,
        isActive: updated.isActive
      }
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * DELETE /api/admin/teachers/:id
 * Deactivates a teacher account (soft delete for audit integrity).
 */
router.delete("/teachers/:id", (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Administrators cannot deactivate their own account"
      });
    }

    const updated = db.updateTeacher(id, { isActive: false });

    return res.status(200).json({
      success: true,
      message: `Teacher '${updated.name}' (${updated.id}) has been deactivated.`,
      teacher: {
        id: updated.id,
        isActive: updated.isActive
      }
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;
