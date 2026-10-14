# Blockchain-Based Attendance System

A secure, decentralized blockchain-based student attendance management system built with Solidity, Hardhat, Express.js, ethers.js, and a responsive vanilla JavaScript frontend.

---

## Key Features

- **Tamper-Resistant Storage**: Attendance records are recorded on an EVM smart contract and cryptographically timestamped and signed.
- **Duplicate Attendance Prevention**: Employs `keccak256(abi.encodePacked(studentId, date))` lookup to prevent double-marking for the same student on the same date.
- **Auditable Student History**: Query complete chronological records with status (PRESENT/ABSENT), block timestamps, and signer wallet addresses.
- **Verified Record Lookup**: Individual record lookup by student ID and date with on-chain cryptographic verification.
- **Interactive Modern Frontend**: Responsive dark glassmorphism dashboard built with semantic HTML5, vanilla CSS, and vanilla JS. No frameworks or build steps required.

---

## Quick Start (Windows)

For full details, see [blockchain/README.md](file:///d:/Blockchain/Blockchain-attendance-system/blockchain/README.md).

### 1. Terminal 1 &mdash; Start Hardhat Blockchain Node:
```powershell
cd d:\Blockchain\Blockchain-attendance-system\blockchain
npx.cmd hardhat node
```

### 2. Terminal 2 &mdash; Deploy Contract & Start Application:
```powershell
cd d:\Blockchain\Blockchain-attendance-system\blockchain

# Compile & Run Tests (43 tests passing)
npm.cmd test

# Deploy to local node
npm.cmd run deploy:local

# Start Express Backend & Frontend Server
npm.cmd start
```

### 3. Open Application:
Navigate to [http://localhost:5000](http://localhost:5000) in your web browser.
