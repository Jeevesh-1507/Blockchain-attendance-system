// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Attendance
 * @dev Smart contract for managing teacher-authenticated, subject-wise student attendance
 * on the Ethereum blockchain. Provides immutable storage, duplicate prevention per student
 * per subject per date, teacher attribution, and auditable correction records.
 */
contract Attendance {
    // Structure to represent an attendance record
    struct AttendanceRecord {
        string studentId;
        string subject;
        string date;
        string status;
        uint256 timestamp;
        address recordedBy; // Wallet address that signed the blockchain transaction
        string teacherId;   // Authenticated teacher identifier
    }

    // Structure to represent an auditable correction / superseding record
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

    // Mapping from unique key (keccak256(studentId + subject + date)) to AttendanceRecord
    mapping(bytes32 => AttendanceRecord) private _records;

    // Mapping to track if attendance has already been marked (unique key => bool)
    mapping(bytes32 => bool) private _isRecorded;

    // Array of unique record keys for global lookup/enumeration
    bytes32[] private _recordKeys;

    // Mapping from studentId to an array of their record keys for history retrieval
    mapping(string => bytes32[]) private _studentRecords;

    // Mapping from subject to an array of record keys for subject history retrieval
    mapping(string => bytes32[]) private _subjectRecords;

    // Mapping from unique key to array of auditable corrections
    mapping(bytes32 => AttendanceCorrection[]) private _corrections;

    // Event emitted when attendance is successfully recorded
    event AttendanceMarked(
        string studentId,
        string subject,
        string date,
        string status,
        uint256 timestamp,
        address recordedBy,
        string teacherId
    );

    // Event emitted when an attendance correction is recorded
    event AttendanceCorrected(
        string studentId,
        string subject,
        string date,
        string previousStatus,
        string newStatus,
        string reason,
        uint256 timestamp,
        address recordedBy,
        string teacherId
    );

    /**
     * @dev Generates a unique hash key for student ID, subject, and date combination.
     * @param studentId The unique identifier of the student.
     * @param subject The subject name or code.
     * @param date The date string (e.g., "YYYY-MM-DD").
     * @return bytes32 Unique hash key.
     */
    function generateRecordKey(
        string memory studentId,
        string memory subject,
        string memory date
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(studentId, subject, date));
    }

    /**
     * @dev Marks subject-wise attendance for a student on a specific date with teacher attribution.
     * @param studentId The unique identifier of the student.
     * @param subject The subject name or code.
     * @param date The date string (e.g., "YYYY-MM-DD").
     * @param status The attendance status ("PRESENT", "ABSENT", or "Present", "Absent").
     * @param teacherId The authenticated teacher identifier.
     */
    function markAttendance(
        string memory studentId,
        string memory subject,
        string memory date,
        string memory status,
        string memory teacherId
    ) public {
        // Input Validations
        require(bytes(studentId).length > 0, "Student ID cannot be empty");
        require(bytes(subject).length > 0, "Subject cannot be empty");
        require(bytes(date).length > 0, "Date cannot be empty");
        require(bytes(status).length > 0, "Attendance status cannot be empty");
        require(bytes(teacherId).length > 0, "Teacher ID cannot be empty");

        // Generate unique key for student, subject, and date
        bytes32 recordKey = generateRecordKey(studentId, subject, date);

        // Duplicate Prevention Check per student, per subject, per date
        if (keccak256(bytes(subject)) == keccak256(bytes("General"))) {
            require(!_isRecorded[recordKey], "Attendance already recorded for this student on this date");
        } else {
            require(!_isRecorded[recordKey], "Attendance already recorded for this student, subject, and date");
        }

        // Record attendance
        AttendanceRecord memory record = AttendanceRecord({
            studentId: studentId,
            subject: subject,
            date: date,
            status: status,
            timestamp: block.timestamp,
            recordedBy: msg.sender,
            teacherId: teacherId
        });

        _records[recordKey] = record;
        _isRecorded[recordKey] = true;
        _recordKeys.push(recordKey);
        _studentRecords[studentId].push(recordKey);
        _subjectRecords[subject].push(recordKey);

        // Emit Event
        emit AttendanceMarked(
            studentId,
            subject,
            date,
            status,
            block.timestamp,
            msg.sender,
            teacherId
        );
    }

    /**
     * @dev Legacy backwards-compatible overload for marking attendance with default subject "General".
     */
    function markAttendance(
        string memory studentId,
        string memory date,
        string memory status
    ) public {
        markAttendance(studentId, "General", date, status, "LEGACY_SIGNER");
    }

    /**
     * @dev Records an explicit attendance correction, preserving the original record in history.
     */
    function recordCorrection(
        string memory studentId,
        string memory subject,
        string memory date,
        string memory newStatus,
        string memory reason,
        string memory teacherId
    ) public {
        require(bytes(studentId).length > 0, "Student ID cannot be empty");
        require(bytes(subject).length > 0, "Subject cannot be empty");
        require(bytes(date).length > 0, "Date cannot be empty");
        require(bytes(newStatus).length > 0, "New status cannot be empty");
        require(bytes(reason).length > 0, "Correction reason cannot be empty");
        require(bytes(teacherId).length > 0, "Teacher ID cannot be empty");

        bytes32 recordKey = generateRecordKey(studentId, subject, date);
        require(_isRecorded[recordKey], "No attendance record found to correct");

        string memory prevStatus = _records[recordKey].status;
        require(
            keccak256(bytes(prevStatus)) != keccak256(bytes(newStatus)),
            "New status must differ from current status"
        );

        // Log correction record
        AttendanceCorrection memory correction = AttendanceCorrection({
            studentId: studentId,
            subject: subject,
            date: date,
            previousStatus: prevStatus,
            newStatus: newStatus,
            reason: reason,
            teacherId: teacherId,
            timestamp: block.timestamp,
            recordedBy: msg.sender
        });
        _corrections[recordKey].push(correction);

        // Update active status on existing record
        _records[recordKey].status = newStatus;
        _records[recordKey].timestamp = block.timestamp;

        emit AttendanceCorrected(
            studentId,
            subject,
            date,
            prevStatus,
            newStatus,
            reason,
            block.timestamp,
            msg.sender,
            teacherId
        );
    }

    /**
     * @dev Checks if attendance has been recorded for a student, subject, and date.
     */
    function hasAttendance(
        string memory studentId,
        string memory subject,
        string memory date
    ) public view returns (bool) {
        bytes32 recordKey = generateRecordKey(studentId, subject, date);
        return _isRecorded[recordKey];
    }

    /**
     * @dev Retrieves attendance details for a student, subject, and date.
     */
    function getAttendance(
        string memory studentId,
        string memory subject,
        string memory date
    ) public view returns (AttendanceRecord memory) {
        bytes32 recordKey = generateRecordKey(studentId, subject, date);
        require(_isRecorded[recordKey], "No attendance record found for this student, subject, and date");
        return _records[recordKey];
    }

    /**
     * @dev Retrieves all attendance records for a specific student across all subjects.
     */
    function getStudentAttendanceHistory(string memory studentId) public view returns (AttendanceRecord[] memory) {
        bytes32[] memory keys = _studentRecords[studentId];
        AttendanceRecord[] memory history = new AttendanceRecord[](keys.length);
        for (uint256 i = 0; i < keys.length; i++) {
            history[i] = _records[keys[i]];
        }
        return history;
    }

    /**
     * @dev Retrieves all attendance records for a specific subject.
     */
    function getSubjectAttendanceHistory(string memory subject) public view returns (AttendanceRecord[] memory) {
        bytes32[] memory keys = _subjectRecords[subject];
        AttendanceRecord[] memory history = new AttendanceRecord[](keys.length);
        for (uint256 i = 0; i < keys.length; i++) {
            history[i] = _records[keys[i]];
        }
        return history;
    }

    /**
     * @dev Retrieves all attendance records in the contract (for administrative or summary queries).
     */
    function getAllAttendanceRecords() public view returns (AttendanceRecord[] memory) {
        AttendanceRecord[] memory allRecords = new AttendanceRecord[](_recordKeys.length);
        for (uint256 i = 0; i < _recordKeys.length; i++) {
            allRecords[i] = _records[_recordKeys[i]];
        }
        return allRecords;
    }

    /**
     * @dev Returns the total number of attendance records stored in the contract.
     */
    function getTotalAttendanceCount() public view returns (uint256) {
        return _recordKeys.length;
    }

    /**
     * @dev Returns all corrections recorded for a student, subject, and date.
     */
    function getCorrections(
        string memory studentId,
        string memory subject,
        string memory date
    ) public view returns (AttendanceCorrection[] memory) {
        bytes32 recordKey = generateRecordKey(studentId, subject, date);
        return _corrections[recordKey];
    }
}
