/**
 * Attendance Input Validation Module
 * 
 * Provides utility functions to validate attendance input data
 * and check for duplicate attendance entries before smart contract submission.
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
 * Validates attendance input data.
 * 
 * Checks:
 * - studentId: must exist and must not be empty
 * - date: must exist and must be a valid date (YYYY-MM-DD)
 * - status: must exist and must be either "PRESENT" or "ABSENT"
 * 
 * @param {object} attendanceData Object containing studentId, date, and status
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

  const { studentId, date, status } = attendanceData;

  // 1. Student ID Validation
  if (studentId === undefined || studentId === null) {
    errors.push("Student ID is required");
  } else if (typeof studentId !== "string" || studentId.trim() === "") {
    errors.push("Student ID cannot be empty");
  }

  // 2. Date Validation
  if (date === undefined || date === null) {
    errors.push("Date is required");
  } else if (typeof date !== "string" || date.trim() === "") {
    errors.push("Date cannot be empty");
  } else if (!isValidDate(date)) {
    errors.push("Date must be a valid date in YYYY-MM-DD format");
  }

  // 3. Status Validation
  const validStatuses = ["PRESENT", "ABSENT"];
  if (status === undefined || status === null) {
    errors.push("Attendance status is required");
  } else if (typeof status !== "string" || status.trim() === "") {
    errors.push("Attendance status cannot be empty");
  } else if (!validStatuses.includes(status.trim())) {
    errors.push("Attendance status must be either 'PRESENT' or 'ABSENT'");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Helper function to check if attendance has already been recorded for a student on a given date.
 * 
 * @param {object|Array} contractOrRecords Smart contract instance or array of record objects
 * @param {string} studentId Unique student identifier
 * @param {string} date Date string (e.g. YYYY-MM-DD)
 * @returns {Promise<{ isDuplicate: boolean, isValid: boolean, error: string|null }>}
 */
async function validateDuplicateAttendance(contractOrRecords, studentId, date) {
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
      (record) => record.studentId === studentId && record.date === date
    );
  } else if (contractOrRecords && typeof contractOrRecords.hasAttendance === "function") {
    isRecorded = await contractOrRecords.hasAttendance(studentId, date);
  } else {
    throw new Error("First argument must be a smart contract instance or an array of records");
  }

  if (isRecorded) {
    return {
      isDuplicate: true,
      isValid: false,
      error: `Attendance has already been recorded for student ${studentId} on date ${date}`
    };
  }

  return {
    isDuplicate: false,
    isValid: true,
    error: null
  };
}

module.exports = {
  isValidDate,
  validateAttendance,
  validateDuplicateAttendance
};
