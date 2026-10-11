const express = require("express");
const router = express.Router();
const attendanceService = require("../services/attendanceService");
const {
  validateAttendance,
  validateDuplicateAttendance
} = require("../../validation/attendanceValidator");

/**
 * POST /api/attendance
 * Marks attendance for a student on a specific date.
 */
router.post("/", async (req, res, next) => {
  try {
    const { studentId, date, status } = req.body || {};

    // 1. Application-level validation using existing attendanceValidator module
    // Uppercase status if string to allow flexible status inputs ("Present" / "PRESENT")
    const formattedStatus =
      typeof status === "string" ? status.trim().toUpperCase() : status;

    const validationResult = validateAttendance({
      studentId,
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

    // 2. Duplicate Attendance Check using existing attendanceValidator module & contract
    const contract = attendanceService.getContract();
    const dupResult = await validateDuplicateAttendance(
      contract,
      studentId.trim(),
      date.trim()
    );

    if (dupResult.isDuplicate) {
      return res.status(400).json({
        success: false,
        message: dupResult.error || "Attendance already recorded for this student on this date"
      });
    }

    // 3. Mark attendance on the blockchain
    const result = await attendanceService.markAttendance(
      studentId.trim(),
      date.trim(),
      status.trim()
    );

    return res.status(200).json({
      success: true,
      message: "Attendance recorded successfully",
      transactionHash: result.transactionHash
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/attendance/count
 * Retrieves total count of attendance records across all students.
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
 * GET /api/attendance/:studentId
 * Retrieves attendance history for a specific student.
 */
router.get("/:studentId", async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!studentId || studentId.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Student ID is required"
      });
    }

    const records = await attendanceService.getStudentAttendanceHistory(
      studentId.trim()
    );

    return res.status(200).json({
      success: true,
      studentId: studentId.trim(),
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
router.get("/:studentId/:date", async (req, res, next) => {
  try {
    const { studentId, date } = req.params;

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

    // Check if record exists first
    const exists = await attendanceService.hasAttendance(
      studentId.trim(),
      date.trim()
    );

    if (!exists) {
      return res.status(404).json({
        success: false,
        message: `No attendance record found for student ${studentId} on date ${date}`
      });
    }

    const record = await attendanceService.getAttendance(
      studentId.trim(),
      date.trim()
    );

    return res.status(200).json({
      success: true,
      record
    });
  } catch (error) {
    if (
      error.message &&
      error.message.includes("No attendance record found")
    ) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
});

module.exports = router;
