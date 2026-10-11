const { expect } = require("chai");
const { ethers } = require("hardhat");
const request = require("supertest");
const app = require("../backend/server");
const attendanceService = require("../backend/services/attendanceService");

describe("Backend API Unit & Integration Tests", function () {
  let attendanceContract;

  beforeEach(async function () {
    // Deploy a fresh smart contract instance for each test
    const Attendance = await ethers.getContractFactory("Attendance");
    attendanceContract = await Attendance.deploy();
    await attendanceContract.waitForDeployment();

    // Attach contract instance to attendanceService
    attendanceService.setContract(attendanceContract);
  });

  describe("1. POST /api/attendance - Valid Attendance Request", function () {
    it("Should record valid attendance successfully and return transaction hash", async function () {
      const res = await request(app)
        .post("/api/attendance")
        .send({
          studentId: "S101",
          date: "2026-08-30",
          status: "PRESENT"
        });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.message).to.equal("Attendance recorded successfully");
      expect(res.body.transactionHash).to.be.a("string").that.is.not.empty;

      const exists = await attendanceContract.hasAttendance("S101", "2026-08-30");
      expect(exists).to.be.true;
    });

    it("Should accept 'Present' case-insensitively and store attendance", async function () {
      const res = await request(app)
        .post("/api/attendance")
        .send({
          studentId: "S102",
          date: "2026-08-30",
          status: "Present"
        });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
    });
  });

  describe("2. POST /api/attendance - Missing Student ID", function () {
    it("Should reject request when studentId is missing", async function () {
      const res = await request(app)
        .post("/api/attendance")
        .send({
          date: "2026-08-30",
          status: "PRESENT"
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Validation failed");
      expect(res.body.errors).to.include("Student ID is required");
    });
  });

  describe("3. POST /api/attendance - Missing Date", function () {
    it("Should reject request when date is missing", async function () {
      const res = await request(app)
        .post("/api/attendance")
        .send({
          studentId: "S101",
          status: "PRESENT"
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Validation failed");
      expect(res.body.errors).to.include("Date is required");
    });
  });

  describe("4. POST /api/attendance - Missing Status", function () {
    it("Should reject request when status is missing", async function () {
      const res = await request(app)
        .post("/api/attendance")
        .send({
          studentId: "S101",
          date: "2026-08-30"
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Validation failed");
      expect(res.body.errors).to.include("Attendance status is required");
    });
  });

  describe("5. POST /api/attendance - Invalid Date", function () {
    it("Should reject request when date format is invalid", async function () {
      const res = await request(app)
        .post("/api/attendance")
        .send({
          studentId: "S101",
          date: "30-08-2026",
          status: "PRESENT"
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.errors).to.include("Date must be a valid date in YYYY-MM-DD format");
    });
  });

  describe("6. POST /api/attendance - Invalid Status", function () {
    it("Should reject request when status is invalid", async function () {
      const res = await request(app)
        .post("/api/attendance")
        .send({
          studentId: "S101",
          date: "2026-08-30",
          status: "HOLIDAY"
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.errors).to.include("Attendance status must be either 'PRESENT' or 'ABSENT'");
    });
  });

  describe("7. POST /api/attendance - Duplicate Attendance Prevention", function () {
    it("Should reject duplicate attendance submission for same student and date", async function () {
      // First submission
      await request(app)
        .post("/api/attendance")
        .send({
          studentId: "S101",
          date: "2026-08-30",
          status: "PRESENT"
        });

      // Second submission
      const res = await request(app)
        .post("/api/attendance")
        .send({
          studentId: "S101",
          date: "2026-08-30",
          status: "ABSENT"
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.contain("Attendance has already been recorded");
    });
  });

  describe("8. GET /api/attendance/:studentId - Student Attendance History", function () {
    it("Should return attendance history for student with records", async function () {
      await attendanceContract.markAttendance("S101", "2026-08-01", "Present");
      await attendanceContract.markAttendance("S101", "2026-08-02", "Absent");

      const res = await request(app).get("/api/attendance/S101");

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.studentId).to.equal("S101");
      expect(res.body.records).to.be.an("array").with.lengthOf(2);
      expect(res.body.records[0].date).to.equal("2026-08-01");
      expect(res.body.records[1].date).to.equal("2026-08-02");
    });

    it("Should return empty records array when student has no history", async function () {
      const res = await request(app).get("/api/attendance/S999");

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.studentId).to.equal("S999");
      expect(res.body.records).to.be.an("array").that.is.empty;
    });
  });

  describe("9. GET /api/attendance/:studentId/:date - Specific Attendance Retrieval", function () {
    it("Should return record details for existing attendance", async function () {
      await attendanceContract.markAttendance("S101", "2026-08-30", "Present");

      const res = await request(app).get("/api/attendance/S101/2026-08-30");

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.record.studentId).to.equal("S101");
      expect(res.body.record.date).to.equal("2026-08-30");
      expect(res.body.record.status).to.equal("Present");
    });

    it("Should return 404 when querying non-existent attendance record", async function () {
      const res = await request(app).get("/api/attendance/S101/2026-08-30");

      expect(res.status).to.equal(404);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.contain("No attendance record found");
    });
  });

  describe("10. GET /api/attendance/count - Total Attendance Count", function () {
    it("Should return accurate total count of attendance records", async function () {
      await attendanceContract.markAttendance("S101", "2026-08-30", "Present");
      await attendanceContract.markAttendance("S102", "2026-08-30", "Present");
      await attendanceContract.markAttendance("S103", "2026-08-30", "Absent");

      const res = await request(app).get("/api/attendance/count");

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.count).to.equal(3);
    });
  });

  describe("11. Invalid Route Error Handling", function () {
    it("Should return 404 JSON for unknown API endpoint", async function () {
      const res = await request(app).get("/api/unknown-endpoint");

      expect(res.status).to.equal(404);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.contain("Route not found");
    });
  });

  describe("12. Server & Blockchain Error Handling", function () {
    it("Should catch internal errors and return 500 JSON response", async function () {
      // Temporarily inject error throwing method into service
      const originalMethod = attendanceService.getStudentAttendanceHistory;
      attendanceService.getStudentAttendanceHistory = async () => {
        throw new Error("Simulated blockchain node RPC timeout");
      };

      const res = await request(app).get("/api/attendance/S101");

      // Restore original method
      attendanceService.getStudentAttendanceHistory = originalMethod;

      expect(res.status).to.equal(500);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Simulated blockchain node RPC timeout");
    });
  });
});
