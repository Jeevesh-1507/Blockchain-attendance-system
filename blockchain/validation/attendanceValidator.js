/**
 * Attendance Input Validation Module
 * 
 * Provides utility functions to validate attendance input data,
 * subject authorizations, and check for duplicate attendance entries
 * before smart contract submission.
 */

/**
 * Validates whether a date string is valid and formatted as YYYY-MM-DD.
 * 
 * @param {string} dateStr Date string to validate
 * @returns {boolean} True if date string is a valid YYYY-MM-DD date
 */
function isValidDate(dateStr) {
  if (typeof dateStr !== "string" || dateStr.trim() === "") {
    return false;
  }

  // Ensure format matches YYYY-MM-DD
  const isoFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoFormatRegex.test(dateStr.trim())) {
    return false;
  }

  const timestamp = Date.parse(dateStr.trim());
  if (isNaN(timestamp)) {
    return false;
  }

  // Verify component matching to prevent invalid dates like 2026-02-31
  const [year, month, day] = dateStr.trim().split("-").map(Number);
  const dateObj = new Date(dateStr.trim());
  return (
    dateObj.getUTCFullYear() === year &&
    dateObj.getUTCMonth() + 1 === month &&
    dateObj.getUTCDate() === day
  );
}

/**
 * Validates single attendance input data.
 * 
 * Checks:
 * - studentId: must exist and must not be empty
 * - subject: optional for legacy requests, but if provided must be a non-empty string
 * - date: must exist and must be a valid date (YYYY-MM-DD)
 * - status: must exist and must be either "PRESENT" or "ABSENT"
 * 
 * @param {object} attendanceData Object containing studentId, subject, date, and status
 * @returns {{ isValid: boolean, errors: string[] }} Result object with validation status and error list
 */
function validateAttendance(attendanceData) {
  const errors = [];

  if (!attendanceData || typeof attendanceData !== "object") {
    return {
      isValid: false,
      errors: ["Attendance data must be a valid object"]
    };
  }

  const { studentId, subject, date, status } = attendanceData;

  // 1. Student ID Validation
  if (studentId === undefined || studentId === null) {
    errors.push("Student ID is required");
  } else if (typeof studentId !== "string" || studentId.trim() === "") {
    errors.push("Student ID cannot be empty");
  }

  // 2. Subject Validation (if provided)
  if (subject !== undefined && subject !== null) {
    if (typeof subject !== "string" || subject.trim() === "") {
      errors.push("Subject cannot be empty");
    }
  }

  // 3. Date Validation
  if (date === undefined || date === null) {
    errors.push("Date is required");
  } else if (typeof date !== "string" || date.trim() === "") {
    errors.push("Date cannot be empty");
  } else if (!isValidDate(date)) {
    errors.push("Date must be a valid date in YYYY-MM-DD format");
  }

  // 4. Status Validation
  const validStatuses = ["PRESENT", "ABSENT"];
  if (status === undefined || status === null) {
    errors.push("Attendance status is required");
  } else if (typeof status !== "string" || status.trim() === "") {
    errors.push("Attendance status cannot be empty");
  } else if (!validStatuses.includes(status.trim().toUpperCase())) {
    errors.push("Attendance status must be either 'PRESENT' or 'ABSENT'");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Helper function to check if attendance has already been recorded for a student, subject, and date.
 * Supports both legacy 3-arg (contract, studentId, date) and 4-arg (contract, studentId, subject, date).
 * 
 * @param {object|Array} contractOrRecords Smart contract instance or array of record objects
 * @param {string} studentId Unique student identifier
 * @param {string} subjectOrDate Subject name OR date string if subject omitted
 * @param {string} [dateOpt] Date string (if subject was provided)
 * @returns {Promise<{ isDuplicate: boolean, isValid: boolean, error: string|null }>}
 */
async function validateDuplicateAttendance(contractOrRecords, studentId, subjectOrDate, dateOpt) {
  let subject = "General";
  let date = subjectOrDate;

  if (dateOpt !== undefined) {
    subject = subjectOrDate;
    date = dateOpt;
  }

  if (!studentId || !date) {
    return {
      isDuplicate: false,
      isValid: false,
      error: "Both studentId and date are required for duplicate validation"
    };
  }

  let isRecorded = false;

  if (Array.isArray(contractOrRecords)) {
    isRecorded = contractOrRecords.some(
      (record) =>
        record.studentId === studentId &&
        (dateOpt !== undefined ? record.subject === subject : true) &&
        record.date === date
    );
  } else if (contractOrRecords && typeof contractOrRecords.hasAttendance === "function") {
    try {
      isRecorded = await contractOrRecords.hasAttendance(studentId, subject, date);
    } catch (e) {
      // Fallback for contract methods
      isRecorded = false;
    }
  } else {
    throw new Error("First argument must be a smart contract instance or an array of records");
  }

  if (isRecorded) {
    const errorMsg =
      subject && subject !== "General"
        ? `Attendance has already been recorded for student ${studentId} in ${subject} on date ${date}`
        : `Attendance has already been recorded for student ${studentId} on date ${date}`;
    return {
      isDuplicate: true,
      isValid: false,
      error: errorMsg
    };
  }

  return {
    isDuplicate: false,
    isValid: true,
    error: null
  };
}

/**
 * Validates bulk attendance payload.
 */
function validateBulkAttendance(bulkData) {
  const errors = [];

  if (!bulkData || typeof bulkData !== "object") {
    return { isValid: false, errors: ["Bulk attendance data must be an object"] };
  }

  const { subject, date, records } = bulkData;

  if (!subject || typeof subject !== "string" || subject.trim() === "") {
    errors.push("Subject is required and cannot be empty");
  }

  if (!date || typeof date !== "string" || !isValidDate(date)) {
    errors.push("Date must be a valid date in YYYY-MM-DD format");
  }

  if (!Array.isArray(records) || records.length === 0) {
    errors.push("Records must be a non-empty array of student attendance entries");
  } else {
    records.forEach((item, idx) => {
      if (!item.studentId || typeof item.studentId !== "string" || item.studentId.trim() === "") {
        errors.push(`Record at index ${idx} is missing studentId`);
      }
      const st = typeof item.status === "string" ? item.status.trim().toUpperCase() : "";
      if (st !== "PRESENT" && st !== "ABSENT") {
        errors.push(`Record for student '${item.studentId || idx}' must have status 'PRESENT' or 'ABSENT'`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates correction payload.
 */
function validateCorrection(correctionData) {
  const errors = [];
  if (!correctionData || typeof correctionData !== "object") {
    return { isValid: false, errors: ["Correction data must be an object"] };
  }

  const { studentId, subject, date, newStatus, reason } = correctionData;

  if (!studentId || typeof studentId !== "string" || studentId.trim() === "") {
    errors.push("Student ID is required");
  }
  if (!subject || typeof subject !== "string" || subject.trim() === "") {
    errors.push("Subject is required");
  }
  if (!date || !isValidDate(date)) {
    errors.push("Date must be a valid date in YYYY-MM-DD format");
  }
  const st = typeof newStatus === "string" ? newStatus.trim().toUpperCase() : "";
  if (st !== "PRESENT" && st !== "ABSENT") {
    errors.push("New status must be either 'PRESENT' or 'ABSENT'");
  }
  if (!reason || typeof reason !== "string" || reason.trim() === "") {
    errors.push("Correction reason is required for auditable records");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  isValidDate,
  validateAttendance,
  validateDuplicateAttendance,
  validateBulkAttendance,
  validateCorrection
};
