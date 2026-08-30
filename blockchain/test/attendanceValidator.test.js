const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  validateAttendance,
  validateDuplicateAttendance,
  isValidDate
} = require("../validation/attendanceValidator");

describe("Attendance Input Validation Module", function () {
  describe("1. Input Data Validation (validateAttendance)", function () {
    it("Should return valid result for valid PRESENT attendance data", function () {
      const data = {
        studentId: "STU1001",
        date: "2026-08-30",
        status: "PRESENT"
      };
      const result = validateAttendance(data);
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.an("array").that.is.empty;
    });

    it("Should return valid result for valid ABSENT attendance data", function () {
      const data = {
        studentId: "STU1002",
        date: "2026-08-30",
        status: "ABSENT"
      };
      const result = validateAttendance(data);
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.an("array").that.is.empty;
    });

    it("Should produce error when student ID is missing", function () {
      const data = {
        date: "2026-08-30",
        status: "PRESENT"
      };
      const result = validateAttendance(data);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include("Student ID is required");
    });

    it("Should produce error when student ID is empty", function () {
      const data = {
        studentId: "   ",
        date: "2026-08-30",
        status: "PRESENT"
      };
      const result = validateAttendance(data);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include("Student ID cannot be empty");
    });

    it("Should produce error when date is missing", function () {
      const data = {
        studentId: "STU1001",
        status: "PRESENT"
      };
      const result = validateAttendance(data);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include("Date is required");
    });

    it("Should produce error when date is empty", function () {
      const data = {
        studentId: "STU1001",
        date: "",
        status: "PRESENT"
      };
      const result = validateAttendance(data);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include("Date cannot be empty");
    });

    it("Should produce error when date is invalid", function () {
      const data = {
        studentId: "STU1001",
        date: "invalid-date",
        status: "PRESENT"
      };
      const result = validateAttendance(data);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include("Date must be a valid date in YYYY-MM-DD format");
    });

    it("Should produce error when attendance status is invalid", function () {
      const data = {
        studentId: "STU1001",
        date: "2026-08-30",
        status: "LATE"
      };
      const result = validateAttendance(data);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include("Attendance status must be either 'PRESENT' or 'ABSENT'");
    });

    it("Should produce error when attendance status is missing", function () {
      const data = {
        studentId: "STU1001",
        date: "2026-08-30"
      };
      const result = validateAttendance(data);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include("Attendance status is required");
    });
  });

  describe("2. Date Helper Validation (isValidDate)", function () {
    it("Should return true for valid YYYY-MM-DD date", function () {
      expect(isValidDate("2026-08-30")).to.be.true;
    });

    it("Should return false for non-existent calendar dates like 2026-02-31", function () {
      expect(isValidDate("2026-02-31")).to.be.false;
    });

    it("Should return false for malformed date string", function () {
      expect(isValidDate("30-08-2026")).to.be.false;
    });
  });

  describe("3. Duplicate Attendance Validation Helper (validateDuplicateAttendance)", function () {
    let attendanceContract;

    beforeEach(async function () {
      const Attendance = await ethers.getContractFactory("Attendance");
      attendanceContract = await Attendance.deploy();
      await attendanceContract.waitForDeployment();
    });

    it("Should return isDuplicate: false when no attendance exists on contract", async function () {
      const result = await validateDuplicateAttendance(attendanceContract, "STU1001", "2026-08-30");
      expect(result.isDuplicate).to.be.false;
      expect(result.isValid).to.be.true;
      expect(result.error).to.be.null;
    });

    it("Should return isDuplicate: true when attendance already recorded on contract", async function () {
      await attendanceContract.markAttendance("STU1001", "2026-08-30", "PRESENT");

      const result = await validateDuplicateAttendance(attendanceContract, "STU1001", "2026-08-30");
      expect(result.isDuplicate).to.be.true;
      expect(result.isValid).to.be.false;
      expect(result.error).to.equal(
        "Attendance has already been recorded for student STU1001 on date 2026-08-30"
      );
    });

    it("Should work with an array of existing records", async function () {
      const records = [
        { studentId: "STU1001", date: "2026-08-30", status: "PRESENT" }
      ];

      const dupResult = await validateDuplicateAttendance(records, "STU1001", "2026-08-30");
      expect(dupResult.isDuplicate).to.be.true;
      expect(dupResult.isValid).to.be.false;

      const cleanResult = await validateDuplicateAttendance(records, "STU1002", "2026-08-30");
      expect(cleanResult.isDuplicate).to.be.false;
      expect(cleanResult.isValid).to.be.true;
    });
  });
});
