const { ethers } = require("ethers");
const path = require("path");

class AttendanceService {
  constructor(contractInstance = null) {
    this.contract = contractInstance;
  }

  /**
   * Sets or overrides the smart contract instance (useful for testing).
   * @param {object} contract Ethers contract instance
   */
  setContract(contract) {
    this.contract = contract;
  }

  /**
   * Resolves and returns the active smart contract instance.
   * If a contract instance was manually provided, it is returned.
   * Otherwise, connects using environment variables (RPC_URL, CONTRACT_ADDRESS, PRIVATE_KEY).
   * @returns {object} Ethers contract instance
   */
  getContract() {
    if (this.contract) {
      return this.contract;
    }

    const rpcUrl = process.env.RPC_URL;
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const privateKey = process.env.PRIVATE_KEY;

    if (!rpcUrl || !contractAddress || !privateKey) {
      throw new Error(
        "Blockchain connection parameters missing. Please set RPC_URL, CONTRACT_ADDRESS, and PRIVATE_KEY in environment variables."
      );
    }

    // Load contract artifact ABI
    const artifactPath = path.join(
      __dirname,
      "../../artifacts/contracts/Attendance.sol/Attendance.json"
    );
    const contractArtifact = require(artifactPath);

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    this.contract = new ethers.Contract(
      contractAddress,
      contractArtifact.abi,
      wallet
    );

    return this.contract;
  }

  /**
   * Submits a transaction to mark attendance on the blockchain.
   * Supports both 5-arg (studentId, subject, date, status, teacherId)
   * and legacy 3-arg (studentId, date, status).
   *
   * @param {string} studentId
   * @param {string} subjectOrDate
   * @param {string} [dateOrStatus]
   * @param {string} [statusOpt]
   * @param {string} [teacherIdOpt]
   * @returns {Promise<{ transactionHash: string }>}
   */
  async markAttendance(studentId, subjectOrDate, dateOrStatus, statusOpt, teacherIdOpt) {
    const contract = this.getContract();

    let subject = "General";
    let date = subjectOrDate;
    let status = dateOrStatus;
    let teacherId = "LEGACY_SIGNER";

    if (statusOpt !== undefined) {
      // 5-arg invocation: (studentId, subject, date, status, teacherId)
      subject = subjectOrDate;
      date = dateOrStatus;
      status = statusOpt;
      teacherId = teacherIdOpt || "UNKNOWN_TEACHER";
    }

    const tx = await contract.markAttendance(
      studentId,
      subject,
      date,
      status,
      teacherId
    );
    const receipt = await tx.wait();
    return {
      transactionHash: receipt.hash || tx.hash
    };
  }

  /**
   * Submits an explicit attendance correction transaction on the blockchain.
   */
  async recordCorrection(studentId, subject, date, newStatus, reason, teacherId) {
    const contract = this.getContract();
    const tx = await contract.recordCorrection(
      studentId,
      subject,
      date,
      newStatus,
      reason,
      teacherId
    );
    const receipt = await tx.wait();
    return {
      transactionHash: receipt.hash || tx.hash
    };
  }

  /**
   * Checks if attendance has already been recorded.
   * Supports both 3-arg (studentId, subject, date) and 2-arg (studentId, date).
   */
  async hasAttendance(studentId, subjectOrDate, dateOpt) {
    const contract = this.getContract();
    let subject = "General";
    let date = subjectOrDate;

    if (dateOpt !== undefined) {
      subject = subjectOrDate;
      date = dateOpt;
    }

    return await contract.hasAttendance(studentId, subject, date);
  }

  /**
   * Retrieves specific attendance record for a student, subject, and date.
   * Supports both 3-arg (studentId, subject, date) and 2-arg (studentId, date).
   */
  async getAttendance(studentId, subjectOrDate, dateOpt) {
    const contract = this.getContract();
    let subject = "General";
    let date = subjectOrDate;

    if (dateOpt !== undefined) {
      subject = subjectOrDate;
      date = dateOpt;
    }

    const record = await contract.getAttendance(studentId, subject, date);
    return {
      studentId: record.studentId,
      subject: record.subject,
      date: record.date,
      status: record.status,
      timestamp: record.timestamp.toString(),
      recordedBy: record.recordedBy,
      teacherId: record.teacherId
    };
  }

  /**
   * Retrieves all attendance history for a given student.
   * @param {string} studentId
   * @returns {Promise<Array<object>>}
   */
  async getStudentAttendanceHistory(studentId) {
    const contract = this.getContract();
    const records = await contract.getStudentAttendanceHistory(studentId);
    return records.map((record) => ({
      studentId: record.studentId,
      subject: record.subject,
      date: record.date,
      status: record.status,
      timestamp: record.timestamp.toString(),
      recordedBy: record.recordedBy,
      teacherId: record.teacherId
    }));
  }

  /**
   * Retrieves all attendance history for a given subject.
   */
  async getSubjectAttendanceHistory(subject) {
    const contract = this.getContract();
    const records = await contract.getSubjectAttendanceHistory(subject);
    return records.map((record) => ({
      studentId: record.studentId,
      subject: record.subject,
      date: record.date,
      status: record.status,
      timestamp: record.timestamp.toString(),
      recordedBy: record.recordedBy,
      teacherId: record.teacherId
    }));
  }

  /**
   * Retrieves all attendance records stored across the smart contract.
   */
  async getAllAttendanceRecords() {
    const contract = this.getContract();
    const records = await contract.getAllAttendanceRecords();
    return records.map((record) => ({
      studentId: record.studentId,
      subject: record.subject,
      date: record.date,
      status: record.status,
      timestamp: record.timestamp.toString(),
      recordedBy: record.recordedBy,
      teacherId: record.teacherId
    }));
  }

  /**
   * Retrieves the total count of attendance records stored in the smart contract.
   * @returns {Promise<number>}
   */
  async getTotalAttendanceCount() {
    const contract = this.getContract();
    const count = await contract.getTotalAttendanceCount();
    return Number(count);
  }

  /**
   * Retrieves audit corrections for a record.
   */
  async getCorrections(studentId, subject, date) {
    const contract = this.getContract();
    const corrections = await contract.getCorrections(studentId, subject, date);
    return corrections.map((c) => ({
      studentId: c.studentId,
      subject: c.subject,
      date: c.date,
      previousStatus: c.previousStatus,
      newStatus: c.newStatus,
      reason: c.reason,
      teacherId: c.teacherId,
      timestamp: c.timestamp.toString(),
      recordedBy: c.recordedBy
    }));
  }
}

// Export singleton instance by default, along with Class for testing flexibility
const defaultService = new AttendanceService();
defaultService.AttendanceService = AttendanceService;
module.exports = defaultService;
