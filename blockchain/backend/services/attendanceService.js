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
   * @param {string} studentId 
   * @param {string} date 
   * @param {string} status 
   * @returns {Promise<{ transactionHash: string }>}
   */
  async markAttendance(studentId, date, status) {
    const contract = this.getContract();
    const tx = await contract.markAttendance(studentId, date, status);
    const receipt = await tx.wait();
    return {
      transactionHash: receipt.hash || tx.hash
    };
  }

  /**
   * Checks if attendance has already been recorded for a given student and date.
   * @param {string} studentId 
   * @param {string} date 
   * @returns {Promise<boolean>}
   */
  async hasAttendance(studentId, date) {
    const contract = this.getContract();
    return await contract.hasAttendance(studentId, date);
  }

  /**
   * Retrieves specific attendance record for a student on a given date.
   * @param {string} studentId 
   * @param {string} date 
   * @returns {Promise<object>}
   */
  async getAttendance(studentId, date) {
    const contract = this.getContract();
    const record = await contract.getAttendance(studentId, date);
    return {
      studentId: record.studentId,
      date: record.date,
      status: record.status,
      timestamp: record.timestamp.toString(),
      recordedBy: record.recordedBy
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
      date: record.date,
      status: record.status,
      timestamp: record.timestamp.toString(),
      recordedBy: record.recordedBy
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
}

// Export singleton instance by default, along with Class for testing flexibility
const defaultService = new AttendanceService();
defaultService.AttendanceService = AttendanceService;
module.exports = defaultService;
