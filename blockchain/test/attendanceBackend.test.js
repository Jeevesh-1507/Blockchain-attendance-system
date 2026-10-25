const { expect } = require("chai");
const { ethers } = require("hardhat");
const request = require("supertest");
const app = require("../backend/server");
const attendanceService = require("../backend/services/attendanceService");
const db = require("../database");

describe("Backend API Unit & Integration Tests", function () {
  let attendanceContract;
  let teacherToken;
  let adminToken;
  let teacher2Token;

  beforeEach(async function () {
    // Reset database to clean initial state
    db.resetToDefault();

    // Deploy a fresh smart contract instance for each test
    const Attendance = await ethers.getContractFactory("Attendance");
    attendanceContract = await Attendance.deploy();
    await attendanceContract.waitForDeployment();

    // Attach contract instance to attendanceService
    attendanceService.setContract(attendanceContract);

    // Authenticate Teacher 1 (Nazneen, assigned: Blockchain Technology)
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        username: "nazneen",
        password: "TeacherPassword@123"
      });
    teacherToken = loginRes.body.token;

    // Authenticate Teacher 2 (Shakthi, assigned: Software Development)
    const login2Res = await request(app)
      .post("/api/auth/login")
      .send({
        username: "shakthi",
        password: "TeacherPassword@123"
      });
    teacher2Token = login2Res.body.token;

    // Authenticate Admin
    const adminLoginRes = await request(app)
      .post("/api/auth/login")
      .send({
        username: "admin",
        password: "AdminPassword@123"
      });
    adminToken = adminLoginRes.body.token;
  });

  describe("1. Authentication & Session Management", function () {
    it("Should successfully log in a teacher with valid credentials", async function () {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          username: "nazneen",
          password: "TeacherPassword@123"
        });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.token).to.be.a("string");
      expect(res.body.teacher.id).to.equal("TCH-001");
      expect(res.body.teacher.name).to.equal("Nazneen");
      expect(res.body.teacher.assignedSubjects).to.include("Blockchain Technology");
    });

    it("Should reject login with invalid credentials", async function () {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          username: "nazneen",
          password: "WrongPassword"
        });

      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.contain("Invalid credentials");
    });

    it("Should reject attendance submission without authentication", async function () {
      const res = await request(app)
        .post("/api/attendance")
        .send({
          studentId: "S101",
          subject: "Blockchain Technology",
          date: "2026-08-30",
          status: "PRESENT"
        });

      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.contain("Authentication required");
    });

    it("Should invalidate session token upon logout", async function () {
      // 1. Perform logout
      const logoutRes = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(logoutRes.status).to.equal(200);
      expect(logoutRes.body.success).to.be.true;

      // 2. Attempt protected operation with logged-out token
      const res = await request(app)
        .post("/api/attendance")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          studentId: "S101",
          subject: "Blockchain Technology",
          date: "2026-08-30",
          status: "PRESENT"
        });

      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.contain("Session has been invalidated");
    });
  });

  describe("2. Subject Authorization", function () {
    it("Should allow Nazneen to submit attendance for assigned subject (Blockchain Technology)", async function () {
      const res = await request(app)
        .post("/api/attendance")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          studentId: "S101",
          subject: "Blockchain Technology",
          date: "2026-08-30",
          status: "PRESENT"
        });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.subject).to.equal("Blockchain Technology");
      expect(res.body.teacher).to.contain("Nazneen");
    });

    it("Should forbid Nazneen from submitting attendance for unauthorized subject (Software Development)", async function () {
      // Nazneen is NOT assigned to Software Development
      const res = await request(app)
        .post("/api/attendance")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          studentId: "S101",
          subject: "Software Development",
          date: "2026-08-30",
          status: "PRESENT"
        });

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.contain("Forbidden: You are not authorized");
    });

    it("Should forbid Shakthi from submitting attendance for unauthorized subject (Blockchain Technology)", async function () {
      // Shakthi is NOT assigned to Blockchain Technology
      const res = await request(app)
        .post("/api/attendance")
        .set("Authorization", `Bearer ${teacher2Token}`)
        .send({
          studentId: "S101",
          subject: "Blockchain Technology",
          date: "2026-08-30",
          status: "PRESENT"
        });

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.contain("Forbidden: You are not authorized");
    });
  });

  describe("3. Valid Attendance Request & Transaction Hash", function () {
    it("Should record valid attendance successfully and return transaction hash", async function () {
      const res = await request(app)
        .post("/api/attendance")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          studentId: "S101",
          subject: "Blockchain Technology",
          date: "2026-08-30",
          status: "PRESENT"
        });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.message).to.equal("Attendance recorded successfully");
      expect(res.body.transactionHash).to.be.a("string").that.is.not.empty;

      const exists = await attendanceContract.hasAttendance("S101", "Blockchain Technology", "2026-08-30");
      expect(exists).to.be.true;
    });

    it("Should accept 'Present' case-insensitively and store attendance", async function () {
      const res = await request(app)
        .post("/api/attendance")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          studentId: "S102",
          subject: "Blockchain Technology",
          date: "2026-08-30",
          status: "Present"
        });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.status).to.equal("PRESENT");
    });
  });

  describe("4. Input Validations", function () {
    it("Should reject request when studentId is missing", async function () {
      const res = await request(app)
        .post("/api/attendance")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          subject: "Blockchain Technology",
          date: "2026-08-30",
          status: "PRESENT"
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.errors).to.include("Student ID is required");
    });

    it("Should reject request when date is missing", async function () {
      const res = await request(app)
        .post("/api/attendance")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          studentId: "S101",
          subject: "Blockchain Technology",
          status: "PRESENT"
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.errors).to.include("Date is required");
    });

    it("Should reject request when status is missing", async function () {
      const res = await request(app)
        .post("/api/attendance")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          studentId: "S101",
          subject: "Blockchain Technology",
          date: "2026-08-30"
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.errors).to.include("Attendance status is required");
    });

    it("Should reject request when date format is invalid", async function () {
      const res = await request(app)
        .post("/api/attendance")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          studentId: "S101",
          subject: "Blockchain Technology",
          date: "30-08-2026",
          status: "PRESENT"
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.errors).to.include("Date must be a valid date in YYYY-MM-DD format");
    });

    it("Should reject request when status is invalid", async function () {
      const res = await request(app)
        .post("/api/attendance")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          studentId: "S101",
          subject: "Blockchain Technology",
          date: "2026-08-30",
          status: "HOLIDAY"
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.errors).to.include("Attendance status must be either 'PRESENT' or 'ABSENT'");
    });
  });

  describe("5. Duplicate Attendance Prevention & Multi-Subject Rules", function () {
    it("Should reject duplicate attendance submission for same student, subject, and date", async function () {
      // First submission
      await request(app)
        .post("/api/attendance")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          studentId: "S101",
          subject: "Blockchain Technology",
          date: "2026-08-30",
          status: "PRESENT"
        });

      // Second submission for same student, same subject, same date
      const res = await request(app)
        .post("/api/attendance")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          studentId: "S101",
          subject: "Blockchain Technology",
          date: "2026-08-30",
          status: "ABSENT"
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.message.toLowerCase()).to.contain("already");
    });

    it("Should permit the same student to have records for different subjects on the same date", async function () {
      // Student S101 marked PRESENT in Blockchain Technology by Nazneen
      const res1 = await request(app)
        .post("/api/attendance")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          studentId: "S101",
          subject: "Blockchain Technology",
          date: "2026-10-25",
          status: "PRESENT"
        });
      expect(res1.status).to.equal(200);

      // Student S101 marked ABSENT in Software Development by Shakthi on same date
      const res2 = await request(app)
        .post("/api/attendance")
        .set("Authorization", `Bearer ${teacher2Token}`)
        .send({
          studentId: "S101",
          subject: "Software Development",
          date: "2026-10-25",
          status: "ABSENT"
        });
      expect(res2.status).to.equal(200);
      expect(res2.body.success).to.be.true;

      // Both records exist on blockchain
      const bctExists = await attendanceContract.hasAttendance("S101", "Blockchain Technology", "2026-10-25");
      const sdExists = await attendanceContract.hasAttendance("S101", "Software Development", "2026-10-25");
      expect(bctExists).to.be.true;
      expect(sdExists).to.be.true;
    });
  });

  describe("6. Bulk Attendance Recording", function () {
    it("Should process bulk attendance and report individual student outcomes", async function () {
      const bulkPayload = {
        subject: "Blockchain Technology",
        date: "2026-10-25",
        records: [
          { studentId: "CSE0917", status: "PRESENT" },
          { studentId: "CSE0918", status: "ABSENT" },
          { studentId: "CSE0919", status: "PRESENT" }
        ]
      };

      const res = await request(app)
        .post("/api/attendance/bulk")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send(bulkPayload);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.totalSubmitted).to.equal(3);
      expect(res.body.successCount).to.equal(3);
      expect(res.body.results.length).to.equal(3);
      expect(res.body.results[0].success).to.be.true;
      expect(res.body.results[0].transactionHash).to.be.a("string");
    });
  });

  describe("7. Attendance Corrections", function () {
    it("Should record explicit attendance correction with reason and teacher attribution", async function () {
      // First mark attendance
      await request(app)
        .post("/api/attendance")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          studentId: "CSE0917",
          subject: "Blockchain Technology",
          date: "2026-10-25",
          status: "ABSENT"
        });

      // Submit correction
      const correctRes = await request(app)
        .post("/api/attendance/correct")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          studentId: "CSE0917",
          subject: "Blockchain Technology",
          date: "2026-10-25",
          newStatus: "PRESENT",
          reason: "Approved medical certificate presented"
        });

      expect(correctRes.status).to.equal(200);
      expect(correctRes.body.success).to.be.true;
      expect(correctRes.body.newStatus).to.equal("PRESENT");
      expect(correctRes.body.transactionHash).to.be.a("string");
    });
  });

  describe("8. Student Attendance History & Reports", function () {
    it("Should return attendance history for student with records", async function () {
      await attendanceContract.markAttendance("S101", "Blockchain Technology", "2026-08-01", "PRESENT", "TCH-001");
      await attendanceContract.markAttendance("S101", "Blockchain Technology", "2026-08-02", "ABSENT", "TCH-001");

      const res = await request(app)
        .get("/api/attendance/S101")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.studentId).to.equal("S101");
      expect(res.body.records).to.be.an("array").with.lengthOf(2);
      expect(res.body.records[0].date).to.equal("2026-08-01");
      expect(res.body.records[1].date).to.equal("2026-08-02");
    });

    it("Should calculate subject summary report accurately", async function () {
      await attendanceContract.markAttendance("S101", "Blockchain Technology", "2026-08-01", "PRESENT", "TCH-001");
      await attendanceContract.markAttendance("S102", "Blockchain Technology", "2026-08-01", "ABSENT", "TCH-001");

      const res = await request(app)
        .get("/api/attendance/report/summary?subject=Blockchain%20Technology")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.totalRecords).to.equal(2);
      expect(res.body.presentCount).to.equal(1);
      expect(res.body.absentCount).to.equal(1);
      expect(res.body.overallPercentage).to.equal(50);
    });
  });

  describe("9. Specific Attendance Retrieval", function () {
    it("Should return record details for existing attendance", async function () {
      await attendanceContract.markAttendance("S101", "Blockchain Technology", "2026-08-30", "PRESENT", "TCH-001");

      const res = await request(app)
        .get("/api/attendance/S101/2026-08-30?subject=Blockchain%20Technology")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.record.studentId).to.equal("S101");
      expect(res.body.record.date).to.equal("2026-08-30");
      expect(res.body.record.status).to.equal("PRESENT");
    });

    it("Should return 404 when querying non-existent attendance record", async function () {
      const res = await request(app)
        .get("/api/attendance/S101/2026-08-30?subject=Blockchain%20Technology")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).to.equal(404);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.contain("No attendance record found");
    });
  });

  describe("10. Total Attendance Count & Route Errors", function () {
    it("Should return accurate total count of attendance records", async function () {
      await attendanceContract.markAttendance("S101", "Blockchain Technology", "2026-08-30", "PRESENT", "TCH-001");
      await attendanceContract.markAttendance("S102", "Blockchain Technology", "2026-08-30", "PRESENT", "TCH-001");
      await attendanceContract.markAttendance("S103", "Software Development", "2026-08-30", "ABSENT", "TCH-002");

      const res = await request(app).get("/api/attendance/count");

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.count).to.equal(3);
    });

    it("Should return 404 JSON for unknown API endpoint", async function () {
      const res = await request(app).get("/api/unknown-endpoint");

      expect(res.status).to.equal(404);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.contain("Route not found");
    });

    it("Should catch internal errors and return 500 JSON response", async function () {
      const originalMethod = attendanceService.getStudentAttendanceHistory;
      attendanceService.getStudentAttendanceHistory = async () => {
        throw new Error("Simulated blockchain node RPC timeout");
      };

      const res = await request(app)
        .get("/api/attendance/S101")
        .set("Authorization", `Bearer ${teacherToken}`);

      attendanceService.getStudentAttendanceHistory = originalMethod;

      expect(res.status).to.equal(500);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Simulated blockchain node RPC timeout");
    });
  });
});
