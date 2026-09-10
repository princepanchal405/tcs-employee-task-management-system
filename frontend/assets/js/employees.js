"use strict";

/* =========================================================
   GLOBAL STATE
========================================================= */

let currentPage = 1;
let totalPages = 1;
let currentEmployees = [];

let isEditing = false;
let editingEmployeeId = null;
let employeeToDelete = null;

let employeeRequestId = 0;

/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  /*
   * Authentication guard.
   */
  if (!requireAuthentication()) {
    return;
  }

  const user = getCurrentUser();

  /* Employee Management is an ADMIN workspace.
   * Employees use the role-specific dashboard instead.
   */
  if (!user || user.role !== "ADMIN") {
    window.location.href = APP_CONFIG.PAGES.DASHBOARD;
    return;
  }

  /*
   * Initialize page components.
   */
  initializeEmployeePage();

  initializeEmployeeUserInfo();

  initializeEmployeePasswordToggles();

  initializeEmployeeUserMenu();

  applyRoleBasedUI();

  /*
   * Load first page.
   */
  await loadEmployees();

  /* Open Add Employee automatically when the dashboard
   * Quick Access or Add Employee button passes ?add=1.
   */
  const query = new URLSearchParams(window.location.search);
  if (query.get("add") === "1") {
    window.history.replaceState({}, document.title, window.location.pathname);
    openAddEmployeeModal();
  }
});

/* =========================================================
   INITIALIZE EMPLOYEE PAGE
========================================================= */

function initializeEmployeePage() {
  const searchInput = document.getElementById("employeeSearch");

  const departmentFilter = document.getElementById("departmentFilter");

  const statusFilter = document.getElementById("statusFilter");

  const resetButton = document.getElementById("resetEmployeeFilters");

  const previousButton = document.getElementById("previousPage");

  const nextButton = document.getElementById("nextPage");

  const addButton = document.getElementById("addEmployeeButton");

  const emptyAddButton = document.getElementById("emptyAddEmployeeButton");

  const alertCloseButton = document.getElementById("employeeAlertClose");

  const employeeForm = document.getElementById("employeeForm");

  const deleteButton = document.getElementById("confirmDeleteButton");

  /* ---------------------------------------------------------
       Search
    --------------------------------------------------------- */

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce(() => {
        currentPage = 1;

        loadEmployees();
      }, 350),
    );
  }

  /* ---------------------------------------------------------
       Department Filter
    --------------------------------------------------------- */

  if (departmentFilter) {
    departmentFilter.addEventListener("change", () => {
      currentPage = 1;

      loadEmployees();
    });
  }

  /* ---------------------------------------------------------
       Status Filter
    --------------------------------------------------------- */

  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      currentPage = 1;

      loadEmployees();
    });
  }

  /* ---------------------------------------------------------
       Reset Filters
    --------------------------------------------------------- */

  if (resetButton) {
    resetButton.addEventListener("click", resetFilters);
  }

  /* ---------------------------------------------------------
       Previous Page
    --------------------------------------------------------- */

  if (previousButton) {
    previousButton.addEventListener("click", () => {
      if (currentPage <= 1) {
        return;
      }

      currentPage -= 1;

      loadEmployees();
    });
  }

  /* ---------------------------------------------------------
       Next Page
    --------------------------------------------------------- */

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      if (currentPage >= totalPages) {
        return;
      }

      currentPage += 1;

      loadEmployees();
    });
  }

  /* ---------------------------------------------------------
       Add Employee
    --------------------------------------------------------- */

  if (addButton) {
    addButton.addEventListener("click", openAddEmployeeModal);
  }

  if (emptyAddButton) {
    emptyAddButton.addEventListener("click", openAddEmployeeModal);
  }

  /* ---------------------------------------------------------
       Alert Close
    --------------------------------------------------------- */

  if (alertCloseButton) {
    alertCloseButton.addEventListener("click", hideEmployeeAlert);
  }

  /* ---------------------------------------------------------
       Employee Form
    --------------------------------------------------------- */

  if (employeeForm) {
    employeeForm.addEventListener("submit", handleEmployeeSubmit);
  }

  /* ---------------------------------------------------------
       Delete
    --------------------------------------------------------- */

  if (deleteButton) {
    deleteButton.addEventListener("click", confirmDeleteEmployee);
  }

  /* ---------------------------------------------------------
       Modal Reset
    --------------------------------------------------------- */

  initializeModalReset();
}

/* =========================================================
   USER INFORMATION
========================================================= */

function initializeEmployeeUserInfo() {
  const user = getCurrentUser();

  if (!user) {
    return;
  }

  const userName = document.getElementById("currentUserName");

  const userRole = document.getElementById("currentUserRole");

  const userAvatar = document.getElementById("userAvatar");

  if (userName) {
    userName.textContent = user.name || "User";
  }

  if (userRole) {
    userRole.textContent = user.role === "ADMIN" ? "Administrator" : "Employee";
  }

  if (userAvatar) {
    userAvatar.textContent = getInitials(user.name || "User");
  }
}

/* =========================================================
   ROLE BASED UI
========================================================= */

function applyRoleBasedUI() {
  const user = getCurrentUser();

  if (!user) {
    return;
  }

  const isAdmin = user.role === "ADMIN";

  const addButton = document.getElementById("addEmployeeButton");

  const emptyAddButton = document.getElementById("emptyAddEmployeeButton");

  const submitButton = document.getElementById("employeeSubmitButton");

  const deleteButton = document.getElementById("confirmDeleteButton");

  /*
   * Only Admin can create employees.
   */
  if (addButton) {
    addButton.style.display = isAdmin ? "" : "none";
  }

  if (emptyAddButton) {
    emptyAddButton.style.display = isAdmin ? "" : "none";
  }

  /*
   * Delete is Admin-only.
   */
  if (deleteButton) {
    deleteButton.style.display = isAdmin ? "" : "none";
  }

  /*
   * Submit button is only relevant for Admin.
   */
  if (submitButton) {
    submitButton.style.display = isAdmin ? "" : "none";
  }
}

/* =========================================================
   LOAD EMPLOYEES
========================================================= */

async function loadEmployees() {
  const requestId = ++employeeRequestId;

  showEmployeeLoading();

  try {
    const params = new URLSearchParams();

    const search =
      document.getElementById("employeeSearch")?.value?.trim() || "";

    const department = document.getElementById("departmentFilter")?.value || "";

    const employmentStatus =
      document.getElementById("statusFilter")?.value || "";

    params.set("page", String(currentPage));

    if (search) {
      params.set("search", search);
    }

    if (department) {
      params.set("department", department);
    }

    if (employmentStatus) {
      params.set("employment_status", employmentStatus);
    }

    const response = await apiRequest(`/employees/?${params.toString()}`, {
      method: "GET",
    });

    /*
     * Ignore an older request if another
     * request already started.
     */
    if (requestId !== employeeRequestId) {
      return;
    }

    ensureSuccessfulResponse(response, "Unable to load employee records.");

    const employees = Array.isArray(response.data) ? response.data : [];

    const pagination = response.pagination || {};

    currentEmployees = employees;

    currentPage = Number(pagination.page) || currentPage || 1;

    totalPages = Math.max(Number(pagination.total_pages) || 1, 1);

    renderEmployeeTable(
      currentEmployees,
      Number(pagination.total_items) || employees.length,
    );

    renderPagination({
      page: currentPage,

      page_size: Number(pagination.page_size) || 10,

      total_items: Number(pagination.total_items) || 0,

      total_pages: totalPages,
    });
  } catch (error) {
    /*
     * Ignore stale requests.
     */
    if (requestId !== employeeRequestId) {
      return;
    }

    console.error("Employee loading error:", error);

    showEmployeeError(
      getApiErrorMessage(error, "Unable to load employee records."),
    );
  }
}

/* =========================================================
   RENDER EMPLOYEE TABLE
========================================================= */

function renderEmployeeTable(employees, totalCount = employees.length) {
  const tableWrapper = document.getElementById("employeeTableWrapper");

  const emptyState = document.getElementById("employeeEmpty");

  const loading = document.getElementById("employeeLoading");

  const pagination = document.getElementById("employeePagination");

  const tbody = document.getElementById("employeeTableBody");

  const count = document.getElementById("employeeCount");

  if (loading) {
    loading.classList.add("d-none");
  }

  if (count) {
    count.textContent = totalCount;
  }

  if (!employees.length) {
    if (tableWrapper) {
      tableWrapper.classList.add("d-none");
    }

    if (pagination) {
      pagination.classList.add("d-none");
    }

    if (emptyState) {
      emptyState.classList.remove("d-none");

      const heading = emptyState.querySelector("h4");

      const description = emptyState.querySelector("p");

      /*
       * Restore normal empty state text
       * after an earlier error.
       */
      if (heading) {
        heading.textContent = "No employees found";
      }

      if (description) {
        description.textContent =
          "There are no employee records matching your current filters.";
      }
    }

    if (tbody) {
      tbody.innerHTML = "";
    }

    return;
  }

  if (emptyState) {
    emptyState.classList.add("d-none");
  }

  if (tableWrapper) {
    tableWrapper.classList.remove("d-none");
  }

  if (pagination) {
    pagination.classList.remove("d-none");
  }

  if (!tbody) {
    return;
  }

  tbody.innerHTML = employees.map(renderEmployeeRow).join("");
}

/* =========================================================
   EMPLOYEE ROW
========================================================= */

function renderEmployeeRow(employee) {
  const initials = getInitials(employee.name || "Employee");

  const isActive = employee.employment_status === "ACTIVE";

  const statusClass = isActive ? "status-active" : "status-inactive";

  const statusText = isActive ? "Active" : "Inactive";

  const user = getCurrentUser();

  const isAdmin = user?.role === "ADMIN";

  return `
        <tr>

            <td>

                <div class="employee-table-person">

                    <div class="employee-table-avatar">
                        ${escapeHtml(initials)}
                    </div>

                    <div class="employee-table-person-info">

                        <strong>
                            ${escapeHtml(employee.name || "-")}
                        </strong>

                        <span>
                            ${escapeHtml(employee.employee_id || "-")}
                        </span>

                    </div>

                </div>

            </td>


            <td>

                <span class="employee-department">
                    ${escapeHtml(employee.department || "-")}
                </span>

            </td>


            <td>
                ${escapeHtml(employee.designation || "-")}
            </td>


            <td>

                <span class="employee-location">

                    <i class="bi bi-geo-alt"></i>

                    ${escapeHtml(employee.location || "-")}

                </span>

            </td>


            <td>
                ${formatDate(employee.joining_date)}
            </td>


            <td>

                <span
                    class="employee-status ${statusClass}"
                >

                    <span></span>

                    ${statusText}

                </span>

            </td>


            <td>

                <div class="employee-actions">

                    <!-- View -->

                    <button
                        type="button"
                        class="employee-action-button view"
                        title="View employee"
                        aria-label="View employee"
                        data-action="view"
                        data-id="${Number(employee.id)}"
                    >
                        <i class="bi bi-eye"></i>
                    </button>


                    ${
                      isAdmin
                        ? `
                                <!-- Edit -->

                                <button
                                    type="button"
                                    class="employee-action-button edit"
                                    title="Edit employee"
                                    aria-label="Edit employee"
                                    data-action="edit"
                                    data-id="${Number(employee.id)}"
                                >
                                    <i class="bi bi-pencil"></i>
                                </button>


                                <!-- Delete -->

                                <button
                                    type="button"
                                    class="employee-action-button delete"
                                    title="Delete employee"
                                    aria-label="Delete employee"
                                    data-action="delete"
                                    data-id="${Number(employee.id)}"
                                >
                                    <i class="bi bi-trash3"></i>
                                </button>
                            `
                        : ""
                    }

                </div>

            </td>

        </tr>
    `;
}

/* =========================================================
   TABLE ACTION DELEGATION
========================================================= */

document.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-action]");

  if (!actionButton) {
    return;
  }

  const id = Number(actionButton.dataset.id);

  const action = actionButton.dataset.action;

  if (!id) {
    return;
  }

  if (action === "view") {
    viewEmployee(id);
  }

  if (action === "edit") {
    editEmployee(id);
  }

  if (action === "delete") {
    deleteEmployee(id);
  }
});

/* =========================================================
   PAGINATION
========================================================= */

function renderPagination(pagination) {
  const total = Number(pagination.total_items) || 0;

  const page = Number(pagination.page) || 1;

  const pageSize = Number(pagination.page_size) || 10;

  const pages = Math.max(Number(pagination.total_pages) || 1, 1);

  totalPages = pages;

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;

  const end = Math.min(page * pageSize, total);

  const startElement = document.getElementById("paginationStart");

  const endElement = document.getElementById("paginationEnd");

  const totalElement = document.getElementById("paginationTotal");

  if (startElement) {
    startElement.textContent = start;
  }

  if (endElement) {
    endElement.textContent = end;
  }

  if (totalElement) {
    totalElement.textContent = total;
  }

  const previousButton = document.getElementById("previousPage");

  const nextButton = document.getElementById("nextPage");

  if (previousButton) {
    previousButton.disabled = page <= 1;
  }

  if (nextButton) {
    nextButton.disabled = page >= pages;
  }

  const numbers = document.getElementById("paginationNumbers");

  if (!numbers) {
    return;
  }

  numbers.innerHTML = "";

  if (pages <= 1) {
    return;
  }

  const visiblePages = buildPaginationPages(page, pages);

  visiblePages.forEach((item) => {
    if (item === "...") {
      const ellipsis = document.createElement("span");

      ellipsis.className = "pagination-ellipsis";

      ellipsis.textContent = "...";

      numbers.appendChild(ellipsis);

      return;
    }

    const button = document.createElement("button");

    button.type = "button";

    button.className = `pagination-number ${item === page ? "active" : ""}`;

    button.textContent = item;

    button.addEventListener("click", () => {
      if (item === currentPage) {
        return;
      }

      currentPage = item;

      loadEmployees();
    });

    numbers.appendChild(button);
  });
}

/* =========================================================
   PAGINATION PAGE GENERATOR
========================================================= */

function buildPaginationPages(current, total) {
  if (total <= 7) {
    return Array.from(
      {
        length: total,
      },
      (_, index) => index + 1,
    );
  }

  const pages = [1];

  if (current > 3) {
    pages.push("...");
  }

  const start = Math.max(2, current - 1);

  const end = Math.min(total - 1, current + 1);

  for (let page = start; page <= end; page++) {
    pages.push(page);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  pages.push(total);

  return pages;
}

/* =========================================================
   ADD EMPLOYEE
========================================================= */

function openAddEmployeeModal() {
  const user = getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    showEmployeeAlert("Only administrators can add employees.", "error");

    return;
  }

  isEditing = false;

  editingEmployeeId = null;

  const form = document.getElementById("employeeForm");

  if (form) {
    form.reset();
  }

  clearFormErrors();

  const title = document.getElementById("employeeModalTitle");

  const subtitle = document.getElementById("employeeModalSubtitle");

  const submitText = document.getElementById("employeeSubmitText");

  if (title) {
    title.textContent = "Add Employee";
  }

  if (subtitle) {
    subtitle.textContent = "Create an employee record and login account.";
  }

  if (submitText) {
    submitText.textContent = "Create Employee";
  }

  setPasswordMode(true);

  clearPasswordFields();

  openModal("employeeModal");
}

/* =========================================================
   EDIT EMPLOYEE
========================================================= */

async function editEmployee(id) {
  const user = getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    showEmployeeAlert("Only administrators can edit employees.", "error");

    return;
  }

  if (!id) {
    return;
  }

  try {
    const response = await apiRequest(`/employees/${id}/`, {
      method: "GET",
    });

    ensureSuccessfulResponse(response, "Unable to load employee.");

    const employee = response.data;

    isEditing = true;

    editingEmployeeId = id;

    populateEmployeeForm(employee);

    clearFormErrors();

    const title = document.getElementById("employeeModalTitle");

    const subtitle = document.getElementById("employeeModalSubtitle");

    const submitText = document.getElementById("employeeSubmitText");

    if (title) {
      title.textContent = "Edit Employee";
    }

    if (subtitle) {
      subtitle.textContent =
        "Update employee information. Password change is optional.";
    }

    if (submitText) {
      submitText.textContent = "Save Changes";
    }

    /*
     * Password is optional while editing.
     */
    setPasswordMode(false);

    clearPasswordFields();

    openModal("employeeModal");
  } catch (error) {
    console.error("Edit employee error:", error);

    handleFormApiErrors(error);

    showEmployeeAlert(
      getApiErrorMessage(error, "Unable to load employee."),
      "error",
    );
  }
}

/* =========================================================
   VIEW EMPLOYEE
========================================================= */

async function viewEmployee(id) {
  if (!id) {
    return;
  }

  try {
    const response = await apiRequest(`/employees/${id}/`, {
      method: "GET",
    });

    ensureSuccessfulResponse(response, "Unable to load employee details.");

    renderEmployeeDetails(response.data);

    openModal("employeeDetailsModal");
  } catch (error) {
    console.error("View employee error:", error);

    showEmployeeAlert(
      getApiErrorMessage(error, "Unable to load employee details."),
      "error",
    );
  }
}

/* =========================================================
   POPULATE EMPLOYEE FORM
========================================================= */

function populateEmployeeForm(employee) {
  setValue("employeeId", employee.employee_id);

  setValue("employeeName", employee.name);

  setValue("employeeEmail", employee.email);

  setValue("employeeMobile", employee.mobile);

  setValue("employeeDepartment", employee.department);

  setValue("employeeDesignation", employee.designation);

  setValue("employeeLocation", employee.location);

  setValue("employeeJoiningDate", employee.joining_date);

  setValue("employeeStatus", employee.employment_status || "ACTIVE");
}

/* =========================================================
   CREATE / UPDATE EMPLOYEE
========================================================= */

async function handleEmployeeSubmit(event) {
  event.preventDefault();

  const user = getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    showEmployeeAlert(
      "Only administrators can manage employee records.",
      "error",
    );

    return;
  }

  clearFormErrors();

  const data = collectEmployeeFormData();

  if (!validateEmployeeForm(data)) {
    return;
  }

  const submitButton = document.getElementById("employeeSubmitButton");

  const submitText = document.getElementById("employeeSubmitText");

  const spinner = document.getElementById("employeeSubmitSpinner");

  const originalText = isEditing ? "Save Changes" : "Create Employee";

  if (submitButton) {
    submitButton.disabled = true;
  }

  if (spinner) {
    spinner.classList.remove("d-none");
  }

  if (submitText) {
    submitText.textContent = isEditing ? "Saving..." : "Creating...";
  }

  try {
    const endpoint = isEditing
      ? `/employees/${editingEmployeeId}/`
      : "/employees/";

    const method = isEditing ? "PUT" : "POST";

    /*
     * Pass object directly.
     * apiRequest handles JSON conversion.
     */
    const response = await apiRequest(endpoint, {
      method,
      body: data,
    });

    ensureSuccessfulResponse(
      response,
      isEditing ? "Unable to update employee." : "Unable to create employee.",
    );

    closeModal("employeeModal");

    showEmployeeAlert(
      isEditing
        ? "Employee updated successfully."
        : "Employee and login account created successfully.",
      "success",
    );

    currentPage = 1;

    await loadEmployees();
  } catch (error) {
    console.error("Employee save error:", error);

    handleFormApiErrors(error);

    /*
     * Only show generic alert when there
     * are no field-level errors.
     */
    if (!hasFormErrors()) {
      showEmployeeAlert(
        getApiErrorMessage(
          error,
          isEditing
            ? "Unable to update employee."
            : "Unable to create employee.",
        ),
        "error",
      );
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
    }

    if (spinner) {
      spinner.classList.add("d-none");
    }

    if (submitText) {
      submitText.textContent = originalText;
    }
  }
}

/* =========================================================
   COLLECT FORM DATA
========================================================= */

function collectEmployeeFormData() {
  const data = {
    employee_id: getValue("employeeId").toUpperCase(),

    name: getValue("employeeName"),

    email: getValue("employeeEmail").toLowerCase(),

    mobile: getValue("employeeMobile"),

    department: getValue("employeeDepartment"),

    designation: getValue("employeeDesignation"),

    location: getValue("employeeLocation"),

    joining_date: getValue("employeeJoiningDate"),

    employment_status: getValue("employeeStatus") || "ACTIVE",
  };

  const passwordInput = document.getElementById("employeePassword");

  const confirmPasswordInput = document.getElementById(
    "employeeConfirmPassword",
  );

  const password = passwordInput?.value || "";

  const confirmPassword = confirmPasswordInput?.value || "";

  /*
   * CREATE
   *
   * Password is required because
   * a login account is created.
   */
  if (!isEditing) {
    data.password = password;

    data.confirm_password = confirmPassword;
  } else if (password || confirmPassword) {

  /*
   * EDIT
   *
   * Only send password if Admin
   * intentionally enters it.
   */
    data.password = password;

    data.confirm_password = confirmPassword;
  }

  return data;
}

/* =========================================================
   DELETE EMPLOYEE
========================================================= */

function deleteEmployee(id) {
  const user = getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    showEmployeeAlert("Only administrators can delete employees.", "error");

    return;
  }

  if (!id) {
    return;
  }

  employeeToDelete = Number(id);

  openModal("deleteEmployeeModal");
}

/* =========================================================
   CONFIRM DELETE
========================================================= */

async function confirmDeleteEmployee() {
  if (!employeeToDelete) {
    return;
  }

  const user = getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    return;
  }

  const button = document.getElementById("confirmDeleteButton");

  const originalHTML = button ? button.innerHTML : "";

  if (button) {
    button.disabled = true;

    button.innerHTML = `
            <span
                class="spinner-border spinner-border-sm"
                aria-hidden="true"
            ></span>
            Deleting...
        `;
  }

  try {
    const response = await apiRequest(`/employees/${employeeToDelete}/`, {
      method: "DELETE",
    });

    ensureSuccessfulResponse(response, "Unable to delete employee.");

    closeModal("deleteEmployeeModal");

    showEmployeeAlert(
      "Employee and linked login account deleted successfully.",
      "success",
    );

    employeeToDelete = null;

    if (currentEmployees.length === 1 && currentPage > 1) {
      currentPage -= 1;
    }

    await loadEmployees();
  } catch (error) {
    console.error("Delete employee error:", error);

    showEmployeeAlert(
      getApiErrorMessage(error, "Unable to delete employee."),
      "error",
    );
  } finally {
    if (button) {
      button.disabled = false;

      button.innerHTML = originalHTML;
    }
  }
}

/* =========================================================
   EMPLOYEE FORM VALIDATION
========================================================= */

function validateEmployeeForm(data) {
  let valid = true;

  /* ---------------------------------------------------------
       Employee ID
    --------------------------------------------------------- */

  if (!data.employee_id) {
    setFormError("employeeId", "Employee ID is required.");

    valid = false;
  } else if (!/^[A-Z0-9-]+$/i.test(data.employee_id)) {
    setFormError("employeeId", "Use only letters, numbers and hyphens.");

    valid = false;
  }

  /* ---------------------------------------------------------
       Name
    --------------------------------------------------------- */

  if (!data.name) {
    setFormError("employeeName", "Name is required.");

    valid = false;
  } else if (data.name.length < 2) {
    setFormError("employeeName", "Name must contain at least 2 characters.");

    valid = false;
  } else if (!/^[A-Za-z .'-]+$/.test(data.name)) {
    setFormError("employeeName", "Enter a valid employee name.");

    valid = false;
  }

  /* ---------------------------------------------------------
       Email
    --------------------------------------------------------- */

  if (!data.email) {
    setFormError("employeeEmail", "Email is required.");

    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    setFormError("employeeEmail", "Enter a valid email address.");

    valid = false;
  }

  /* ---------------------------------------------------------
       Mobile
    --------------------------------------------------------- */

  if (!data.mobile) {
    setFormError("employeeMobile", "Mobile number is required.");

    valid = false;
  } else if (!/^\+?[0-9]{10,15}$/.test(data.mobile)) {
    setFormError("employeeMobile", "Enter a valid mobile number.");

    valid = false;
  }

  /* ---------------------------------------------------------
       Department
    --------------------------------------------------------- */

  if (!data.department) {
    setFormError("employeeDepartment", "Department is required.");

    valid = false;
  }

  /* ---------------------------------------------------------
       Designation
    --------------------------------------------------------- */

  if (!data.designation) {
    setFormError("employeeDesignation", "Designation is required.");

    valid = false;
  }

  /* ---------------------------------------------------------
       Location
    --------------------------------------------------------- */

  if (!data.location) {
    setFormError("employeeLocation", "Location is required.");

    valid = false;
  }

  /* ---------------------------------------------------------
       Joining Date
    --------------------------------------------------------- */

  if (!data.joining_date) {
    setFormError("employeeJoiningDate", "Joining date is required.");

    valid = false;
  } else {
    const selectedDate = data.joining_date;

    const today = new Date().toISOString().split("T")[0];

    if (selectedDate > today) {
      setFormError(
        "employeeJoiningDate",
        "Joining date cannot be in the future.",
      );

      valid = false;
    }
  }

  /* ---------------------------------------------------------
       Password
    --------------------------------------------------------- */

  const password = data.password || "";

  const confirmPassword = data.confirm_password || "";

  /*
   * CREATE
   */
  if (!isEditing) {
    if (!password) {
      setFormError("employeePassword", "Login password is required.");

      valid = false;
    } else if (password.length < 8) {
      setFormError(
        "employeePassword",
        "Password must contain at least 8 characters.",
      );

      valid = false;
    }

    if (!confirmPassword) {
      setFormError("employeeConfirmPassword", "Please confirm the password.");

      valid = false;
    } else if (password !== confirmPassword) {
      setFormError("employeeConfirmPassword", "Passwords do not match.");

      valid = false;
    }
  } else {

  /*
   * EDIT
   *
   * Password is optional.
   */
    const passwordEntered = Boolean(password);

    const confirmEntered = Boolean(confirmPassword);

    if (passwordEntered || confirmEntered) {
      if (!passwordEntered) {
        setFormError("employeePassword", "Enter a new password.");

        valid = false;
      } else if (password.length < 8) {
        setFormError(
          "employeePassword",
          "Password must contain at least 8 characters.",
        );

        valid = false;
      }

      if (!confirmEntered) {
        setFormError(
          "employeeConfirmPassword",
          "Please confirm the new password.",
        );

        valid = false;
      } else if (password !== confirmPassword) {
        setFormError("employeeConfirmPassword", "Passwords do not match.");

        valid = false;
      }
    }
  }

  return valid;
}

/* =========================================================
   BACKEND VALIDATION ERRORS
========================================================= */

function handleFormApiErrors(error) {
  const response = error?.data || error;

  const errors = response?.errors || response;

  if (!errors || typeof errors !== "object") {
    return;
  }

  const fieldMap = {
    employee_id: "employeeId",

    name: "employeeName",

    email: "employeeEmail",

    mobile: "employeeMobile",

    department: "employeeDepartment",

    designation: "employeeDesignation",

    location: "employeeLocation",

    joining_date: "employeeJoiningDate",

    employment_status: "employeeStatus",

    password: "employeePassword",

    confirm_password: "employeeConfirmPassword",
  };

  Object.entries(errors).forEach(([field, messages]) => {
    const inputId = fieldMap[field];

    if (!inputId) {
      return;
    }

    const message = Array.isArray(messages) ? messages[0] : String(messages);

    setFormError(inputId, message);
  });
}

/* =========================================================
   EMPLOYEE DETAILS
========================================================= */

function renderEmployeeDetails(employee) {
  setText("detailsAvatar", getInitials(employee.name || "Employee"));

  setText("detailsName", employee.name || "-");

  setText("detailsEmployeeId", employee.employee_id || "-");

  setText("detailsEmail", employee.email || "-");

  setText("detailsMobile", employee.mobile || "-");

  setText("detailsDepartment", employee.department || "-");

  setText("detailsDesignation", employee.designation || "-");

  setText("detailsLocation", employee.location || "-");

  setText("detailsJoiningDate", formatDate(employee.joining_date));

  setText(
    "detailsStatus",
    employee.employment_status === "ACTIVE" ? "Active" : "Inactive",
  );

  /*
   * Optional login status element.
   *
   * It is safe even when the HTML does not
   * contain this element yet.
   */
  const loginStatus = document.getElementById("detailsLoginAccess");

  if (loginStatus) {
    loginStatus.textContent = employee.has_login_account
      ? "Enabled"
      : "Not configured";

    loginStatus.classList.toggle(
      "status-active",
      Boolean(employee.has_login_account),
    );

    loginStatus.classList.toggle(
      "status-inactive",
      !employee.has_login_account,
    );
  }
}

/* =========================================================
   RESET FILTERS
========================================================= */

function resetFilters() {
  const search = document.getElementById("employeeSearch");

  const department = document.getElementById("departmentFilter");

  const status = document.getElementById("statusFilter");

  if (search) {
    search.value = "";
  }

  if (department) {
    department.value = "";
  }

  if (status) {
    status.value = "";
  }

  currentPage = 1;

  loadEmployees();
}

/* =========================================================
   LOADING STATE
========================================================= */

function showEmployeeLoading() {
  const loading = document.getElementById("employeeLoading");

  const empty = document.getElementById("employeeEmpty");

  const table = document.getElementById("employeeTableWrapper");

  const pagination = document.getElementById("employeePagination");

  if (loading) {
    loading.classList.remove("d-none");
  }

  if (empty) {
    empty.classList.add("d-none");
  }

  if (table) {
    table.classList.add("d-none");
  }

  if (pagination) {
    pagination.classList.add("d-none");
  }
}

/* =========================================================
   ERROR STATE
========================================================= */

function showEmployeeError(message) {
  const loading = document.getElementById("employeeLoading");

  const empty = document.getElementById("employeeEmpty");

  const table = document.getElementById("employeeTableWrapper");

  const pagination = document.getElementById("employeePagination");

  if (loading) {
    loading.classList.add("d-none");
  }

  if (table) {
    table.classList.add("d-none");
  }

  if (pagination) {
    pagination.classList.add("d-none");
  }

  if (!empty) {
    return;
  }

  empty.classList.remove("d-none");

  const heading = empty.querySelector("h4");

  const description = empty.querySelector("p");

  const icon = empty.querySelector(".employee-state-icon i");

  if (heading) {
    heading.textContent = "Unable to load employees";
  }

  if (description) {
    description.textContent = message;
  }

  if (icon) {
    icon.className = "bi bi-exclamation-triangle";
  }
}

/* =========================================================
   ALERT
========================================================= */

function showEmployeeAlert(message, type = "success") {
  const alert = document.getElementById("employeeAlert");

  const messageElement = document.getElementById("employeeAlertMessage");

  if (!alert || !messageElement) {
    return;
  }

  alert.classList.remove("d-none", "success", "error");

  alert.classList.add(type === "error" ? "error" : "success");

  messageElement.textContent = message;

  window.clearTimeout(showEmployeeAlert.timeoutId);

  showEmployeeAlert.timeoutId = window.setTimeout(hideEmployeeAlert, 5000);
}

function hideEmployeeAlert() {
  const alert = document.getElementById("employeeAlert");

  if (alert) {
    alert.classList.add("d-none");
  }
}

/* =========================================================
   MODALS
========================================================= */

function openModal(id) {
  const element = document.getElementById(id);

  if (!element) {
    console.error(`Modal element "${id}" not found.`);

    return;
  }

  if (typeof bootstrap === "undefined") {
    console.error("Bootstrap JavaScript is not loaded.");

    return;
  }

  const modal = bootstrap.Modal.getOrCreateInstance(element);

  modal.show();
}

function closeModal(id) {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  if (typeof bootstrap === "undefined") {
    return;
  }

  const modal = bootstrap.Modal.getInstance(element);

  if (modal) {
    modal.hide();
  }
}

/* =========================================================
   MODAL RESET
========================================================= */

function initializeModalReset() {
  const employeeModal = document.getElementById("employeeModal");

  if (!employeeModal) {
    return;
  }

  employeeModal.addEventListener("hidden.bs.modal", () => {
    const form = document.getElementById("employeeForm");

    if (form) {
      form.reset();
    }

    clearPasswordFields();

    clearFormErrors();

    isEditing = false;

    editingEmployeeId = null;

    setPasswordMode(true);
  });
}

/* =========================================================
   PASSWORD TOGGLES
========================================================= */

function initializeEmployeePasswordToggles() {
  const toggleConfigurations = [
    {
      buttonId: "toggleEmployeePassword",

      inputId: "employeePassword",
    },

    {
      buttonId: "toggleEmployeeConfirmPassword",

      inputId: "employeeConfirmPassword",
    },
  ];

  toggleConfigurations.forEach(({ buttonId, inputId }) => {
    const button = document.getElementById(buttonId);

    const input = document.getElementById(inputId);

    if (!button || !input) {
      return;
    }

    /*
     * Prevent duplicate event binding
     * if this initializer is called again.
     */
    if (button.dataset.passwordToggleInitialized === "true") {
      return;
    }

    button.dataset.passwordToggleInitialized = "true";

    button.addEventListener("click", () => {
      const isPassword = input.type === "password";

      input.type = isPassword ? "text" : "password";

      const icon = button.querySelector("i");

      if (icon) {
        icon.classList.toggle("bi-eye", !isPassword);

        icon.classList.toggle("bi-eye-slash", isPassword);
      }

      button.setAttribute(
        "aria-label",
        isPassword ? "Hide password" : "Show password",
      );
    });
  });
}

/* =========================================================
   PASSWORD MODE
========================================================= */

function setPasswordMode(isCreateMode) {
  const passwordInput = document.getElementById("employeePassword");

  const confirmPasswordInput = document.getElementById(
    "employeeConfirmPassword",
  );

  const passwordRequired = document.getElementById("passwordRequiredMark");

  const confirmRequired = document.getElementById(
    "confirmPasswordRequiredMark",
  );

  const passwordHelp = document.getElementById("employeePasswordHelp");

  if (passwordRequired) {
    passwordRequired.style.display = isCreateMode ? "inline" : "none";
  }

  if (confirmRequired) {
    confirmRequired.style.display = isCreateMode ? "inline" : "none";
  }

  if (passwordInput) {
    passwordInput.required = isCreateMode;

    passwordInput.autocomplete = isCreateMode ? "new-password" : "new-password";
  }

  if (confirmPasswordInput) {
    confirmPasswordInput.required = isCreateMode;

    confirmPasswordInput.autocomplete = isCreateMode
      ? "new-password"
      : "new-password";
  }

  if (passwordHelp) {
    passwordHelp.textContent = isCreateMode
      ? "The employee will use this password to sign in."
      : "Leave blank to keep the existing password.";
  }
}

/* =========================================================
   CLEAR PASSWORD FIELDS
========================================================= */

function clearPasswordFields() {
  const passwordInput = document.getElementById("employeePassword");

  const confirmPasswordInput = document.getElementById(
    "employeeConfirmPassword",
  );

  if (passwordInput) {
    passwordInput.value = "";

    passwordInput.type = "password";
  }

  if (confirmPasswordInput) {
    confirmPasswordInput.value = "";

    confirmPasswordInput.type = "password";
  }

  const passwordToggle = document.getElementById("toggleEmployeePassword");

  const confirmPasswordToggle = document.getElementById(
    "toggleEmployeeConfirmPassword",
  );

  if (passwordToggle) {
    const icon = passwordToggle.querySelector("i");

    if (icon) {
      icon.className = "bi bi-eye";
    }

    passwordToggle.setAttribute("aria-label", "Show password");
  }

  if (confirmPasswordToggle) {
    const icon = confirmPasswordToggle.querySelector("i");

    if (icon) {
      icon.className = "bi bi-eye";
    }

    confirmPasswordToggle.setAttribute("aria-label", "Show password");
  }
}

/* =========================================================
   FORM HELPERS
========================================================= */

function setFormError(inputId, message) {
  const input = document.getElementById(inputId);

  if (!input) {
    return;
  }

  input.classList.add("is-invalid");

  let errorElement = input.parentElement?.querySelector(".form-error-message");

  if (!errorElement) {
    errorElement = document.createElement("div");

    errorElement.className = "form-error-message";

    input.parentElement?.appendChild(errorElement);
  }

  errorElement.textContent = message;
}

function clearFormErrors() {
  document.querySelectorAll("#employeeForm .is-invalid").forEach((element) => {
    element.classList.remove("is-invalid");
  });

  document
    .querySelectorAll("#employeeForm .form-error-message")
    .forEach((element) => {
      element.remove();
    });
}

function hasFormErrors() {
  return Boolean(document.querySelector("#employeeForm .form-error-message"));
}

/* =========================================================
   API HELPERS
========================================================= */

function ensureSuccessfulResponse(response, fallbackMessage) {
  if (!response || response.success === false) {
    throw createApiError(response?.message || fallbackMessage, response);
  }
}

function createApiError(message, data = null) {
  const error = new Error(message);

  error.data = data;

  if (data?.status) {
    error.status = data.status;
  }

  return error;
}

function getApiErrorMessage(error, fallback) {
  if (!error) {
    return fallback;
  }

  const data = error.data;

  if (typeof data === "string") {
    return data;
  }

  if (data?.message) {
    return data.message;
  }

  if (data?.detail) {
    return data.detail;
  }

  if (data?.errors && typeof data.errors === "object") {
    const firstError = Object.values(data.errors)[0];

    if (Array.isArray(firstError)) {
      return firstError[0];
    }

    if (firstError) {
      return String(firstError);
    }
  }

  if (error.message) {
    return error.message;
  }

  return fallback;
}

/* =========================================================
   BASIC DOM HELPERS
========================================================= */

function getValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function setValue(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.value = value || "";
  }
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value ?? "-";
  }
}

/* =========================================================
   UTILITY FUNCTIONS
========================================================= */

function getInitials(name) {
  const safeName = String(name || "User").trim();

  if (!safeName) {
    return "U";
  }

  return safeName
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

function formatDate(dateString) {
  if (!dateString) {
    return "-";
  }

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function debounce(callback, delay) {
  let timer = null;

  return function (...args) {
    window.clearTimeout(timer);

    timer = window.setTimeout(() => {
      callback(...args);
    }, delay);
  };
}

/* =========================================================
   EMPLOYEE USER MENU
========================================================= */

function initializeEmployeeUserMenu() {

    const button =
        document.getElementById(
            "employeeUserButton"
        );

    const menu =
        document.getElementById(
            "employeeUserMenu"
        );

    const logoutLink =
        document.getElementById(
            "employeeMenuLogout"
        );


    if (!button || !menu) {
        return;
    }


    /* Prevent duplicate initialization */
    if (
        button.dataset.userMenuInitialized ===
        "true"
    ) {
        return;
    }


    button.dataset.userMenuInitialized =
        "true";


    /* ---------------------------------------------------------
       Toggle menu
    --------------------------------------------------------- */

    button.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            event.stopPropagation();


            const isOpen =
                menu.classList.toggle(
                    "show"
                );


            button.setAttribute(
                "aria-expanded",
                String(isOpen)
            );


            menu.setAttribute(
                "aria-hidden",
                String(!isOpen)
            );
        }
    );


    /* ---------------------------------------------------------
       Prevent menu click from closing itself
    --------------------------------------------------------- */

    menu.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();
        }
    );


    /* ---------------------------------------------------------
       Close when clicking outside
    --------------------------------------------------------- */

    document.addEventListener(
        "click",
        () => {

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
    );


    /* ---------------------------------------------------------
       Escape key
    --------------------------------------------------------- */

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }


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
    );


    /* ---------------------------------------------------------
       Sign out
    --------------------------------------------------------- */

    if (logoutLink) {

        logoutLink.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                event.stopPropagation();

                logout();
            }
        );
    }
}