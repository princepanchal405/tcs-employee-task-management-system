"use strict";

document.addEventListener("DOMContentLoaded", () => {
    if (typeof isAuthenticated === "function" && isAuthenticated()) {
        window.location.href = APP_CONFIG.PAGES.DASHBOARD;
        return;
    }

    initializeRegistrationPasswordToggles();
    initializeRegistrationForm();
});


function initializeRegistrationPasswordToggles() {
    document.querySelectorAll("[data-password-target]").forEach((button) => {
        button.addEventListener("click", () => {
            const input = document.getElementById(button.dataset.passwordTarget);
            if (!input) return;

            const isPassword = input.type === "password";
            input.type = isPassword ? "text" : "password";

            const icon = button.querySelector("i");
            if (icon) {
                icon.classList.toggle("bi-eye", !isPassword);
                icon.classList.toggle("bi-eye-slash", isPassword);
            }

            button.setAttribute(
                "aria-label",
                isPassword ? "Hide password" : "Show password"
            );
        });
    });
}


function initializeRegistrationForm() {
    const form = document.getElementById("registrationForm");
    if (!form) return;

    form.addEventListener("submit", handleRegistrationSubmit);
}


async function handleRegistrationSubmit(event) {
    event.preventDefault();
    clearRegistrationErrors();
    hideRegistrationAlert();

    const data = collectRegistrationData();

    if (!validateRegistration(data)) {
        return;
    }

    const button = document.getElementById("registerSubmitButton");
    const text = document.getElementById("registerSubmitText");
    const spinner = document.getElementById("registerSpinner");
    const arrow = document.getElementById("registerArrow");

    if (button) {
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
    }
    if (text) text.textContent = "Creating...";
    if (spinner) spinner.classList.remove("d-none");
    if (arrow) arrow.classList.add("d-none");

    try {
        const response = await apiRequest("/auth/register/", {
            method: "POST",
            body: data,
            requiresAuth: false,
        });

        if (!response?.success) {
            throw createRegistrationError(
                response?.message || "Unable to create employee account.",
                response
            );
        }

        showRegistrationAlert(
            "Account created successfully. You can now sign in with your email and password.",
            "success"
        );

        document.getElementById("registrationForm")?.reset();

        window.setTimeout(() => {
            window.location.href = "index.html?registered=1";
        }, 1200);
    } catch (error) {
        console.error("Registration failed:", error);
        handleRegistrationApiErrors(error);

        if (!hasRegistrationErrors()) {
            showRegistrationAlert(
                getRegistrationErrorMessage(
                    error,
                    "Unable to create employee account. Please try again."
                ),
                "error"
            );
        }
    } finally {
        if (button) {
            button.disabled = false;
            button.removeAttribute("aria-busy");
        }
        if (text) text.textContent = "Create account";
        if (spinner) spinner.classList.add("d-none");
        if (arrow) arrow.classList.remove("d-none");
    }
}


function collectRegistrationData() {
    return {
        employee_id: getRegisterValue("registerEmployeeId").toUpperCase(),
        name: getRegisterValue("registerName"),
        email: getRegisterValue("registerEmail").toLowerCase(),
        mobile: getRegisterValue("registerMobile"),
        department: getRegisterValue("registerDepartment"),
        designation: getRegisterValue("registerDesignation"),
        location: getRegisterValue("registerLocation"),
        joining_date: getRegisterValue("registerJoiningDate"),
        password: document.getElementById("registerPassword")?.value || "",
        confirm_password:
            document.getElementById("registerConfirmPassword")?.value || "",
    };
}


function validateRegistration(data) {
    let valid = true;

    if (!data.employee_id) {
        setRegistrationError("registerEmployeeId", "Employee ID is required.");
        valid = false;
    } else if (!/^[A-Z0-9-]+$/i.test(data.employee_id)) {
        setRegistrationError(
            "registerEmployeeId",
            "Use only letters, numbers and hyphens."
        );
        valid = false;
    }

    if (!data.name) {
        setRegistrationError("registerName", "Full name is required.");
        valid = false;
    }

    if (!data.email) {
        setRegistrationError("registerEmail", "Email address is required.");
        valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        setRegistrationError("registerEmail", "Enter a valid email address.");
        valid = false;
    }

    if (!data.mobile) {
        setRegistrationError("registerMobile", "Mobile number is required.");
        valid = false;
    } else if (!/^\+?[0-9]{10,15}$/.test(data.mobile)) {
        setRegistrationError("registerMobile", "Enter a valid mobile number.");
        valid = false;
    }

    if (!data.department) {
        setRegistrationError("registerDepartment", "Department is required.");
        valid = false;
    }

    if (!data.designation) {
        setRegistrationError("registerDesignation", "Designation is required.");
        valid = false;
    }

    if (!data.location) {
        setRegistrationError("registerLocation", "Location is required.");
        valid = false;
    }

    if (!data.joining_date) {
        setRegistrationError("registerJoiningDate", "Joining date is required.");
        valid = false;
    } else {
        const today = new Date().toISOString().split("T")[0];
        if (data.joining_date > today) {
            setRegistrationError(
                "registerJoiningDate",
                "Joining date cannot be in the future."
            );
            valid = false;
        }
    }

    if (!data.password) {
        setRegistrationError("registerPassword", "Password is required.");
        valid = false;
    } else if (data.password.length < 8) {
        setRegistrationError(
            "registerPassword",
            "Password must contain at least 8 characters."
        );
        valid = false;
    }

    if (!data.confirm_password) {
        setRegistrationError(
            "registerConfirmPassword",
            "Please confirm the password."
        );
        valid = false;
    } else if (data.password !== data.confirm_password) {
        setRegistrationError(
            "registerConfirmPassword",
            "Passwords do not match."
        );
        valid = false;
    }

    return valid;
}


function handleRegistrationApiErrors(error) {
    const data = error?.data;
    const errors = data?.errors || data;
    if (!errors || typeof errors !== "object") return;

    const fieldMap = {
        employee_id: "registerEmployeeId",
        name: "registerName",
        email: "registerEmail",
        mobile: "registerMobile",
        department: "registerDepartment",
        designation: "registerDesignation",
        location: "registerLocation",
        joining_date: "registerJoiningDate",
        password: "registerPassword",
        confirm_password: "registerConfirmPassword",
    };

    Object.entries(errors).forEach(([field, messages]) => {
        const inputId = fieldMap[field];
        if (!inputId) return;

        const message = Array.isArray(messages) ? messages[0] : String(messages);
        setRegistrationError(inputId, message);
    });
}


function setRegistrationError(inputId, message) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.classList.add("is-invalid");

    const error = document.querySelector(
        `[data-error-for="${inputId}"]`
    );
    if (error) error.textContent = message;
}


function clearRegistrationErrors() {
    document.querySelectorAll("#registrationForm .is-invalid").forEach((element) => {
        element.classList.remove("is-invalid");
    });

    document.querySelectorAll(".registration-error").forEach((element) => {
        element.textContent = "";
    });
}


function hasRegistrationErrors() {
    return Boolean(
        document.querySelector(
            "#registrationForm .registration-error:not(:empty)"
        )
    );
}


function showRegistrationAlert(message, type = "success") {
    const alert = document.getElementById("registrationAlert");
    if (!alert) return;

    alert.textContent = message;
    alert.className = `registration-alert ${type}`;
}


function hideRegistrationAlert() {
    const alert = document.getElementById("registrationAlert");
    if (!alert) return;

    alert.textContent = "";
    alert.className = "registration-alert d-none";
}


function getRegistrationErrorMessage(error, fallback) {
    const data = error?.data;

    if (typeof data?.message === "string") return data.message;
    if (typeof data?.detail === "string") return data.detail;
    if (error?.message) return error.message;

    return fallback;
}


function createRegistrationError(message, data = null) {
    const error = new Error(message);
    error.data = data;
    error.status = data?.status;
    return error;
}


function getRegisterValue(id) {
    return document.getElementById(id)?.value?.trim() || "";
}
