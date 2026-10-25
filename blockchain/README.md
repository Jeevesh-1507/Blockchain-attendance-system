# Blockchain-Based Teacher-Authenticated Attendance Management System

An academic-grade, decentralized student attendance management system upgraded to support **teacher authentication**, **subject-wise attendance**, **duplicate prevention per student/subject/date**, **bulk roster submission**, **auditable corrections**, and **cryptographic verification** on Ethereum smart contracts.

---

## 1. Project Architecture

The application adopts a layered architecture separating authentication, business authorization, database persistence, and blockchain consensus:

```
┌────────────────────────────────────────────────────────────────────────┐
│               Responsive Frontend (HTML5, Vanilla CSS, JS)             │
│   • Faculty & Admin Login Portal  • Subject Dropdown (Assigned Only)   │
│   • Single Attendance Form        • Faculty Bulk Class Attendance      │
│   • Student Chronological History • Subject-Wise Reports & CSV Export  │
│   • Verified On-Chain Lookup      • Administrator Faculty Console      │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ REST API (JSON + Bearer JWT)
┌────────────────────────────────────▼───────────────────────────────────┐
│                    Express.js Backend API Server                       │
│   • Auth Middleware (JWT Verification & Revocation Blacklist)          │
│   • Subject Authorization Guard (Enforces Assigned Subjects)           │
│   • Multi-Layer Input & Duplicate Attendance Validator                │
│   • REST Routes: /api/auth, /api/attendance, /api/subjects, etc.      │
└─────────────────┬──────────────────────────────────┬───────────────────┘
                  │                                  │
┌─────────────────▼──────────────┐  ┌────────────────▼───────────────────┐
│  Atomic Local Database Store   │  │    Ethers.js Blockchain Service    │
│  (backend/database/data/)      │  │    (backend/services/)             │
│  • Bcrypt Hashed Credentials   │  │    • Authorized Signing Wallet     │
│  • Subjects Catalog            │  │    • Nonce & Transaction Handling  │
│  • Enrolled Student Rosters    │  │    • Smart Contract ABI Interface  │
│  • Revoked Session Tokens      │  └────────────────┬───────────────────┘
└────────────────────────────────┘                   │ JSON-RPC (Port 8545)
                                    ┌────────────────▼───────────────────┐
                                    │     Hardhat Local EVM Blockchain   │
                                    │     (Chain ID: 31337)              │
                                    │  Attendance.sol Smart Contract     │
                                    │  • Immutable Record Storage        │
                                    │  • Subject-Wise Unique Key Hash    │
                                    │  • Teacher Attribution & Events    │
                                    │  • Auditable Corrections Trail     │
                                    └────────────────────────────────────┘
```

---

## 2. Directory Structure

```
blockchain/
├── backend/
│   ├── middleware/
│   │   └── authMiddleware.js      # JWT verification, revocation check, role & subject authorization
│   ├── routes/
│   │   ├── authRoutes.js          # /api/auth (login, logout with token invalidation, /me)
│   │   ├── adminRoutes.js         # /api/admin/teachers (CRUD, subject allocation, deactivation)
│   │   ├── attendanceRoutes.js    # /api/attendance (single, bulk, correct, history, reports, CSV)
│   │   ├── subjectRoutes.js       # /api/subjects (filtered by teacher assignment)
│   │   └── studentRoutes.js       # /api/students (roster queries filtered by subject)
│   ├── services/
│   │   └── attendanceService.js   # ethers.js smart contract service with teacher attribution
│   └── server.js                  # Express API server & static host (Port 5000)
├── contracts/
│   └── Attendance.sol             # Upgraded Solidity contract (subject-wise uniqueness, corrections)
├── database/
│   ├── data/                      # Persistent JSON storage (teachers, subjects, students, revoked tokens)
│   └── index.js                   # Atomic file-based database engine with auto-seeding
├── frontend/
│   ├── css/
│   │   └── style.css              # Light modern dashboard styles with academic typography
│   ├── js/
│   │   └── app.js                 # Vanilla JS client (auth state, bulk attendance, reports, lookup)
│   └── index.html                 # Complete responsive UI portal
├── scripts/
│   └── deploy.js                  # Hardhat deployment script
├── test/
│   ├── Attendance.test.js         # Smart contract unit tests (20 passing)
│   ├── attendanceBackend.test.js  # Backend integration tests with auth (24 passing)
│   └── attendanceValidator.test.js# Validator unit tests (15 passing)
├── validation/
│   └── attendanceValidator.js     # Input and duplicate attendance validator
├── hardhat.config.js              # Hardhat EVM network configuration
├── package.json                   # NPM configuration, dependencies, and scripts
├── .env.example                   # Environment configuration template
└── README.md                      # Complete module documentation (this file)
```

---

## 3. Teacher Login & Session Workflow

1. **Authentication**: Teachers and administrators submit credentials (`username`/`teacherId` and `password`) to `POST /api/auth/login`.
2. **Password Security**: Passwords are never stored in plaintext. Passwords are salted and hashed using `bcryptjs` (cost factor 10).
3. **Session Tokens**: Successful authentication generates a signed JWT token containing the teacher's ID, name, role, and assigned subjects.
4. **Endpoint Protection**: All attendance operations (`POST /api/attendance`, `POST /api/attendance/bulk`, `POST /api/attendance/correct`, student history, reports) require a valid `Authorization: Bearer <token>` header.
5. **Secure Logout**: Calling `POST /api/auth/logout` records the token in the database's revoked token registry. Revoked tokens cannot be reused even before their natural expiration.
6. **Frontend Security**: Private keys, database credentials, and password hashes are never exposed to client-side scripts.

---

## 4. Administrator Workflow & Subject Allocation

Administrators (`role: "admin"`) have access to the **Admin Console** tab:
- **View Faculty Accounts**: Real-time table of all registered teachers, their IDs, usernames, active status, and subject assignments.
- **Create Teacher Account**: Assign teacher ID, full name, username, password, and select assigned subjects (`Java Programming`, `Database Management Systems`, `Computer Networks`).
- **Update Subject Allocation**: Modify existing teacher assignments via `PUT /api/admin/teachers/:id`.
- **Account Deactivation**: Toggle teacher status between Active and Deactivated. Deactivated accounts are immediately blocked from logging in or submitting attendance.

---

## 5. Subject-Wise Attendance & Multi-Subject Rules

### The Uniqueness Rule
Attendance uniqueness is enforced per:
$$\text{Unique Key} = \text{keccak256}(\text{studentId} \parallel \text{subject} \parallel \text{date})$$

- **Duplicate Prevention**: If teacher submits attendance for `CSE0917` + `Java Programming` on `2026-10-25` more than once, it is safely rejected both at the backend validation layer and by the smart contract `require(!_isRecorded[recordKey])`.
- **Multi-Subject Permitted on Same Date**: A student *can* have different attendance records for different subjects on the exact same calendar date:
  - `CSE0917` + `Java Programming` + `2026-10-25` &rarr; `PRESENT`
  - `CSE0917` + `Database Management Systems` + `2026-10-25` &rarr; `ABSENT`
  Both records are permitted and stored independently.

---

## 6. Smart Contract Architecture (`Attendance.sol`)

The upgraded smart contract (`contracts/Attendance.sol`) provides:

```solidity
struct AttendanceRecord {
    string studentId;
    string subject;
    string date;
    string status;
    uint256 timestamp;
    address recordedBy; // Backend wallet address that signed the transaction
    string teacherId;   // Authenticated teacher identity
}

struct AttendanceCorrection {
    string studentId;
    string subject;
    string date;
    string previousStatus;
    string newStatus;
    string reason;
    string teacherId;
    uint256 timestamp;
    address recordedBy;
}
```

### Key Contract Functions:
- `markAttendance(studentId, subject, date, status, teacherId)`: Records subject-wise attendance with teacher attribution.
- `recordCorrection(studentId, subject, date, newStatus, reason, teacherId)`: Emits `AttendanceCorrected`, updates current status, and stores an auditable correction entry without destroying historical data.
- `hasAttendance(studentId, subject, date)`: View function checking if record exists.
- `getAttendance(studentId, subject, date)`: View function retrieving verified record.
- `getStudentAttendanceHistory(studentId)`: Returns all attendance records for a student across all subjects.
- `getSubjectAttendanceHistory(subject)`: Returns all attendance records for a given subject.
- `getTotalAttendanceCount()`: Returns total records on the blockchain.
- `getCorrections(studentId, subject, date)`: Returns all audit corrections for a record.

---

## 7. Transaction Signing & Teacher Identity

- **Signing Wallet**: Transactions submitted to the Ethereum testnet are signed by the authorized backend developer wallet specified by `PRIVATE_KEY` in `.env`.
- **Teacher Identity**: The authenticated teacher's verified identity (e.g., `Prof. Alan Turing (TCH-001)`) is independently extracted from the verified session token on the backend and stored in the contract's `teacherId` field and event parameters.
- **Transparency**: The UI clearly distinguishes between the **Authorized Signer Wallet** (EVM account) and the **Authenticated Teacher** who authorized the record.

---

## 8. Faculty Bulk Attendance

Teachers can record attendance for an entire class roster in a single workflow:
1. Select an authorized subject and date.
2. Click **Load Student Roster** to view enrolled students.
3. Toggle student statuses between `PRESENT` and `ABSENT` (with helper buttons "Mark All Present" / "Mark All Absent").
4. Review total present/absent summary and click **Submit Bulk Attendance**.
5. The application broadcasts transactions sequentially and renders an itemized outcome table showing transaction hashes for successful submissions and explicit reasons for any failed or duplicate entries.

---

## 9. Subject-Wise Attendance Reports & CSV Export

- **Metrics Calculated**: Total lecture sessions held (distinct class dates), total records, present count, absent count, and attendance percentage:
  $$\text{Attendance Rate} = \left(\frac{\text{Present Count}}{\text{Total Records}}\right) \times 100\%$$
- **CSV Export**: Authorized faculty and administrators can download a full CSV audit report containing: `Student ID, Subject, Date, Status, Teacher ID, Signer Address, Timestamp`.

---

## 10. Demonstration Credentials

The application includes pre-seeded demonstration accounts with hashed passwords:

| Role | Name | Teacher ID | Username | Password | Assigned Subjects |
|---|---|---|---|---|---|
| **Admin** | System Administrator | `ADMIN-001` | `admin` | `AdminPassword@123` | All Subjects (Campus Admin) |
| **Faculty** | Prof. Alan Turing | `TCH-001` | `teacher.alan` | `TeacherPassword@123` | Java Programming, Computer Networks |
| **Faculty** | Prof. Grace Hopper | `TCH-002` | `teacher.grace` | `TeacherPassword@123` | Database Management Systems |
| **Faculty** | Dr. Ada Lovelace | `TCH-003` | `teacher.ada` | `TeacherPassword@123` | Java Programming |

*Note: The login page includes one-click autofill chips for each demo account for rapid evaluation.*

---

## 11. Demonstration Student Roster

The pre-seeded student roster enrolled across subjects:
- `CSE0917`: Arjun Sharma (Java Programming, Database Management Systems, Computer Networks)
- `CSE0918`: Priya Patel (Java Programming, Database Management Systems, Computer Networks)
- `CSE0919`: Rahul Verma (Java Programming, Database Management Systems, Computer Networks)
- `CSE0920`: Sneha Rao (Java Programming, Database Management Systems)
- `CSE0921`: Vikram Malhotra (Database Management Systems, Computer Networks)

---

## 12. Local Startup Instructions

### Prerequisites
- Node.js (v18+ recommended)
- Windows PowerShell / Command Prompt / Terminal

### Step 1: Open Terminal 1 &mdash; Start Hardhat Node
```powershell
cd d:\Blockchain\Blockchain-attendance-system\blockchain
npx.cmd hardhat node
```
*Keep this terminal running.*

### Step 2: Open Terminal 2 &mdash; Deploy Smart Contract
```powershell
cd d:\Blockchain\Blockchain-attendance-system\blockchain

# Compile smart contracts
npx.cmd hardhat compile

# Deploy to local Hardhat node
npm.cmd run deploy:local
```
Copy the deployed contract address and ensure `CONTRACT_ADDRESS` in `.env` is updated (e.g., `CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3`).

### Step 3: Run Test Suite (59 Tests Passing)
```powershell
npm.cmd test
```

### Step 4: Start Express Backend & Frontend Server
```powershell
npm.cmd start
```

### Step 5: Open Application
Navigate to [http://localhost:5000](http://localhost:5000) in your web browser.

---

## 13. Known Limitations

1. **Local Testnet Ephemerality**: If the local Hardhat node process is restarted, EVM state resets to block 0. The contract must be redeployed using `npm.cmd run deploy:local`.
2. **Single Signing Wallet in Development**: All blockchain transactions are signed by the authorized development account specified in `PRIVATE_KEY`. In a full production deployment, multi-signature or individual hardware wallet signatures could be used.
3. **Sequential Bulk Transactions**: Bulk submissions are processed sequentially to avoid Ethereum account nonce collisions on the local node.
