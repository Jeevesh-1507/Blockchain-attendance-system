const express = require("express");
const router = express.Router();
const attendanceService = require("../services/attendanceService");
const {
  validateAttendance,
  validateDuplicateAttendance,
  validateBulkAttendance,
  validateCorrection
} = require("../../validation/attendanceValidator");
const {
  requireAuth,
  isTeacherAuthorizedForSubject
} = require("../middleware/authMiddleware");

/**
 * Helper to resolve teacher display identity
 */
function getTeacherIdentity(user) {
  if (!user) return "UNKNOWN_TEACHER";
  return user.id ? `${user.name} (${user.id})` : user.name || "TEACHER";
}

/**
 * Helper to determine default subject for teacher if omitted
 */
function resolveSubject(user, subject) {
  if (subject && typeof subject === "string" && subject.trim() !== "") {
    return subject.trim();
  }
  if (user && Array.isArray(user.assignedSubjects) && user.assignedSubjects.length > 0) {
    return user.assignedSubjects[0];
  }
  return "General";
}

/**
 * GET /api/attendance/count
 * Retrieves total count of attendance records across all subjects.
 * (Publicly accessible for system health/overview)
 */
router.get("/count", async (req, res, next) => {
  try {
    const count = await attendanceService.getTotalAttendanceCount();
    return res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/attendance
 * Marks subject-wise attendance for a student on a specific date.
 * Protected by teacher authentication and subject authorization.
 */
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { studentId, subject: inputSubject, date, status } = req.body || {};

    const subject = resolveSubject(req.user, inputSubject);

    // 1. Enforce subject authorization
    if (!isTeacherAuthorizedForSubject(req.user, subject)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You are not authorized to record attendance for '${subject}'. Assigned subjects: ${
          req.user.assignedSubjects ? req.user.assignedSubjects.join(", ") : "None"
        }`
      });
    }

    // 2. Application-level validation
    const formattedStatus =
      typeof status === "string" ? status.trim().toUpperCase() : status;

    const validationResult = validateAttendance({
      studentId,
      subject,
      date,
      status: formattedStatus
    });

    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.errors
      });
    }

    // 3. Duplicate Attendance Check per student, per subject, per date
    const contract = attendanceService.getContract();
    const dupResult = await validateDuplicateAttendance(
      contract,
      studentId.trim(),
      subject,
      date.trim()
    );

    if (dupResult.isDuplicate) {
      return res.status(400).json({
        success: false,
        message:
          dupResult.error ||
          `Attendance already recorded for student ${studentId} in ${subject} on date ${date}`
      });
    }

    // 4. Authenticated teacher identity
    const teacherIdentifier = getTeacherIdentity(req.user);

    // 5. Mark attendance on the blockchain
    const result = await attendanceService.markAttendance(
      studentId.trim(),
      subject,
      date.trim(),
      formattedStatus,
      teacherIdentifier
    );

    return res.status(200).json({
      success: true,
      message: "Attendance recorded successfully",
      studentId: studentId.trim(),
      subject,
      date: date.trim(),
      status: formattedStatus,
      teacher: teacherIdentifier,
      transactionHash: result.transactionHash
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/attendance/bulk
 * Records bulk attendance for an entire student roster.
 * Protected by teacher authentication and subject authorization.
 */
router.post("/bulk", requireAuth, async (req, res, next) => {
  try {
    const { subject, date, records } = req.body || {};

    // 1. Enforce subject authorization
    if (!isTeacherAuthorizedForSubject(req.user, subject)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You are not authorized to record attendance for '${subject}'.`
      });
    }

    // 2. Validate payload structure
    const valResult = validateBulkAttendance({ subject, date, records });
    if (!valResult.isValid) {
      return res.status(400).json({
        success: false,
        message: "Bulk validation failed",
        errors: valResult.errors
      });
    }

    const teacherIdentifier = getTeacherIdentity(req.user);
    const contract = attendanceService.getContract();
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // Process each student record sequentially to preserve EVM nonce order
    for (const item of records) {
      const studentId = item.studentId.trim();
      const status = item.status.trim().toUpperCase();

      // Check duplicate
      const dup = await validateDuplicateAttendance(contract, studentId, subject, date.trim());
      if (dup.isDuplicate) {
        results.push({
          studentId,
          status,
          success: false,
          error: `Duplicate: Attendance already marked for this date in ${subject}`
        });
        failureCount++;
        continue;
      }

      try {
        const txResult = await attendanceService.markAttendance(
          studentId,
          subject,
          date.trim(),
          status,
          teacherIdentifier
        );
        results.push({
          studentId,
          status,
          success: true,
          transactionHash: txResult.transactionHash
        });
        successCount++;
      } catch (txErr) {
        results.push({
          studentId,
          status,
          success: false,
          error: txErr.reason || txErr.message || "Transaction failed"
        });
        failureCount++;
      }
    }

    return res.status(200).json({
      success: true,
      subject,
      date: date.trim(),
      teacher: teacherIdentifier,
      totalSubmitted: records.length,
      successCount,
      failureCount,
      results
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/attendance/correct
 * Explicit attendance correction with reason and teacher attribution.
 */
router.post("/correct", requireAuth, async (req, res, next) => {
  try {
    const { studentId, subject, date, newStatus, reason } = req.body || {};

    if (!isTeacherAuthorizedForSubject(req.user, subject)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You are not authorized to correct attendance for '${subject}'.`
      });
    }

    const valResult = validateCorrection({ studentId, subject, date, newStatus, reason });
    if (!valResult.isValid) {
      return res.status(400).json({
        success: false,
        message: "Correction validation failed",
        errors: valResult.errors
      });
    }

    const teacherIdentifier = getTeacherIdentity(req.user);

    const result = await attendanceService.recordCorrection(
      studentId.trim(),
      subject.trim(),
      date.trim(),
      newStatus.trim().toUpperCase(),
      reason.trim(),
      teacherIdentifier
    );

    return res.status(200).json({
      success: true,
      message: "Attendance correction recorded successfully on blockchain",
      studentId: studentId.trim(),
      subject: subject.trim(),
      date: date.trim(),
      newStatus: newStatus.trim().toUpperCase(),
      reason: reason.trim(),
      teacher: teacherIdentifier,
      transactionHash: result.transactionHash
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/attendance/report/summary
 * Retrieves subject-wise statistics (sessions, present, absent, attendance percentage).
 */
router.get("/report/summary", requireAuth, async (req, res, next) => {
  try {
    const { subject } = req.query;
    if (!subject) {
      return res.status(400).json({
        success: false,
        message: "Subject query parameter is required"
      });
    }

    if (!isTeacherAuthorizedForSubject(req.user, subject)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Not authorized to view reports for '${subject}'`
      });
    }

    const records = await attendanceService.getSubjectAttendanceHistory(subject.trim());

    // Calculate metrics
    const totalRecords = records.length;
    const presentCount = records.filter(
      (r) => r.status && r.status.toUpperCase() === "PRESENT"
    ).length;
    const absentCount = records.filter(
      (r) => r.status && r.status.toUpperCase() === "ABSENT"
    ).length;

    // Distinct dates recorded for this subject (denotes number of lecture sessions)
    const distinctDates = [...new Set(records.map((r) => r.date))];
    const totalSessions = distinctDates.length;

    const overallPercentage =
      totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

    return res.status(200).json({
      success: true,
      subject: subject.trim(),
      totalSessions,
      totalRecords,
      presentCount,
      absentCount,
      overallPercentage,
      records
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/attendance/export/csv
 * Exports attendance records as downloadable CSV.
 */
router.get("/export/csv", requireAuth, async (req, res, next) => {
  try {
    const { subject, studentId } = req.query;

    let records = [];
    if (subject) {
      if (!isTeacherAuthorizedForSubject(req.user, subject)) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: Not authorized for subject '${subject}'`
        });
      }
      records = await attendanceService.getSubjectAttendanceHistory(subject.trim());
    } else if (studentId) {
      records = await attendanceService.getStudentAttendanceHistory(studentId.trim());
    } else if (req.user.role === "admin") {
      records = await attendanceService.getAllAttendanceRecords();
    } else {
      // Teacher: get records across all their assigned subjects
      const all = await attendanceService.getAllAttendanceRecords();
      records = all.filter((r) =>
        req.user.assignedSubjects && req.user.assignedSubjects.includes(r.subject)
      );
    }

    // Generate CSV content
    const headers = ["Student ID", "Subject", "Date", "Status", "Teacher ID", "Signer Address", "Timestamp"];
    const rows = records.map((r) => [
      `"${r.studentId}"`,
      `"${r.subject || "General"}"`,
      `"${r.date}"`,
      `"${r.status}"`,
      `"${r.teacherId || "--"}"`,
      `"${r.recordedBy || "--"}"`,
      `"${r.timestamp || "--"}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance_report_${Date.now()}.csv"`
    );
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/attendance/:studentId
 * Retrieves attendance history for a specific student, optionally filtered by subject.
 */
router.get("/:studentId", requireAuth, async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { subject } = req.query;

    if (!studentId || studentId.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Student ID is required"
      });
    }

    let records = await attendanceService.getStudentAttendanceHistory(studentId.trim());

    // If teacher is not admin, filter to subjects the teacher is authorized to view
    if (req.user.role !== "admin") {
      records = records.filter(
        (r) =>
          req.user.assignedSubjects &&
          req.user.assignedSubjects.some(
            (sub) => sub.toLowerCase() === (r.subject || "General").toLowerCase()
          )
      );
    }

    // Further filter by specific subject if provided
    if (subject) {
      records = records.filter(
        (r) => (r.subject || "General").toLowerCase() === subject.trim().toLowerCase()
      );
    }

    return res.status(200).json({
      success: true,
      studentId: studentId.trim(),
      subject: subject || "ALL",
      records
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/attendance/:studentId/:date
 * Retrieves specific attendance record for a student on a specific date.
 */
router.get("/:studentId/:date", requireAuth, async (req, res, next) => {
  try {
    const { studentId, date } = req.params;
    const { subject } = req.query;

    if (!studentId || studentId.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Student ID is required"
      });
    }

    if (!date || date.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Date is required"
      });
    }

    const targetSubject = resolveSubject(req.user, subject);

    // Check if record exists
    const exists = await attendanceService.hasAttendance(
      studentId.trim(),
      targetSubject,
      date.trim()
    );

    if (!exists) {
      return res.status(404).json({
        success: false,
        message: `No attendance record found for student ${studentId} on date ${date} in ${targetSubject}`
      });
    }

    const record = await attendanceService.getAttendance(
      studentId.trim(),
      targetSubject,
      date.trim()
    );

    return res.status(200).json({
      success: true,
      record
    });
  } catch (error) {
    if (error.message && error.message.includes("No attendance record found")) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
});

module.exports = router;
