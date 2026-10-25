const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const DATA_DIR = path.join(__dirname, "data");
const TEACHERS_FILE = path.join(DATA_DIR, "teachers.json");
const SUBJECTS_FILE = path.join(DATA_DIR, "subjects.json");
const STUDENTS_FILE = path.join(DATA_DIR, "students.json");
const REVOKED_TOKENS_FILE = path.join(DATA_DIR, "revokedTokens.json");

/**
 * Ensures data directory exists
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Safely reads a JSON file with a fallback
 */
function readJson(filePath, fallback = []) {
  try {
    ensureDataDir();
    if (!fs.existsSync(filePath)) {
      writeJson(filePath, fallback);
      return fallback;
    }
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return fallback;
  }
}

/**
 * Atomically writes JSON to a file
 */
function writeJson(filePath, data) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Initial Seeding for Local Development
 */
function initDatabase(force = false) {
  ensureDataDir();

  // 1. Seed Subjects Catalog
  if (force || !fs.existsSync(SUBJECTS_FILE)) {
    const defaultSubjects = [
      {
        id: "SUB-101",
        code: "CS301",
        name: "Blockchain Technology",
        department: "Computer Science & Engineering",
        credits: 4
      },
      {
        id: "SUB-102",
        code: "CS302",
        name: "Software Development",
        department: "Computer Science & Engineering",
        credits: 4
      },
      {
        id: "SUB-103",
        code: "CS303",
        name: "Java Programming",
        department: "Computer Science & Engineering",
        credits: 4
      },
      {
        id: "SUB-104",
        code: "CS304",
        name: "Database Management Systems",
        department: "Computer Science & Engineering",
        credits: 4
      },
      {
        id: "SUB-105",
        code: "CS305",
        name: "Computer Networks",
        department: "Computer Science & Engineering",
        credits: 4
      }
    ];
    writeJson(SUBJECTS_FILE, defaultSubjects);
  }

  // 2. Seed Teachers & Admin Accounts (Bcrypt hashed)
  if (force || !fs.existsSync(TEACHERS_FILE)) {
    const saltRounds = 10;
    const defaultPasswordHash = bcrypt.hashSync("TeacherPassword@123", saltRounds);
    const adminPasswordHash = bcrypt.hashSync("AdminPassword@123", saltRounds);

    const defaultTeachers = [
      {
        id: "ADMIN-001",
        username: "admin",
        name: "System Administrator",
        passwordHash: adminPasswordHash,
        role: "admin",
        assignedSubjects: [
          "Blockchain Technology",
          "Software Development",
          "Java Programming",
          "Database Management Systems",
          "Computer Networks"
        ],
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: "TCH-001",
        username: "nazneen",
        name: "Nazneen",
        passwordHash: defaultPasswordHash,
        role: "teacher",
        assignedSubjects: ["Blockchain Technology"],
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: "TCH-002",
        username: "shakthi",
        name: "Shakthi",
        passwordHash: defaultPasswordHash,
        role: "teacher",
        assignedSubjects: ["Software Development"],
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
    writeJson(TEACHERS_FILE, defaultTeachers);
  }

  // 3. Seed Demonstration Students Roster
  if (force || !fs.existsSync(STUDENTS_FILE)) {
    const defaultStudents = [
      {
        id: "CSE0917",
        name: "Arjun Sharma",
        department: "Computer Science",
        semester: 6,
        enrolledSubjects: [
          "Blockchain Technology",
          "Software Development",
          "Java Programming",
          "Database Management Systems",
          "Computer Networks"
        ]
      },
      {
        id: "CSE0918",
        name: "Priya Patel",
        department: "Computer Science",
        semester: 6,
        enrolledSubjects: [
          "Blockchain Technology",
          "Software Development",
          "Java Programming",
          "Database Management Systems",
          "Computer Networks"
        ]
      },
      {
        id: "CSE0919",
        name: "Rahul Verma",
        department: "Computer Science",
        semester: 6,
        enrolledSubjects: [
          "Blockchain Technology",
          "Software Development",
          "Java Programming",
          "Database Management Systems",
          "Computer Networks"
        ]
      },
      {
        id: "CSE0920",
        name: "Sneha Rao",
        department: "Computer Science",
        semester: 6,
        enrolledSubjects: [
          "Blockchain Technology",
          "Software Development",
          "Java Programming",
          "Database Management Systems"
        ]
      },
      {
        id: "CSE0921",
        name: "Vikram Malhotra",
        department: "Computer Science",
        semester: 6,
        enrolledSubjects: [
          "Blockchain Technology",
          "Software Development",
          "Database Management Systems",
          "Computer Networks"
        ]
      }
    ];
    writeJson(STUDENTS_FILE, defaultStudents);
  }

  // 4. Revoked Tokens
  if (force || !fs.existsSync(REVOKED_TOKENS_FILE)) {
    writeJson(REVOKED_TOKENS_FILE, []);
  }
}

// Auto-seed on load
initDatabase();

// --- Database Operations ---

const db = {
  // --- Teachers ---
  getAllTeachers() {
    return readJson(TEACHERS_FILE);
  },

  getTeacherById(id) {
    const teachers = readJson(TEACHERS_FILE);
    return teachers.find((t) => t.id === id) || null;
  },

  getTeacherByUsername(username) {
    const teachers = readJson(TEACHERS_FILE);
    if (!username) return null;
    const clean = username.trim().toLowerCase();
    return (
      teachers.find((t) => {
        const u = t.username.toLowerCase();
        const id = t.id.toLowerCase();
        return (
          u === clean ||
          id === clean ||
          (clean.startsWith("teacher.") && u === clean.replace("teacher.", "")) ||
          ("teacher." + u === clean)
        );
      }) || null
    );
  },

  createTeacher({ id, username, name, password, role = "teacher", assignedSubjects = [] }) {
    const teachers = readJson(TEACHERS_FILE);
    const existing = teachers.find(
      (t) =>
        t.id.toLowerCase() === id.trim().toLowerCase() ||
        t.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (existing) {
      throw new Error(`Teacher with ID '${id}' or username '${username}' already exists`);
    }

    const saltRounds = 10;
    const passwordHash = bcrypt.hashSync(password, saltRounds);

    const newTeacher = {
      id: id.trim(),
      username: username.trim(),
      name: name.trim(),
      passwordHash,
      role: role === "admin" ? "admin" : "teacher",
      assignedSubjects: Array.isArray(assignedSubjects) ? assignedSubjects : [],
      isActive: true,
      createdAt: new Date().toISOString()
    };

    teachers.push(newTeacher);
    writeJson(TEACHERS_FILE, teachers);
    return newTeacher;
  },

  updateTeacher(id, updates = {}) {
    const teachers = readJson(TEACHERS_FILE);
    const index = teachers.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Teacher '${id}' not found`);
    }

    const teacher = teachers[index];

    if (updates.name !== undefined) teacher.name = updates.name.trim();
    if (updates.assignedSubjects !== undefined) {
      teacher.assignedSubjects = Array.isArray(updates.assignedSubjects)
        ? updates.assignedSubjects
        : [];
    }
    if (updates.isActive !== undefined) teacher.isActive = Boolean(updates.isActive);
    if (updates.password) {
      teacher.passwordHash = bcrypt.hashSync(updates.password, 10);
    }
    teacher.updatedAt = new Date().toISOString();

    teachers[index] = teacher;
    writeJson(TEACHERS_FILE, teachers);
    return teacher;
  },

  // --- Subjects ---
  getAllSubjects() {
    return readJson(SUBJECTS_FILE);
  },

  getSubjectByNameOrCode(query) {
    const subjects = readJson(SUBJECTS_FILE);
    if (!query) return null;
    const q = query.trim().toLowerCase();
    return (
      subjects.find(
        (s) => s.name.toLowerCase() === q || s.code.toLowerCase() === q
      ) || null
    );
  },

  // --- Students ---
  getAllStudents() {
    return readJson(STUDENTS_FILE);
  },

  getStudentsBySubject(subjectName) {
    const students = readJson(STUDENTS_FILE);
    if (!subjectName) return students;
    return students.filter((s) =>
      Array.isArray(s.enrolledSubjects) &&
      s.enrolledSubjects.some(
        (sub) => sub.toLowerCase() === subjectName.trim().toLowerCase()
      )
    );
  },

  getStudentById(id) {
    const students = readJson(STUDENTS_FILE);
    if (!id) return null;
    return students.find((s) => s.id.toLowerCase() === id.trim().toLowerCase()) || null;
  },

  // --- Revoked Tokens (Logout Invalidation) ---
  revokeToken(token, expiresAt) {
    const tokens = readJson(REVOKED_TOKENS_FILE);
    tokens.push({ token, revokedAt: new Date().toISOString(), expiresAt });
    // Clean up expired entries
    const now = Date.now();
    const activeRevoked = tokens.filter((t) => !t.expiresAt || t.expiresAt > now);
    writeJson(REVOKED_TOKENS_FILE, activeRevoked);
  },

  isTokenRevoked(token) {
    const tokens = readJson(REVOKED_TOKENS_FILE);
    return tokens.some((t) => t.token === token);
  },

  // Reset database to initial state (useful for test isolation)
  resetToDefault() {
    initDatabase(true);
  }
};

module.exports = db;
