# Blockchain Attendance Module

This module contains the Solidity smart contract, Hardhat configuration, unit tests, and integration documentation for the **Blockchain-Based Attendance System**.

---

## Directory Structure

```
blockchain/
├── contracts/
│   └── Attendance.sol        # Solidity smart contract for recording attendance
├── test/
│   └── Attendance.test.js     # Hardhat Mocha/Chai unit test suite
├── hardhat.config.js          # Hardhat framework configuration
├── package.json               # Node.js dependencies and scripts
└── README.md                  # Module documentation (this file)
```

---

## Smart Contract Overview (`Attendance.sol`)

The `Attendance.sol` contract provides an immutable, tamper-resistant store for student attendance records on an EVM-compatible blockchain.

### Data Structure (`AttendanceRecord`)
Each attendance record contains:
- **`studentId`** (`string`): Unique identifier for the student.
- **`date`** (`string`): Attendance date formatted as a string (e.g., `YYYY-MM-DD`).
- **`status`** (`string`): Status of attendance (e.g., `Present`, `Absent`, `Late`).
- **`timestamp`** (`uint256`): Ethereum block timestamp when recorded.
- **`recordedBy`** (`address`): Wallet address of the account/backend caller that submitted the transaction.

---

## Contract Functions

### State-Changing Functions

#### `markAttendance(string studentId, string date, string status)`
- **Description**: Records attendance for a student on a specific date.
- **Validations**:
  - `studentId` cannot be empty.
  - `date` cannot be empty.
  - `status` cannot be empty.
  - Reverts if attendance for `(studentId, date)` was already recorded.
- **Emits**: `AttendanceMarked` event.

---

### Read-Only (View) Functions

#### `getAttendance(string studentId, string date) returns (AttendanceRecord)`
- **Description**: Retrieves attendance record details for a specific student on a given date.
- **Reverts**: If no record exists for the given `(studentId, date)`.

#### `hasAttendance(string studentId, string date) returns (bool)`
- **Description**: Returns `true` if attendance has been recorded for the student on the specified date, `false` otherwise.

#### `getStudentAttendanceHistory(string studentId) returns (AttendanceRecord[])`
- **Description**: Returns an array of all historical attendance records for the given student.

#### `getTotalAttendanceCount() returns (uint256)`
- **Description**: Returns the total number of attendance records stored in the smart contract.

#### `generateRecordKey(string studentId, string date) returns (bytes32)`
- **Description**: Helper function generating the unique hash key `keccak256(abi.encodePacked(studentId, date))`.

---

## How Duplicate Attendance is Prevented

Duplicate attendance records for the same student on the same date are prevented using a cryptographic hash lookup:

1. A unique `bytes32` key is generated using `keccak256(abi.encodePacked(studentId, date))`.
2. A mapping `mapping(bytes32 => bool) private _isRecorded` tracks recorded entries.
3. Before storing any record, `markAttendance` checks `require(!_isRecorded[recordKey], "Attendance already recorded for this student on this date")`.
4. If a second attempt is made with the same `studentId` and `date`, the transaction immediately reverts with a descriptive error message.

---

## Events Emitted

```solidity
event AttendanceMarked(
    string studentId,
    string date,
    string status,
    uint256 timestamp,
    address recordedBy
);
```

Emitted whenever `markAttendance` completes successfully. Backend services can listen to this event to verify transaction inclusion or update application caches.

---

## Backend Integration Guide

When the backend API integrates with this smart contract, it will call the following methods (e.g., using `ethers.js` or `web3.py`):

1. **`markAttendance(studentId, date, status)`**: Triggered when a teacher/admin submits attendance.
2. **`getAttendance(studentId, date)`**: Called when querying attendance status for a student on a specific day.
3. **`hasAttendance(studentId, date)`**: Used for fast verification before attempting transaction submission.
4. **`getStudentAttendanceHistory(studentId)`**: Called to generate student attendance reports.

---

## How to Install Dependencies

Navigate to the `blockchain` directory and install the Node.js packages:

```bash
cd blockchain
npm install
```

---

## How to Run Tests

Run the Hardhat test suite to verify contract functionality:

```bash
cd blockchain
npm test
```

Or run Hardhat directly:

```bash
cd blockchain
npx hardhat test
```

To compile the smart contract without running tests:

```bash
cd blockchain
npx hardhat compile
```

---

## Assumptions & Design Decisions

1. **Date Format Flexibility**: Dates are passed as strings (e.g., `"YYYY-MM-DD"`). This allows standard formatting without needing complex timestamp calculation logic inside the contract.
2. **Flexible Status String**: Status is stored as a string (e.g., `"Present"`, `"Absent"`, `"Late"`) rather than a strict enum, allowing easy extension of status types without contract redeployment.
3. **Standalone Hardhat Setup**: Hardhat is configured in the isolated `blockchain/` folder so it doesn't conflict with root project dependencies or frontend/backend setups.
