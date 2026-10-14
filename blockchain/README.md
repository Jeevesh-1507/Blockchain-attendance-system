# Blockchain Attendance Module

This module contains the Solidity smart contract, Hardhat configuration, unit tests, and integration documentation for the **Blockchain-Based Attendance System**.

---

## Directory Structure

```
blockchain/
├── backend/
│   ├── routes/
│   │   └── attendanceRoutes.js    # REST API route handlers (/api/attendance)
│   ├── services/
│   │   └── attendanceService.js   # ethers.js smart contract service
│   └── server.js                  # Express server & static frontend host (Port 5000)
├── contracts/
│   └── Attendance.sol             # Solidity smart contract for attendance storage
├── frontend/
│   ├── css/
│   │   └── style.css              # Vanilla CSS dark glassmorphism stylesheet
│   ├── js/
│   │   └── app.js                 # Vanilla JS client interacting with Express API
│   └── index.html                 # Complete responsive UI portal
├── scripts/
│   └── deploy.js                  # Hardhat deployment script
├── test/
│   ├── Attendance.test.js         # Smart contract unit test suite
│   ├── attendanceBackend.test.js    # Backend API integration test suite
│   └── attendanceValidator.test.js  # Validation logic test suite
├── validation/
│   └── attendanceValidator.js     # Input and duplicate attendance validator
├── hardhat.config.js              # Hardhat EVM network configuration
├── package.json                   # NPM configuration, dependencies, and scripts
├── .env.example                   # Environment configuration template
└── README.md                      # Module documentation (this file)
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

## API Endpoints Reference

The Express backend exposes the following REST endpoints:

| Method | Endpoint | Description | Sample Request / Response |
|---|---|---|---|
| `GET` | `/api/attendance/count` | Total count of recorded attendance | Response: `{"success": true, "count": 2}` |
| `POST` | `/api/attendance` | Record attendance on blockchain | Body: `{"studentId": "CSE2301", "date": "2026-10-14", "status": "PRESENT"}` |
| `GET` | `/api/attendance/:studentId` | Retrieve full history for a student | Response: `{"success": true, "studentId": "...", "records": [...]}` |
| `GET` | `/api/attendance/:studentId/:date` | Retrieve single attendance record | Response: `{"success": true, "record": {...}}` |

---

## Complete Step-by-Step Windows Running Instructions

Follow these exact steps to run the application locally on Windows.

### Prerequisites

- **Node.js**: v18.x or v20.x installed. Verify with `node -v`.
- **npm**: Verify with `npm -v` (on Windows PowerShell, use `npm.cmd` if script execution policies apply).

---

### Step 1: Install Dependencies

Open Windows PowerShell or Command Prompt, navigate to the `blockchain` folder, and install dependencies:

```powershell
cd d:\Blockchain\Blockchain-attendance-system\blockchain
npm.cmd install
```

---

### Step 2: Compile the Smart Contract

Compile the Solidity smart contract (`Attendance.sol`) with Hardhat:

```powershell
npm.cmd run compile
```

---

### Step 3: Run the Automated Test Suite

Run the Mocha/Chai and Supertest test suites covering the contract, validation, and backend APIs:

```powershell
npm.cmd test
```

*Expected Result: 43 passing tests across smart contract, backend API, and validation modules.*

---

### Step 4: Start the Local Hardhat Blockchain Node

In a **separate dedicated terminal window**, start the local EVM blockchain node:

```powershell
cd d:\Blockchain\Blockchain-attendance-system\blockchain
npx.cmd hardhat node
```

*The node will launch at `http://127.0.0.1:8545` and generate 20 pre-funded test accounts with 10,000 ETH each.*

---

### Step 5: Deploy the Smart Contract to Localhost

In your **primary terminal window**, run the deployment script targeting the running node:

```powershell
cd d:\Blockchain\Blockchain-attendance-system\blockchain
npm.cmd run deploy:local
```

*Expected output:*
```
Starting deployment of Attendance smart contract...
Deploying from account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Attendance contract deployed successfully!
Contract Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

---

### Step 6: Configure the Environment Variables

Create or update `blockchain/.env` with the deployed contract address and Hardhat test account private key:

```ini
# Blockchain Network RPC URL
RPC_URL=http://127.0.0.1:8545

# Deployed Attendance Smart Contract Address from Step 5
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3

# Private Key of Authorized Account (Hardhat Account #0 default)
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Express Server Port
PORT=5000
```

---

### Step 7: Start the Express Backend Server

Start the Express application:

```powershell
cd d:\Blockchain\Blockchain-attendance-system\blockchain
npm.cmd start
```

*Expected output:*
```
Backend API server running on port 5000
```

---

### Step 8: Open the Frontend Application

Open your browser and navigate to:

`http://localhost:5000`

The portal provides:
- **System Dashboard**: Live attendance record count and on-chain connection verification.
- **Record Attendance**: Form to record attendance with duplicate protection and real transaction hashes.
- **Student History**: Chronological audit trail, attendance percentage, and status breakdown.
- **Find Record**: Single record lookup with verified on-chain signer details.

---

## Important Notice on Local Blockchain Resets

The local Hardhat node (`npx hardhat node`) runs entirely in memory:
- If you terminate or restart the Hardhat node, all blocks and contract states are reset to 0.
- When restarting the node, you must **re-run Step 5** (`npm.cmd run deploy:local`) and ensure the new `CONTRACT_ADDRESS` is updated in your `blockchain/.env` file.
- Restart the Express backend (`npm.cmd start`) to pick up the updated contract.

---

## Troubleshooting Common Windows Issues

1. **PowerShell Script Execution Restriction (`UnauthorizedAccess` / `npm.ps1 cannot be loaded`)**:
   - Cause: Windows execution policy blocks `.ps1` scripts by default.
   - Solution: Use `npm.cmd` and `npx.cmd` instead of `npm` and `npx`, or run in Command Prompt (`cmd.exe`).
2. **Error: `connect ECONNREFUSED 127.0.0.1:8545`**:
   - Cause: The Hardhat local node is not running.
   - Solution: Ensure Step 4 is running in its own terminal window before starting the backend.
3. **Error: `No attendance record found` (404)**:
   - Expected behavior when searching for a student and date that has not yet been marked.
4. **Port 5000 Already in Use**:
   - Change `PORT=5001` in `blockchain/.env` and access `http://localhost:5001`.
