"use strict";

/* =========================================================
   GLOBAL STATE
========================================================= */

let currentLeavePage = 1;
let totalLeavePages = 1;

let currentLeaves = [];

let leaveModalMode = "create";
let selectedLeaveId = null;

let leaveRequestController = null;


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    if (!requireAuthentication()) {
        return;
    }

    initializeLeavePage();
    initializeLeaveUserInfo();
    initializeLeaveUserMenu();
    applyLeaveRoleUI();

    await loadLeaveEmployees();
    await loadLeaves();
});


/* =========================================================
   INITIALIZE PAGE
========================================================= */

function initializeLeavePage() {

    const search =
        document.getElementById("leaveSearch");

    const employeeFilter =
        document.getElementById("leaveEmployeeFilter");

    const typeFilter =
        document.getElementById("leaveTypeFilter");

    const statusFilter =
        document.getElementById("leaveStatusFilter");

    const ordering =
        document.getElementById("leaveOrdering");

    const resetButton =
        document.getElementById("resetLeaveFilters");

    const applyButton =
        document.getElementById("applyLeaveButton");

    const emptyApplyButton =
        document.getElementById("emptyApplyLeaveButton");

    const alertClose =
        document.getElementById("leaveAlertClose");

    const leaveForm =
        document.getElementById("leaveForm");

    const previousButton =
        document.getElementById("previousLeavePage");

    const nextButton =
        document.getElementById("nextLeavePage");


    /* Search */
    search?.addEventListener(
        "input",
        debounce(() => {

            currentLeavePage = 1;

            loadLeaves();

        }, 350)
    );


    /* Employee */
    employeeFilter?.addEventListener(
        "change",
        () => {

            currentLeavePage = 1;

            loadLeaves();

        }
    );


    /* Leave type */
    typeFilter?.addEventListener(
        "change",
        () => {

            currentLeavePage = 1;

            loadLeaves();

        }
    );


    /* Status */
    statusFilter?.addEventListener(
        "change",
        () => {

            currentLeavePage = 1;

            loadLeaves();

        }
    );


    /* Ordering */
    ordering?.addEventListener(
        "change",
        () => {

            currentLeavePage = 1;

            loadLeaves();

        }
    );


    /* Reset */
    resetButton?.addEventListener(
        "click",
        resetLeaveFilters
    );


    /* Apply Leave */
    applyButton?.addEventListener(
        "click",
        openCreateLeaveModal
    );

    emptyApplyButton?.addEventListener(
        "click",
        openCreateLeaveModal
    );


    /* Alert */
    alertClose?.addEventListener(
        "click",
        hideLeaveAlert
    );


    /* Form */
    leaveForm?.addEventListener(
        "submit",
        handleLeaveSubmit
    );


    /* Previous */
    previousButton?.addEventListener(
        "click",
        () => {

            if (currentLeavePage <= 1) {
                return;
            }

            currentLeavePage -= 1;

            loadLeaves();
        }
    );


    /* Next */
    nextButton?.addEventListener(
        "click",
        () => {

            if (
                currentLeavePage >=
                totalLeavePages
            ) {
                return;
            }

            currentLeavePage += 1;

            loadLeaves();
        }
    );


    initializeLeaveDateValidation();
    initializeLeaveModalReset();
}


/* =========================================================
   USER INFO
========================================================= */

function initializeLeaveUserInfo() {

    const user =
        getCurrentUser();

    if (!user) {
        return;
    }

    const name =
        user.name ||
        user.username ||
        "User";

    const role =
        user.role === "ADMIN"
            ? "Administrator"
            : "Employee";


    setText(
        "leaveUserName",
        name
    );

    setText(
        "leaveUserRole",
        role
    );

    setText(
        "leaveUserAvatar",
        getInitials(name)
    );

    setText(
        "leaveMenuUserName",
        name
    );

    setText(
        "leaveMenuUserEmail",
        user.email || "No email"
    );
}


/* =========================================================
   ROLE UI
========================================================= */

function applyLeaveRoleUI() {

    const user =
        getCurrentUser();

    const isAdmin =
        user?.role === "ADMIN";


    setText(
        "leaveTopbarHeading",
        isAdmin
            ? "Leave Requests"
            : "My Leaves"
    );


    setText(
        "leaveHeading",
        isAdmin
            ? "Leave Management"
            : "My Leaves"
    );


    setText(
        "leavePageDescription",
        isAdmin
            ? "Review employee leave requests and manage approvals."
            : "Apply for leave and track your leave requests."
    );


    setText(
        "leaveSectionLabel",
        isAdmin
            ? "Management"
            : "Workspace"
    );


    setText(
        "leaveSidebarLabel",
        isAdmin
            ? "Leave Management"
            : "My Leaves"
    );


    setText(
        "leaveTableHeading",
        isAdmin
            ? "Leave Requests"
            : "My Leave Records"
    );


    setText(
        "leaveTaskLabel",
        isAdmin
            ? "Tasks"
            : "My Tasks"
    );


    const employeeFilterWrap =
        document.getElementById(
            "leaveEmployeeFilterWrap"
        );


    if (employeeFilterWrap) {

        employeeFilterWrap.hidden =
            !isAdmin;
    }


    /* ADMIN-only elements */
    document
        .querySelectorAll('[data-role="ADMIN"]')
        .forEach((element) => {

            element.hidden =
                !isAdmin;
        });


    /* EMPLOYEE-only elements */
    document
        .querySelectorAll('[data-role="EMPLOYEE"]')
        .forEach((element) => {

            element.hidden =
                isAdmin;
        });
}


/* =========================================================
   LOAD EMPLOYEES
========================================================= */

async function loadLeaveEmployees() {

    const select =
        document.getElementById(
            "leaveEmployeeFilter"
        );

    if (!select) {
        return;
    }


    if (
        getCurrentUser()?.role !==
        "ADMIN"
    ) {
        return;
    }


    try {

        const response =
            await apiRequest(
                "/employees/?page=1&page_size=100",
                {
                    method: "GET"
                }
            );


        ensureLeaveResponse(
            response,
            "Unable to load employees."
        );


        const employees =
            Array.isArray(response.data)
                ? response.data
                : [];


        select.innerHTML =
            '<option value="">All Employees</option>';


        employees.forEach(
            (employee) => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    employee.id;

                option.textContent =
                    `${employee.name || "Employee"} (${employee.employee_id || employee.id})`;

                select.appendChild(option);
            }
        );

    } catch (error) {

        console.error(
            "Leave employee loading error:",
            error
        );

    }
}


/* =========================================================
   LOAD LEAVES
========================================================= */

async function loadLeaves() {

    if (leaveRequestController) {
        leaveRequestController.abort();
    }


    const controller =
        new AbortController();

    leaveRequestController =
        controller;


    showLeaveLoading();


    try {

        const params =
            new URLSearchParams();


        const search =
            getValue("leaveSearch");

        const employee =
            getValue("leaveEmployeeFilter");

        const type =
            getValue("leaveTypeFilter");

        const leaveStatus =
            getValue("leaveStatusFilter");

        const ordering =
            getValue("leaveOrdering") ||
            "-created_at";


        params.set(
            "page",
            String(currentLeavePage)
        );

        params.set(
            "ordering",
            ordering
        );


        if (search) {

            params.set(
                "search",
                search
            );
        }


        if (employee) {

            params.set(
                "employee",
                employee
            );
        }


        if (type) {

            params.set(
                "leave_type",
                type
            );
        }


        if (leaveStatus) {

            params.set(
                "status",
                leaveStatus
            );
        }


        const response =
            await apiRequest(
                `/leaves/?${params.toString()}`,
                {
                    method: "GET",
                    signal: controller.signal
                }
            );


        if (controller.signal.aborted) {
            return;
        }


        ensureLeaveResponse(
            response,
            "Unable to load leave requests."
        );


        currentLeaves =
            Array.isArray(response.data)
                ? response.data
                : [];


        const pagination =
            response.pagination || {};


        currentLeavePage =
            Number(
                pagination.page
            ) ||
            currentLeavePage ||
            1;


        totalLeavePages =
            Math.max(
                Number(
                    pagination.total_pages
                ) || 1,
                1
            );


        renderLeaveTable(
            currentLeaves,
            Number(
                pagination.total_items
            ) ||
            currentLeaves.length
        );


        renderLeavePagination(
            {
                page:
                    currentLeavePage,

                page_size:
                    Number(
                        pagination.page_size
                    ) || 10,

                total_items:
                    Number(
                        pagination.total_items
                    ) ||
                    currentLeaves.length,

                total_pages:
                    totalLeavePages
            }
        );

    } catch (error) {

        if (
            error?.name ===
            "AbortError"
        ) {
            return;
        }


        console.error(
            "Leave loading error:",
            error
        );


        showLeaveError(
            getApiErrorMessage(
                error,
                "Unable to load leave requests."
            )
        );

    } finally {

        if (
            leaveRequestController ===
            controller
        ) {

            leaveRequestController =
                null;
        }
    }
}


/* =========================================================
   RENDER TABLE
========================================================= */

function renderLeaveTable(
    leaves,
    totalCount = leaves.length
) {

    const wrapper =
        document.getElementById(
            "leaveTableWrapper"
        );

    const empty =
        document.getElementById(
            "leaveEmpty"
        );

    const loading =
        document.getElementById(
            "leaveLoading"
        );

    const pagination =
        document.getElementById(
            "leavePagination"
        );

    const tbody =
        document.getElementById(
            "leaveTableBody"
        );

    const count =
        document.getElementById(
            "leaveCount"
        );


    loading?.classList.add(
        "d-none"
    );


    if (count) {

        count.textContent =
            totalCount;
    }


    if (!leaves.length) {

        wrapper?.classList.add(
            "d-none"
        );

        pagination?.classList.add(
            "d-none"
        );

        empty?.classList.remove(
            "d-none"
        );


        if (tbody) {
            tbody.innerHTML = "";
        }


        const heading =
            document.getElementById(
                "leaveEmptyHeading"
            );

        const description =
            document.getElementById(
                "leaveEmptyDescription"
            );

        const icon =
            document.getElementById(
                "leaveEmptyIcon"
            );


        if (heading) {

            heading.textContent =
                "No leave requests found";
        }


        if (description) {

            description.textContent =
                "There are no leave records matching your current filters.";
        }


        if (icon) {

            icon.className =
                "bi bi-calendar2-check";
        }


        const emptyApplyButton =
            document.getElementById(
                "emptyApplyLeaveButton"
            );


        if (emptyApplyButton) {

            emptyApplyButton.hidden =
                getCurrentUser()?.role !==
                "EMPLOYEE";
        }


        return;
    }


    empty?.classList.add(
        "d-none"
    );

    wrapper?.classList.remove(
        "d-none"
    );

    pagination?.classList.remove(
        "d-none"
    );


    if (tbody) {

        tbody.innerHTML =
            leaves
                .map(renderLeaveRow)
                .join("");
    }
}


/* =========================================================
   RENDER ROW
========================================================= */

function renderLeaveRow(leave) {

    const user =
        getCurrentUser();

    const isAdmin =
        user?.role === "ADMIN";


    const leaveType =
        normalizeValue(
            leave.leave_type
        );


    const leaveStatus =
        normalizeValue(
            leave.status
        );


    const employeeName =
        leave.employee_name ||
        "Employee";


    const employeeId =
        leave.employee_id ||
        "";


    const duration =
        calculateLeaveDuration(
            leave.from_date,
            leave.to_date
        );


    const remarks =
        leave.admin_remarks ||
        "—";


    const statusClass =
        getLeaveStatusClass(
            leaveStatus
        );


    const statusText =
        getLeaveStatusText(
            leaveStatus
        );


    let actions = `
        <button
            type="button"
            class="task-action-button view"
            title="View leave"
            aria-label="View leave"
            data-action="view"
            data-id="${Number(leave.id)}"
        >
            <i class="bi bi-eye"></i>
        </button>
    `;


    if (
        isAdmin &&
        leaveStatus === "PENDING"
    ) {

        actions += `
            <button
                type="button"
                class="task-action-button edit"
                title="Review leave"
                aria-label="Review leave"
                data-action="review"
                data-id="${Number(leave.id)}"
            >
                <i class="bi bi-check2-square"></i>
            </button>
        `;
    }


    if (isAdmin) {

        actions += `
            <button
                type="button"
                class="task-action-button delete"
                title="Delete leave"
                aria-label="Delete leave"
                data-action="delete"
                data-id="${Number(leave.id)}"
            >
                <i class="bi bi-trash3"></i>
            </button>
        `;
    }


    return `
        <tr>

            <td>

                <div class="task-assigned-person">

                    <div class="task-assigned-avatar">
                        ${escapeHtml(
                            getInitials(employeeName)
                        )}
                    </div>

                    <div class="task-assigned-info">

                        <strong>
                            ${escapeHtml(
                                employeeName
                            )}
                        </strong>

                        <span>
                            ${escapeHtml(
                                employeeId
                            )}
                        </span>

                    </div>

                </div>

            </td>


            <td>

                <span class="leave-type-badge">
                    ${escapeHtml(
                        getLeaveTypeText(
                            leaveType
                        )
                    )}
                </span>

            </td>


            <td>
                ${escapeHtml(
                    formatLeaveDate(
                        leave.from_date
                    )
                )}
            </td>


            <td>
                ${escapeHtml(
                    formatLeaveDate(
                        leave.to_date
                    )
                )}
            </td>


            <td>

                <span class="leave-duration">
                    ${escapeHtml(
                        duration
                    )}
                </span>

            </td>


            <td>

                <span
                    class="leave-status ${statusClass}"
                >

                    <span></span>

                    ${escapeHtml(
                        statusText
                    )}

                </span>

            </td>


            <td>

                <span
                    class="leave-remarks"
                    title="${escapeHtml(remarks)}"
                >
                    ${escapeHtml(
                        truncateText(
                            remarks,
                            45
                        )
                    )}
                </span>

            </td>


            <td>

                <div class="task-actions">
                    ${actions}
                </div>

            </td>

        </tr>
    `;
}


/* =========================================================
   TABLE ACTIONS
========================================================= */

document.addEventListener(
    "click",
    (event) => {

        const button =
            event.target.closest(
                "[data-action]"
            );


        if (!button) {
            return;
        }


        const id =
            Number(
                button.dataset.id
            );


        const action =
            button.dataset.action;


        if (!id) {
            return;
        }


        if (action === "view") {
            viewLeave(id);
        }


        if (action === "review") {
            reviewLeave(id);
        }


        if (action === "delete") {
            deleteLeave(id);
        }
    }
);


/* =========================================================
   CREATE LEAVE
========================================================= */

function openCreateLeaveModal() {

    if (
        getCurrentUser()?.role !==
        "EMPLOYEE"
    ) {
        return;
    }


    leaveModalMode =
        "create";

    selectedLeaveId =
        null;


    const form =
        document.getElementById(
            "leaveForm"
        );


    form?.reset();

    clearLeaveFormErrors();


    setText(
        "leaveModalTitle",
        "Apply Leave"
    );


    setText(
        "leaveModalSubtitle",
        "Submit a new leave request."
    );


    setText(
        "leaveSubmitText",
        "Submit Leave"
    );


    document
        .getElementById(
            "leaveAdminReviewWrap"
        )
        ?.classList.add("d-none");


    document
        .getElementById(
            "leaveAdminStatusWrap"
        )
        ?.classList.add("d-none");


    document
        .getElementById(
            "leaveReviewEmployeeWrap"
        )
        ?.classList.add("d-none");


    [
        "leaveType",
        "leaveFromDate",
        "leaveToDate",
        "leaveReason"
    ].forEach(
        (id) => {

            document
                .getElementById(id)
                ?.removeAttribute(
                    "disabled"
                );
        }
    );


    document
        .getElementById(
            "leaveSubmitButton"
        )
        ?.classList.remove(
            "d-none"
        );


    setLeaveDateMinimums();

    openLeaveModal(
        "leaveModal"
    );
}


/* =========================================================
   VIEW LEAVE
========================================================= */

async function viewLeave(id) {

    if (!id) {
        return;
    }


    try {

        const response =
            await apiRequest(
                `/leaves/${id}/`,
                {
                    method: "GET"
                }
            );


        ensureLeaveResponse(
            response,
            "Unable to load leave details."
        );


        renderLeaveDetails(
            response.data
        );


        openLeaveModal(
            "leaveDetailsModal"
        );

    } catch (error) {

        console.error(
            "View leave error:",
            error
        );


        showLeaveAlert(
            getApiErrorMessage(
                error,
                "Unable to load leave details."
            ),
            "error"
        );
    }
}


/* =========================================================
   REVIEW LEAVE
========================================================= */

async function reviewLeave(id) {

    if (
        getCurrentUser()?.role !==
        "ADMIN"
    ) {
        return;
    }


    if (!id) {
        return;
    }


    try {

        const response =
            await apiRequest(
                `/leaves/${id}/`,
                {
                    method: "GET"
                }
            );


        ensureLeaveResponse(
            response,
            "Unable to load leave request."
        );


        const leave =
            response.data;


        leaveModalMode =
            "review";

        selectedLeaveId =
            Number(id);


        setText(
            "leaveModalTitle",
            "Review Leave Request"
        );


        setText(
            "leaveModalSubtitle",
            "Approve or reject this leave request."
        );


        setText(
            "leaveSubmitText",
            "Save Decision"
        );


        setValue(
            "leaveType",
            leave.leave_type
        );


        setValue(
            "leaveFromDate",
            leave.from_date
        );


        setValue(
            "leaveToDate",
            leave.to_date
        );


        setValue(
            "leaveReason",
            leave.reason
        );


        setValue(
            "leaveAdminRemarks",
            ""
        );


        setValue(
            "leaveAdminStatus",
            ""
        );


        setText(
            "leaveReviewEmployee",
            `${leave.employee_name || "-"} (${leave.employee_id || "-"})`
        );


        document
            .getElementById(
                "leaveReviewEmployeeWrap"
            )
            ?.classList.remove(
                "d-none"
            );


        document
            .getElementById(
                "leaveAdminReviewWrap"
            )
            ?.classList.remove(
                "d-none"
            );


        document
            .getElementById(
                "leaveAdminStatusWrap"
            )
            ?.classList.remove(
                "d-none"
            );


        [
            "leaveType",
            "leaveFromDate",
            "leaveToDate",
            "leaveReason"
        ].forEach(
            (id) => {

                document
                    .getElementById(id)
                    ?.setAttribute(
                        "disabled",
                        "disabled"
                    );
            }
        );


        openLeaveModal(
            "leaveModal"
        );

    } catch (error) {

        console.error(
            "Review leave error:",
            error
        );


        showLeaveAlert(
            getApiErrorMessage(
                error,
                "Unable to load leave request."
            ),
            "error"
        );
    }
}


/* =========================================================
   SUBMIT LEAVE / REVIEW
========================================================= */

async function handleLeaveSubmit(
    event
) {

    event.preventDefault();

    clearLeaveFormErrors();


    const isAdmin =
        getCurrentUser()?.role ===
        "ADMIN";


    if (
        leaveModalMode ===
            "review" &&
        isAdmin
    ) {

        await submitLeaveReview();

        return;
    }


    const data = {

        leave_type:
            getValue(
                "leaveType"
            ),

        from_date:
            getValue(
                "leaveFromDate"
            ),

        to_date:
            getValue(
                "leaveToDate"
            ),

        reason:
            getValue(
                "leaveReason"
            )

    };


    if (
        !validateLeaveForm(
            data
        )
    ) {
        return;
    }


    const submitButton =
        document.getElementById(
            "leaveSubmitButton"
        );

    const spinner =
        document.getElementById(
            "leaveSubmitSpinner"
        );

    const icon =
        document.getElementById(
            "leaveSubmitIcon"
        );


    submitButton?.setAttribute(
        "disabled",
        "disabled"
    );


    spinner?.classList.remove(
        "d-none"
    );


    icon?.classList.add(
        "d-none"
    );


    setText(
        "leaveSubmitText",
        "Submitting..."
    );


    try {

        const response =
            await apiRequest(
                "/leaves/",
                {
                    method: "POST",
                    body: data
                }
            );


        ensureLeaveResponse(
            response,
            "Unable to submit leave request."
        );


        closeLeaveModal(
            "leaveModal"
        );


        showLeaveAlert(
            "Leave request submitted successfully.",
            "success"
        );


        currentLeavePage =
            1;


        await loadLeaves();

    } catch (error) {

        console.error(
            "Leave submit error:",
            error
        );


        handleLeaveFormApiErrors(
            error
        );


        if (
            !hasLeaveFormErrors()
        ) {

            showLeaveAlert(
                getApiErrorMessage(
                    error,
                    "Unable to submit leave request."
                ),
                "error"
            );
        }

    } finally {

        submitButton?.removeAttribute(
            "disabled"
        );

        spinner?.classList.add(
            "d-none"
        );

        icon?.classList.remove(
            "d-none"
        );

        setText(
            "leaveSubmitText",
            "Submit Leave"
        );
    }
}


/* =========================================================
   ADMIN REVIEW SUBMIT
========================================================= */

async function submitLeaveReview() {

    if (!selectedLeaveId) {
        return;
    }


    const decision =
        getValue(
            "leaveAdminStatus"
        );


    const remarks =
        getValue(
            "leaveAdminRemarks"
        );


    if (!decision) {

        setLeaveFormError(
            "leaveAdminStatus",
            "Please select Approve or Reject."
        );

        return;
    }


    if (!remarks) {

        setLeaveFormError(
            "leaveAdminRemarks",
            "Approval/rejection remarks are required."
        );

        return;
    }


    if (remarks.length < 3) {

        setLeaveFormError(
            "leaveAdminRemarks",
            "Remarks must contain at least 3 characters."
        );

        return;
    }


    const button =
        document.getElementById(
            "leaveSubmitButton"
        );

    const spinner =
        document.getElementById(
            "leaveSubmitSpinner"
        );

    const icon =
        document.getElementById(
            "leaveSubmitIcon"
        );


    button?.setAttribute(
        "disabled",
        "disabled"
    );


    spinner?.classList.remove(
        "d-none"
    );


    icon?.classList.add(
        "d-none"
    );


    setText(
        "leaveSubmitText",
        "Saving..."
    );


    try {

        const response =
            await apiRequest(
                `/leaves/${selectedLeaveId}/`,
                {
                    method: "PATCH",

                    body: {
                        status:
                            decision,

                        admin_remarks:
                            remarks
                    }
                }
            );


        ensureLeaveResponse(
            response,
            "Unable to review leave request."
        );


        closeLeaveModal(
            "leaveModal"
        );


        showLeaveAlert(
            decision === "APPROVED"
                ? "Leave request approved successfully."
                : "Leave request rejected successfully.",
            "success"
        );


        selectedLeaveId =
            null;


        currentLeavePage =
            1;


        await loadLeaves();

    } catch (error) {

        console.error(
            "Leave review error:",
            error
        );


        handleLeaveFormApiErrors(
            error
        );


        if (
            !hasLeaveFormErrors()
        ) {

            showLeaveAlert(
                getApiErrorMessage(
                    error,
                    "Unable to review leave request."
                ),
                "error"
            );
        }

    } finally {

        button?.removeAttribute(
            "disabled"
        );

        spinner?.classList.add(
            "d-none"
        );

        icon?.classList.remove(
            "d-none"
        );

        setText(
            "leaveSubmitText",
            "Save Decision"
        );
    }
}


/* =========================================================
   VALIDATION
========================================================= */

function validateLeaveForm(
    data
) {

    let valid = true;


    /* Leave Type */

    if (!data.leave_type) {

        setLeaveFormError(
            "leaveType",
            "Please select a leave type."
        );

        valid = false;
    }


    /* From Date */

    if (!data.from_date) {

        setLeaveFormError(
            "leaveFromDate",
            "From date is required."
        );

        valid = false;
    }


    /* To Date */

    if (!data.to_date) {

        setLeaveFormError(
            "leaveToDate",
            "To date is required."
        );

        valid = false;
    }


    /* Date Logic */

    if (
        data.from_date &&
        data.to_date
    ) {

        const today =
            getLocalLeaveDate();


        if (
            data.from_date <
            today
        ) {

            setLeaveFormError(
                "leaveFromDate",
                "From date cannot be in the past."
            );

            valid = false;
        }


        if (
            data.to_date <
            today
        ) {

            setLeaveFormError(
                "leaveToDate",
                "To date cannot be in the past."
            );

            valid = false;
        }


        if (
            data.to_date <
            data.from_date
        ) {

            setLeaveFormError(
                "leaveToDate",
                "To date must be greater than or equal to from date."
            );

            valid = false;
        }
    }


    /* Reason */

    if (!data.reason) {

        setLeaveFormError(
            "leaveReason",
            "Reason for leave is required."
        );

        valid = false;

    } else if (
        data.reason.length < 3
    ) {

        setLeaveFormError(
            "leaveReason",
            "Reason must contain at least 3 characters."
        );

        valid = false;
    }


    return valid;
}


/* =========================================================
   DELETE
========================================================= */

async function deleteLeave(id) {

    if (
        getCurrentUser()?.role !==
        "ADMIN"
    ) {
        return;
    }


    if (!id) {
        return;
    }


    const confirmed =
        window.confirm(
            "Delete this leave request?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await apiRequest(
                `/leaves/${id}/`,
                {
                    method: "DELETE"
                }
            );


        ensureLeaveResponse(
            response,
            "Unable to delete leave request."
        );


        showLeaveAlert(
            "Leave request deleted successfully.",
            "success"
        );


        if (
            currentLeaves.length ===
                1 &&
            currentLeavePage > 1
        ) {

            currentLeavePage -=
                1;
        }


        await loadLeaves();

    } catch (error) {

        console.error(
            "Delete leave error:",
            error
        );


        showLeaveAlert(
            getApiErrorMessage(
                error,
                "Unable to delete leave request."
            ),
            "error"
        );
    }
}


/* =========================================================
   DETAILS
========================================================= */

function renderLeaveDetails(
    leave
) {

    setText(
        "detailsLeaveEmployee",
        leave.employee_name || "-"
    );


    setText(
        "detailsLeaveEmployeeId",
        leave.employee_id || "-"
    );


    setText(
        "detailsLeaveType",
        getLeaveTypeText(
            leave.leave_type
        )
    );


    setText(
        "detailsLeaveFrom",
        formatLeaveDate(
            leave.from_date
        )
    );


    setText(
        "detailsLeaveTo",
        formatLeaveDate(
            leave.to_date
        )
    );


    setText(
        "detailsLeaveDuration",
        calculateLeaveDuration(
            leave.from_date,
            leave.to_date
        )
    );


    setText(
        "detailsLeaveStatus",
        getLeaveStatusText(
            leave.status
        )
    );


    setText(
        "detailsLeaveReason",
        leave.reason || "-"
    );


    setText(
        "detailsLeaveRemarks",
        leave.admin_remarks ||
        "No remarks."
    );
}


/* =========================================================
   PAGINATION
========================================================= */

function renderLeavePagination(
    pagination
) {

    const total =
        Number(
            pagination.total_items
        ) || 0;


    const page =
        Number(
            pagination.page
        ) || 1;


    const pageSize =
        Number(
            pagination.page_size
        ) || 10;


    const pages =
        Math.max(
            Number(
                pagination.total_pages
            ) || 1,
            1
        );


    totalLeavePages =
        pages;


    const start =
        total === 0
            ? 0
            : (
                (page - 1) *
                pageSize
            ) + 1;


    const end =
        Math.min(
            page * pageSize,
            total
        );


    setText(
        "leavePaginationStart",
        start
    );

    setText(
        "leavePaginationEnd",
        end
    );

    setText(
        "leavePaginationTotal",
        total
    );


    const previous =
        document.getElementById(
            "previousLeavePage"
        );

    const next =
        document.getElementById(
            "nextLeavePage"
        );


    if (previous) {

        previous.disabled =
            page <= 1;
    }


    if (next) {

        next.disabled =
            page >= pages;
    }


    const numbers =
        document.getElementById(
            "leavePaginationNumbers"
        );


    if (!numbers) {
        return;
    }


    numbers.innerHTML = "";


    if (pages <= 1) {
        return;
    }


    buildLeavePaginationPages(
        page,
        pages
    ).forEach(
        (item) => {

            if (item === "...") {

                const span =
                    document.createElement(
                        "span"
                    );

                span.className =
                    "pagination-ellipsis";

                span.textContent =
                    "...";

                numbers.appendChild(
                    span
                );

                return;
            }


            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                `pagination-number ${
                    item === page
                        ? "active"
                        : ""
                }`;


            button.textContent =
                item;


            button.addEventListener(
                "click",
                () => {

                    if (
                        item ===
                        currentLeavePage
                    ) {
                        return;
                    }


                    currentLeavePage =
                        item;


                    loadLeaves();
                }
            );


            numbers.appendChild(
                button
            );
        }
    );
}


/* =========================================================
   PAGINATION BUILDER
========================================================= */

function buildLeavePaginationPages(
    current,
    total
) {

    if (total <= 7) {

        return Array.from(
            {
                length: total
            },
            (_, index) =>
                index + 1
        );
    }


    const pages = [1];


    if (current > 3) {

        pages.push(
            "..."
        );
    }


    const start =
        Math.max(
            2,
            current - 1
        );


    const end =
        Math.min(
            total - 1,
            current + 1
        );


    for (
        let page = start;
        page <= end;
        page++
    ) {

        pages.push(
            page
        );
    }


    if (
        current <
        total - 2
    ) {

        pages.push(
            "..."
        );
    }


    pages.push(
        total
    );


    return pages;
}


/* =========================================================
   RESET FILTERS
========================================================= */

function resetLeaveFilters() {

    setValue(
        "leaveSearch",
        ""
    );


    setValue(
        "leaveEmployeeFilter",
        ""
    );


    setValue(
        "leaveTypeFilter",
        ""
    );


    setValue(
        "leaveStatusFilter",
        ""
    );


    setValue(
        "leaveOrdering",
        "-created_at"
    );


    currentLeavePage =
        1;


    loadLeaves();
}


/* =========================================================
   STATES
========================================================= */

function showLeaveLoading() {

    document
        .getElementById(
            "leaveLoading"
        )
        ?.classList.remove(
            "d-none"
        );


    document
        .getElementById(
            "leaveEmpty"
        )
        ?.classList.add(
            "d-none"
        );


    document
        .getElementById(
            "leaveTableWrapper"
        )
        ?.classList.add(
            "d-none"
        );


    document
        .getElementById(
            "leavePagination"
        )
        ?.classList.add(
            "d-none"
        );
}


function showLeaveError(
    message
) {

    document
        .getElementById(
            "leaveLoading"
        )
        ?.classList.add(
            "d-none"
        );


    document
        .getElementById(
            "leaveTableWrapper"
        )
        ?.classList.add(
            "d-none"
        );


    document
        .getElementById(
            "leavePagination"
        )
        ?.classList.add(
            "d-none"
        );


    const empty =
        document.getElementById(
            "leaveEmpty"
        );


    empty?.classList.remove(
        "d-none"
    );


    setText(
        "leaveEmptyHeading",
        "Unable to load leave requests"
    );


    setText(
        "leaveEmptyDescription",
        message
    );


    const icon =
        document.getElementById(
            "leaveEmptyIcon"
        );


    if (icon) {

        icon.className =
            "bi bi-exclamation-triangle";
    }


    const emptyApplyButton =
        document.getElementById(
            "emptyApplyLeaveButton"
        );


    emptyApplyButton?.classList.add(
        "d-none"
    );
}


/* =========================================================
   ALERT
========================================================= */

function showLeaveAlert(
    message,
    type = "success"
) {

    const alert =
        document.getElementById(
            "leaveAlert"
        );


    const messageElement =
        document.getElementById(
            "leaveAlertMessage"
        );


    const icon =
        document.getElementById(
            "leaveAlertIcon"
        );


    if (
        !alert ||
        !messageElement
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


    messageElement.textContent =
        message;


    if (icon) {

        icon.className =
            type === "error"
                ? "bi bi-exclamation-triangle"
                : "bi bi-check-circle";
    }


    window.clearTimeout(
        showLeaveAlert.timeoutId
    );


    showLeaveAlert.timeoutId =
        window.setTimeout(
            hideLeaveAlert,
            5000
        );
}


function hideLeaveAlert() {

    document
        .getElementById(
            "leaveAlert"
        )
        ?.classList.add(
            "d-none"
        );
}


/* =========================================================
   FORM API ERRORS
========================================================= */

function handleLeaveFormApiErrors(
    error
) {

    const response =
        error?.data ||
        error;


    const errors =
        response?.errors ||
        response;


    if (
        !errors ||
        typeof errors !==
        "object"
    ) {
        return;
    }


    const fieldMap = {

        leave_type:
            "leaveType",

        from_date:
            "leaveFromDate",

        to_date:
            "leaveToDate",

        reason:
            "leaveReason",

        status:
            "leaveAdminStatus",

        admin_remarks:
            "leaveAdminRemarks"

    };


    Object.entries(
        errors
    ).forEach(
        ([field, messages]) => {

            const inputId =
                fieldMap[field];


            if (!inputId) {
                return;
            }


            const message =
                Array.isArray(messages)
                    ? messages[0]
                    : String(messages);


            setLeaveFormError(
                inputId,
                message
            );
        }
    );
}


/* =========================================================
   FORM ERROR HELPERS
========================================================= */

function setLeaveFormError(
    inputId,
    message
) {

    const input =
        document.getElementById(
            inputId
        );


    if (!input) {
        return;
    }


    input.classList.add(
        "is-invalid"
    );


    let error =
        input.parentElement?.querySelector(
            ".leave-form-error"
        );


    if (!error) {

        error =
            document.createElement(
                "div"
            );


        error.className =
            "leave-form-error";


        input.parentElement?.appendChild(
            error
        );
    }


    error.textContent =
        message;
}


function clearLeaveFormErrors() {

    document
        .querySelectorAll(
            "#leaveForm .is-invalid"
        )
        .forEach(
            (element) => {

                element.classList.remove(
                    "is-invalid"
                );
            }
        );


    document
        .querySelectorAll(
            "#leaveForm .leave-form-error"
        )
        .forEach(
            (element) => {

                element.remove();
            }
        );
}


function hasLeaveFormErrors() {

    return Boolean(
        document.querySelector(
            "#leaveForm .leave-form-error"
        )
    );
}


/* =========================================================
   DATE VALIDATION
========================================================= */

function initializeLeaveDateValidation() {

    const from =
        document.getElementById(
            "leaveFromDate"
        );


    const to =
        document.getElementById(
            "leaveToDate"
        );


    from?.addEventListener(
        "change",
        () => {

            if (to) {

                to.min =
                    from.value ||
                    getLocalLeaveDate();
            }


            clearDateFieldError(
                "leaveFromDate"
            );
        }
    );


    to?.addEventListener(
        "change",
        () => {

            clearDateFieldError(
                "leaveToDate"
            );


            if (
                from?.value &&
                to?.value &&
                to.value <
                    from.value
            ) {

                setLeaveFormError(
                    "leaveToDate",
                    "To date must be greater than or equal to from date."
                );
            }
        }
    );
}


function clearDateFieldError(
    inputId
) {

    const input =
        document.getElementById(
            inputId
        );


    if (!input) {
        return;
    }


    input.classList.remove(
        "is-invalid"
    );


    input.parentElement
        ?.querySelector(
            ".leave-form-error"
        )
        ?.remove();
}


function setLeaveDateMinimums() {

    const today =
        getLocalLeaveDate();


    const from =
        document.getElementById(
            "leaveFromDate"
        );


    const to =
        document.getElementById(
            "leaveToDate"
        );


    if (from) {

        from.min =
            today;
    }


    if (to) {

        to.min =
            from?.value ||
            today;
    }
}


function getLocalLeaveDate() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;
}


/* =========================================================
   MODAL RESET
========================================================= */

function initializeLeaveModalReset() {

    const modal =
        document.getElementById(
            "leaveModal"
        );


    modal?.addEventListener(
        "hidden.bs.modal",
        () => {

            document
                .getElementById(
                    "leaveForm"
                )
                ?.reset();


            clearLeaveFormErrors();


            leaveModalMode =
                "create";


            selectedLeaveId =
                null;


            [
                "leaveType",
                "leaveFromDate",
                "leaveToDate",
                "leaveReason"
            ].forEach(
                (id) => {

                    document
                        .getElementById(id)
                        ?.removeAttribute(
                            "disabled"
                        );
                }
            );


            document
                .getElementById(
                    "leaveAdminReviewWrap"
                )
                ?.classList.add(
                    "d-none"
                );


            document
                .getElementById(
                    "leaveAdminStatusWrap"
                )
                ?.classList.add(
                    "d-none"
                );


            document
                .getElementById(
                    "leaveReviewEmployeeWrap"
                )
                ?.classList.add(
                    "d-none"
                );


            setText(
                "leaveSubmitText",
                "Submit Leave"
            );


            setLeaveDateMinimums();
        }
    );
}


/* =========================================================
   MODALS
========================================================= */

function openLeaveModal(id) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        console.error(
            `Modal "${id}" not found.`
        );

        return;
    }


    if (
        typeof bootstrap ===
        "undefined"
    ) {

        console.error(
            "Bootstrap JavaScript is not loaded."
        );

        return;
    }


    bootstrap.Modal
        .getOrCreateInstance(
            element
        )
        .show();
}


function closeLeaveModal(id) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    if (
        typeof bootstrap ===
        "undefined"
    ) {
        return;
    }


    bootstrap.Modal
        .getInstance(
            element
        )
        ?.hide();
}


/* =========================================================
   STATUS / TYPE HELPERS
========================================================= */

function getLeaveTypeText(
    type
) {

    switch (
        String(
            type || ""
        ).toUpperCase()
    ) {

        case "CASUAL":
            return "Casual";

        case "SICK":
            return "Sick";

        case "EARNED":
            return "Earned";

        case "OTHER":
            return "Other";

        default:
            return "-";
    }
}


function getLeaveStatusText(
    status
) {

    switch (
        String(
            status || ""
        ).toUpperCase()
    ) {

        case "PENDING":
            return "Pending";

        case "APPROVED":
            return "Approved";

        case "REJECTED":
            return "Rejected";

        default:
            return "-";
    }
}


function getLeaveStatusClass(
    status
) {

    switch (
        String(
            status || ""
        ).toUpperCase()
    ) {

        case "APPROVED":
            return "leave-status-approved";

        case "REJECTED":
            return "leave-status-rejected";

        default:
            return "leave-status-pending";
    }
}


/* =========================================================
   DATE / DURATION HELPERS
========================================================= */

function calculateLeaveDuration(
    fromDate,
    toDate
) {

    if (
        !fromDate ||
        !toDate
    ) {
        return "-";
    }


    const start =
        new Date(
            `${fromDate}T00:00:00`
        );


    const end =
        new Date(
            `${toDate}T00:00:00`
        );


    if (
        Number.isNaN(
            start.getTime()
        ) ||
        Number.isNaN(
            end.getTime()
        )
    ) {

        return "-";
    }


    const milliseconds =
        end.getTime() -
        start.getTime();


    const days =
        Math.floor(
            milliseconds /
            (1000 * 60 * 60 * 24)
        ) + 1;


    return `${days} ${
        days === 1
            ? "day"
            : "days"
    }`;
}


function formatLeaveDate(
    value
) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(
            `${value}T00:00:00`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "-";
    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


/* =========================================================
   API HELPERS
========================================================= */

function ensureLeaveResponse(
    response,
    fallback
) {

    if (
        !response ||
        response.success === false
    ) {

        throw createLeaveApiError(
            response?.message ||
            fallback,
            response
        );
    }
}


function createLeaveApiError(
    message,
    data = null
) {

    const error =
        new Error(
            message
        );


    error.data =
        data;


    if (data?.status) {

        error.status =
            data.status;
    }


    return error;
}


/* =========================================================
   USER MENU
========================================================= */

function initializeLeaveUserMenu() {

    const button =
        document.getElementById(
            "leaveUserButton"
        );


    const menu =
        document.getElementById(
            "leaveUserMenu"
        );


    const logoutButton =
        document.getElementById(
            "leaveMenuLogout"
        );


    const profileButton =
        document.getElementById(
            "leaveMenuProfile"
        );


    const settingsButton =
        document.getElementById(
            "leaveMenuSettings"
        );


    if (
        !button ||
        !menu
    ) {
        return;
    }


    /* ---------------------------------------------------------
       TOGGLE
    --------------------------------------------------------- */

    button.addEventListener(
        "click",
        (event) => {

            event.preventDefault();
            event.stopPropagation();


            const isOpen =
                menu.classList.contains(
                    "show"
                );


            if (isOpen) {

                closeLeaveUserMenu();

            } else {

                openLeaveUserMenu();
            }
        }
    );


    /* ---------------------------------------------------------
       CLOSE OUTSIDE
    --------------------------------------------------------- */

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

                closeLeaveUserMenu();
            }
        }
    );


    /* ---------------------------------------------------------
       ESCAPE
    --------------------------------------------------------- */

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key ===
                "Escape"
            ) {

                closeLeaveUserMenu();
            }
        }
    );


    /* ---------------------------------------------------------
       PROFILE
    --------------------------------------------------------- */

    profileButton?.addEventListener(
        "click",
        (event) => {

            event.preventDefault();
            event.stopPropagation();

            closeLeaveUserMenu();

            showLeaveAlert(
                "My Profile will be available in a later project phase.",
                "success"
            );
        }
    );


    /* ---------------------------------------------------------
       SETTINGS
    --------------------------------------------------------- */

    settingsButton?.addEventListener(
        "click",
        (event) => {

            event.preventDefault();
            event.stopPropagation();

            closeLeaveUserMenu();

            showLeaveAlert(
                "Settings will be available in a later project phase.",
                "success"
            );
        }
    );


    /* ---------------------------------------------------------
       LOGOUT
    --------------------------------------------------------- */

    logoutButton?.addEventListener(
        "click",
        (event) => {

            event.preventDefault();
            event.stopPropagation();

            closeLeaveUserMenu();

            performLeaveLogout();
        }
    );
}


/* =========================================================
   OPEN USER MENU
========================================================= */

function openLeaveUserMenu() {

    const menu =
        document.getElementById(
            "leaveUserMenu"
        );


    const button =
        document.getElementById(
            "leaveUserButton"
        );


    if (
        !menu ||
        !button
    ) {
        return;
    }


    menu.classList.add(
        "show"
    );


    button.setAttribute(
        "aria-expanded",
        "true"
    );


    menu.setAttribute(
        "aria-hidden",
        "false"
    );
}


/* =========================================================
   CLOSE USER MENU
========================================================= */

function closeLeaveUserMenu() {

    const menu =
        document.getElementById(
            "leaveUserMenu"
        );


    const button =
        document.getElementById(
            "leaveUserButton"
        );


    if (menu) {

        menu.classList.remove(
            "show"
        );


        menu.setAttribute(
            "aria-hidden",
            "true"
        );
    }


    if (button) {

        button.setAttribute(
            "aria-expanded",
            "false"
        );
    }
}


/* =========================================================
   LEAVE LOGOUT
========================================================= */

function performLeaveLogout() {

    /*
     * Use the common authentication
     * logout function from auth.js.
     */
    if (
        typeof logout ===
        "function"
    ) {

        logout();

        return;
    }


    /*
     * Safe fallback.
     */
    try {

        localStorage.removeItem(
            APP_CONFIG.TOKEN_KEYS.ACCESS
        );

        localStorage.removeItem(
            APP_CONFIG.TOKEN_KEYS.REFRESH
        );

        localStorage.removeItem(
            APP_CONFIG.STORAGE_KEYS.USER
        );

    } catch (error) {

        console.error(
            "Leave logout cleanup error:",
            error
        );
    }


    window.location.href =
        APP_CONFIG.PAGES.LOGIN;
}


/* =========================================================
   BASIC HELPERS
========================================================= */

function getValue(id) {

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
            value ?? "";
    }
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
            value ?? "-";
    }
}


function normalizeValue(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toUpperCase();
}


function truncateText(
    value,
    maxLength
) {

    const text =
        String(
            value ?? ""
        );


    if (
        text.length <=
        maxLength
    ) {

        return text;
    }


    return (
        text.slice(
            0,
            maxLength
        ) +
        "..."
    );
}


function getInitials(
    name
) {

    const safe =
        String(
            name || "User"
        ).trim();


    if (!safe) {
        return "U";
    }


    return safe
        .split(/\s+/)
        .slice(
            0,
            2
        )
        .map(
            (word) =>
                word.charAt(0)
        )
        .join("")
        .toUpperCase();
}


function escapeHtml(
    value
) {

    return String(
        value ?? ""
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


function debounce(
    callback,
    delay
) {

    let timer =
        null;


    return function (
        ...args
    ) {

        window.clearTimeout(
            timer
        );


        timer =
            window.setTimeout(
                () => {

                    callback(
                        ...args
                    );

                },
                delay
            );
    };
}