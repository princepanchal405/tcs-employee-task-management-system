"use strict";

/* =========================================================
   REPORTS & ANALYTICS
   Live data from authenticated APIs
========================================================= */

let reportData = {
    employees: [],
    tasks: [],
    leaves: []
};

let filteredEmployeeSummary = [];
let employeeSummaryPage = 1;
const employeeSummaryPageSize = 10;

let departmentChart = null;
let taskStatusChart = null;
let leaveStatusChart = null;
let pendingCompletedChart = null;


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    if (!requireAuthentication()) {
        return;
    }

    const user = getCurrentUser();

    if (!user || user.role !== "ADMIN") {
        window.location.href = "dashboard.html";
        return;
    }

    initializeReportsUser(user);
    initializeReportsInteractions();
    cleanReportsUserMenu();

    await loadReports();
});


/* =========================================================
   USER
========================================================= */

function initializeReportsUser(user) {
    const name =
        user.name ||
        user.username ||
        user.email ||
        "Admin";

    const date = new Intl.DateTimeFormat(
        "en-IN",
        {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        }
    ).format(new Date()).toUpperCase();

    setText("reportsUserName", name);
    setText("reportsUserRole", "Administrator");
    setText("reportsUserAvatar", getInitials(name));

    setText(
        "reportsMenuUserName",
        name
    );

    setText(
        "reportsMenuUserEmail",
        user.email || ""
    );

    setText(
        "reportsWelcomeDate",
        date
    );
}


/* =========================================================
   INTERACTIONS
========================================================= */

function initializeReportsInteractions() {

    document
        .getElementById("refreshReports")
        ?.addEventListener(
            "click",
            loadReports
        );


    document
        .getElementById("reportsAlertClose")
        ?.addEventListener(
            "click",
            hideReportsAlert
        );


    document
        .getElementById("reportEmployeeSearch")
        ?.addEventListener(
            "input",
            debounce(
                () => {
                    employeeSummaryPage = 1;
                    applyReportFilters();
                },
                250
            )
        );


    document
        .getElementById("reportTaskStatusFilter")
        ?.addEventListener(
            "change",
            () => {
                employeeSummaryPage = 1;
                applyReportFilters();
            }
        );


    document
        .getElementById("resetReportFilters")
        ?.addEventListener(
            "click",
            resetReportFilters
        );


    initializeExportMenu();
    initializeReportsUserMenu();
}


/* =========================================================
   REMOVE UNUSED ACCOUNT OPTIONS
========================================================= */

function cleanReportsUserMenu() {

    [
        "reportsMenuProfile",
        "reportsMenuSettings"
    ].forEach(
        (id) => {
            document
                .getElementById(id)
                ?.remove();
        }
    );
}


/* =========================================================
   EXPORT MENU
========================================================= */

function initializeExportMenu() {

    const exportButton =
        document.getElementById(
            "exportReportButton"
        );

    const dropdown =
        document.getElementById(
            "exportReportDropdown"
        );

    if (!exportButton || !dropdown) {
        return;
    }


    exportButton.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();

            dropdown.classList.toggle(
                "d-none"
            );
        }
    );


    dropdown
        .querySelectorAll(
            "[data-export]"
        )
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    async () => {

                        const type =
                            button.dataset.export;

                        dropdown.classList.add(
                            "d-none"
                        );

                        await exportReportCsv(
                            type
                        );
                    }
                );
            }
        );


    document.addEventListener(
        "click",
        (event) => {

            if (
                !dropdown.contains(
                    event.target
                ) &&
                !exportButton.contains(
                    event.target
                )
            ) {
                dropdown.classList.add(
                    "d-none"
                );
            }
        }
    );
}


/* =========================================================
   LOAD REPORTS
========================================================= */

async function loadReports() {

    showReportsLoadingState();

    try {

        const [
            employees,
            tasks,
            leaves
        ] = await Promise.all([

            fetchAllPages(
                "/employees/"
            ),

            fetchAllPages(
                "/tasks/"
            ),

            fetchAllPages(
                "/leaves/"
            )
        ]);


        reportData = {
            employees,
            tasks,
            leaves
        };


        employeeSummaryPage = 1;


        renderReportSummary();

        renderCharts();

        applyReportFilters();


        showReportsAlert(
            "Reports refreshed successfully.",
            "success"
        );

    } catch (error) {

        console.error(
            "Reports loading error:",
            error
        );

        reportData = {
            employees: [],
            tasks: [],
            leaves: []
        };

        filteredEmployeeSummary = [];
        employeeSummaryPage = 1;

        renderReportSummary();

        renderCharts();

        renderEmployeeTaskSummary(
            []
        );

        showReportsAlert(
            getApiErrorMessage(
                error,
                "Unable to load reports."
            ),
            "error"
        );
    }
}


/* =========================================================
   FETCH ALL PAGINATED API DATA
========================================================= */

async function fetchAllPages(
    endpoint
) {

    const rows = [];
    let page = 1;

    const pageSize = 100;
    const maximumPages = 100;


    while (
        page <= maximumPages
    ) {

        const separator =
            endpoint.includes("?")
                ? "&"
                : "?";


        const response =
            await apiRequest(
                `${endpoint}${separator}page=${page}&page_size=${pageSize}`,
                {
                    method: "GET"
                }
            );


        if (
            !response ||
            response.success === false
        ) {

            throw createReportsApiError(
                response?.message ||
                    `Unable to load ${endpoint}.`,
                response
            );
        }


        const batch =
            Array.isArray(
                response.data
            )
                ? response.data
                : [];


        rows.push(
            ...batch
        );


        const pagination =
            response.pagination ||
            {};


        const totalPages =
            Number(
                pagination.total_pages
            ) || 1;


        if (
            page >= totalPages ||
            batch.length === 0
        ) {
            break;
        }


        page += 1;
    }


    return rows;
}


/* =========================================================
   SUMMARY
========================================================= */

function renderReportSummary() {

    const employees =
        Array.isArray(
            reportData.employees
        )
            ? reportData.employees
            : [];


    const tasks =
        Array.isArray(
            reportData.tasks
        )
            ? reportData.tasks
            : [];


    const leaves =
        Array.isArray(
            reportData.leaves
        )
            ? reportData.leaves
            : [];


    const activeEmployees =
        employees.filter(
            (employee) =>
                String(
                    employee.employment_status ||
                    ""
                ).toUpperCase() ===
                "ACTIVE"
        ).length;


    const inactiveEmployees =
        Math.max(
            0,
            employees.length -
                activeEmployees
        );


    const pendingTasks =
        countByStatus(
            tasks,
            "PENDING"
        );


    const inProgressTasks =
        countByStatus(
            tasks,
            "IN_PROGRESS"
        );


    const completedTasks =
        countByStatus(
            tasks,
            "COMPLETED"
        );


    const pendingLeaves =
        countByStatus(
            leaves,
            "PENDING"
        );


    const approvedLeaves =
        countByStatus(
            leaves,
            "APPROVED"
        );


    const rejectedLeaves =
        countByStatus(
            leaves,
            "REJECTED"
        );


    const overdueTasks =
        tasks.filter(
            isOverdueOpenTask
        ).length;


    setText(
        "reportTotalEmployees",
        employees.length
    );


    setText(
        "reportEmployeeMeta",
        `${activeEmployees} active • ${inactiveEmployees} inactive`
    );


    setText(
        "reportTotalTasks",
        tasks.length
    );


    setText(
        "reportTaskMeta",
        `${pendingTasks} pending • ${completedTasks} completed`
    );


    setText(
        "reportTotalLeaves",
        leaves.length
    );


    setText(
        "reportLeaveMeta",
        `${pendingLeaves} pending • ${approvedLeaves} approved`
    );


    setText(
        "reportOverdueTasks",
        overdueTasks
    );


    setText(
        "summaryActiveEmployees",
        activeEmployees
    );


    setText(
        "summaryInProgressTasks",
        inProgressTasks
    );


    setText(
        "summaryCompletedTasks",
        completedTasks
    );


    setText(
        "summaryApprovedLeaves",
        approvedLeaves
    );


    setText(
        "summaryRejectedLeaves",
        rejectedLeaves
    );
}


/* =========================================================
   STATUS COUNT
========================================================= */

function countByStatus(
    rows,
    status
) {

    return rows.filter(
        (row) =>
            String(
                row?.status ||
                ""
            ).toUpperCase() ===
            status
    ).length;
}


/* =========================================================
   CHARTS
========================================================= */

function renderCharts() {

    renderDepartmentChart();

    renderTaskStatusChart();

    renderLeaveStatusChart();

    renderPendingCompletedChart();
}


/* =========================================================
   DEPARTMENT CHART
========================================================= */

function renderDepartmentChart() {

    const counts = {};


    reportData.employees.forEach(
        (employee) => {

            const department =
                String(
                    employee.department ||
                    "Unassigned"
                ).trim() ||
                "Unassigned";


            counts[department] =
                (
                    counts[department] ||
                    0
                ) + 1;
        }
    );


    departmentChart =
        replaceChart(
            departmentChart,
            "departmentChart",
            "bar",
            Object.keys(counts),
            Object.values(counts),
            "Employees",
            "departmentChartEmpty"
        );
}


/* =========================================================
   TASK STATUS CHART
========================================================= */

function renderTaskStatusChart() {

    const values = {
        PENDING: 0,
        IN_PROGRESS: 0,
        COMPLETED: 0
    };


    reportData.tasks.forEach(
        (task) => {

            const status =
                String(
                    task.status ||
                    ""
                ).toUpperCase();


            if (
                Object.prototype.hasOwnProperty.call(
                    values,
                    status
                )
            ) {
                values[status] += 1;
            }
        }
    );


    taskStatusChart =
        replaceChart(
            taskStatusChart,
            "taskStatusChart",
            "doughnut",
            [
                "Pending",
                "In Progress",
                "Completed"
            ],
            [
                values.PENDING,
                values.IN_PROGRESS,
                values.COMPLETED
            ],
            "Tasks",
            "taskStatusChartEmpty"
        );
}


/* =========================================================
   LEAVE STATUS CHART
========================================================= */

function renderLeaveStatusChart() {

    const values = {
        PENDING: 0,
        APPROVED: 0,
        REJECTED: 0
    };


    reportData.leaves.forEach(
        (leave) => {

            const status =
                String(
                    leave.status ||
                    ""
                ).toUpperCase();


            if (
                Object.prototype.hasOwnProperty.call(
                    values,
                    status
                )
            ) {
                values[status] += 1;
            }
        }
    );


    leaveStatusChart =
        replaceChart(
            leaveStatusChart,
            "leaveStatusChart",
            "doughnut",
            [
                "Pending",
                "Approved",
                "Rejected"
            ],
            [
                values.PENDING,
                values.APPROVED,
                values.REJECTED
            ],
            "Leaves",
            "leaveStatusChartEmpty"
        );
}


/* =========================================================
   PENDING VS COMPLETED CHART
   Reuses Workflow Summary panel.
========================================================= */

function renderPendingCompletedChart() {

    const panel =
        document.querySelector(
            ".report-summary-panel"
        );


    if (!panel) {
        return;
    }


    let chartWrap =
        document.getElementById(
            "pendingCompletedChartWrap"
        );


    if (!chartWrap) {

        chartWrap =
            document.createElement(
                "div"
            );

        chartWrap.id =
            "pendingCompletedChartWrap";

        chartWrap.className =
            "report-chart-wrap report-pending-completed-wrap";


        const summaryList =
            panel.querySelector(
                ".report-summary-list"
            );


        if (summaryList) {
            panel.insertBefore(
                chartWrap,
                summaryList
            );
        } else {
            panel.appendChild(
                chartWrap
            );
        }
    }


    let canvas =
        document.getElementById(
            "pendingCompletedChart"
        );


    if (!canvas) {

        canvas =
            document.createElement(
                "canvas"
            );

        canvas.id =
            "pendingCompletedChart";

        chartWrap.appendChild(
            canvas
        );
    }


    pendingCompletedChart?.destroy();


    const pending =
        countByStatus(
            reportData.tasks,
            "PENDING"
        );


    const completed =
        countByStatus(
            reportData.tasks,
            "COMPLETED"
        );


    const hasData =
        pending > 0 ||
        completed > 0;


    if (!hasData) {

        canvas.style.display =
            "none";

        chartWrap.innerHTML = `
            <div class="report-chart-empty">
                No task completion data available yet.
            </div>
        `;

        pendingCompletedChart =
            null;

        return;
    }


    chartWrap.innerHTML = `
        <canvas id="pendingCompletedChart"></canvas>
    `;


    canvas =
        document.getElementById(
            "pendingCompletedChart"
        );


    canvas.style.display =
        "";


    if (
        typeof Chart ===
        "undefined"
    ) {
        return;
    }


    pendingCompletedChart =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {
                    labels: [
                        "Pending",
                        "Completed"
                    ],

                    datasets: [
                        {
                            label: "Tasks",
                            data: [
                                pending,
                                completed
                            ],
                            borderWidth: 1
                        }
                    ]
                },

                options: {
                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {
                        legend: {
                            display: false
                        }
                    },

                    scales: {
                        y: {
                            beginAtZero: true,

                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }
            }
        );
}


/* =========================================================
   GENERIC CHART REPLACER
========================================================= */

function replaceChart(
    existing,
    canvasId,
    type,
    labels,
    values,
    label,
    emptyId
) {

    const canvas =
        document.getElementById(
            canvasId
        );


    const empty =
        document.getElementById(
            emptyId
        );


    if (
        !canvas ||
        typeof Chart ===
            "undefined"
    ) {
        return existing;
    }


    existing?.destroy();


    const hasData =
        values.some(
            (value) =>
                Number(value) > 0
        );


    if (empty) {

        empty.classList.toggle(
            "d-none",
            hasData
        );
    }


    canvas.classList.toggle(
        "d-none",
        !hasData
    );


    if (!hasData) {
        return null;
    }


    return new Chart(
        canvas,
        {
            type,

            data: {
                labels,

                datasets: [
                    {
                        label,
                        data: values,
                        borderWidth: 1
                    }
                ]
            },

            options: {
                responsive: true,

                maintainAspectRatio:
                    false,

                plugins: {
                    legend: {
                        display:
                            type !==
                            "bar",

                        position:
                            "bottom"
                    }
                },

                scales:
                    type === "bar"
                        ? {
                            y: {
                                beginAtZero:
                                    true,

                                ticks: {
                                    precision:
                                        0
                                }
                            }
                        }
                        : undefined
            }
        }
    );
}


/* =========================================================
   EMPLOYEE-WISE TASK SUMMARY
========================================================= */

function applyReportFilters() {

    const search =
        getValue(
            "reportEmployeeSearch"
        ).toLowerCase();


    const taskStatus =
        getValue(
            "reportTaskStatusFilter"
        ).toUpperCase();


    const employeeMap =
        new Map();


    reportData.employees.forEach(
        (employee) => {

            employeeMap.set(
                String(
                    employee.id
                ),
                {
                    id:
                        employee.id,

                    employee_id:
                        employee.employee_id ||
                        "-",

                    name:
                        employee.name ||
                        "Employee",

                    department:
                        employee.department ||
                        "-",

                    total_tasks: 0,

                    pending_tasks: 0,

                    in_progress_tasks: 0,

                    completed_tasks: 0
                }
            );
        }
    );


    const filteredTasks =
        reportData.tasks.filter(
            (task) => {

                if (!taskStatus) {
                    return true;
                }

                return (
                    String(
                        task.status ||
                        ""
                    ).toUpperCase() ===
                    taskStatus
                );
            }
        );


    filteredTasks.forEach(
        (task) => {

            const employee =
                resolveTaskEmployee(
                    task
                );


            if (!employee) {
                return;
            }


            const key =
                String(
                    employee.id
                );


            if (
                !employeeMap.has(
                    key
                )
            ) {

                employeeMap.set(
                    key,
                    {
                        id:
                            employee.id,

                        employee_id:
                            employee.employee_id ||
                            "-",

                        name:
                            employee.name ||
                            "Employee",

                        department:
                            employee.department ||
                            "-",

                        total_tasks: 0,

                        pending_tasks: 0,

                        in_progress_tasks: 0,

                        completed_tasks: 0
                    }
                );
            }


            const row =
                employeeMap.get(
                    key
                );


            row.total_tasks += 1;


            const status =
                String(
                    task.status ||
                    ""
                ).toUpperCase();


            if (
                status ===
                "PENDING"
            ) {
                row.pending_tasks += 1;
            }


            if (
                status ===
                "IN_PROGRESS"
            ) {
                row.in_progress_tasks += 1;
            }


            if (
                status ===
                "COMPLETED"
            ) {
                row.completed_tasks += 1;
            }
        }
    );


    filteredEmployeeSummary =
        Array.from(
            employeeMap.values()
        )
        .filter(
            (row) => {

                if (!search) {
                    return true;
                }


                return (
                    String(
                        row.name
                    )
                        .toLowerCase()
                        .includes(
                            search
                        ) ||

                    String(
                        row.employee_id
                    )
                        .toLowerCase()
                        .includes(
                            search
                        ) ||

                    String(
                        row.department
                    )
                        .toLowerCase()
                        .includes(
                            search
                        )
                );
            }
        )
        .sort(
            (a, b) =>
                String(
                    a.name ||
                    ""
                ).localeCompare(
                    String(
                        b.name ||
                        ""
                    )
                )
        );


    renderEmployeeTaskSummary(
        filteredEmployeeSummary
    );
}


/* =========================================================
   RESOLVE ASSIGNED EMPLOYEE
========================================================= */

function resolveTaskEmployee(
    task
) {

    const possibleIds = [
        task.assigned_to,
        task.assigned_to_id,
        task.employee_id,
        task.assigned_employee_id
    ];


    for (
        const value of
        possibleIds
    ) {

        if (
            value ===
                null ||
            value ===
                undefined ||
            value ===
                ""
        ) {
            continue;
        }


        const match =
            reportData.employees.find(
                (employee) =>
                    String(
                        employee.id
                    ) ===
                        String(value) ||

                    String(
                        employee.employee_id
                    ) ===
                        String(value)
            );


        if (match) {
            return match;
        }
    }


    const name =
        task.assigned_employee_name ||
        task.assigned_to_name;


    if (name) {

        return (
            reportData.employees.find(
                (employee) =>
                    String(
                        employee.name ||
                        ""
                    ).toLowerCase() ===
                    String(
                        name
                    ).toLowerCase()
            ) ||
            null
        );
    }


    return null;
}


/* =========================================================
   EMPLOYEE SUMMARY TABLE + PAGINATION
========================================================= */

function renderEmployeeTaskSummary(
    rows
) {

    const tbody =
        document.getElementById(
            "employeeSummaryBody"
        );


    const empty =
        document.getElementById(
            "employeeSummaryEmpty"
        );


    const count =
        document.getElementById(
            "employeeSummaryCount"
        );


    if (count) {

        count.textContent =
            `${rows.length} records`;
    }


    if (!tbody) {
        return;
    }


    if (!rows.length) {

        tbody.innerHTML = "";

        empty?.classList.remove(
            "d-none"
        );

        removeReportPagination();

        return;
    }


    empty?.classList.add(
        "d-none"
    );


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                rows.length /
                    employeeSummaryPageSize
            )
        );


    if (
        employeeSummaryPage >
        totalPages
    ) {
        employeeSummaryPage =
            totalPages;
    }


    const start =
        (
            employeeSummaryPage -
            1
        ) *
        employeeSummaryPageSize;


    const pageRows =
        rows.slice(
            start,
            start +
                employeeSummaryPageSize
        );


    tbody.innerHTML =
        pageRows
            .map(
                (row) => `
                    <tr>

                        <td>
                            <div class="task-assigned-person">

                                <div class="task-assigned-avatar">
                                    ${escapeHtml(
                                        getInitials(
                                            row.name
                                        )
                                    )}
                                </div>

                                <div class="task-assigned-info">

                                    <strong>
                                        ${escapeHtml(
                                            row.name
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHtml(
                                            row.employee_id
                                        )}
                                    </span>

                                </div>

                            </div>
                        </td>

                        <td>
                            ${escapeHtml(
                                row.department
                            )}
                        </td>

                        <td>
                            <strong>
                                ${row.total_tasks}
                            </strong>
                        </td>

                        <td>
                            ${row.pending_tasks}
                        </td>

                        <td>
                            ${row.in_progress_tasks}
                        </td>

                        <td>
                            ${row.completed_tasks}
                        </td>

                    </tr>
                `
            )
            .join("");


    renderReportPagination(
        rows.length,
        totalPages
    );
}


/* =========================================================
   REPORT PAGINATION
========================================================= */

function renderReportPagination(
    total,
    totalPages
) {

    let pagination =
        document.getElementById(
            "employeeReportPagination"
        );


    if (!pagination) {

        const tableCard =
            document.querySelector(
                ".report-table-card"
            );


        if (!tableCard) {
            return;
        }


        pagination =
            document.createElement(
                "div"
            );


        pagination.id =
            "employeeReportPagination";

        pagination.className =
            "task-pagination report-pagination";


        tableCard.appendChild(
            pagination
        );
    }


    const start =
        total === 0
            ? 0
            : (
                (
                    employeeSummaryPage -
                    1
                ) *
                employeeSummaryPageSize
            ) + 1;


    const end =
        Math.min(
            employeeSummaryPage *
                employeeSummaryPageSize,
            total
        );


    pagination.innerHTML = `

        <div class="task-pagination-info">

            Showing
            <strong>${start}</strong>
            -
            <strong>${end}</strong>
            of
            <strong>${total}</strong>

        </div>


        <div class="task-pagination-controls">

            <button
                type="button"
                class="pagination-button"
                id="previousEmployeeReportPage"
                ${employeeSummaryPage <= 1 ? "disabled" : ""}
                aria-label="Previous page"
            >
                <i class="bi bi-chevron-left"></i>
            </button>


            <div class="pagination-numbers">

                ${buildPaginationButtons(
                    totalPages
                )}

            </div>


            <button
                type="button"
                class="pagination-button"
                id="nextEmployeeReportPage"
                ${employeeSummaryPage >= totalPages ? "disabled" : ""}
                aria-label="Next page"
            >
                <i class="bi bi-chevron-right"></i>
            </button>

        </div>
    `;


    pagination
        .querySelector(
            "#previousEmployeeReportPage"
        )
        ?.addEventListener(
            "click",
            () => {

                if (
                    employeeSummaryPage <= 1
                ) {
                    return;
                }

                employeeSummaryPage -= 1;

                renderEmployeeTaskSummary(
                    filteredEmployeeSummary
                );
            }
        );


    pagination
        .querySelector(
            "#nextEmployeeReportPage"
        )
        ?.addEventListener(
            "click",
            () => {

                if (
                    employeeSummaryPage >=
                    totalPages
                ) {
                    return;
                }

                employeeSummaryPage += 1;

                renderEmployeeTaskSummary(
                    filteredEmployeeSummary
                );
            }
        );


    pagination
        .querySelectorAll(
            "[data-report-page]"
        )
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {

                        employeeSummaryPage =
                            Number(
                                button.dataset.reportPage
                            );

                        renderEmployeeTaskSummary(
                            filteredEmployeeSummary
                        );
                    }
                );
            }
        );
}


function buildPaginationButtons(
    totalPages
) {

    let html = "";

    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        if (
            totalPages > 7 &&
            page > 3 &&
            page < totalPages - 1
        ) {

            if (page === 4) {
                html += `
                    <span class="pagination-ellipsis">
                        ...
                    </span>
                `;
            }

            continue;
        }


        html += `
            <button
                type="button"
                class="pagination-number ${
                    page ===
                    employeeSummaryPage
                        ? "active"
                        : ""
                }"
                data-report-page="${page}"
            >
                ${page}
            </button>
        `;
    }


    return html;
}


function removeReportPagination() {

    document
        .getElementById(
            "employeeReportPagination"
        )
        ?.remove();
}


/* =========================================================
   CSV EXPORT
========================================================= */

async function exportReportCsv(
    type
) {

    try {

        const rows =
            getExportRows(
                type
            );


        if (!rows.length) {

            showReportsAlert(
                "There is no data to export.",
                "error"
            );

            return;
        }


        const csv =
            rowsToCsv(
                rows
            );


        downloadTextFile(
            csv,
            `${type}_report.csv`,
            "text/csv;charset=utf-8;"
        );


        showReportsAlert(
            `${prettifyExportType(type)} report exported successfully.`,
            "success"
        );

    } catch (error) {

        console.error(
            "Report export error:",
            error
        );

        showReportsAlert(
            getApiErrorMessage(
                error,
                "Unable to export report."
            ),
            "error"
        );
    }
}


/* =========================================================
   EXPORT ROW BUILDERS
========================================================= */

function getExportRows(
    type
) {

    if (
        type ===
        "employees"
    ) {

        return reportData
            .employees
            .map(
                (employee) => ({
                    employee_id:
                        employee.employee_id ||
                        "",

                    name:
                        employee.name ||
                        "",

                    email:
                        employee.email ||
                        "",

                    mobile:
                        employee.mobile_number ||
                        employee.mobile ||
                        "",

                    department:
                        employee.department ||
                        "",

                    designation:
                        employee.designation ||
                        "",

                    location:
                        employee.location ||
                        "",

                    joining_date:
                        employee.joining_date ||
                        "",

                    employment_status:
                        employee.employment_status ||
                        ""
                })
            );
    }


    if (
        type ===
        "tasks"
    ) {

        return reportData
            .tasks
            .map(
                (task) => ({
                    id:
                        task.id ||
                        "",

                    title:
                        task.title ||
                        "",

                    priority:
                        task.priority ||
                        "",

                    status:
                        task.status ||
                        "",

                    due_date:
                        task.due_date ||
                        "",

                    assigned_employee:
                        task.assigned_employee_name ||
                        task.assigned_to_name ||
                        "",

                    assigned_employee_id:
                        task.assigned_employee_id ||
                        task.assigned_to ||
                        "",

                    created_by:
                        task.created_by_name ||
                        ""
                })
            );
    }


    if (
        type ===
        "leaves"
    ) {

        return reportData
            .leaves
            .map(
                (leave) => ({
                    id:
                        leave.id ||
                        "",

                    employee:
                        leave.employee_name ||
                        leave.assigned_employee_name ||
                        leave.employee?.name ||
                        "",

                    employee_id:
                        leave.employee_id ||
                        leave.assigned_employee_id ||
                        leave.employee?.employee_id ||
                        "",

                    leave_type:
                        leave.leave_type ||
                        "",

                    from_date:
                        leave.from_date ||
                        "",

                    to_date:
                        leave.to_date ||
                        "",

                    status:
                        leave.status ||
                        "",

                    reason:
                        leave.reason ||
                        "",

                    remarks:
                        leave.admin_remarks ||
                        leave.remarks ||
                        ""
                })
            );
    }


    throw new Error(
        "Unknown report type."
    );
}


/* =========================================================
   CSV HELPERS
========================================================= */

function rowsToCsv(
    rows
) {

    if (!rows.length) {
        return "";
    }


    const headers =
        Object.keys(
            rows[0]
        );


    const lines = [
        headers
            .map(
                csvEscape
            )
            .join(",")
    ];


    rows.forEach(
        (row) => {

            lines.push(
                headers
                    .map(
                        (header) =>
                            csvEscape(
                                row[header]
                            )
                    )
                    .join(",")
            );
        }
    );


    return (
        "\uFEFF" +
        lines.join(
            "\r\n"
        )
    );
}


function csvEscape(
    value
) {

    const text =
        String(
            value ??
            ""
        );


    return `"${text.replaceAll(
        '"',
        '""'
    )}"`;
}


function downloadTextFile(
    content,
    filename,
    mimeType
) {

    const blob =
        new Blob(
            [content],
            {
                type:
                    mimeType
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const anchor =
        document.createElement(
            "a"
        );


    anchor.href =
        url;

    anchor.download =
        filename;


    document
        .body
        .appendChild(
            anchor
        );


    anchor.click();

    anchor.remove();


    URL.revokeObjectURL(
        url
    );
}


/* =========================================================
   LOADING STATE
========================================================= */

function showReportsLoadingState() {

    [
        "reportTotalEmployees",
        "reportTotalTasks",
        "reportTotalLeaves",
        "reportOverdueTasks",
        "summaryActiveEmployees",
        "summaryInProgressTasks",
        "summaryCompletedTasks",
        "summaryApprovedLeaves",
        "summaryRejectedLeaves"
    ]
        .forEach(
            (id) =>
                setText(
                    id,
                    "…"
                )
        );


    document
        .querySelectorAll(
            ".report-chart-empty"
        )
        .forEach(
            (element) =>
                element.classList.add(
                    "d-none"
                )
        );
}


/* =========================================================
   FILTER RESET
========================================================= */

function resetReportFilters() {

    setValue(
        "reportEmployeeSearch",
        ""
    );

    setValue(
        "reportTaskStatusFilter",
        ""
    );

    employeeSummaryPage = 1;

    applyReportFilters();
}


/* =========================================================
   OVERDUE TASK
========================================================= */

function isOverdueOpenTask(
    task
) {

    const status =
        String(
            task?.status ||
            ""
        ).toUpperCase();


    if (
        status ===
        "COMPLETED"
    ) {
        return false;
    }


    if (!task?.due_date) {
        return false;
    }


    return (
        String(
            task.due_date
        ) <
        getLocalDateString()
    );
}


function getLocalDateString() {

    const now =
        new Date();


    return (
        `${now.getFullYear()}-` +
        `${String(
            now.getMonth() + 1
        ).padStart(2, "0")}-` +
        `${String(
            now.getDate()
        ).padStart(2, "0")}`
    );
}


/* =========================================================
   USER MENU
========================================================= */

function initializeReportsUserMenu() {

    const button =
        document.getElementById(
            "reportsUserButton"
        );


    const menu =
        document.getElementById(
            "reportsUserMenu"
        );


    if (
        !button ||
        !menu
    ) {
        return;
    }


    button.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();


            const open =
                menu.classList.toggle(
                    "show"
                );


            button.setAttribute(
                "aria-expanded",
                String(
                    open
                )
            );


            menu.setAttribute(
                "aria-hidden",
                String(
                    !open
                )
            );
        }
    );


    document.addEventListener(
        "click",
        (event) => {

            if (
                !menu.contains(
                    event.target
                ) &&
                !button.contains(
                    event.target
                )
            ) {

                menu.classList.remove(
                    "show"
                );


                button.setAttribute(
                    "aria-expanded",
                    "false"
                );


                menu.setAttribute(
                    "aria-hidden",
                    "true"
                );
            }
        }
    );


    document
        .getElementById(
            "reportsMenuLogout"
        )
        ?.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                logout();
            }
        );
}


/* =========================================================
   ALERTS
========================================================= */

function showReportsAlert(
    message,
    type = "success"
) {

    const alert =
        document.getElementById(
            "reportsAlert"
        );


    const icon =
        document.getElementById(
            "reportsAlertIcon"
        );


    const messageEl =
        document.getElementById(
            "reportsAlertMessage"
        );


    if (
        !alert ||
        !messageEl
    ) {
        return;
    }


    alert.classList.remove(
        "d-none",
        "success",
        "error"
    );


    alert.classList.add(
        type === "error"
            ? "error"
            : "success"
    );


    messageEl.textContent =
        message;


    if (icon) {

        icon.className =
            type === "error"
                ? "bi bi-exclamation-triangle"
                : "bi bi-check-circle";
    }


    clearTimeout(
        showReportsAlert.timeoutId
    );


    showReportsAlert.timeoutId =
        setTimeout(
            hideReportsAlert,
            4500
        );
}


function hideReportsAlert() {

    document
        .getElementById(
            "reportsAlert"
        )
        ?.classList.add(
            "d-none"
        );
}


/* =========================================================
   HELPERS
========================================================= */

function createReportsApiError(
    message,
    data = null
) {

    const error =
        new Error(
            message
        );


    error.data =
        data;


    if (
        data?.status
    ) {
        error.status =
            data.status;
    }


    return error;
}


function getApiErrorMessage(
    error,
    fallback
) {

    const data =
        error?.data;


    if (
        typeof data ===
        "string"
    ) {
        return data;
    }


    if (
        data?.detail
    ) {
        return data.detail;
    }


    if (
        data?.message
    ) {
        return data.message;
    }


    if (
        data?.errors &&
        typeof data.errors ===
            "object"
    ) {

        const first =
            Object.values(
                data.errors
            )[0];


        if (
            Array.isArray(
                first
            )
        ) {
            return first[0];
        }


        if (first) {
            return String(
                first
            );
        }
    }


    return (
        error?.message ||
        fallback
    );
}


function getInitials(
    name
) {

    return (
        String(
            name ||
            "User"
        )
            .trim()
            .split(
                /\s+/
            )
            .slice(
                0,
                2
            )
            .map(
                (word) =>
                    word.charAt(
                        0
                    )
            )
            .join("")
            .toUpperCase()
        ||
        "U"
    );
}


function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value ??
            "-";
    }
}


function getValue(
    id
) {

    return (
        document
            .getElementById(id)
            ?.value
            ?.trim() ||
        ""
    );
}


function setValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.value =
            value ??
            "";
    }
}


function escapeHtml(
    value
) {

    return String(
        value ??
        ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


function prettifyExportType(
    type
) {

    const labels = {
        employees:
            "Employee",

        tasks:
            "Task",

        leaves:
            "Leave"
    };


    return (
        labels[type] ||
        "Data"
    );
}


function debounce(
    callback,
    delay
) {

    let timer =
        null;


    return (
        ...args
    ) => {

        clearTimeout(
            timer
        );


        timer =
            setTimeout(
                () =>
                    callback(
                        ...args
                    ),
                delay
            );
    };
}