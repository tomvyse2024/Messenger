
/* =========================================
   MYINT MYINT BUSINESS DASHBOARD
   Google Apps Script API Connection
   Browser Cache + Auto Refresh
   Auto Refresh: 120 Seconds
========================================= */

const API_URL =
  "https://script.google.com/macros/s/AKfycbxAdLFXswMg2Bdqr0AhSCc_Ujp3VUCol5yujUNG31CCf-mo0xDzSFHIHQZsdUujSt2Rxg/exec";

const REFRESH_INTERVAL = 120000;

const CACHE_KEY = "MYINT_MYINT_DASHBOARD_CACHE_V1";

let dailyChart = null;
let groupChart = null;
let isLoading = false;


/* =========================================
   FORMAT NUMBERS
========================================= */

function formatMoney(value) {

  return Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 0
  });

}


function formatNumber(value) {

  return Number(value || 0).toLocaleString("en-US");

}


/* =========================================
   CONNECTION STATUS
========================================= */

function setConnectionStatus(connected, message) {

  const label = document.getElementById("connection-label");
  const status = document.getElementById("status-message");
  const dot = document.querySelector(".live-dot");

  if (label) {
    label.textContent = connected ? "Live Data" : "Connection Lost";
  }

  if (status) {
    status.textContent = message;
  }

  if (dot) {
    dot.style.background = connected ? "#28d89a" : "#ff6b78";
    dot.style.color = connected ? "#28d89a" : "#ff6b78";
  }

}


/* =========================================
   CACHED DATA STATUS
========================================= */

function setCachedStatus() {

  const label = document.getElementById("connection-label");
  const status = document.getElementById("status-message");
  const dot = document.querySelector(".live-dot");

  if (label) {
    label.textContent = "Saved Data";
  }

  if (status) {
    status.textContent = "Showing saved data. Updating...";
  }

  if (dot) {
    dot.style.background = "#f0b44d";
    dot.style.color = "#f0b44d";
  }

}


/* =========================================
   SAVE DATA TO BROWSER CACHE
========================================= */

function saveDashboardCache(data) {

  try {

    const cacheData = {
      savedAt: Date.now(),
      data: data
    };

    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify(cacheData)
    );

  } catch (error) {

    console.warn(
      "Dashboard cache save failed:",
      error
    );

  }

}


/* =========================================
   LOAD DATA FROM BROWSER CACHE
========================================= */

function loadDashboardCache() {

  try {

    const cached = localStorage.getItem(CACHE_KEY);

    if (!cached) return null;

    const parsed = JSON.parse(cached);

    if (
      !parsed ||
      !parsed.data ||
      parsed.data.ok !== true
    ) {
      return null;
    }

    return parsed;

  } catch (error) {

    console.warn(
      "Dashboard cache read failed:",
      error
    );

    return null;

  }

}


/* =========================================
   SHOW CACHED DATA IMMEDIATELY
========================================= */

function showCachedDashboard() {

  const cached = loadDashboardCache();

  if (!cached) return false;

  try {

    updateDashboard(cached.data);

    setCachedStatus();

    console.log(
      "Showing saved dashboard data:",
      new Date(cached.savedAt)
    );

    return true;

  } catch (error) {

    console.error(
      "Cached dashboard display error:",
      error
    );

    return false;

  }

}


/* =========================================
   LOAD DATA FROM GOOGLE APPS SCRIPT
========================================= */

function loadDashboardData() {

  if (isLoading) return;

  isLoading = true;

  const callbackName = "mmDashboardCallback";

  const oldScript = document.getElementById("mm-api-script");

  if (oldScript) {
    oldScript.remove();
  }

  const script = document.createElement("script");

  script.id = "mm-api-script";

  let completed = false;


  // REQUEST TIMEOUT

  const timeout = setTimeout(() => {

    if (completed) return;

    completed = true;

    isLoading = false;

    setConnectionStatus(
      false,
      "Unable to connect. Retrying..."
    );

    script.remove();

    delete window[callbackName];

  }, 20000);


  // SUCCESS CALLBACK

  window[callbackName] = function(data) {

    if (completed) return;

    completed = true;

    clearTimeout(timeout);

    isLoading = false;

    try {

      if (!data || data.ok !== true) {
        throw new Error("Invalid API response");
      }

      // Update dashboard with fresh data
      updateDashboard(data);

      // Save latest data in browser
      saveDashboardCache(data);

      setConnectionStatus(
        true,
        "Data updated successfully"
      );

      console.log(
        "Fresh dashboard data received:",
        new Date()
      );

    } catch (error) {

      console.error(
        "Dashboard update error:",
        error
      );

      setConnectionStatus(
        false,
        "Data update failed"
      );

    }

    script.remove();

    delete window[callbackName];

  };


  // CONNECTION ERROR

  script.onerror = function() {

    if (completed) return;

    completed = true;

    clearTimeout(timeout);

    isLoading = false;

    setConnectionStatus(
      false,
      "Connection error. Retrying..."
    );

    script.remove();

    delete window[callbackName];

  };


  // JSONP REQUEST

  script.src =
    API_URL +
    "?callback=" +
    encodeURIComponent(callbackName) +
    "&_=" +
    Date.now();

  document.body.appendChild(script);

}


/* =========================================
   UPDATE DASHBOARD
========================================= */

function updateDashboard(data) {

  const today = data.today;

  const totals = data.totals || {};

  const daily = data.daily || [];

  const groups = data.groups || [];

  const todayData = daily.find(
    item => item.date === today
  ) || {};


  /* TODAY METRICS */

  setText(
    "today-income",
    formatMoney(todayData.income)
  );

  setText(
    "today-expense",
    formatMoney(todayData.expense)
  );

  setText(
    "today-invoices",
    formatNumber(todayData.invoices)
  );


  /* MONTHLY METRICS */

  const monthlyIncome = Number(
    totals.income || 0
  );

  const monthlyExpense = Number(
    totals.expense || 0
  );

  const monthlyNet = monthlyIncome - monthlyExpense;


  setText(
    "month-net",
    formatMoney(monthlyNet)
  );

  setText(
    "month-income",
    formatMoney(monthlyIncome)
  );

  setText(
    "month-expense",
    formatMoney(monthlyExpense)
  );

  setText(
    "month-invoices",
    formatNumber(totals.invoices)
  );

  setText(
    "month-groupsales",
    formatMoney(totals.groupSales)
  );


  /* MONTH LABEL */

  if (data.month) {

    const date = new Date(
      data.month + "-01T00:00:00"
    );

    const monthName = date.toLocaleDateString(
      "en-US",
      {
        month: "long",
        year: "numeric"
      }
    );

    setText(
      "month-label",
      monthName
    );

  }


  /* UPDATED TIME */

  setText(
    "updated-at",
    data.updatedAt || "—"
  );


  /* CHARTS */

  updateDailyChart(daily);

  updateGroupChart(groups);


  /* GROUP TABLE */

  updateGroupTable(groups);


  /* COUNTS */

  setText(
    "daily-count",
    daily.length + " days"
  );

  setText(
    "group-count",
    groups.length + " groups"
  );

}


/* =========================================
   SAFE TEXT UPDATE
========================================= */

function setText(id, value) {

  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }

}


/* =========================================
   DAILY SALES & EXPENSE CHART
========================================= */

function updateDailyChart(daily) {

  const canvas = document.getElementById("dailyChart");

  if (!canvas) return;

  const labels = daily.map(item => {

    const date = String(item.date || "");

    return date.slice(8, 10);

  });


  const income = daily.map(
    item => Number(item.income || 0)
  );

  const expense = daily.map(
    item => Number(item.expense || 0)
  );


  const chartData = {

    labels: labels,

    datasets: [

      {
        label: "Income",

        data: income,

        borderColor: "#28d89a",

        backgroundColor: "rgba(40,216,154,0.10)",

        borderWidth: 2.5,

        pointRadius: 3,

        pointHoverRadius: 6,

        tension: 0.35,

        fill: true
      },

      {
        label: "Expense",

        data: expense,

        borderColor: "#ff6b78",

        backgroundColor: "rgba(255,107,120,0.05)",

        borderWidth: 2.5,

        pointRadius: 3,

        pointHoverRadius: 6,

        tension: 0.35,

        fill: false
      }

    ]

  };


  if (dailyChart) {

    dailyChart.data = chartData;

    dailyChart.update("none");

    return;

  }


  dailyChart = new Chart(canvas, {

    type: "line",

    data: chartData,

    options: {

      responsive: true,

      maintainAspectRatio: false,

      interaction: {
        intersect: false,
        mode: "index"
      },

      plugins: {

        legend: {
          display: false
        },

        tooltip: {

          backgroundColor: "#101827",

          titleColor: "#ffffff",

          bodyColor: "#dce5f1",

          borderColor: "rgba(255,255,255,0.1)",

          borderWidth: 1,

          callbacks: {

            label: function(context) {

              return context.dataset.label +
                ": " +
                formatMoney(context.raw) +
                " MMK";

            }

          }

        }

      },

      scales: {

        x: {

          grid: {
            display: false
          },

          ticks: {
            color: "#91a0b5",
            font: {
              size: 10
            }
          }

        },

        y: {

          beginAtZero: true,

          grid: {
            color: "rgba(255,255,255,0.06)"
          },

          ticks: {

            color: "#91a0b5",

            font: {
              size: 10
            },

            callback: function(value) {

              return formatCompact(value);

            }

          }

        }

      }

    }

  });

}


/* =========================================
   GROUP SALES CHART
========================================= */

function updateGroupChart(groups) {

  const canvas = document.getElementById("groupChart");

  if (!canvas) return;


  const sortedGroups = [...groups].sort(
    (a, b) => Number(b.amount || 0) - Number(a.amount || 0)
  );


  const labels = sortedGroups.map(
    item => item.name
  );

  const values = sortedGroups.map(
    item => Number(item.amount || 0)
  );


  const chartData = {

    labels: labels,

    datasets: [

      {

        label: "Sales Amount",

        data: values,

        backgroundColor: "#28d89a",

        borderRadius: 5,

        barThickness: 13,

        maxBarThickness: 16

      }

    ]

  };


  if (groupChart) {

    groupChart.data = chartData;

    groupChart.update("none");

    return;

  }


  groupChart = new Chart(canvas, {

    type: "bar",

    data: chartData,

    options: {

      indexAxis: "y",

      responsive: true,

      maintainAspectRatio: false,

      plugins: {

        legend: {
          display: false
        },

        tooltip: {

          callbacks: {

            label: function(context) {

              return formatMoney(context.raw) + " MMK";

            }

          }

        }

      },

      scales: {

        x: {

          beginAtZero: true,

          grid: {
            color: "rgba(255,255,255,0.06)"
          },

          ticks: {

            color: "#91a0b5",

            font: {
              size: 9
            },

            callback: function(value) {
              return formatCompact(value);
            }

          }

        },

        y: {

          grid: {
            display: false
          },

          ticks: {

            color: "#dce5f1",

            font: {
              size: 10
            }

          }

        }

      }

    }

  });

}


/* =========================================
   GROUP SALES TABLE
========================================= */

function updateGroupTable(groups) {

  const tbody = document.getElementById("group-table");

  if (!tbody) return;


  if (!groups.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="empty">
          No group sales data
        </td>
      </tr>
    `;

    return;

  }


  const sortedGroups = [...groups].sort(
    (a, b) => Number(b.amount || 0) - Number(a.amount || 0)
  );


  tbody.innerHTML = sortedGroups.map(item => {

    const name = escapeHTML(item.name || "Unknown");

    const quantity = formatNumber(item.quantity);

    const amount = formatMoney(item.amount);


    return `
      <tr>
        <td>${name}</td>
        <td class="num">${quantity}</td>
        <td class="num">${amount}</td>
      </tr>
    `;

  }).join("");

}


/* =========================================
   HTML ESCAPE
========================================= */

function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =========================================
   COMPACT NUMBER FORMAT
========================================= */

function formatCompact(value) {

  const number = Number(value || 0);

  if (number >= 1000000000) {
    return (number / 1000000000).toFixed(1) + "B";
  }

  if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + "M";
  }

  if (number >= 1000) {
    return (number / 1000).toFixed(0) + "K";
  }

  return number;

}


/* =========================================
   START DASHBOARD
========================================= */

function startDashboard() {

  // 1. Show saved data immediately
  showCachedDashboard();

  // 2. Fetch fresh data immediately
  loadDashboardData();

  // 3. Auto refresh every 120 seconds
  setInterval(
    loadDashboardData,
    REFRESH_INTERVAL
  );

}


/* =========================================
   INITIALIZE
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  startDashboard
);
