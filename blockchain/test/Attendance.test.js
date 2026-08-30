const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Attendance Smart Contract", function () {
  let Attendance;
  let attendance;
  let owner;
  let teacher;
  let student1;

  beforeEach(async function () {
    [owner, teacher, student1] = await ethers.getSigners();
    Attendance = await ethers.getContractFactory("Attendance");
    attendance = await Attendance.deploy();
    await attendance.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully with 0 initial records", async function () {
      expect(await attendance.getTotalAttendanceCount()).to.equal(0);
    });
  });

  describe("1. Successful attendance recording", function () {
    it("Should allow marking attendance for a student", async function () {
      const studentId = "STU1001";
      const date = "2026-08-30";
      const status = "Present";

      await expect(attendance.connect(teacher).markAttendance(studentId, date, status))
        .to.not.be.reverted;

      expect(await attendance.hasAttendance(studentId, date)).to.be.true;
      expect(await attendance.getTotalAttendanceCount()).to.equal(1);
    });
  });

  describe("2. Correct storage/retrieval of attendance", function () {
    it("Should correctly store and retrieve attendance details", async function () {
      const studentId = "STU1002";
      const date = "2026-08-30";
      const status = "Present";

      await attendance.connect(teacher).markAttendance(studentId, date, status);

      const record = await attendance.getAttendance(studentId, date);
      expect(record.studentId).to.equal(studentId);
      expect(record.date).to.equal(date);
      expect(record.status).to.equal(status);
      expect(record.recordedBy).to.equal(teacher.address);
      expect(record.timestamp).to.be.gt(0);
    });

    it("Should retrieve student attendance history accurately", async function () {
      const studentId = "STU1003";
      await attendance.connect(teacher).markAttendance(studentId, "2026-08-01", "Present");
      await attendance.connect(teacher).markAttendance(studentId, "2026-08-02", "Absent");
      await attendance.connect(teacher).markAttendance(studentId, "2026-08-03", "Late");

      const history = await attendance.getStudentAttendanceHistory(studentId);
      expect(history.length).to.equal(3);
      expect(history[0].status).to.equal("Present");
      expect(history[1].status).to.equal("Absent");
      expect(history[2].status).to.equal("Late");
    });
  });

  describe("3. Prevention of duplicate attendance for the same student and date", function () {
    it("Should revert when marking attendance twice for the same student on the same date", async function () {
      const studentId = "STU1004";
      const date = "2026-08-30";
      const status = "Present";

      await attendance.connect(teacher).markAttendance(studentId, date, status);

      await expect(
        attendance.connect(teacher).markAttendance(studentId, date, "Absent")
      ).to.be.revertedWith("Attendance already recorded for this student on this date");
    });

    it("Should allow marking attendance for different dates for the same student", async function () {
      const studentId = "STU1004";
      await attendance.connect(teacher).markAttendance(studentId, "2026-08-30", "Present");
      await expect(
        attendance.connect(teacher).markAttendance(studentId, "2026-08-31", "Present")
      ).to.not.be.reverted;
    });

    it("Should allow marking attendance for different students on the same date", async function () {
      const date = "2026-08-30";
      await attendance.connect(teacher).markAttendance("STU1005", date, "Present");
      await expect(
        attendance.connect(teacher).markAttendance("STU1006", date, "Present")
      ).to.not.be.reverted;
    });
  });

  describe("4. Correct handling of attendance status", function () {
    it("Should support different attendance statuses ('Present', 'Absent', 'Late')", async function () {
      const date = "2026-08-30";

      await attendance.connect(teacher).markAttendance("STU2001", date, "Present");
      await attendance.connect(teacher).markAttendance("STU2002", date, "Absent");
      await attendance.connect(teacher).markAttendance("STU2003", date, "Late");

      const rec1 = await attendance.getAttendance("STU2001", date);
      const rec2 = await attendance.getAttendance("STU2002", date);
      const rec3 = await attendance.getAttendance("STU2003", date);

      expect(rec1.status).to.equal("Present");
      expect(rec2.status).to.equal("Absent");
      expect(rec3.status).to.equal("Late");
    });
  });

  describe("5. Event emission when attendance is recorded", function () {
    it("Should emit AttendanceMarked event with correct arguments", async function () {
      const studentId = "STU3001";
      const date = "2026-08-30";
      const status = "Present";

      await expect(attendance.connect(teacher).markAttendance(studentId, date, status))
        .to.emit(attendance, "AttendanceMarked")
        .withArgs(studentId, date, status, (val) => val > 0n, teacher.address);
    });
  });

  describe("6. Rejection of invalid attendance requests", function () {
    it("Should revert if student ID is empty", async function () {
      await expect(
        attendance.connect(teacher).markAttendance("", "2026-08-30", "Present")
      ).to.be.revertedWith("Student ID cannot be empty");
    });

    it("Should revert if date is empty", async function () {
      await expect(
        attendance.connect(teacher).markAttendance("STU4001", "", "Present")
      ).to.be.revertedWith("Date cannot be empty");
    });

    it("Should revert if status is empty", async function () {
      await expect(
        attendance.connect(teacher).markAttendance("STU4001", "2026-08-30", "")
      ).to.be.revertedWith("Attendance status cannot be empty");
    });

    it("Should revert when querying attendance for a non-existent record", async function () {
      await expect(
        attendance.getAttendance("STU9999", "2026-08-30")
      ).to.be.revertedWith("No attendance record found for this student on this date");
    });
  });
});
