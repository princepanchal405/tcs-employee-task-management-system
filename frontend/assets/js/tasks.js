"use strict";

let currentPage = 1;
let totalPages = 1;
let currentTasks = [];
let isEditing = false;
let editingTaskId = null;
let taskToDelete = null;
let taskRequestController = null;


document.addEventListener("DOMContentLoaded", async () => {
    if (!requireAuthentication()) {
        return;
    }
    initializeTaskPage();
    initializeTaskUserInfo();
    initializeTaskUserMenu();
    applyTaskRoleUI();
    await loadTaskEmployees();
    await loadTasks();
});

function initializeTaskPage() {
    const searchInput = document.getElementById("taskSearch");
    const employeeFilter = document.getElementById("taskEmployeeFilter");
    const priorityFilter = document.getElementById("taskPriorityFilter");
    const statusFilter = document.getElementById("taskStatusFilter");
    const ordering = document.getElementById("taskOrdering");
    const resetButton = document.getElementById("resetTaskFilters");
    const addButton = document.getElementById("addTaskButton");
    const emptyCreateButton = document.getElementById("emptyCreateTaskButton");
    const alertCloseButton = document.getElementById("taskAlertClose");
    const taskForm = document.getElementById("taskForm");
    const deleteButton = document.getElementById("confirmDeleteTaskButton");
    const previousButton = document.getElementById("previousTaskPage");
    const nextButton = document.getElementById("nextTaskPage");

    searchInput?.addEventListener("input", debounce(() => { currentPage = 1; loadTasks(); }, 350));
    employeeFilter?.addEventListener("change", () => { currentPage = 1; loadTasks(); });
    priorityFilter?.addEventListener("change", () => { currentPage = 1; loadTasks(); });
    statusFilter?.addEventListener("change", () => { currentPage = 1; loadTasks(); });
    ordering?.addEventListener("change", () => { currentPage = 1; loadTasks(); });
    resetButton?.addEventListener("click", resetTaskFilters);

    previousButton?.addEventListener("click", () => {
        if (currentPage > 1) { currentPage -= 1; loadTasks(); }
    });
    nextButton?.addEventListener("click", () => {
        if (currentPage < totalPages) { currentPage += 1; loadTasks(); }
    });

    addButton?.addEventListener("click", openCreateTaskModal);
    emptyCreateButton?.addEventListener("click", openCreateTaskModal);
    alertCloseButton?.addEventListener("click", hideTaskAlert);
    taskForm?.addEventListener("submit", handleTaskSubmit);
    deleteButton?.addEventListener("click", confirmDeleteTask);

    initializeTaskModalReset();
    initializeTaskDateMinimum();
}

function initializeTaskUserInfo() {
    const user = getCurrentUser();
    if (!user) return;

    const name = user.name || user.username || "User";
    const role = user.role === "ADMIN" ? "Administrator" : "Employee";

    setText("taskUserName", name);
    setText("taskUserRole", role);
    setText("taskUserAvatar", getInitials(name));
    setText("taskMenuUserName", name);
    setText("taskMenuUserEmail", user.email || "");
    setText("taskMenuUserRole", role);
}

function applyTaskRoleUI() {
    const isAdmin = getCurrentUser()?.role === "ADMIN";

    setText("taskTopbarHeading", isAdmin ? "Tasks" : "My Tasks");
    setText("taskHeading", isAdmin ? "Task Management" : "My Tasks");
    setText(
        "taskPageDescription",
        isAdmin
            ? "Create, assign and monitor employee tasks."
            : "View your assigned tasks and update their status."
    );
    setText("taskSectionLabel", isAdmin ? "Management" : "Workspace");
    setText("taskTableHeading", isAdmin ? "Task Records" : "My Task Records");
    setText("taskSidebarLabel", isAdmin ? "Tasks" : "My Tasks");

    document.querySelectorAll('[data-role="ADMIN"]').forEach((element) => {
        element.hidden = !isAdmin;
    });

    const employeeFilterWrap = document.getElementById("taskEmployeeFilterWrap");
    if (employeeFilterWrap) employeeFilterWrap.hidden = !isAdmin;
}

async function loadTaskEmployees() {
    const assignedSelect = document.getElementById("taskAssignedTo");
    const filterSelect = document.getElementById("taskEmployeeFilter");

    if (getCurrentUser()?.role !== "ADMIN") return;
    if (!assignedSelect && !filterSelect) return;

    try {
        const response = await apiRequest("/employees/?page=1&page_size=100", { method: "GET" });
        ensureTaskSuccessfulResponse(response, "Unable to load employees.");

        const employees = Array.isArray(response.data) ? response.data : [];

        if (assignedSelect) {
            assignedSelect.innerHTML = '<option value="">Select employee</option>';
            employees
                .filter((employee) => String(employee.employment_status || "").toUpperCase() === "ACTIVE")
                .forEach((employee) => {
                    const option = document.createElement("option");
                    option.value = employee.id;
                    option.textContent = `${employee.name || "Employee"} (${employee.employee_id || employee.id})`;
                    assignedSelect.appendChild(option);
                });
            if (assignedSelect.options.length === 1) {
                assignedSelect.innerHTML = '<option value="">No active employees available</option>';
            }
        }

        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">All Employees</option>';
            employees.forEach((employee) => {
                const option = document.createElement("option");
                option.value = employee.id;
                option.textContent = `${employee.name || "Employee"} (${employee.employee_id || employee.id})`;
                filterSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Task employee loading error:", error);
        if (assignedSelect) assignedSelect.innerHTML = '<option value="">Unable to load employees</option>';
    }
}

async function loadTasks() {
    if (taskRequestController) taskRequestController.abort();
    const controller = new AbortController();
    taskRequestController = controller;
    showTaskLoading();

    try {
        const params = new URLSearchParams();
        const search = getValue("taskSearch");
        const employee = getValue("taskEmployeeFilter");
        const priority = getValue("taskPriorityFilter");
        const taskStatus = getValue("taskStatusFilter");
        const ordering = getValue("taskOrdering") || "-created_at";

        params.set("page", String(currentPage));
        params.set("ordering", ordering);
        if (search) params.set("search", search);
        if (employee) params.set("assigned_to", employee);
        if (priority) params.set("priority", priority);
        if (taskStatus) params.set("status", taskStatus);

        const response = await apiRequest(`/tasks/?${params.toString()}`, { method: "GET", signal: controller.signal });
        if (controller.signal.aborted) return;

        ensureTaskSuccessfulResponse(response, "Unable to load tasks.");
        currentTasks = Array.isArray(response.data) ? response.data : [];
        const pagination = response.pagination || {};

        currentPage = Number(pagination.page) || currentPage || 1;
        totalPages = Number(pagination.total_pages) || 1;

        renderTaskTable(currentTasks, pagination);
        renderTaskPagination({
            page: currentPage,
            page_size: Number(pagination.page_size) || 10,
            total_items: Number(pagination.total_items) || currentTasks.length,
            total_pages: totalPages,
        });
    } catch (error) {
        if (error?.name === "AbortError") return;
        console.error("Task loading error:", error);
        showTaskError(getApiErrorMessage(error, "Unable to load task records."));
    } finally {
        if (taskRequestController === controller) taskRequestController = null;
    }
}

function renderTaskTable(tasks, paginationData = {}) {
    const wrapper = document.getElementById("taskTableWrapper");
    const empty = document.getElementById("taskEmpty");
    const loading = document.getElementById("taskLoading");
    const pagination = document.getElementById("taskPagination");
    const tbody = document.getElementById("taskTableBody");
    const count = document.getElementById("taskCount");

    loading?.classList.add("d-none");
    if (count) count.textContent = Number(paginationData.total_items) || tasks.length;

    if (!tasks.length) {
        wrapper?.classList.add("d-none");
        pagination?.classList.add("d-none");
        empty?.classList.remove("d-none");
        if (tbody) tbody.innerHTML = "";
        const createButton = document.getElementById("emptyCreateTaskButton");
        if (createButton) createButton.hidden = getCurrentUser()?.role !== "ADMIN";
        return;
    }

    empty?.classList.add("d-none");
    wrapper?.classList.remove("d-none");
    pagination?.classList.remove("d-none");
    if (tbody) tbody.innerHTML = tasks.map(renderTaskRow).join("");
}

function renderTaskRow(task) {
    const isAdmin = getCurrentUser()?.role === "ADMIN";
    const priority = normalizeValue(task.priority);
    const taskStatus = normalizeValue(task.status);
    const employeeName = task.assigned_employee_name || task.assigned_to_name || task.employee_name || task.assigned_to?.name || "Unknown Employee";
    const employeeId = task.assigned_employee_id || task.assigned_to_employee_id || task.employee_id || task.assigned_to?.employee_id || "";
    const createdBy = task.created_by_name || task.created_by_username || task.created_by_email || "-";

    const actions = isAdmin
        ? `
            <button type="button" class="task-action-button view" title="View task" data-action="view" data-id="${Number(task.id)}"><i class="bi bi-eye"></i></button>
            <button type="button" class="task-action-button edit" title="Edit task" data-action="edit" data-id="${Number(task.id)}"><i class="bi bi-pencil"></i></button>
            <button type="button" class="task-action-button delete" title="Delete task" data-action="delete" data-id="${Number(task.id)}"><i class="bi bi-trash3"></i></button>`
        : `
            <button type="button" class="task-action-button view" title="View task" data-action="view" data-id="${Number(task.id)}"><i class="bi bi-eye"></i></button>
            <button type="button" class="task-action-button status" title="Update status" data-action="status" data-id="${Number(task.id)}"><i class="bi bi-arrow-repeat"></i></button>`;

    return `
        <tr>
            <td><div class="task-table-main"><div class="task-table-icon"><i class="bi bi-check2-square"></i></div><div class="task-table-info"><strong>${escapeHtml(task.title || "Untitled Task")}</strong><span>${escapeHtml(truncateText(task.description || "No description", 70))}</span></div></div></td>
            <td><div class="task-assigned-person"><div class="task-assigned-avatar">${escapeHtml(getInitials(employeeName))}</div><div class="task-assigned-info"><strong>${escapeHtml(employeeName)}</strong><span>${escapeHtml(employeeId)}</span></div></div></td>
            <td><span class="task-priority ${getPriorityClass(priority)}">${getPriorityText(priority)}</span></td>
            <td>${renderDueDate(task.due_date)}</td>
            <td><span class="task-status ${getTaskStatusClass(taskStatus)}"><span></span>${getTaskStatusText(taskStatus)}</span></td>
            <td>${escapeHtml(createdBy)}</td>
            <td><div class="task-actions">${actions}</div></td>
        </tr>`;
}

document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const id = Number(button.dataset.id);
    if (!id) return;
    const action = button.dataset.action;
    if (action === "view") viewTask(id);
    if (action === "edit") editTask(id);
    if (action === "status") updateTaskStatus(id);
    if (action === "delete") deleteTask(id);
});

function openCreateTaskModal() {
    if (getCurrentUser()?.role !== "ADMIN") return;
    isEditing = false;
    editingTaskId = null;
    document.getElementById("taskForm")?.reset();
    clearTaskFormErrors();
    setTaskFormAdminMode();
    setText("taskModalTitle", "Create Task");
    setText("taskModalSubtitle", "Create and assign a new task.");
    setText("taskSubmitText", "Create Task");
    setDefaultTaskDueDate();
    openTaskModal("taskModal");
}

async function editTask(id) {
    if (getCurrentUser()?.role !== "ADMIN" || !id) return;
    try {
        const response = await apiRequest(`/tasks/${id}/`, { method: "GET" });
        ensureTaskSuccessfulResponse(response, "Unable to load task.");
        isEditing = true;
        editingTaskId = Number(id);
        populateTaskForm(response.data);
        setTaskFormAdminMode();
        setText("taskModalTitle", "Edit Task");
        setText("taskModalSubtitle", "Update task information.");
        setText("taskSubmitText", "Save Changes");
        openTaskModal("taskModal");
    } catch (error) {
        console.error("Edit task error:", error);
        showTaskAlert(getApiErrorMessage(error, "Unable to load task."), "error");
    }
}

async function viewTask(id) {
    if (!id) return;
    try {
        const response = await apiRequest(`/tasks/${id}/`, { method: "GET" });
        ensureTaskSuccessfulResponse(response, "Unable to load task details.");
        renderTaskDetails(response.data);
        openTaskModal("taskDetailsModal");
    } catch (error) {
        console.error("View task error:", error);
        showTaskAlert(getApiErrorMessage(error, "Unable to load task details."), "error");
    }
}

async function updateTaskStatus(id) {
    if (getCurrentUser()?.role !== "EMPLOYEE" || !id) return;
    try {
        const response = await apiRequest(`/tasks/${id}/`, { method: "GET" });
        ensureTaskSuccessfulResponse(response, "Unable to load task.");
        isEditing = true;
        editingTaskId = Number(id);
        populateTaskForm(response.data);
        setTaskFormEmployeeMode();
        setText("taskModalTitle", "Update Task Status");
        setText("taskModalSubtitle", "Update the status of your assigned task.");
        setText("taskSubmitText", "Update Status");
        openTaskModal("taskModal");
    } catch (error) {
        console.error("Task status loading error:", error);
        showTaskAlert(getApiErrorMessage(error, "Unable to load task."), "error");
    }
}

function populateTaskForm(task) {
    setValue("taskTitle", task.title);
    setValue("taskDescription", task.description);
    setValue("taskAssignedTo", task.assigned_to ?? task.assigned_to_id ?? "");
    setValue("taskPriority", normalizeValue(task.priority) || "MEDIUM");
    setValue("taskDueDate", task.due_date);
    setValue("taskStatus", normalizeValue(task.status) || "PENDING");
}

function setTaskFormAdminMode() {
    ["taskTitle", "taskDescription", "taskAssignedTo", "taskPriority", "taskDueDate", "taskStatus"].forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.disabled = false;
    });
}

function setTaskFormEmployeeMode() {
    ["taskTitle", "taskDescription", "taskAssignedTo", "taskPriority", "taskDueDate"].forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.disabled = true;
    });
    const status = document.getElementById("taskStatus");
    if (status) status.disabled = false;
}

async function handleTaskSubmit(event) {
    event.preventDefault();
    clearTaskFormErrors();

    const user = getCurrentUser();
    const role = user?.role || "EMPLOYEE";
    const data = collectTaskFormData();

    if (!validateTaskForm(data, role)) return;

    const submitButton = document.getElementById("taskSubmitButton");
    const spinner = document.getElementById("taskSubmitSpinner");
    const submitIcon = document.getElementById("taskSubmitIcon");
    const submitText = document.getElementById("taskSubmitText");

    if (submitButton) submitButton.disabled = true;
    spinner?.classList.remove("d-none");
    submitIcon?.classList.add("d-none");
    if (submitText) submitText.textContent = isEditing ? "Saving..." : "Creating...";

    try {
        let endpoint;
        let method;
        let body;

        if (!isEditing) {
            if (role !== "ADMIN") throw createTaskApiError("Only administrators can create tasks.");
            endpoint = "/tasks/";
            method = "POST";
            body = data;
        } else {
            endpoint = `/tasks/${editingTaskId}/`;
            method = "PATCH";
            body = role === "EMPLOYEE" ? { status: data.status } : data;
        }

        const response = await apiRequest(endpoint, { method, body });
        ensureTaskSuccessfulResponse(response, isEditing ? "Unable to update task." : "Unable to create task.");

        closeTaskModal("taskModal");
        showTaskAlert(
            role === "EMPLOYEE"
                ? "Task status updated successfully."
                : isEditing
                    ? "Task updated successfully."
                    : "Task created successfully.",
            "success"
        );
        currentPage = 1;
        await loadTasks();
    } catch (error) {
        console.error("Task save error:", error);
        handleTaskFormApiErrors(error);
        if (!hasTaskFormErrors()) {
            showTaskAlert(getApiErrorMessage(error, isEditing ? "Unable to update task." : "Unable to create task."), "error");
        }
    } finally {
        if (submitButton) submitButton.disabled = false;
        spinner?.classList.add("d-none");
        submitIcon?.classList.remove("d-none");
        if (submitText) submitText.textContent = isEditing ? (role === "EMPLOYEE" ? "Update Status" : "Save Changes") : "Create Task";
    }
}

function collectTaskFormData() {
    return {
        title: getValue("taskTitle"),
        description: getValue("taskDescription"),
        assigned_to: getValue("taskAssignedTo"),
        priority: normalizeValue(getValue("taskPriority")),
        due_date: getValue("taskDueDate"),
        status: normalizeValue(getValue("taskStatus")) || "PENDING",
    };
}

function validateTaskForm(data, role) {
    let valid = true;

    if (role === "EMPLOYEE") {
        if (!["PENDING", "IN_PROGRESS", "COMPLETED"].includes(data.status)) {
            setTaskFormError("taskStatus", "Select a valid task status.");
            valid = false;
        }
        return valid;
    }

    if (!data.title) {
        setTaskFormError("taskTitle", "Task title is required.");
        valid = false;
    } else if (data.title.length < 3) {
        setTaskFormError("taskTitle", "Task title must contain at least 3 characters.");
        valid = false;
    }

    if (!data.assigned_to) {
        const assignedSelect = document.getElementById("taskAssignedTo");
        const hasAssignableEmployees = assignedSelect && assignedSelect.options.length > 1 && !assignedSelect.options[0]?.textContent?.startsWith("No active");
        setTaskFormError(
            "taskAssignedTo",
            hasAssignableEmployees ? "Please select an employee." : "No active employees are available. Add or activate an employee first."
        );
        valid = false;
    }

    if (!["LOW", "MEDIUM", "HIGH"].includes(data.priority)) {
        setTaskFormError("taskPriority", "Select a valid priority.");
        valid = false;
    }

    if (!data.due_date) {
        setTaskFormError("taskDueDate", "Due date is required.");
        valid = false;
    } else if (data.due_date < getLocalDateString()) {
        setTaskFormError("taskDueDate", "Due date cannot be in the past.");
        valid = false;
    }

    if (!["PENDING", "IN_PROGRESS", "COMPLETED"].includes(data.status)) {
        setTaskFormError("taskStatus", "Select a valid task status.");
        valid = false;
    }

    return valid;
}

function deleteTask(id) {
    if (getCurrentUser()?.role !== "ADMIN" || !id) return;
    taskToDelete = Number(id);
    openTaskModal("deleteTaskModal");
}

async function confirmDeleteTask() {
    if (getCurrentUser()?.role !== "ADMIN" || !taskToDelete) return;

    const button = document.getElementById("confirmDeleteTaskButton");
    const spinner = document.getElementById("deleteTaskSpinner");
    const buttonText = document.getElementById("deleteTaskButtonText");

    if (button) button.disabled = true;
    spinner?.classList.remove("d-none");
    if (buttonText) buttonText.textContent = "Deleting...";

    try {
        const response = await apiRequest(`/tasks/${taskToDelete}/`, { method: "DELETE" });
        ensureTaskSuccessfulResponse(response, "Unable to delete task.");
        closeTaskModal("deleteTaskModal");
        showTaskAlert("Task deleted successfully.", "success");
        taskToDelete = null;
        if (currentTasks.length === 1 && currentPage > 1) currentPage -= 1;
        await loadTasks();
    } catch (error) {
        console.error("Delete task error:", error);
        showTaskAlert(getApiErrorMessage(error, "Unable to delete task."), "error");
    } finally {
        if (button) button.disabled = false;
        spinner?.classList.add("d-none");
        if (buttonText) buttonText.textContent = "Delete Task";
    }
}

function renderTaskDetails(task) {
    setText("detailsTaskTitle", task.title || "-");
    setText("detailsTaskId", `Task #${task.id || "-"}`);
    setText("detailsTaskDescription", task.description || "No description provided.");
    setText("detailsAssignedEmployee", task.assigned_employee_name || task.assigned_to_name || task.employee_name || task.assigned_to?.name || "-");
    setText("detailsAssignedEmployeeId", task.assigned_employee_id || task.assigned_to_employee_id || task.employee_id || task.assigned_to?.employee_id || "-");
    setText("detailsTaskPriority", getPriorityText(task.priority));
    setText("detailsTaskDueDate", formatTaskDate(task.due_date));
    setText("detailsTaskStatus", getTaskStatusText(task.status));
    setText("detailsTaskCreatedBy", task.created_by_name || task.created_by_username || task.created_by_email || "-");
    setText("detailsTaskCreatedAt", formatTaskDateTime(task.created_at));
}

function renderTaskPagination(pagination) {
    const total = Number(pagination.total_items) || 0;
    const page = Number(pagination.page) || 1;
    const pageSize = Number(pagination.page_size) || 10;
    const pages = Number(pagination.total_pages) || 1;

    totalPages = pages;
    setText("taskPaginationStart", total === 0 ? 0 : ((page - 1) * pageSize) + 1);
    setText("taskPaginationEnd", Math.min(page * pageSize, total));
    setText("taskPaginationTotal", total);

    const previous = document.getElementById("previousTaskPage");
    const next = document.getElementById("nextTaskPage");
    if (previous) previous.disabled = page <= 1;
    if (next) next.disabled = page >= pages;

    const numbers = document.getElementById("taskPaginationNumbers");
    if (!numbers) return;
    numbers.innerHTML = "";
    if (pages <= 1) return;

    buildTaskPaginationPages(page, pages).forEach((item) => {
        if (item === "...") {
            const span = document.createElement("span");
            span.className = "pagination-ellipsis";
            span.textContent = "...";
            numbers.appendChild(span);
            return;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.className = `pagination-number ${item === page ? "active" : ""}`;
        button.textContent = item;
        button.addEventListener("click", () => {
            if (item !== currentPage) {
                currentPage = item;
                loadTasks();
            }
        });
        numbers.appendChild(button);
    });
}

function buildTaskPaginationPages(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
    const pages = [1];
    if (current > 3) pages.push("...");
    for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page += 1) pages.push(page);
    if (current < total - 2) pages.push("...");
    pages.push(total);
    return pages;
}

function resetTaskFilters() {
    setValue("taskSearch", "");
    setValue("taskEmployeeFilter", "");
    setValue("taskPriorityFilter", "");
    setValue("taskStatusFilter", "");
    setValue("taskOrdering", "-created_at");
    currentPage = 1;
    loadTasks();
}

function showTaskLoading() {
    document.getElementById("taskLoading")?.classList.remove("d-none");
    document.getElementById("taskEmpty")?.classList.add("d-none");
    document.getElementById("taskTableWrapper")?.classList.add("d-none");
    document.getElementById("taskPagination")?.classList.add("d-none");
}

function showTaskError(message) {
    document.getElementById("taskLoading")?.classList.add("d-none");
    document.getElementById("taskTableWrapper")?.classList.add("d-none");
    document.getElementById("taskPagination")?.classList.add("d-none");
    const empty = document.getElementById("taskEmpty");
    empty?.classList.remove("d-none");
    setText("taskEmptyHeading", "Unable to load tasks");
    setText("taskEmptyDescription", message);
    const icon = document.getElementById("taskEmptyIcon");
    if (icon) icon.className = "bi bi-exclamation-triangle";
    document.getElementById("emptyCreateTaskButton")?.classList.add("d-none");
}

function showTaskAlert(message, type = "success") {
    const alert = document.getElementById("taskAlert");
    const messageElement = document.getElementById("taskAlertMessage");
    const icon = document.getElementById("taskAlertIcon");
    if (!alert || !messageElement) return;

    alert.classList.remove("d-none", "success", "error");
    alert.classList.add(type === "error" ? "error" : "success");
    messageElement.textContent = message;
    if (icon) icon.className = type === "error" ? "bi bi-exclamation-triangle" : "bi bi-check-circle";
    window.clearTimeout(showTaskAlert.timeoutId);
    showTaskAlert.timeoutId = window.setTimeout(hideTaskAlert, 5000);
}

function hideTaskAlert() {
    document.getElementById("taskAlert")?.classList.add("d-none");
}

function handleTaskFormApiErrors(error) {
    const response = error?.data || error;
    const errors = response?.errors || response;
    if (!errors || typeof errors !== "object") return;

    const fieldMap = {
        title: "taskTitle",
        description: "taskDescription",
        assigned_to: "taskAssignedTo",
        priority: "taskPriority",
        due_date: "taskDueDate",
        status: "taskStatus",
    };

    Object.entries(errors).forEach(([field, messages]) => {
        const inputId = fieldMap[field];
        if (!inputId) return;
        const message = Array.isArray(messages) ? messages[0] : String(messages);
        setTaskFormError(inputId, message);
    });
}

function setTaskFormError(inputId, message) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.classList.add("is-invalid");
    let errorElement = input.parentElement?.querySelector(".task-form-error");
    if (!errorElement) {
        errorElement = document.createElement("div");
        errorElement.className = "task-form-error";
        input.parentElement?.appendChild(errorElement);
    }
    errorElement.textContent = message;
}

function clearTaskFormErrors() {
    document.querySelectorAll("#taskForm .is-invalid").forEach((element) => element.classList.remove("is-invalid"));
    document.querySelectorAll("#taskForm .task-form-error").forEach((element) => element.remove());
}

function hasTaskFormErrors() {
    return Boolean(document.querySelector("#taskForm .task-form-error"));
}

function openTaskModal(id) {
    const element = document.getElementById(id);
    if (!element || typeof bootstrap === "undefined") return;
    bootstrap.Modal.getOrCreateInstance(element).show();
}

function closeTaskModal(id) {
    const element = document.getElementById(id);
    if (!element || typeof bootstrap === "undefined") return;
    bootstrap.Modal.getInstance(element)?.hide();
}

function initializeTaskModalReset() {
    const modal = document.getElementById("taskModal");
    modal?.addEventListener("hidden.bs.modal", () => {
        document.getElementById("taskForm")?.reset();
        clearTaskFormErrors();
        isEditing = false;
        editingTaskId = null;
        setTaskFormAdminMode();
    });

    document.getElementById("deleteTaskModal")?.addEventListener("hidden.bs.modal", () => {
        taskToDelete = null;
    });
}

function initializeTaskDateMinimum() {
    const input = document.getElementById("taskDueDate");
    if (input) input.min = getLocalDateString();
}

function setDefaultTaskDueDate() {
    const input = document.getElementById("taskDueDate");
    if (!input) return;
    input.min = getLocalDateString();
    if (!input.value) {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        input.value = date.toISOString().split("T")[0];
    }
}

function getLocalDateString() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function normalizeValue(value) {
    return String(value ?? "").trim().toUpperCase();
}

function getPriorityClass(priority) {
    if (priority === "LOW") return "task-priority-low";
    if (priority === "HIGH") return "task-priority-high";
    return "task-priority-medium";
}

function getPriorityText(priority) {
    if (priority === "LOW") return "Low";
    if (priority === "MEDIUM") return "Medium";
    if (priority === "HIGH") return "High";
    return "-";
}

function getTaskStatusClass(status) {
    if (status === "COMPLETED") return "task-status-completed";
    if (status === "IN_PROGRESS") return "task-status-progress";
    return "task-status-pending";
}

function getTaskStatusText(status) {
    if (status === "PENDING") return "Pending";
    if (status === "IN_PROGRESS") return "In Progress";
    if (status === "COMPLETED") return "Completed";
    return "-";
}

function renderDueDate(dateString) {
    if (!dateString) return '<span class="task-due-date"><i class="bi bi-calendar-event"></i> -</span>';
    const overdue = dateString < getLocalDateString();
    return `<span class="task-due-date ${overdue ? "overdue" : ""}"><i class="bi bi-calendar-event"></i> ${escapeHtml(formatTaskDate(dateString))}</span>`;
}

function formatTaskDate(dateString) {
    if (!dateString) return "-";
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTaskDateTime(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function initializeTaskUserMenu() {
    const button = document.getElementById("taskUserButton");
    const menu = document.getElementById("taskUserMenu");
    if (!button || !menu) return;

    button.addEventListener("click", (event) => {
        event.stopPropagation();
        const open = menu.classList.toggle("show");
        button.setAttribute("aria-expanded", String(open));
        menu.setAttribute("aria-hidden", String(!open));
    });

    document.addEventListener("click", (event) => {
        if (!menu.contains(event.target) && !button.contains(event.target)) closeTaskUserMenu();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeTaskUserMenu();
    });

    document.getElementById("taskMenuLogout")?.addEventListener("click", (event) => {
        event.preventDefault();
        closeTaskUserMenu();
        if (typeof logout === "function") logout();
    });

    document.getElementById("taskMenuProfile")?.addEventListener("click", (event) => {
        event.preventDefault();
        closeTaskUserMenu();
        showTaskAlert("My Profile will be available in the account phase.");
    });

    document.getElementById("taskMenuSettings")?.addEventListener("click", (event) => {
        event.preventDefault();
        closeTaskUserMenu();
        showTaskAlert("Settings will be available in the account phase.");
    });

    document.getElementById("taskMenuChangePassword")?.addEventListener("click", (event) => {
        event.preventDefault();
        closeTaskUserMenu();
        showTaskAlert("Change Password will be available in the account phase.");
    });
}

function closeTaskUserMenu() {
    const menu = document.getElementById("taskUserMenu");
    const button = document.getElementById("taskUserButton");
    menu?.classList.remove("show");
    button?.setAttribute("aria-expanded", "false");
    menu?.setAttribute("aria-hidden", "true");
}

function ensureTaskSuccessfulResponse(response, fallbackMessage) {
    if (!response || response.success === false) throw createTaskApiError(response?.message || fallbackMessage, response);
}

function createTaskApiError(message, data = null) {
    const error = new Error(message);
    error.data = data;
    if (data?.status) error.status = data.status;
    return error;
}

function getApiErrorMessage(error, fallback) {
    if (!error) return fallback;
    const data = error.data;
    if (typeof data === "string") return data;
    if (data?.message) return data.message;
    if (data?.detail) return data.detail;
    if (data?.errors && typeof data.errors === "object") {
        const first = Object.values(data.errors)[0];
        if (Array.isArray(first)) return first[0];
        if (first) return String(first);
    }
    return error.message || fallback;
}

function getValue(id) {
    return document.getElementById(id)?.value?.trim() || "";
}

function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value ?? "";
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value ?? "-";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function truncateText(value, maxLength) {
    const text = String(value ?? "");
    return text.length <= maxLength ? text : `${text.slice(0, maxLength)}...`;
}

function getInitials(name) {
    const safe = String(name || "User").trim();
    return safe.split(/\s+/).slice(0, 2).map((word) => word.charAt(0)).join("").toUpperCase() || "U";
}

function debounce(callback, delay) {
    let timer = null;
    return function (...args) {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => callback(...args), delay);
    };
}
