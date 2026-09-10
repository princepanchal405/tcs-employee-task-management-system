"use strict";

/* =========================================================
   DASHBOARD STATE
========================================================= */

let dashboardRefreshTimer = null;


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        if (
            typeof requireAuthentication ===
            "function"
        ) {
            const authenticated =
                requireAuthentication();

            if (
                authenticated === false
            ) {
                return;
            }
        }

        const user =
            typeof getCurrentUser ===
            "function"
                ? getCurrentUser()
                : null;

        if (!user) {

            if (
                typeof logout ===
                "function"
            ) {
                logout();
            }

            return;

        }


        initializeDashboardUser(
            user
        );

        initializeDashboardRole(
            user
        );

        initializeDashboardActions(
            user
        );

        initializeUserMenu();


        /*
         * First load immediately.
         */
        await loadDashboardData(
            user
        );


        /*
         * Refresh live dashboard data
         * every 60 seconds.
         */
        dashboardRefreshTimer =
            window.setInterval(
                () => {

                    loadDashboardData(
                        getCurrentUser()
                    );

                },
                60000
            );

    }
);


/* =========================================================
   USER INFORMATION
========================================================= */

function initializeDashboardUser(
    user
) {

    const userName =
        document.getElementById(
            "currentUserName"
        );

    const welcomeName =
        document.getElementById(
            "welcomeUserName"
        );

    const userRole =
        document.getElementById(
            "currentUserRole"
        );

    const avatar =
        document.getElementById(
            "userAvatar"
        );

    const employeeName =
        document.getElementById(
            "employeeWelcomeName"
        );

    const menuName =
        document.getElementById(
            "menuUserName"
        );

    const menuEmail =
        document.getElementById(
            "menuUserEmail"
        );

    const adminDate =
        document.getElementById(
            "adminWelcomeDate"
        );

    const employeeDate =
        document.getElementById(
            "employeeWelcomeDate"
        );


    const name =
        user?.name ||
        user?.username ||
        user?.email ||
        "User";


    const roleLabel =
        user?.role ===
        "ADMIN"
            ? "Administrator"
            : "Employee";


    if (userName) {

        userName.textContent =
            name;

    }


    if (welcomeName) {

        welcomeName.textContent =
            name;

    }


    if (employeeName) {

        employeeName.textContent =
            name;

    }


    if (userRole) {

        userRole.textContent =
            roleLabel;

    }


    if (avatar) {

        avatar.textContent =
            getInitials(
                name
            );

    }


    if (menuName) {

        menuName.textContent =
            name;

    }


    if (menuEmail) {

        menuEmail.textContent =
            user?.email ||
            "";

    }


    const formattedDate =
        new Intl.DateTimeFormat(
            "en-IN",
            {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
            }
        ).format(
            new Date()
        );


    if (adminDate) {

        adminDate.textContent =
            formattedDate.toUpperCase();

    }


    if (employeeDate) {

        employeeDate.textContent =
            formattedDate.toUpperCase();

    }

}


/* =========================================================
   ROLE-BASED VIEW
========================================================= */

function initializeDashboardRole(
    user
) {

    const role =
        String(
            user?.role ||
            "EMPLOYEE"
        ).toUpperCase();


    const isAdmin =
        role === "ADMIN";


    /*
     * Hide/show navigation elements
     * according to role.
     */
    document
        .querySelectorAll(
            "[data-role]"
        )
        .forEach(
            element => {

                const allowedRoles =
                    String(
                        element.dataset.role ||
                        ""
                    )
                        .split(",")
                        .map(
                            item =>
                                item
                                    .trim()
                                    .toUpperCase()
                        );


                element.hidden =
                    !allowedRoles.includes(
                        role
                    );

            }
        );


    const adminView =
        document.getElementById(
            "adminDashboardView"
        );


    const employeeView =
        document.getElementById(
            "employeeDashboardView"
        );


    if (adminView) {

        adminView.hidden =
            !isAdmin;

    }


    if (employeeView) {

        employeeView.hidden =
            isAdmin;

    }

}


/* =========================================================
   DASHBOARD ACTIONS
========================================================= */

function initializeDashboardActions(
    user
) {

    const role =
        String(
            user?.role ||
            "EMPLOYEE"
        ).toUpperCase();


    const addEmployeeButton =
        document.getElementById(
            "dashboardAddEmployee"
        );


    const exportButton =
        document.getElementById(
            "dashboardExportReport"
        );


    const searchButton =
        document.querySelector(
            '.topbar-icon-button[aria-label="Search"]'
        );


    const notificationButton =
        document.querySelector(
            ".notification-button"
        );


    /*
     * Admin: Add Employee
     */
    if (
        addEmployeeButton
    ) {

        addEmployeeButton.addEventListener(
            "click",
            () => {

                if (
                    role !==
                    "ADMIN"
                ) {
                    return;
                }

                window.location.href =
                    "employees.html?add=1";

            }
        );

    }


    /*
     * Admin: Reports
     */
    if (
        exportButton
    ) {

        exportButton.addEventListener(
            "click",
            () => {

                if (
                    role !==
                    "ADMIN"
                ) {
                    return;
                }

                window.location.href =
                    "reports.html";

            }
        );

    }


    /*
     * Search shortcut
     */
    if (
        searchButton
    ) {

        searchButton.addEventListener(
            "click",
            () => {

                if (
                    role ===
                    "ADMIN"
                ) {

                    window.location.href =
                        "employees.html";

                } else {

                    window.location.href =
                        "tasks.html";

                }

            }
        );

    }


    /*
     * Notification button
     */
    if (
        notificationButton
    ) {

        notificationButton.addEventListener(
            "click",
            () => {

                showDashboardNotice(
                    "No new notifications."
                );

            }
        );

    }

}


/* =========================================================
   LIVE DASHBOARD DATA
========================================================= */

async function loadDashboardData(
    user
) {

    if (!user) {
        return;
    }


    const role =
        String(
            user?.role ||
            "EMPLOYEE"
        ).toUpperCase();


    try {

        showDashboardLoading();


        if (
            role ===
            "ADMIN"
        ) {

            await loadAdminDashboard();

        } else {

            await loadEmployeeDashboard();

        }

    } catch (error) {

        console.error(
            "Dashboard data loading error:",
            error
        );


        showDashboardError(
            getDashboardErrorMessage(
                error
            )
        );

    }

}


/* =========================================================
   ADMIN DASHBOARD
========================================================= */

async function loadAdminDashboard() {

    const [
        totalEmployees,
        activeEmployees,
        pendingTasks,
        completedTasks,
        pendingLeaves
    ] =
        await Promise.all(
            [

                getDashboardCount(
                    "/employees/"
                ),

                getDashboardCount(
                    "/employees/?employment_status=ACTIVE"
                ),

                getDashboardCount(
                    "/tasks/?status=PENDING"
                ),

                getDashboardCount(
                    "/tasks/?status=COMPLETED"
                ),

                getDashboardCount(
                    "/leaves/?status=PENDING"
                ),

            ]
        );


    setDashboardMetric(
        "totalEmployees",
        totalEmployees
    );


    setDashboardMetric(
        "activeEmployees",
        activeEmployees
    );


    setDashboardMetric(
        "pendingTasks",
        pendingTasks
    );


    setDashboardMetric(
        "completedTasks",
        completedTasks
    );


    setDashboardMetric(
        "pendingLeaveRequests",
        pendingLeaves
    );


    const activeDescription =
        document.getElementById(
            "activeEmployeesDescription"
        );


    if (
        activeDescription
    ) {

        if (
            totalEmployees >
            0
        ) {

            const percentage =
                (
                    activeEmployees /
                    totalEmployees
                ) *
                100;


            activeDescription.textContent =
                `${percentage.toFixed(1)}% of total workforce`;

        } else {

            activeDescription.textContent =
                "No employees registered yet";

        }

    }

}


/* =========================================================
   EMPLOYEE DASHBOARD
========================================================= */

async function loadEmployeeDashboard() {

    const [
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        pendingLeaves,
        approvedLeaves
    ] =
        await Promise.all(
            [

                getDashboardCount(
                    "/tasks/"
                ),

                getDashboardCount(
                    "/tasks/?status=PENDING"
                ),

                getDashboardCount(
                    "/tasks/?status=IN_PROGRESS"
                ),

                getDashboardCount(
                    "/tasks/?status=COMPLETED"
                ),

                getDashboardCount(
                    "/leaves/?status=PENDING"
                ),

                getDashboardCount(
                    "/leaves/?status=APPROVED"
                ),

            ]
        );


    setDashboardMetric(
        "employeeTotalTasks",
        totalTasks
    );


    setDashboardMetric(
        "employeePendingTasks",
        pendingTasks
    );


    setDashboardMetric(
        "employeeInProgressTasks",
        inProgressTasks
    );


    setDashboardMetric(
        "employeeCompletedTasks",
        completedTasks
    );


    setDashboardMetric(
        "employeePendingLeaves",
        pendingLeaves
    );


    setDashboardMetric(
        "employeeApprovedLeaves",
        approvedLeaves
    );

}


/* =========================================================
   GENERIC COUNT REQUEST
========================================================= */

async function getDashboardCount(
    endpoint
) {

    let finalEndpoint =
        endpoint;


    /*
     * Only request one row.
     * We use server pagination's total_items
     * to get the real count.
     */
    if (
        endpoint.includes("?")
    ) {

        finalEndpoint +=
            "&page_size=1";

    } else {

        finalEndpoint +=
            "?page_size=1";

    }


    const response =
        await apiRequest(
            finalEndpoint,
            {
                method: "GET"
            }
        );


    if (
        !response
    ) {

        throw new Error(
            "Empty dashboard response."
        );

    }


    if (
        response.success ===
        false
    ) {

        throw new Error(
            response.message ||
            "Dashboard API request failed."
        );

    }


    /*
     * Preferred source.
     */
    const totalFromPagination =
        Number(
            response
                ?.pagination
                ?.total_items
        );


    if (
        Number.isFinite(
            totalFromPagination
        )
    ) {

        return totalFromPagination;

    }


    /*
     * Some APIs may return count directly.
     */
    const directCount =
        Number(
            response.count
        );


    if (
        Number.isFinite(
            directCount
        )
    ) {

        return directCount;

    }


    /*
     * Fallback to returned data length.
     */
    if (
        Array.isArray(
            response.data
        )
    ) {

        return response.data.length;

    }


    return 0;

}


/* =========================================================
   LOADING STATE
========================================================= */

function showDashboardLoading() {

    const metricIds = [

        "totalEmployees",

        "activeEmployees",

        "pendingTasks",

        "completedTasks",

        "pendingLeaveRequests",

        "employeeTotalTasks",

        "employeePendingTasks",

        "employeeInProgressTasks",

        "employeeCompletedTasks",

        "employeePendingLeaves",

        "employeeApprovedLeaves"

    ];


    metricIds.forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );


            if (element) {

                element.textContent =
                    "—";

            }

        }
    );

}


/* =========================================================
   ERROR STATE
========================================================= */

function showDashboardError(
    message
) {

    console.error(
        message
    );


    const metricIds = [

        "totalEmployees",

        "activeEmployees",

        "pendingTasks",

        "completedTasks",

        "pendingLeaveRequests",

        "employeeTotalTasks",

        "employeePendingTasks",

        "employeeInProgressTasks",

        "employeeCompletedTasks",

        "employeePendingLeaves",

        "employeeApprovedLeaves"

    ];


    metricIds.forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );


            if (element) {

                element.textContent =
                    "—";

            }

        }
    );


    const activeDescription =
        document.getElementById(
            "activeEmployeesDescription"
        );


    if (
        activeDescription
    ) {

        activeDescription.textContent =
            "Statistics unavailable";

    }

}


/* =========================================================
   SET DASHBOARD METRIC
========================================================= */

function setDashboardMetric(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    const numericValue =
        Number(
            value
        );


    element.textContent =
        Number.isFinite(
            numericValue
        )
            ? String(
                numericValue
            )
            : "—";

}


/* =========================================================
   USER MENU
========================================================= */

function initializeUserMenu() {

    const userButton =
        document.getElementById(
            "dashboardUserButton"
        );


    const menu =
        document.getElementById(
            "dashboardUserMenu"
        );


    if (
        !userButton ||
        !menu
    ) {

        return;

    }


    userButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            const isOpen =
                menu.classList.toggle(
                    "show"
                );


            userButton.setAttribute(
                "aria-expanded",
                String(
                    isOpen
                )
            );


            menu.setAttribute(
                "aria-hidden",
                String(
                    !isOpen
                )
            );

        }
    );


    menu.addEventListener(
        "click",
        event => {

            event.stopPropagation();

        }
    );


    document.addEventListener(
        "click",
        () => {

            menu.classList.remove(
                "show"
            );


            userButton.setAttribute(
                "aria-expanded",
                "false"
            );


            menu.setAttribute(
                "aria-hidden",
                "true"
            );

        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                menu.classList.remove(
                    "show"
                );


                userButton.setAttribute(
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


    const logoutItem =
        document.getElementById(
            "dashboardMenuLogout"
        );


    if (
        logoutItem
    ) {

        logoutItem.addEventListener(
            "click",
            event => {

                event.preventDefault();


                menu.classList.remove(
                    "show"
                );


                if (
                    typeof logout ===
                    "function"
                ) {

                    logout();

                    return;

                }


                if (
                    typeof logoutUser ===
                    "function"
                ) {

                    logoutUser();

                    return;

                }


                /*
                 * Safe fallback.
                 */
                localStorage.removeItem(
                    "access_token"
                );

                localStorage.removeItem(
                    "refresh_token"
                );

                localStorage.removeItem(
                    "current_user"
                );


                sessionStorage.clear();


                window.location.href =
                    "index.html";

            }
        );

    }

}


/* =========================================================
   NOTICE
========================================================= */

function showDashboardNotice(
    message
) {

    let notice =
        document.getElementById(
            "dashboardNotice"
        );


    if (!notice) {

        notice =
            document.createElement(
                "div"
            );


        notice.id =
            "dashboardNotice";


        notice.className =
            "dashboard-inline-notice";


        document.body.appendChild(
            notice
        );

    }


    notice.textContent =
        message;


    notice.classList.add(
        "show"
    );


    window.clearTimeout(
        showDashboardNotice.timeoutId
    );


    showDashboardNotice.timeoutId =
        window.setTimeout(
            () => {

                notice.classList.remove(
                    "show"
                );

            },
            3500
        );

}


/* =========================================================
   ERROR MESSAGE
========================================================= */

function getDashboardErrorMessage(
    error
) {

    if (!error) {

        return "Unable to load dashboard data.";

    }


    if (
        typeof error.message ===
        "string" &&
        error.message.trim()
    ) {

        return error.message;

    }


    return "Unable to load dashboard data.";

}


/* =========================================================
   INITIALS
========================================================= */

function getInitials(
    name
) {

    const safeName =
        String(
            name ||
            "User"
        )
            .trim();


    if (!safeName) {

        return "U";

    }


    return safeName
        .split(
            /\s+/
        )
        .slice(
            0,
            2
        )
        .map(
            word =>
                word
                    .charAt(0)
                    .toUpperCase()
        )
        .join(
            ""
        ) || "U";

}


/* =========================================================
   CLEANUP
========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        if (
            dashboardRefreshTimer
        ) {

            window.clearInterval(
                dashboardRefreshTimer
            );

            dashboardRefreshTimer =
                null;

        }

    }
);