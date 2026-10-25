/**
 * Blockchain-Based Attendance System
 * Teacher-Authenticated Subject-Wise Attendance Management Application Logic
 * Vanilla JavaScript (No Frameworks)
 */

document.addEventListener("DOMContentLoaded", () => {
  // ====================================================
  // 1. CONFIGURATION & STATE
  // ====================================================
  const API_BASE = "/api/attendance";
  const TOKEN_KEY = "blockchain_attendance_auth_token";

  let currentUser = null;
  let bulkRosterData = []; // Array of { studentId, name, department, status }

  // ====================================================
  // 2. DOM ELEMENTS CACHE
  // ====================================================
  // Containers
  const viewLogin = document.getElementById("view-login");
  const appContainer = document.getElementById("app-authenticated-container");
  const toastContainer = document.getElementById("toast-container");

  // Login View
  const loginForm = document.getElementById("teacher-login-form");
  const loginUsername = document.getElementById("login-username");
  const loginPassword = document.getElementById("login-password");
  const loginTogglePwd = document.getElementById("login-toggle-pwd");
  const loginSubmitBtn = document.getElementById("login-submit-btn");
  const loginBtnText = document.getElementById("login-btn-text");
  const loginBtnSpinner = document.getElementById("login-btn-spinner");
  const loginAlertContainer = document.getElementById("login-alert-container");
  const loginAlertTitle = document.getElementById("login-alert-title");
  const loginAlertMsg = document.getElementById("login-alert-message");
  const loginAlertIcon = document.getElementById("login-alert-icon");
  const demoChips = document.querySelectorAll("[data-login-user]");

  // Header & Navigation
  const headerTeacherName = document.getElementById("header-teacher-name");
  const headerTeacherId = document.getElementById("header-teacher-id");
  const headerTeacherSubjects = document.getElementById("header-assigned-subjects-badge");
  const headerLogoutBtn = document.getElementById("header-logout-btn");
  const connectionBadge = document.getElementById("connection-status-badge");
  const connectionText = document.getElementById("connection-status-text");
  const navTabs = document.querySelectorAll(".nav-tab");
  const sections = document.querySelectorAll(".content-section");
  const tabAdmin = document.getElementById("tab-btn-admin");

  // Dashboard View
  const dashWelcomeName = document.getElementById("dash-welcome-name");
  const dashWelcomeRole = document.getElementById("dash-welcome-role");
  const dashWelcomeSubjectsBox = document.getElementById("dash-welcome-subjects-box");
  const dashTeacherIdVal = document.getElementById("dash-teacher-id-val");
  const totalCountVal = document.getElementById("total-count-value");
  const totalCountSpinner = document.getElementById("total-count-spinner");
  const totalCountStatus = document.getElementById("total-count-status");
  const btnQuickRecord = document.getElementById("btn-quick-record");
  const btnQuickBulk = document.getElementById("btn-quick-bulk");
  const btnQuickReport = document.getElementById("btn-quick-report");

  // Single Record Attendance
  const recordForm = document.getElementById("record-attendance-form");
  const recordSubject = document.getElementById("record-subject");
  const recordStudentId = document.getElementById("record-student-id");
  const recordDate = document.getElementById("record-date");
  const recordStatus = document.getElementById("record-status");
  const recordSubmitBtn = document.getElementById("record-submit-btn");
  const recordBtnText = document.getElementById("record-btn-text");
  const recordBtnSpinner = document.getElementById("record-btn-spinner");
  const recordAlertContainer = document.getElementById("record-alert-container");
  const recordAlertTitle = document.getElementById("record-alert-title");
  const recordAlertMsg = document.getElementById("record-alert-message");
  const recordAlertDetails = document.getElementById("record-alert-details");
  const recordAlertIcon = document.getElementById("record-alert-icon");
  const sampleStudentChips = document.querySelectorAll("[data-fill-student]");

  // Bulk Attendance
  const bulkSubject = document.getElementById("bulk-subject");
  const bulkDate = document.getElementById("bulk-date");
  const bulkLoadRosterBtn = document.getElementById("bulk-load-roster-btn");
  const bulkRosterCard = document.getElementById("bulk-roster-card");
  const bulkRosterSubjectName = document.getElementById("bulk-roster-subject-name");
  const bulkRosterCountBadge = document.getElementById("bulk-roster-count-badge");
  const bulkTableBody = document.getElementById("bulk-table-body");
  const bulkMarkAllPresentBtn = document.getElementById("bulk-mark-all-present");
  const bulkMarkAllAbsentBtn = document.getElementById("bulk-mark-all-absent");
  const bulkPresentCount = document.getElementById("bulk-present-count");
  const bulkAbsentCount = document.getElementById("bulk-absent-count");
  const bulkSubmitBtn = document.getElementById("bulk-submit-btn");
  const bulkBtnText = document.getElementById("bulk-btn-text");
  const bulkBtnSpinner = document.getElementById("bulk-btn-spinner");
  const bulkResultsCard = document.getElementById("bulk-results-card");
  const bulkResultsTbody = document.getElementById("bulk-results-tbody");
  const bulkOutcomeBadge = document.getElementById("bulk-outcome-badge");

  // Student History
  const historyForm = document.getElementById("history-search-form");
  const historyStudentId = document.getElementById("history-student-id");
  const historySubjectFilter = document.getElementById("history-subject-filter");
  const historyFetchBtn = document.getElementById("history-fetch-btn");
  const historyBtnText = document.getElementById("history-btn-text");
  const historyBtnSpinner = document.getElementById("history-btn-spinner");
  const historyStatsContainer = document.getElementById("history-stats-container");
  const historyStatStudentId = document.getElementById("history-stat-student-id");
  const historyStatTotal = document.getElementById("history-stat-total");
  const historyStatPresent = document.getElementById("history-stat-present");
  const historyStatAbsent = document.getElementById("history-stat-absent");
  const historyStatPercentage = document.getElementById("history-stat-percentage");
  const historyTableContainer = document.getElementById("history-table-container");
  const historyTableBody = document.getElementById("history-table-body");
  const historyCountBadge = document.getElementById("history-records-count-badge");
  const historyEmptyState = document.getElementById("history-empty-state");

  // Subject Reports & CSV
  const reportSubjectSelect = document.getElementById("report-subject-select");
  const reportFetchBtn = document.getElementById("report-fetch-btn");
  const reportExportCsvBtn = document.getElementById("report-export-csv-btn");
  const reportMetricsContainer = document.getElementById("report-metrics-container");
  const reportStatSessions = document.getElementById("report-stat-sessions");
  const reportStatRecords = document.getElementById("report-stat-records");
  const reportStatRate = document.getElementById("report-stat-rate");
  const reportStatBreakdown = document.getElementById("report-stat-breakdown");
  const reportTableCard = document.getElementById("report-table-card");
  const reportSubjectTitle = document.getElementById("report-subject-title");
  const reportCountBadge = document.getElementById("report-count-badge");
  const reportTableBody = document.getElementById("report-table-body");

  // Lookup Record
  const lookupForm = document.getElementById("lookup-search-form");
  const lookupStudentId = document.getElementById("lookup-student-id");
  const lookupSubject = document.getElementById("lookup-subject");
  const lookupDate = document.getElementById("lookup-date");
  const lookupSearchBtn = document.getElementById("lookup-search-btn");
  const lookupBtnText = document.getElementById("lookup-btn-text");
  const lookupBtnSpinner = document.getElementById("lookup-btn-spinner");
  const lookupAlertContainer = document.getElementById("lookup-alert-container");
  const lookupAlertTitle = document.getElementById("lookup-alert-title");
  const lookupAlertMsg = document.getElementById("lookup-alert-message");
  const lookupAlertIcon = document.getElementById("lookup-alert-icon");
  const lookupResultCard = document.getElementById("lookup-result-card");
  const lookupResStudentId = document.getElementById("lookup-res-student-id");
  const lookupResStatusBadge = document.getElementById("lookup-res-status-badge");
  const lookupResSubject = document.getElementById("lookup-res-subject");
  const lookupResDate = document.getElementById("lookup-res-date");
  const lookupResStatus = document.getElementById("lookup-res-status");
  const lookupResTeacher = document.getElementById("lookup-res-teacher");
  const lookupResTimestamp = document.getElementById("lookup-res-timestamp");
  const lookupResRecordedBy = document.getElementById("lookup-res-recorded-by");
  const lookupCopyAddressBtn = document.getElementById("lookup-copy-address-btn");

  // Admin Console
  const adminOpenCreateModal = document.getElementById("admin-open-create-modal");
  const adminTeachersCountBadge = document.getElementById("admin-teachers-count-badge");
  const adminTeachersTbody = document.getElementById("admin-teachers-tbody");
  const adminCreateModal = document.getElementById("admin-create-modal");
  const adminCloseModal = document.getElementById("admin-close-modal");
  const adminCancelModal = document.getElementById("admin-cancel-modal");
  const adminCreateTeacherForm = document.getElementById("admin-create-teacher-form");
  const adminNewId = document.getElementById("admin-new-id");
  const adminNewName = document.getElementById("admin-new-name");
  const adminNewUsername = document.getElementById("admin-new-username");
  const adminNewPassword = document.getElementById("admin-new-password");

  // ====================================================
  // 3. UTILITIES & AUTH FETCH HELPER
  // ====================================================

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  function clearSession() {
    setToken(null);
    currentUser = null;
    showLoginView();
  }

  /**
   * Authenticated fetch wrapper that attaches Bearer JWT token
   * and handles 401 unauthenticated responses cleanly.
   */
  async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = {
      ...(options.headers || {})
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      // Token is expired, invalid or revoked
      showToast("Session expired. Please log in again.", "warning");
      clearSession();
      throw new Error("Unauthorized");
    }

    return response;
  }

  function getTodayDateString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function formatTimestamp(timestampVal) {
    if (!timestampVal) return "--";
    const sec = Number(timestampVal);
    if (isNaN(sec) || sec === 0) return "--";
    const dateObj = new Date(sec * 1000);
    return dateObj.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function truncateAddress(address) {
    if (!address || typeof address !== "string") return "--";
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  async function copyToClipboard(text, label = "Item") {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      showToast(`${label} copied to clipboard!`, "success");
    } catch (err) {
      showToast("Unable to copy to clipboard", "error");
    }
  }

  function showToast(message, type = "info") {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 300);
    }, 3800);
  }

  function showAlert(container, titleEl, msgEl, detailsEl, iconEl, type, title, message, details = null) {
    if (!container) return;
    container.className = `alert-box alert-${type}`;
    container.style.display = "flex";
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;

    if (detailsEl) {
      if (details) {
        detailsEl.textContent = details;
        detailsEl.style.display = "block";
      } else {
        detailsEl.style.display = "none";
      }
    }

    if (iconEl) {
      iconEl.textContent = type === "success" ? "✓" : type === "error" ? "⚠" : "ℹ";
    }
  }

  function hideAlert(container) {
    if (container) container.style.display = "none";
  }

  // ====================================================
  // 4. AUTHENTICATION & LOGIN FLOW
  // ====================================================

  function showLoginView() {
    if (viewLogin) viewLogin.style.display = "flex";
    if (appContainer) appContainer.style.display = "none";
    if (loginPassword) loginPassword.value = "";
    hideAlert(loginAlertContainer);
  }

  function showAppView() {
    if (viewLogin) viewLogin.style.display = "none";
    if (appContainer) appContainer.style.display = "block";
    updateTeacherHeaderUI();
    fetchTotalCount();
    populateSubjectDropdowns();
  }

  async function checkExistingAuth() {
    const token = getToken();
    if (!token) {
      showLoginView();
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok && data.success && data.teacher) {
        currentUser = data.teacher;
        showAppView();
      } else {
        clearSession();
      }
    } catch (err) {
      clearSession();
    }
  }

  // Quick Demo account fill buttons
  demoChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const u = chip.getAttribute("data-login-user");
      const p = chip.getAttribute("data-login-pwd");
      if (loginUsername) loginUsername.value = u;
      if (loginPassword) loginPassword.value = p;
      if (loginSubmitBtn) loginSubmitBtn.focus();
    });
  });

  // Toggle Password Visibility
  if (loginTogglePwd && loginPassword) {
    loginTogglePwd.addEventListener("click", () => {
      const isPwd = loginPassword.type === "password";
      loginPassword.type = isPwd ? "text" : "password";
    });
  }

  // Login Form Submission
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert(loginAlertContainer);

      const username = loginUsername.value.trim();
      const password = loginPassword.value.trim();

      if (!username || !password) {
        showAlert(
          loginAlertContainer,
          loginAlertTitle,
          loginAlertMsg,
          null,
          loginAlertIcon,
          "error",
          "Login Required",
          "Please enter your Teacher ID/Username and password."
        );
        return;
      }

      loginSubmitBtn.disabled = true;
      loginBtnText.textContent = "Authenticating...";
      loginBtnSpinner.style.display = "inline-block";

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.success && data.token) {
          setToken(data.token);
          currentUser = data.teacher;
          showAppView();
          showToast(`Welcome, ${currentUser.name}! Authenticated on EVM testnet.`, "success");
        } else {
          showAlert(
            loginAlertContainer,
            loginAlertTitle,
            loginAlertMsg,
            null,
            loginAlertIcon,
            "error",
            "Authentication Failed",
            data.message || "Invalid credentials."
          );
        }
      } catch (err) {
        showAlert(
          loginAlertContainer,
          loginAlertTitle,
          loginAlertMsg,
          null,
          loginAlertIcon,
          "error",
          "Connection Error",
          "Unable to communicate with authentication server. Check that backend is running."
        );
      } finally {
        loginSubmitBtn.disabled = false;
        loginBtnText.textContent = "Sign In to Dashboard";
        loginBtnSpinner.style.display = "none";
      }
    });
  }

  // Logout Handler
  if (headerLogoutBtn) {
    headerLogoutBtn.addEventListener("click", async () => {
      try {
        await authFetch("/api/auth/logout", { method: "POST" });
      } catch (e) {
        // Ignore network failure on logout
      } finally {
        clearSession();
        showToast("Logged out successfully. Session revoked.", "info");
      }
    });
  }

  // ====================================================
  // 5. TEACHER PROFILE & SUBJECT ALLOCATION UI
  // ====================================================

  function updateTeacherHeaderUI() {
    if (!currentUser) return;

    if (headerTeacherName) headerTeacherName.textContent = currentUser.name;
    if (headerTeacherId) headerTeacherId.textContent = `(${currentUser.id})`;

    if (dashWelcomeName) dashWelcomeName.textContent = currentUser.name;
    if (dashWelcomeRole) {
      dashWelcomeRole.textContent = currentUser.role === "admin" ? "System Administrator" : "Faculty Member";
    }
    if (dashTeacherIdVal) {
      dashTeacherIdVal.textContent = `${currentUser.name} (${currentUser.id})`;
    }

    // Render assigned subject tags in Header and Welcome Banner
    if (headerTeacherSubjects) {
      headerTeacherSubjects.innerHTML = "";
      if (currentUser.assignedSubjects && currentUser.assignedSubjects.length > 0) {
        currentUser.assignedSubjects.forEach((sub) => {
          const tag = document.createElement("span");
          tag.className = "subject-tag-mini";
          tag.textContent = sub;
          headerTeacherSubjects.appendChild(tag);
        });
      }
    }

    if (dashWelcomeSubjectsBox) {
      dashWelcomeSubjectsBox.innerHTML = "";
      if (currentUser.assignedSubjects && currentUser.assignedSubjects.length > 0) {
        currentUser.assignedSubjects.forEach((sub) => {
          const pill = document.createElement("span");
          pill.className = "subject-badge-pill";
          pill.textContent = sub;
          dashWelcomeSubjectsBox.appendChild(pill);
        });
      } else if (currentUser.role === "admin") {
        const pill = document.createElement("span");
        pill.className = "subject-badge-pill";
        pill.textContent = "All Campus Subjects (Admin)";
        dashWelcomeSubjectsBox.appendChild(pill);
      }
    }

    // Show Admin tab if admin role
    if (tabAdmin) {
      tabAdmin.style.display = currentUser.role === "admin" ? "inline-flex" : "none";
    }
  }

  async function populateSubjectDropdowns() {
    if (!currentUser) return;

    try {
      const res = await authFetch("/api/subjects?myOnly=true");
      const data = await res.json();

      let subjects = [];
      if (res.ok && data.success && Array.isArray(data.subjects)) {
        subjects = data.subjects.map((s) => s.name);
      } else if (currentUser.assignedSubjects) {
        subjects = currentUser.assignedSubjects;
      }

      const dropdowns = [
        recordSubject,
        bulkSubject,
        reportSubjectSelect,
        lookupSubject
      ];

      dropdowns.forEach((dropdown) => {
        if (!dropdown) return;
        dropdown.innerHTML = "";
        subjects.forEach((sub) => {
          const opt = document.createElement("option");
          opt.value = sub;
          opt.textContent = sub;
          dropdown.appendChild(opt);
        });
      });

      // History Filter includes an "All" option
      if (historySubjectFilter) {
        historySubjectFilter.innerHTML = '<option value="">All Authorized Subjects</option>';
        subjects.forEach((sub) => {
          const opt = document.createElement("option");
          opt.value = sub;
          opt.textContent = sub;
          historySubjectFilter.appendChild(opt);
        });
      }
    } catch (e) {
      // Fallback to cached assigned subjects
      if (currentUser && currentUser.assignedSubjects) {
        [recordSubject, bulkSubject, reportSubjectSelect, lookupSubject].forEach((dd) => {
          if (!dd) return;
          dd.innerHTML = "";
          currentUser.assignedSubjects.forEach((sub) => {
            const opt = document.createElement("option");
            opt.value = sub;
            opt.textContent = sub;
            dd.appendChild(opt);
          });
        });
      }
    }
  }

  // ====================================================
  // 6. TAB NAVIGATION
  // ====================================================

  function switchTab(targetTabId) {
    navTabs.forEach((tab) => {
      const isTarget = tab.getAttribute("data-target") === targetTabId;
      tab.classList.toggle("active", isTarget);
      tab.setAttribute("aria-selected", isTarget ? "true" : "false");
    });

    sections.forEach((sec) => {
      const isTarget = sec.id === `section-${targetTabId}`;
      sec.classList.toggle("active", isTarget);
    });

    if (targetTabId === "dashboard") {
      fetchTotalCount();
    } else if (targetTabId === "admin" && currentUser && currentUser.role === "admin") {
      fetchAdminTeachers();
    }
  }

  navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-target");
      if (target) switchTab(target);
    });
  });

  if (btnQuickRecord) btnQuickRecord.addEventListener("click", () => switchTab("record"));
  if (btnQuickBulk) btnQuickBulk.addEventListener("click", () => switchTab("bulk"));
  if (btnQuickReport) btnQuickReport.addEventListener("click", () => switchTab("report"));

  // ====================================================
  // 7. SYSTEM COUNT & HEALTH STATUS
  // ====================================================

  async function fetchTotalCount() {
    if (totalCountSpinner) totalCountSpinner.style.display = "inline-block";
    if (totalCountStatus) totalCountStatus.textContent = "Querying smart contract...";

    try {
      const response = await fetch(`${API_BASE}/count`);
      const data = await response.json();

      if (response.ok && data.success) {
        const count = typeof data.count === "number" ? data.count : Number(data.count);
        if (totalCountVal) totalCountVal.textContent = count.toLocaleString();
        if (totalCountStatus) totalCountStatus.textContent = "Live on Local EVM Testnet";

        if (connectionBadge) connectionBadge.className = "status-pill status-online";
        if (connectionText) connectionText.textContent = "System Connected";
      } else {
        const errMsg = data.message || "Failed to query smart contract";
        if (totalCountVal) totalCountVal.textContent = "--";
        if (totalCountStatus) totalCountStatus.textContent = errMsg;

        if (connectionBadge) connectionBadge.className = "status-pill status-offline";
        if (connectionText) connectionText.textContent = "Blockchain Unreachable";
      }
    } catch (networkErr) {
      if (totalCountVal) totalCountVal.textContent = "--";
      if (totalCountStatus) totalCountStatus.textContent = "Backend server unreachable";

      if (connectionBadge) connectionBadge.className = "status-pill status-offline";
      if (connectionText) connectionText.textContent = "Backend Offline";
    } finally {
      if (totalCountSpinner) totalCountSpinner.style.display = "none";
    }
  }

  // Pre-fill today's date
  const todayStr = getTodayDateString();
  if (recordDate) recordDate.value = todayStr;
  if (bulkDate) bulkDate.value = todayStr;
  if (lookupDate) lookupDate.value = todayStr;

  // Sample student chips
  sampleStudentChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const sid = chip.getAttribute("data-fill-student");
      if (recordStudentId) {
        recordStudentId.value = sid;
        recordStudentId.focus();
      }
    });
  });

  // ====================================================
  // 8. RECORD SINGLE ATTENDANCE
  // ====================================================

  if (recordForm) {
    recordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert(recordAlertContainer);

      const subject = recordSubject.value.trim();
      const studentId = recordStudentId.value.trim();
      const date = recordDate.value.trim();
      const status = recordStatus.value.trim();

      if (!subject) {
        showAlert(
          recordAlertContainer,
          recordAlertTitle,
          recordAlertMsg,
          recordAlertDetails,
          recordAlertIcon,
          "error",
          "Subject Required",
          "Please select an authorized subject."
        );
        recordSubject.focus();
        return;
      }

      if (!studentId) {
        showAlert(
          recordAlertContainer,
          recordAlertTitle,
          recordAlertMsg,
          recordAlertDetails,
          recordAlertIcon,
          "error",
          "Student ID Required",
          "Please enter a Student ID."
        );
        recordStudentId.focus();
        return;
      }

      if (!date) {
        showAlert(
          recordAlertContainer,
          recordAlertTitle,
          recordAlertMsg,
          recordAlertDetails,
          recordAlertIcon,
          "error",
          "Date Required",
          "Please select a valid attendance date (YYYY-MM-DD)."
        );
        recordDate.focus();
        return;
      }

      recordSubmitBtn.disabled = true;
      recordBtnText.textContent = "Recording on Blockchain...";
      recordBtnSpinner.style.display = "inline-block";

      try {
        const response = await authFetch(API_BASE, {
          method: "POST",
          body: JSON.stringify({
            subject,
            studentId,
            date,
            status
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          const txHash = data.transactionHash || "";
          showAlert(
            recordAlertContainer,
            recordAlertTitle,
            recordAlertMsg,
            recordAlertDetails,
            recordAlertIcon,
            "success",
            "Attendance Confirmed on Blockchain!",
            `Student ${studentId} marked ${status} for '${subject}' on ${date} by ${data.teacher}.`,
            txHash ? `Transaction Hash: ${txHash}` : null
          );

          if (txHash && recordAlertDetails) {
            const copyBtn = document.createElement("button");
            copyBtn.type = "button";
            copyBtn.className = "btn btn-outline";
            copyBtn.style.marginTop = "0.5rem";
            copyBtn.style.padding = "0.25rem 0.65rem";
            copyBtn.style.fontSize = "0.75rem";
            copyBtn.textContent = "Copy Transaction Hash";
            copyBtn.addEventListener("click", () => copyToClipboard(txHash, "Transaction Hash"));
            recordAlertDetails.appendChild(copyBtn);
          }

          showToast("Attendance successfully saved to blockchain!", "success");
          fetchTotalCount();
        } else {
          let errTitle = "Submission Failed";
          let errMsg = data.message || "An unexpected error occurred.";

          if (data.errors && Array.isArray(data.errors)) {
            errMsg = data.errors.join(", ");
          }

          if (errMsg.toLowerCase().includes("already") || errMsg.toLowerCase().includes("duplicate")) {
            errTitle = "Duplicate Attendance Prevented";
          }

          showAlert(
            recordAlertContainer,
            recordAlertTitle,
            recordAlertMsg,
            recordAlertDetails,
            recordAlertIcon,
            "error",
            errTitle,
            errMsg
          );
        }
      } catch (err) {
        if (err.message !== "Unauthorized") {
          showAlert(
            recordAlertContainer,
            recordAlertTitle,
            recordAlertMsg,
            recordAlertDetails,
            recordAlertIcon,
            "error",
            "Submission Error",
            "Failed to reach blockchain service. Ensure Hardhat node and Express server are active."
          );
        }
      } finally {
        recordSubmitBtn.disabled = false;
        recordBtnText.textContent = "Submit to Blockchain Ledger";
        recordBtnSpinner.style.display = "none";
      }
    });
  }

  // ====================================================
  // 9. BULK CLASS ATTENDANCE
  // ====================================================

  function updateBulkCounts() {
    let p = 0;
    let a = 0;
    bulkRosterData.forEach((item) => {
      if (item.status === "PRESENT") p++;
      else a++;
    });
    if (bulkPresentCount) bulkPresentCount.textContent = `${p} Present`;
    if (bulkAbsentCount) bulkAbsentCount.textContent = `${a} Absent`;
  }

  function renderBulkRoster() {
    if (!bulkTableBody) return;
    bulkTableBody.innerHTML = "";

    bulkRosterData.forEach((item, index) => {
      const tr = document.createElement("tr");

      // #
      const tdIdx = document.createElement("td");
      tdIdx.textContent = index + 1;
      tr.appendChild(tdIdx);

      // Student ID
      const tdId = document.createElement("td");
      const code = document.createElement("code");
      code.className = "student-id-code";
      code.textContent = item.studentId;
      tdId.appendChild(code);
      tr.appendChild(tdId);

      // Name
      const tdName = document.createElement("td");
      tdName.textContent = item.name;
      tr.appendChild(tdName);

      // Dept
      const tdDept = document.createElement("td");
      tdDept.textContent = item.department || "Computer Science";
      tr.appendChild(tdDept);

      // Toggle Buttons
      const tdToggle = document.createElement("td");
      const toggleGroup = document.createElement("div");
      toggleGroup.className = "bulk-toggle-group";

      const btnPresent = document.createElement("button");
      btnPresent.type = "button";
      btnPresent.className = `btn-toggle-option ${item.status === "PRESENT" ? "selected-present" : ""}`;
      btnPresent.textContent = "PRESENT";

      const btnAbsent = document.createElement("button");
      btnAbsent.type = "button";
      btnAbsent.className = `btn-toggle-option ${item.status === "ABSENT" ? "selected-absent" : ""}`;
      btnAbsent.textContent = "ABSENT";

      btnPresent.addEventListener("click", () => {
        item.status = "PRESENT";
        btnPresent.className = "btn-toggle-option selected-present";
        btnAbsent.className = "btn-toggle-option";
        badgeVal.className = "badge badge-success";
        badgeVal.textContent = "PRESENT";
        updateBulkCounts();
      });

      btnAbsent.addEventListener("click", () => {
        item.status = "ABSENT";
        btnAbsent.className = "btn-toggle-option selected-absent";
        btnPresent.className = "btn-toggle-option";
        badgeVal.className = "badge badge-danger";
        badgeVal.textContent = "ABSENT";
        updateBulkCounts();
      });

      toggleGroup.appendChild(btnPresent);
      toggleGroup.appendChild(btnAbsent);
      tdToggle.appendChild(toggleGroup);
      tr.appendChild(tdToggle);

      // Current Value Badge
      const tdBadge = document.createElement("td");
      const badgeVal = document.createElement("span");
      badgeVal.className = item.status === "PRESENT" ? "badge badge-success" : "badge badge-danger";
      badgeVal.textContent = item.status;
      tdBadge.appendChild(badgeVal);
      tr.appendChild(tdBadge);

      bulkTableBody.appendChild(tr);
    });

    updateBulkCounts();
  }

  // Load Roster Button
  if (bulkLoadRosterBtn) {
    bulkLoadRosterBtn.addEventListener("click", async () => {
      const subject = bulkSubject.value;
      if (!subject) {
        showToast("Please select a subject to load roster", "warning");
        return;
      }

      bulkLoadRosterBtn.disabled = true;
      bulkLoadRosterBtn.textContent = "Loading Roster...";

      try {
        const res = await authFetch(`/api/students?subject=${encodeURIComponent(subject)}`);
        const data = await res.json();

        if (res.ok && data.success && Array.isArray(data.students)) {
          bulkRosterData = data.students.map((s) => ({
            studentId: s.id,
            name: s.name,
            department: s.department,
            status: "PRESENT" // default
          }));

          if (bulkRosterSubjectName) bulkRosterSubjectName.textContent = subject;
          if (bulkRosterCountBadge) bulkRosterCountBadge.textContent = `${bulkRosterData.length} Enrolled Students`;
          if (bulkRosterCard) bulkRosterCard.style.display = "block";
          if (bulkResultsCard) bulkResultsCard.style.display = "none";

          renderBulkRoster();
          showToast(`Loaded ${bulkRosterData.length} students for ${subject}`, "success");
        } else {
          showToast(data.message || "Failed to load student roster", "error");
        }
      } catch (err) {
        showToast("Error retrieving student roster", "error");
      } finally {
        bulkLoadRosterBtn.disabled = false;
        bulkLoadRosterBtn.textContent = "Load Student Roster";
      }
    });
  }

  if (bulkMarkAllPresentBtn) {
    bulkMarkAllPresentBtn.addEventListener("click", () => {
      bulkRosterData.forEach((item) => (item.status = "PRESENT"));
      renderBulkRoster();
    });
  }

  if (bulkMarkAllAbsentBtn) {
    bulkMarkAllAbsentBtn.addEventListener("click", () => {
      bulkRosterData.forEach((item) => (item.status = "ABSENT"));
      renderBulkRoster();
    });
  }

  // Submit Bulk Attendance
  if (bulkSubmitBtn) {
    bulkSubmitBtn.addEventListener("click", async () => {
      const subject = bulkSubject.value;
      const date = bulkDate.value;

      if (!subject || !date) {
        showToast("Please select subject and date", "warning");
        return;
      }

      if (bulkRosterData.length === 0) {
        showToast("No student records to submit", "warning");
        return;
      }

      const confirmed = window.confirm(
        `Confirm Bulk Submission:\n\nSubject: ${subject}\nDate: ${date}\nTotal Students: ${bulkRosterData.length}\n\nProceed to submit each entry to the Ethereum blockchain ledger?`
      );

      if (!confirmed) return;

      bulkSubmitBtn.disabled = true;
      bulkBtnText.textContent = "Broadcasting Transactions to Blockchain...";
      bulkBtnSpinner.style.display = "inline-block";

      try {
        const payload = {
          subject,
          date,
          records: bulkRosterData.map((s) => ({
            studentId: s.studentId,
            status: s.status
          }))
        };

        const response = await authFetch("/api/attendance/bulk", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Render outcomes
          if (bulkResultsTbody) bulkResultsTbody.innerHTML = "";
          if (bulkResultsCard) bulkResultsCard.style.display = "block";

          data.results.forEach((resItem) => {
            const tr = document.createElement("tr");

            const tdId = document.createElement("td");
            tdId.textContent = resItem.studentId;
            tr.appendChild(tdId);

            const tdStatus = document.createElement("td");
            tdStatus.innerHTML = `<span class="badge ${resItem.status === "PRESENT" ? "badge-success" : "badge-danger"}">${resItem.status}</span>`;
            tr.appendChild(tdStatus);

            const tdOutcome = document.createElement("td");
            if (resItem.success) {
              tdOutcome.innerHTML = '<span class="badge badge-success">Mined on Chain</span>';
            } else {
              tdOutcome.innerHTML = `<span class="badge badge-danger">Failed: ${resItem.error || "Duplicate prevented"}</span>`;
            }
            tr.appendChild(tdOutcome);

            const tdHash = document.createElement("td");
            if (resItem.transactionHash) {
              const hashSpan = document.createElement("code");
              hashSpan.className = "wallet-address";
              hashSpan.textContent = truncateAddress(resItem.transactionHash);
              tdHash.appendChild(hashSpan);

              const cpBtn = document.createElement("button");
              cpBtn.type = "button";
              cpBtn.className = "btn-copy";
              cpBtn.title = "Copy Transaction Hash";
              cpBtn.innerHTML = "⎘";
              cpBtn.addEventListener("click", () => copyToClipboard(resItem.transactionHash, "Transaction Hash"));
              tdHash.appendChild(cpBtn);
            } else {
              tdHash.textContent = "--";
            }
            tr.appendChild(tdHash);

            bulkResultsTbody.appendChild(tr);
          });

          if (bulkOutcomeBadge) {
            bulkOutcomeBadge.textContent = `${data.successCount} Succeeded &bull; ${data.failureCount} Failed`;
            bulkOutcomeBadge.className = data.failureCount === 0 ? "badge badge-success" : "badge badge-warning";
          }

          showToast(
            `Bulk attendance processed! ${data.successCount} recorded on blockchain.`,
            data.failureCount === 0 ? "success" : "info"
          );

          fetchTotalCount();
        } else {
          showToast(data.message || "Bulk attendance failed", "error");
        }
      } catch (err) {
        showToast("Error processing bulk attendance", "error");
      } finally {
        bulkSubmitBtn.disabled = false;
        bulkBtnText.textContent = "Submit Bulk Attendance to Blockchain";
        bulkBtnSpinner.style.display = "none";
      }
    });
  }

  // ====================================================
  // 10. STUDENT ATTENDANCE HISTORY
  // ====================================================

  if (historyForm) {
    historyForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const studentId = historyStudentId.value.trim();
      const subject = historySubjectFilter ? historySubjectFilter.value.trim() : "";

      if (!studentId) {
        showToast("Please enter a Student ID", "warning");
        historyStudentId.focus();
        return;
      }

      historyFetchBtn.disabled = true;
      historyBtnText.textContent = "Fetching...";
      historyBtnSpinner.style.display = "inline-block";

      try {
        let url = `${API_BASE}/${encodeURIComponent(studentId)}`;
        if (subject) url += `?subject=${encodeURIComponent(subject)}`;

        const res = await authFetch(url);
        const data = await res.json();

        if (res.ok && data.success) {
          const records = data.records || [];

          if (records.length === 0) {
            if (historyStatsContainer) historyStatsContainer.style.display = "none";
            if (historyTableContainer) historyTableContainer.style.display = "none";
            if (historyEmptyState) historyEmptyState.style.display = "block";
          } else {
            if (historyEmptyState) historyEmptyState.style.display = "none";

            // Stats calculation
            const total = records.length;
            const present = records.filter((r) => r.status && r.status.toUpperCase() === "PRESENT").length;
            const absent = records.filter((r) => r.status && r.status.toUpperCase() === "ABSENT").length;
            const rate = total > 0 ? Math.round((present / total) * 100) : 0;

            if (historyStatStudentId) historyStatStudentId.textContent = studentId;
            if (historyStatTotal) historyStatTotal.textContent = total;
            if (historyStatPresent) historyStatPresent.textContent = present;
            if (historyStatAbsent) historyStatAbsent.textContent = absent;
            if (historyStatPercentage) historyStatPercentage.textContent = `${rate}%`;
            if (historyStatsContainer) historyStatsContainer.style.display = "flex";

            // Render Table
            if (historyTableBody) {
              historyTableBody.innerHTML = "";
              records.forEach((rec, idx) => {
                const tr = document.createElement("tr");

                const tdIdx = document.createElement("td");
                tdIdx.textContent = idx + 1;
                tr.appendChild(tdIdx);

                const tdSid = document.createElement("td");
                tdSid.innerHTML = `<code class="student-id-code">${rec.studentId}</code>`;
                tr.appendChild(tdSid);

                const tdSub = document.createElement("td");
                tdSub.textContent = rec.subject || "General";
                tr.appendChild(tdSub);

                const tdDate = document.createElement("td");
                tdDate.textContent = rec.date;
                tr.appendChild(tdDate);

                const tdStatus = document.createElement("td");
                tdStatus.innerHTML = `<span class="badge ${rec.status.toUpperCase() === "PRESENT" ? "badge-success" : "badge-danger"}">${rec.status}</span>`;
                tr.appendChild(tdStatus);

                const tdTeacher = document.createElement("td");
                tdTeacher.textContent = rec.teacherId || "Verified Signer";
                tr.appendChild(tdTeacher);

                const tdSigner = document.createElement("td");
                tdSigner.innerHTML = `<code class="wallet-address">${truncateAddress(rec.recordedBy)}</code>`;
                tr.appendChild(tdSigner);

                const tdTime = document.createElement("td");
                tdTime.textContent = formatTimestamp(rec.timestamp);
                tr.appendChild(tdTime);

                historyTableBody.appendChild(tr);
              });
            }

            if (historyCountBadge) historyCountBadge.textContent = `${total} verified records`;
            if (historyTableContainer) historyTableContainer.style.display = "block";
          }
        } else {
          showToast(data.message || "Failed to retrieve history", "error");
        }
      } catch (err) {
        if (err.message !== "Unauthorized") {
          showToast("Error retrieving attendance history", "error");
        }
      } finally {
        historyFetchBtn.disabled = false;
        historyBtnText.textContent = "Retrieve History";
        historyBtnSpinner.style.display = "none";
      }
    });
  }

  // ====================================================
  // 11. SUBJECT REPORTS & CSV EXPORT
  // ====================================================

  if (reportFetchBtn) {
    reportFetchBtn.addEventListener("click", async () => {
      const subject = reportSubjectSelect.value;
      if (!subject) {
        showToast("Please select a subject", "warning");
        return;
      }

      reportFetchBtn.disabled = true;
      reportFetchBtn.textContent = "Loading Report...";

      try {
        const res = await authFetch(`/api/attendance/report/summary?subject=${encodeURIComponent(subject)}`);
        const data = await res.json();

        if (res.ok && data.success) {
          if (reportStatSessions) reportStatSessions.textContent = data.totalSessions;
          if (reportStatRecords) reportStatRecords.textContent = data.totalRecords;
          if (reportStatRate) reportStatRate.textContent = `${data.overallPercentage}%`;
          if (reportStatBreakdown) {
            reportStatBreakdown.textContent = `${data.presentCount} Present &bull; ${data.absentCount} Absent`;
          }
          if (reportMetricsContainer) reportMetricsContainer.style.display = "grid";

          if (reportTableBody) {
            reportTableBody.innerHTML = "";
            (data.records || []).forEach((rec, idx) => {
              const tr = document.createElement("tr");

              const tdIdx = document.createElement("td");
              tdIdx.textContent = idx + 1;
              tr.appendChild(tdIdx);

              const tdSid = document.createElement("td");
              tdSid.innerHTML = `<code class="student-id-code">${rec.studentId}</code>`;
              tr.appendChild(tdSid);

              const tdDate = document.createElement("td");
              tdDate.textContent = rec.date;
              tr.appendChild(tdDate);

              const tdStatus = document.createElement("td");
              tdStatus.innerHTML = `<span class="badge ${rec.status.toUpperCase() === "PRESENT" ? "badge-success" : "badge-danger"}">${rec.status}</span>`;
              tr.appendChild(tdStatus);

              const tdTeacher = document.createElement("td");
              tdTeacher.textContent = rec.teacherId || "--";
              tr.appendChild(tdTeacher);

              const tdSigner = document.createElement("td");
              tdSigner.innerHTML = `<code class="wallet-address">${truncateAddress(rec.recordedBy)}</code>`;
              tr.appendChild(tdSigner);

              const tdTime = document.createElement("td");
              tdTime.textContent = formatTimestamp(rec.timestamp);
              tr.appendChild(tdTime);

              reportTableBody.appendChild(tr);
            });
          }

          if (reportSubjectTitle) reportSubjectTitle.textContent = subject;
          if (reportCountBadge) reportCountBadge.textContent = `${data.totalRecords} records`;
          if (reportTableCard) reportTableCard.style.display = "block";

          showToast(`Report generated for ${subject}`, "success");
        } else {
          showToast(data.message || "Failed to generate report", "error");
        }
      } catch (err) {
        showToast("Error generating report", "error");
      } finally {
        reportFetchBtn.disabled = false;
        reportFetchBtn.textContent = "Generate Report";
      }
    });
  }

  // CSV Export Download
  if (reportExportCsvBtn) {
    reportExportCsvBtn.addEventListener("click", async () => {
      const subject = reportSubjectSelect.value;
      const token = getToken();

      try {
        const url = `/api/attendance/export/csv${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = downloadUrl;
          a.download = `attendance_${subject || "all"}_${Date.now()}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(downloadUrl);
          document.body.removeChild(a);
          showToast("CSV report downloaded successfully!", "success");
        } else {
          showToast("Failed to export CSV report", "error");
        }
      } catch (err) {
        showToast("Error downloading CSV", "error");
      }
    });
  }

  // ====================================================
  // 12. FIND INDIVIDUAL ON-CHAIN RECORD
  // ====================================================

  if (lookupForm) {
    lookupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert(lookupAlertContainer);
      if (lookupResultCard) lookupResultCard.style.display = "none";

      const studentId = lookupStudentId.value.trim();
      const subject = lookupSubject.value.trim();
      const date = lookupDate.value.trim();

      if (!studentId || !date) {
        showToast("Student ID and Date are required", "warning");
        return;
      }

      lookupSearchBtn.disabled = true;
      lookupBtnText.textContent = "Verifying...";
      lookupBtnSpinner.style.display = "inline-block";

      try {
        let url = `${API_BASE}/${encodeURIComponent(studentId)}/${encodeURIComponent(date)}`;
        if (subject) url += `?subject=${encodeURIComponent(subject)}`;

        const res = await authFetch(url);
        const data = await res.json();

        if (res.ok && data.success && data.record) {
          const rec = data.record;

          if (lookupResStudentId) lookupResStudentId.textContent = rec.studentId;
          if (lookupResSubject) lookupResSubject.textContent = rec.subject || "General";
          if (lookupResDate) lookupResDate.textContent = rec.date;
          if (lookupResStatus) lookupResStatus.textContent = rec.status;
          if (lookupResTeacher) lookupResTeacher.textContent = rec.teacherId || "--";
          if (lookupResTimestamp) lookupResTimestamp.textContent = formatTimestamp(rec.timestamp);
          if (lookupResRecordedBy) lookupResRecordedBy.textContent = rec.recordedBy || "--";

          if (lookupResStatusBadge) {
            lookupResStatusBadge.innerHTML = `<span class="badge ${rec.status.toUpperCase() === "PRESENT" ? "badge-success" : "badge-danger"}">${rec.status}</span>`;
          }

          if (lookupResultCard) lookupResultCard.style.display = "block";
          showToast("On-chain record verified successfully!", "success");
        } else {
          showAlert(
            lookupAlertContainer,
            lookupAlertTitle,
            lookupAlertMsg,
            null,
            lookupAlertIcon,
            "error",
            "Record Not Found",
            data.message || `No verified attendance record found for student ${studentId} on ${date}.`
          );
        }
      } catch (err) {
        if (err.message !== "Unauthorized") {
          showAlert(
            lookupAlertContainer,
            lookupAlertTitle,
            lookupAlertMsg,
            null,
            lookupAlertIcon,
            "error",
            "Verification Failed",
            "Failed to query blockchain record. Verify network connection."
          );
        }
      } finally {
        lookupSearchBtn.disabled = false;
        lookupBtnText.textContent = "Verify Record";
        lookupBtnSpinner.style.display = "none";
      }
    });
  }

  if (lookupCopyAddressBtn && lookupResRecordedBy) {
    lookupCopyAddressBtn.addEventListener("click", () => {
      copyToClipboard(lookupResRecordedBy.textContent, "Signer Address");
    });
  }

  // ====================================================
  // 13. ADMINISTRATOR CONSOLE
  // ====================================================

  async function fetchAdminTeachers() {
    if (!adminTeachersTbody) return;

    try {
      const res = await authFetch("/api/admin/teachers");
      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.teachers)) {
        if (adminTeachersCountBadge) adminTeachersCountBadge.textContent = `${data.teachers.length} Accounts`;
        adminTeachersTbody.innerHTML = "";

        data.teachers.forEach((tch) => {
          const tr = document.createElement("tr");

          const tdId = document.createElement("td");
          tdId.innerHTML = `<strong>${tch.id}</strong>`;
          tr.appendChild(tdId);

          const tdName = document.createElement("td");
          tdName.textContent = tch.name;
          tr.appendChild(tdName);

          const tdUser = document.createElement("td");
          tdUser.innerHTML = `<code>${tch.username}</code>`;
          tr.appendChild(tdUser);

          const tdRole = document.createElement("td");
          tdRole.innerHTML = `<span class="badge ${tch.role === "admin" ? "badge-purple" : "badge-neutral"}">${tch.role.toUpperCase()}</span>`;
          tr.appendChild(tdRole);

          const tdSubs = document.createElement("td");
          if (tch.assignedSubjects && tch.assignedSubjects.length > 0) {
            tdSubs.textContent = tch.assignedSubjects.join(", ");
          } else {
            tdSubs.innerHTML = "<span class='text-dim'>None</span>";
          }
          tr.appendChild(tdSubs);

          const tdStatus = document.createElement("td");
          tdStatus.innerHTML = `<span class="badge ${tch.isActive ? "badge-success" : "badge-danger"}">${tch.isActive ? "Active" : "Deactivated"}</span>`;
          tr.appendChild(tdStatus);

          const tdActions = document.createElement("td");
          if (tch.id !== currentUser.id && tch.isActive) {
            const deactBtn = document.createElement("button");
            deactBtn.type = "button";
            deactBtn.className = "btn btn-outline btn-sm";
            deactBtn.textContent = "Deactivate";
            deactBtn.addEventListener("click", async () => {
              const confirmDeact = window.confirm(`Deactivate teacher account '${tch.name}' (${tch.id})?`);
              if (!confirmDeact) return;
              try {
                const dRes = await authFetch(`/api/admin/teachers/${tch.id}`, { method: "DELETE" });
                if (dRes.ok) {
                  showToast(`Teacher ${tch.name} deactivated`, "info");
                  fetchAdminTeachers();
                }
              } catch (e) {
                showToast("Failed to deactivate account", "error");
              }
            });
            tdActions.appendChild(deactBtn);
          } else if (!tch.isActive) {
            const reactBtn = document.createElement("button");
            reactBtn.type = "button";
            reactBtn.className = "btn btn-secondary btn-sm";
            reactBtn.textContent = "Activate";
            reactBtn.addEventListener("click", async () => {
              try {
                const aRes = await authFetch(`/api/admin/teachers/${tch.id}`, {
                  method: "PUT",
                  body: JSON.stringify({ isActive: true })
                });
                if (aRes.ok) {
                  showToast(`Teacher ${tch.name} reactivated`, "success");
                  fetchAdminTeachers();
                }
              } catch (e) {
                showToast("Failed to activate account", "error");
              }
            });
            tdActions.appendChild(reactBtn);
          } else {
            tdActions.innerHTML = "<span class='text-dim'>Self</span>";
          }
          tr.appendChild(tdActions);

          adminTeachersTbody.appendChild(tr);
        });
      }
    } catch (err) {
      showToast("Error loading faculty accounts", "error");
    }
  }

  if (adminOpenCreateModal) {
    adminOpenCreateModal.addEventListener("click", () => {
      if (adminCreateModal) adminCreateModal.style.display = "flex";
      if (adminNewId) adminNewId.focus();
    });
  }

  function closeAdminModal() {
    if (adminCreateModal) adminCreateModal.style.display = "none";
    if (adminCreateTeacherForm) adminCreateTeacherForm.reset();
  }

  if (adminCloseModal) adminCloseModal.addEventListener("click", closeAdminModal);
  if (adminCancelModal) adminCancelModal.addEventListener("click", closeAdminModal);

  if (adminCreateTeacherForm) {
    adminCreateTeacherForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const id = adminNewId.value.trim();
      const name = adminNewName.value.trim();
      const username = adminNewUsername.value.trim();
      const password = adminNewPassword.value.trim();

      const selectedSubjects = [];
      const checkboxes = document.querySelectorAll("input[name='adminSubject']:checked");
      checkboxes.forEach((cb) => selectedSubjects.push(cb.value));

      if (!id || !name || !username || !password) {
        showToast("All fields are required", "warning");
        return;
      }

      try {
        const res = await authFetch("/api/admin/teachers", {
          method: "POST",
          body: JSON.stringify({
            id,
            name,
            username,
            password,
            role: "teacher",
            assignedSubjects: selectedSubjects
          })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          showToast(`Teacher ${name} created successfully!`, "success");
          closeAdminModal();
          fetchAdminTeachers();
        } else {
          showToast(data.message || "Failed to create teacher", "error");
        }
      } catch (err) {
        showToast("Error creating teacher account", "error");
      }
    });
  }

  // ====================================================
  // 14. INITIAL BOOT
  // ====================================================
  checkExistingAuth();
});
