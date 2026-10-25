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
      const subject = "General";
      const date = "2026-08-30";
      const status = "Present";
      const teacherId = "TCH-001";

      await expect(
        attendance.connect(teacher).markAttendance(studentId, subject, date, status, teacherId)
      ).to.not.be.reverted;

      expect(await attendance.hasAttendance(studentId, subject, date)).to.be.true;
      expect(await attendance.getTotalAttendanceCount()).to.equal(1);
    });
  });

  describe("2. Correct storage/retrieval of attendance", function () {
    it("Should correctly store and retrieve attendance details", async function () {
      const studentId = "STU1002";
      const subject = "General";
      const date = "2026-08-30";
      const status = "Present";
      const teacherId = "TCH-001";

      await attendance.connect(teacher).markAttendance(studentId, subject, date, status, teacherId);

      const record = await attendance.getAttendance(studentId, subject, date);
      expect(record.studentId).to.equal(studentId);
      expect(record.subject).to.equal(subject);
      expect(record.date).to.equal(date);
      expect(record.status).to.equal(status);
      expect(record.teacherId).to.equal(teacherId);
      expect(record.recordedBy).to.equal(teacher.address);
      expect(record.timestamp).to.be.gt(0);
    });

    it("Should retrieve student attendance history accurately", async function () {
      const studentId = "STU1003";
      await attendance.connect(teacher).markAttendance(studentId, "General", "2026-08-01", "Present", "TCH-001");
      await attendance.connect(teacher).markAttendance(studentId, "General", "2026-08-02", "Absent", "TCH-001");
      await attendance.connect(teacher).markAttendance(studentId, "General", "2026-08-03", "Late", "TCH-001");

      const history = await attendance.getStudentAttendanceHistory(studentId);
      expect(history.length).to.equal(3);
      expect(history[0].status).to.equal("Present");
      expect(history[1].status).to.equal("Absent");
      expect(history[2].status).to.equal("Late");
    });
  });

  describe("3. Prevention of duplicate attendance for the same student, subject, and date", function () {
    it("Should revert when marking attendance twice for the same student on the same date", async function () {
      const studentId = "STU1004";
      const subject = "General";
      const date = "2026-08-30";
      const status = "Present";

      await attendance.connect(teacher).markAttendance(studentId, subject, date, status, "TCH-001");

      await expect(
        attendance.connect(teacher).markAttendance(studentId, subject, date, "Absent", "TCH-001")
      ).to.be.revertedWith("Attendance already recorded for this student on this date");
    });

    it("Should allow marking attendance for different dates for the same student", async function () {
      const studentId = "STU1004";
      await attendance.connect(teacher).markAttendance(studentId, "General", "2026-08-30", "Present", "TCH-001");
      await expect(
        attendance.connect(teacher).markAttendance(studentId, "General", "2026-08-31", "Present", "TCH-001")
      ).to.not.be.reverted;
    });

    it("Should allow marking attendance for different students on the same date", async function () {
      const date = "2026-08-30";
      await attendance.connect(teacher).markAttendance("STU1005", "General", date, "Present", "TCH-001");
      await expect(
        attendance.connect(teacher).markAttendance("STU1006", "General", date, "Present", "TCH-001")
      ).to.not.be.reverted;
    });
  });

  describe("4. Correct handling of attendance status", function () {
    it("Should support different attendance statuses ('Present', 'Absent', 'Late')", async function () {
      const date = "2026-08-30";

      await attendance.connect(teacher).markAttendance("STU2001", "General", date, "Present", "TCH-001");
      await attendance.connect(teacher).markAttendance("STU2002", "General", date, "Absent", "TCH-001");
      await attendance.connect(teacher).markAttendance("STU2003", "General", date, "Late", "TCH-001");

      const rec1 = await attendance.getAttendance("STU2001", "General", date);
      const rec2 = await attendance.getAttendance("STU2002", "General", date);
      const rec3 = await attendance.getAttendance("STU2003", "General", date);

      expect(rec1.status).to.equal("Present");
      expect(rec2.status).to.equal("Absent");
      expect(rec3.status).to.equal("Late");
    });
  });

  describe("5. Event emission when attendance is recorded", function () {
    it("Should emit AttendanceMarked event with correct arguments", async function () {
      const studentId = "STU3001";
      const subject = "General";
      const date = "2026-08-30";
      const status = "Present";
      const teacherId = "TCH-001";

      await expect(
        attendance.connect(teacher).markAttendance(studentId, subject, date, status, teacherId)
      )
        .to.emit(attendance, "AttendanceMarked")
        .withArgs(studentId, subject, date, status, (val) => val > 0n, teacher.address, teacherId);
    });
  });

  describe("6. Rejection of invalid attendance requests", function () {
    it("Should revert if student ID is empty", async function () {
      await expect(
        attendance.connect(teacher).markAttendance("", "General", "2026-08-30", "Present", "TCH-001")
      ).to.be.revertedWith("Student ID cannot be empty");
    });

    it("Should revert if date is empty", async function () {
      await expect(
        attendance.connect(teacher).markAttendance("STU4001", "General", "", "Present", "TCH-001")
      ).to.be.revertedWith("Date cannot be empty");
    });

    it("Should revert if status is empty", async function () {
      await expect(
        attendance.connect(teacher).markAttendance("STU4001", "General", "2026-08-30", "", "TCH-001")
      ).to.be.revertedWith("Attendance status cannot be empty");
    });

    it("Should revert if subject is empty", async function () {
      await expect(
        attendance.connect(teacher).markAttendance("STU4001", "", "2026-08-30", "Present", "TCH-001")
      ).to.be.revertedWith("Subject cannot be empty");
    });

    it("Should revert if teacher ID is empty", async function () {
      await expect(
        attendance.connect(teacher).markAttendance("STU4001", "General", "2026-08-30", "Present", "")
      ).to.be.revertedWith("Teacher ID cannot be empty");
    });

    it("Should revert when querying attendance for a non-existent record", async function () {
      await expect(
        attendance.getAttendance("STU9999", "General", "2026-08-30")
      ).to.be.revertedWith("No attendance record found for this student, subject, and date");
    });
  });

  describe("7. Subject-Wise Attendance & Teacher Attribution", function () {
    it("Should allow marking attendance with specific subject and teacher ID", async function () {
      const studentId = "CSE0917";
      const subject = "Java Programming";
      const date = "2026-10-25";
      const status = "PRESENT";
      const teacherId = "TCH-001";

      await expect(
        attendance.connect(teacher).markAttendance(studentId, subject, date, status, teacherId)
      )
        .to.emit(attendance, "AttendanceMarked")
        .withArgs(studentId, subject, date, status, (val) => val > 0n, teacher.address, teacherId);

      const hasRec = await attendance.hasAttendance(studentId, subject, date);
      expect(hasRec).to.be.true;

      const record = await attendance.getAttendance(studentId, subject, date);
      expect(record.studentId).to.equal(studentId);
      expect(record.subject).to.equal(subject);
      expect(record.date).to.equal(date);
      expect(record.status).to.equal(status);
      expect(record.teacherId).to.equal(teacherId);
      expect(record.recordedBy).to.equal(teacher.address);
    });

    it("Should allow the same student to have different subjects on the same date", async function () {
      const studentId = "CSE0917";
      const date = "2026-10-25";

      // Mark Java Programming as PRESENT
      await attendance.connect(teacher).markAttendance(
        studentId,
        "Java Programming",
        date,
        "PRESENT",
        "TCH-001"
      );

      // Mark Database Management Systems as ABSENT on the same date - must be permitted!
      await expect(
        attendance.connect(teacher).markAttendance(
          studentId,
          "Database Management Systems",
          date,
          "ABSENT",
          "TCH-002"
        )
      ).to.not.be.reverted;

      const javaRec = await attendance.getAttendance(studentId, "Java Programming", date);
      const dbmsRec = await attendance.getAttendance(studentId, "Database Management Systems", date);

      expect(javaRec.status).to.equal("PRESENT");
      expect(dbmsRec.status).to.equal("ABSENT");
      expect(javaRec.teacherId).to.equal("TCH-001");
      expect(dbmsRec.teacherId).to.equal("TCH-002");
    });

    it("Should prevent duplicate attendance for the same student, subject, and date", async function () {
      const studentId = "CSE0917";
      const subject = "Computer Networks";
      const date = "2026-10-25";

      await attendance.connect(teacher).markAttendance(
        studentId,
        subject,
        date,
        "PRESENT",
        "TCH-001"
      );

      await expect(
        attendance.connect(teacher).markAttendance(
          studentId,
          subject,
          date,
          "ABSENT",
          "TCH-001"
        )
      ).to.be.revertedWith("Attendance already recorded for this student, subject, and date");
    });

    it("Should retrieve subject-specific history accurately", async function () {
      const subject = "Java Programming";
      await attendance.connect(teacher).markAttendance("CSE101", subject, "2026-10-20", "PRESENT", "TCH-001");
      await attendance.connect(teacher).markAttendance("CSE102", subject, "2026-10-20", "ABSENT", "TCH-001");
      await attendance.connect(teacher).markAttendance("CSE103", "Database Management Systems", "2026-10-20", "PRESENT", "TCH-002");

      const javaHistory = await attendance.getSubjectAttendanceHistory(subject);
      expect(javaHistory.length).to.equal(2);
      expect(javaHistory[0].studentId).to.equal("CSE101");
      expect(javaHistory[1].studentId).to.equal("CSE102");
    });
  });

  describe("8. Attendance Corrections Audit Trail", function () {
    it("Should allow authorized correction and preserve audit history", async function () {
      const studentId = "CSE0917";
      const subject = "Java Programming";
      const date = "2026-10-25";

      // Initial attendance marked as ABSENT
      await attendance.connect(teacher).markAttendance(
        studentId,
        subject,
        date,
        "ABSENT",
        "TCH-001"
      );

      // Submit explicit correction with reason
      await expect(
        attendance.connect(teacher).recordCorrection(
          studentId,
          subject,
          date,
          "PRESENT",
          "Student arrived with official lab permit",
          "TCH-001"
        )
      )
        .to.emit(attendance, "AttendanceCorrected")
        .withArgs(
          studentId,
          subject,
          date,
          "ABSENT",
          "PRESENT",
          "Student arrived with official lab permit",
          (val) => val > 0n,
          teacher.address,
          "TCH-001"
        );

      // Verify active record reflects corrected status
      const updatedRecord = await attendance.getAttendance(studentId, subject, date);
      expect(updatedRecord.status).to.equal("PRESENT");

      // Verify corrections audit trail is stored
      const corrections = await attendance.getCorrections(studentId, subject, date);
      expect(corrections.length).to.equal(1);
      expect(corrections[0].previousStatus).to.equal("ABSENT");
      expect(corrections[0].newStatus).to.equal("PRESENT");
      expect(corrections[0].reason).to.equal("Student arrived with official lab permit");
      expect(corrections[0].teacherId).to.equal("TCH-001");
    });
  });
});
