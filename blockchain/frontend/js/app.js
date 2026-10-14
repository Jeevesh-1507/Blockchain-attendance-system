/**
 * Blockchain-Based Attendance System
 * Frontend Application Logic (Vanilla JavaScript)
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Configuration - Central API Base URL
  const API_BASE = "/api/attendance";

  // 2. DOM Elements Cache
  // Header & Navigation
  const connectionBadge = document.getElementById("connection-status-badge");
  const connectionText = document.getElementById("connection-status-text");
  const headerRefreshBtn = document.getElementById("header-refresh-btn");
  const navTabs = document.querySelectorAll(".nav-tab");
  const sections = document.querySelectorAll(".content-section");
  const toastContainer = document.getElementById("toast-container");

  // Dashboard Elements
  const dashboardRefreshBtn = document.getElementById("dashboard-refresh-btn");
  const totalCountVal = document.getElementById("total-count-value");
  const totalCountSpinner = document.getElementById("total-count-spinner");
  const totalCountStatus = document.getElementById("total-count-status");
  const btnQuickRecord = document.getElementById("btn-quick-record");
  const btnQuickHistory = document.getElementById("btn-quick-history");
  const btnQuickLookup = document.getElementById("btn-quick-lookup");

  // Record Attendance Elements
  const recordForm = document.getElementById("record-attendance-form");
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
  const sampleChips = document.querySelectorAll("[data-fill-student]");

  // History Elements
  const historyForm = document.getElementById("history-search-form");
  const historyStudentId = document.getElementById("history-student-id");
  const historyFetchBtn = document.getElementById("history-fetch-btn");
  const historyBtnText = document.getElementById("history-btn-text");
  const historyBtnSpinner = document.getElementById("history-btn-spinner");
  const historyAlertContainer = document.getElementById("history-alert-container");
  const historyAlertTitle = document.getElementById("history-alert-title");
  const historyAlertMsg = document.getElementById("history-alert-message");
  const historyAlertIcon = document.getElementById("history-alert-icon");
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
  const historyEmptyTitle = document.getElementById("history-empty-title");
  const historyEmptyMsg = document.getElementById("history-empty-message");

  // Lookup Elements
  const lookupForm = document.getElementById("lookup-search-form");
  const lookupStudentId = document.getElementById("lookup-student-id");
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
  const lookupResDate = document.getElementById("lookup-res-date");
  const lookupResStatus = document.getElementById("lookup-res-status");
  const lookupResTimestamp = document.getElementById("lookup-res-timestamp");
  const lookupResRecordedBy = document.getElementById("lookup-res-recorded-by");
  const lookupCopyAddressBtn = document.getElementById("lookup-copy-address-btn");

  // 3. Helper Functions
  /**
   * Returns today's date formatted as YYYY-MM-DD
   */
  function getTodayDateString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Formats a Unix timestamp string/number into human-readable local date and time
   */
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

  /**
   * Shortens an Ethereum wallet address (e.g., 0xf39F...2266)
   */
  function truncateAddress(address) {
    if (!address || typeof address !== "string") return "--";
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  /**
   * Copies text to clipboard safely and shows feedback toast
   */
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

  /**
   * Shows a floating toast message
   */
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
    }, 3500);
  }

  /**
   * Sets alert box content safely using textContent
   */
  function showAlert(container, titleEl, msgEl, detailsEl, iconEl, type, title, message, details = null) {
    container.className = `alert-box alert-${type}`;
    container.style.display = "flex";
    titleEl.textContent = title;
    msgEl.textContent = message;

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

  /**
   * Hides an alert box
   */
  function hideAlert(container) {
    if (container) container.style.display = "none";
  }

  // 4. Tab Navigation Management
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

    // If switching to dashboard, refresh count
    if (targetTabId === "dashboard") {
      fetchTotalCount();
    }
  }

  navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-target");
      if (target) switchTab(target);
    });
  });

  // Quick Action navigation buttons
  if (btnQuickRecord) btnQuickRecord.addEventListener("click", () => switchTab("record"));
  if (btnQuickHistory) btnQuickHistory.addEventListener("click", () => switchTab("history"));
  if (btnQuickLookup) btnQuickLookup.addEventListener("click", () => switchTab("lookup"));

  // 5. System Health & Attendance Count
  async function fetchTotalCount() {
    if (totalCountSpinner) totalCountSpinner.style.display = "inline-block";
    if (totalCountStatus) totalCountStatus.textContent = "Connecting to backend & blockchain...";

    try {
      const response = await fetch(`${API_BASE}/count`);
      const data = await response.json();

      if (response.ok && data.success) {
        // Connected and count retrieved from real contract
        const count = typeof data.count === "number" ? data.count : Number(data.count);
        totalCountVal.textContent = count.toLocaleString();
        totalCountStatus.textContent = "Live on Local EVM Testnet";

        connectionBadge.className = "status-pill status-online";
        connectionText.textContent = "System Connected";
      } else {
        // Backend replied with error (e.g. contract not deployed or RPC failed)
        const errMsg = data.message || "Failed to query smart contract";
        totalCountVal.textContent = "--";
        totalCountStatus.textContent = errMsg;

        connectionBadge.className = "status-pill status-offline";
        connectionText.textContent = "Blockchain Unreachable";
      }
    } catch (networkErr) {
      // Backend is completely down
      totalCountVal.textContent = "--";
      totalCountStatus.textContent = "Backend server unreachable";

      connectionBadge.className = "status-pill status-offline";
      connectionText.textContent = "Backend Offline";
    } finally {
      if (totalCountSpinner) totalCountSpinner.style.display = "none";
    }
  }

  if (dashboardRefreshBtn) dashboardRefreshBtn.addEventListener("click", fetchTotalCount);
  if (headerRefreshBtn) {
    headerRefreshBtn.addEventListener("click", () => {
      fetchTotalCount();
      showToast("Refreshed system status", "info");
    });
  }

  // 6. Record Attendance Submission
  // Pre-fill default dates
  const todayDate = getTodayDateString();
  if (recordDate) recordDate.value = todayDate;
  if (lookupDate) lookupDate.value = todayDate;

  // Sample ID chips click
  sampleChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const sid = chip.getAttribute("data-fill-student");
      if (recordStudentId) recordStudentId.value = sid;
      recordStudentId.focus();
    });
  });

  if (recordForm) {
    recordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert(recordAlertContainer);

      const studentId = recordStudentId.value.trim();
      const date = recordDate.value.trim();
      const status = recordStatus.value.trim();

      // Client-side quick checks
      if (!studentId) {
        showAlert(
          recordAlertContainer,
          recordAlertTitle,
          recordAlertMsg,
          recordAlertDetails,
          recordAlertIcon,
          "error",
          "Validation Error",
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
          "Validation Error",
          "Please select a valid attendance date."
        );
        recordDate.focus();
        return;
      }

      // Set loading state
      recordSubmitBtn.disabled = true;
      recordBtnText.textContent = "Submitting to Blockchain...";
      recordBtnSpinner.style.display = "inline-block";

      try {
        const response = await fetch(API_BASE, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            studentId,
            date,
            status
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Success!
          const txHash = data.transactionHash || "";
          showAlert(
            recordAlertContainer,
            recordAlertTitle,
            recordAlertMsg,
            recordAlertDetails,
            recordAlertIcon,
            "success",
            "Attendance Recorded Successfully!",
            `Student ${studentId} marked ${status} on ${date}.`,
            txHash ? `Transaction Hash: ${txHash}` : null
          );

          // Add copy button next to tx hash if available
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

          showToast("Attendance successfully saved on blockchain!", "success");

          // Refresh total count in dashboard
          fetchTotalCount();
        } else {
          // Error response from backend / validation / duplicate check
          let errTitle = "Submission Failed";
          let errMsg = data.message || "An unexpected error occurred.";

          if (data.errors && Array.isArray(data.errors)) {
            errMsg = data.errors.join(", ");
          }

          if (errMsg.toLowerCase().includes("already recorded") || errMsg.toLowerCase().includes("duplicate")) {
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
      } catch (networkError) {
        showAlert(
          recordAlertContainer,
          recordAlertTitle,
          recordAlertMsg,
          recordAlertDetails,
          recordAlertIcon,
          "error",
          "Network Error",
          "Unable to connect to backend server. Ensure Express is running on port 5000."
        );
      } finally {
        recordSubmitBtn.disabled = false;
        recordBtnText.textContent = "Record Attendance on Blockchain";
        recordBtnSpinner.style.display = "none";
      }
    });
  }

  // 7. Student Attendance History
  if (historyForm) {
    historyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert(historyAlertContainer);

      const studentId = historyStudentId.value.trim();
      if (!studentId) {
        showAlert(
          historyAlertContainer,
          historyAlertTitle,
          historyAlertMsg,
          null,
          historyAlertIcon,
          "error",
          "Input Required",
          "Please enter a Student ID to view history."
        );
        historyStudentId.focus();
        return;
      }

      // Loading state
      historyFetchBtn.disabled = true;
      historyBtnText.textContent = "Fetching...";
      historyBtnSpinner.style.display = "inline-block";
      historyEmptyState.style.display = "none";
      historyTableContainer.style.display = "none";
      historyStatsContainer.style.display = "none";

      try {
        const response = await fetch(`${API_BASE}/${encodeURIComponent(studentId)}`);
        const data = await response.json();

        if (response.ok && data.success) {
          const records = data.records || [];

          if (records.length === 0) {
            // Friendly empty state (Not an error)
            historyEmptyState.style.display = "block";
            historyEmptyTitle.textContent = `No Records for "${studentId}"`;
            historyEmptyMsg.textContent = "This student currently has no attendance records stored on the blockchain.";
          } else {
            // Populate stats
            let presentCount = 0;
            let absentCount = 0;

            // Sort chronologically (ascending or descending)
            const sortedRecords = [...records].sort((a, b) => {
              return a.date.localeCompare(b.date);
            });

            // Populate table safely using DOM methods
            historyTableBody.innerHTML = ""; // Clear existing rows

            sortedRecords.forEach((record, idx) => {
              const statusUpper = (record.status || "").toUpperCase();
              if (statusUpper === "PRESENT") presentCount++;
              else absentCount++;

              const tr = document.createElement("tr");

              // Index col
              const tdIndex = document.createElement("td");
              tdIndex.textContent = String(idx + 1);
              tr.appendChild(tdIndex);

              // Student ID col
              const tdSid = document.createElement("td");
              tdSid.textContent = record.studentId || studentId;
              tr.appendChild(tdSid);

              // Date col
              const tdDate = document.createElement("td");
              tdDate.textContent = record.date || "--";
              tr.appendChild(tdDate);

              // Status col with badge
              const tdStatus = document.createElement("td");
              const statusBadge = document.createElement("span");
              statusBadge.className = `badge ${statusUpper === "PRESENT" ? "badge-present" : "badge-absent"}`;
              statusBadge.textContent = record.status || "--";
              tdStatus.appendChild(statusBadge);
              tr.appendChild(tdStatus);

              // Timestamp col
              const tdTimestamp = document.createElement("td");
              tdTimestamp.textContent = formatTimestamp(record.timestamp);
              tr.appendChild(tdTimestamp);

              // Recorded By col
              const tdRecordedBy = document.createElement("td");
              const addrBox = document.createElement("div");
              addrBox.className = "address-container";

              const addrCode = document.createElement("code");
              addrCode.className = "wallet-address";
              addrCode.textContent = truncateAddress(record.recordedBy);
              addrCode.title = record.recordedBy || "";
              addrBox.appendChild(addrCode);

              if (record.recordedBy) {
                const copyBtn = document.createElement("button");
                copyBtn.type = "button";
                copyBtn.className = "btn-copy";
                copyBtn.title = "Copy Address";
                copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
                copyBtn.addEventListener("click", () => copyToClipboard(record.recordedBy, "Signer Address"));
                addrBox.appendChild(copyBtn);
              }

              tdRecordedBy.appendChild(addrBox);
              tr.appendChild(tdRecordedBy);

              historyTableBody.appendChild(tr);
            });

            // Update stats cards
            const total = records.length;
            const percentage = total > 0 ? Math.round((presentCount / total) * 100) : 0;

            historyStatStudentId.textContent = studentId;
            historyStatTotal.textContent = String(total);
            historyStatPresent.textContent = String(presentCount);
            historyStatAbsent.textContent = String(absentCount);
            historyStatPercentage.textContent = `${percentage}%`;
            historyCountBadge.textContent = `${total} record${total === 1 ? "" : "s"}`;

            historyStatsContainer.style.display = "grid";
            historyTableContainer.style.display = "block";
          }
        } else {
          showAlert(
            historyAlertContainer,
            historyAlertTitle,
            historyAlertMsg,
            null,
            historyAlertIcon,
            "error",
            "Error",
            data.message || "Failed to retrieve attendance history."
          );
        }
      } catch (networkError) {
        showAlert(
          historyAlertContainer,
          historyAlertTitle,
          historyAlertMsg,
          null,
          historyAlertIcon,
          "error",
          "Network Failure",
          "Could not communicate with the backend API."
        );
      } finally {
        historyFetchBtn.disabled = false;
        historyBtnText.textContent = "Retrieve History";
        historyBtnSpinner.style.display = "none";
      }
    });
  }

  // 8. Find Individual Attendance Record
  if (lookupForm) {
    lookupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert(lookupAlertContainer);
      if (lookupResultCard) lookupResultCard.style.display = "none";

      const studentId = lookupStudentId.value.trim();
      const date = lookupDate.value.trim();

      if (!studentId || !date) {
        showAlert(
          lookupAlertContainer,
          lookupAlertTitle,
          lookupAlertMsg,
          null,
          lookupAlertIcon,
          "error",
          "Missing Fields",
          "Both Student ID and Attendance Date are required."
        );
        return;
      }

      lookupSearchBtn.disabled = true;
      lookupBtnText.textContent = "Searching...";
      lookupBtnSpinner.style.display = "inline-block";

      try {
        const response = await fetch(
          `${API_BASE}/${encodeURIComponent(studentId)}/${encodeURIComponent(date)}`
        );
        const data = await response.json();

        if (response.status === 404) {
          // Record not found
          showAlert(
            lookupAlertContainer,
            lookupAlertTitle,
            lookupAlertMsg,
            null,
            lookupAlertIcon,
            "info",
            "Record Not Found",
            `No attendance record was found for student "${studentId}" on date "${date}".`
          );
        } else if (response.ok && data.success && data.record) {
          // Record found!
          const record = data.record;
          const statusUpper = (record.status || "").toUpperCase();

          lookupResStudentId.textContent = record.studentId || studentId;
          lookupResDate.textContent = record.date || date;
          lookupResStatus.textContent = record.status || "--";
          lookupResTimestamp.textContent = formatTimestamp(record.timestamp);
          lookupResRecordedBy.textContent = record.recordedBy || "--";

          // Status Badge
          lookupResStatusBadge.innerHTML = "";
          const badgeEl = document.createElement("span");
          badgeEl.className = `badge ${statusUpper === "PRESENT" ? "badge-present" : "badge-absent"}`;
          badgeEl.textContent = record.status || "--";
          lookupResStatusBadge.appendChild(badgeEl);

          // Copy address setup
          if (lookupCopyAddressBtn) {
            lookupCopyAddressBtn.onclick = () => {
              if (record.recordedBy) copyToClipboard(record.recordedBy, "Signer Address");
            };
          }

          lookupResultCard.style.display = "block";
        } else {
          showAlert(
            lookupAlertContainer,
            lookupAlertTitle,
            lookupAlertMsg,
            null,
            lookupAlertIcon,
            "error",
            "Error",
            data.message || "Failed to retrieve attendance record."
          );
        }
      } catch (networkError) {
        showAlert(
          lookupAlertContainer,
          lookupAlertTitle,
          lookupAlertMsg,
          null,
          lookupAlertIcon,
          "error",
          "Network Error",
          "Could not reach backend server to verify attendance."
        );
      } finally {
        lookupSearchBtn.disabled = false;
        lookupBtnText.textContent = "Search Record";
        lookupBtnSpinner.style.display = "none";
      }
    });
  }

  // Initial Load: Fetch total count & verify connectivity
  fetchTotalCount();
});
