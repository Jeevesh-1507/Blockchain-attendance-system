// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Attendance
 * @dev Smart contract for managing student attendance on the blockchain.
 * Provides immutable storage, duplicate prevention per student per date,
 * and event notifications when attendance is recorded.
 */
contract Attendance {
    // Structure to represent an attendance record
    struct AttendanceRecord {
        string studentId;
        string date;
        string status;
        uint256 timestamp;
        address recordedBy;
    }

    // Mapping from unique key (keccak256(studentId + date)) to AttendanceRecord
    mapping(bytes32 => AttendanceRecord) private _records;

    // Mapping to track if attendance has already been marked (unique key => bool)
    mapping(bytes32 => bool) private _isRecorded;

    // Array of unique record keys for global lookup/enumeration
    bytes32[] private _recordKeys;

    // Mapping from studentId to an array of their record keys for history retrieval
    mapping(string => bytes32[]) private _studentRecords;

    // Event emitted when attendance is successfully recorded
    event AttendanceMarked(
        string studentId,
        string date,
        string status,
        uint256 timestamp,
        address recordedBy
    );

    /**
     * @dev Generates a unique hash key for a student ID and date combination.
     * @param studentId The unique identifier of the student.
     * @param date The date string (e.g., "YYYY-MM-DD").
     * @return bytes32 Unique hash key.
     */
    function generateRecordKey(string memory studentId, string memory date) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(studentId, date));
    }

    /**
     * @dev Marks attendance for a student on a specific date.
     * @param studentId The unique identifier of the student.
     * @param date The date string (e.g., "YYYY-MM-DD").
     * @param status The attendance status (e.g., "Present", "Absent", "Late").
     */
    function markAttendance(
        string memory studentId,
        string memory date,
        string memory status
    ) public {
        // Input Validations
        require(bytes(studentId).length > 0, "Student ID cannot be empty");
        require(bytes(date).length > 0, "Date cannot be empty");
        require(bytes(status).length > 0, "Attendance status cannot be empty");

        // Generate unique key for student and date
        bytes32 recordKey = generateRecordKey(studentId, date);

        // Duplicate Prevention Check
        require(!_isRecorded[recordKey], "Attendance already recorded for this student on this date");

        // Record attendance
        AttendanceRecord memory record = AttendanceRecord({
            studentId: studentId,
            date: date,
            status: status,
            timestamp: block.timestamp,
            recordedBy: msg.sender
        });

        _records[recordKey] = record;
        _isRecorded[recordKey] = true;
        _recordKeys.push(recordKey);
        _studentRecords[studentId].push(recordKey);

        // Emit Event
        emit AttendanceMarked(
            studentId,
            date,
            status,
            block.timestamp,
            msg.sender
        );
    }

    /**
     * @dev Checks if attendance has been recorded for a given student and date.
     * @param studentId The unique identifier of the student.
     * @param date The date string.
     * @return bool True if attendance exists, false otherwise.
     */
    function hasAttendance(string memory studentId, string memory date) public view returns (bool) {
        bytes32 recordKey = generateRecordKey(studentId, date);
        return _isRecorded[recordKey];
    }

    /**
     * @dev Retrieves attendance details for a specific student on a specific date.
     * @param studentId The unique identifier of the student.
     * @param date The date string.
     * @return record The AttendanceRecord struct.
     */
    function getAttendance(
        string memory studentId,
        string memory date
    ) public view returns (AttendanceRecord memory record) {
        bytes32 recordKey = generateRecordKey(studentId, date);
        require(_isRecorded[recordKey], "No attendance record found for this student on this date");
        return _records[recordKey];
    }

    /**
     * @dev Retrieves all attendance records for a specific student.
     * @param studentId The unique identifier of the student.
     * @return AttendanceRecord[] Array of attendance records.
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
     * @dev Returns the total number of attendance records stored in the contract.
     * @return uint256 Total count of records.
     */
    function getTotalAttendanceCount() public view returns (uint256) {
        return _recordKeys.length;
    }
}
