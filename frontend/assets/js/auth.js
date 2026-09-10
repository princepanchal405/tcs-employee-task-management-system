/* =========================================================
   AUTHENTICATION MODULE
   TCS Employee & Task Management System
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    if (document.body.classList.contains("login-page")) {
        if (redirectIfAuthenticated()) {
            return;
        }
    }

    initializePasswordToggle();
    initializeLoginForm();
    initializeForgotPassword();
    handleRegistrationNotice();
    restoreRememberedEmail();
});


/* =========================================================
   PASSWORD TOGGLE
========================================================= */

function initializePasswordToggle() {
    const toggleButton = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("password");

    if (!toggleButton || !passwordInput) {
        return;
    }

    toggleButton.addEventListener("click", () => {
        const isPassword = passwordInput.type === "password";

        passwordInput.type = isPassword ? "text" : "password";

        const icon = toggleButton.querySelector("i");

        if (icon) {
            icon.classList.toggle("bi-eye", !isPassword);
            icon.classList.toggle("bi-eye-slash", isPassword);
        }

        toggleButton.setAttribute(
            "aria-label",
            isPassword ? "Hide password" : "Show password"
        );
    });
}


/* =========================================================
   LOGIN FORM
========================================================= */

function initializeLoginForm() {
    const loginForm = document.getElementById("loginForm");

    if (!loginForm) {
        console.error("Login form not found.");
        return;
    }

    loginForm.addEventListener("submit", handleLogin);

    console.log("Login form initialized successfully.");
}


/* =========================================================
   LOGIN
========================================================= */

async function handleLogin(event) {
    event.preventDefault();

    console.log("Login form submitted.");

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const rememberCheckbox = document.getElementById("rememberMe");

    const email = emailInput?.value.trim() || "";
    const password = passwordInput?.value || "";
    const rememberMe = rememberCheckbox?.checked || false;

    clearLoginError();

    /* ---------- Validation ---------- */

    if (!email) {
        showLoginError("Please enter your email address.");
        emailInput?.focus();
        return;
    }

    if (!validateLoginEmail(email)) {
        showLoginError("Please enter a valid email address.");
        emailInput?.focus();
        return;
    }

    if (!password) {
        showLoginError("Please enter your password.");
        passwordInput?.focus();
        return;
    }

    /* ---------- Button ---------- */

    const submitButton =
        document.getElementById("loginButton");

    setLoginButtonLoading(
        submitButton,
        true
    );

    try {
        console.log("Sending login request to backend...");

        /* ---------- API Request ---------- */

        const response = await apiRequest(
            "/auth/login/",
            {
                method: "POST",

                body: {
                    email: email,
                    password: password
                },

                requiresAuth: false
            }
        );

        console.log("Login API response received:", response);

        /* ---------- Response Validation ---------- */

        const authData = response?.data;

        if (
            !authData ||
            !authData.access ||
            !authData.refresh ||
            !authData.user
        ) {
            throw new Error(
                "Invalid authentication response from server."
            );
        }

        /* ---------- Store Access Token ---------- */

        localStorage.setItem(
            APP_CONFIG.TOKEN_KEYS.ACCESS,
            authData.access
        );

        /* ---------- Store Refresh Token ---------- */

        localStorage.setItem(
            APP_CONFIG.TOKEN_KEYS.REFRESH,
            authData.refresh
        );

        /* ---------- Store User ---------- */

        localStorage.setItem(
            APP_CONFIG.STORAGE_KEYS.USER,
            JSON.stringify(authData.user)
        );

        /* ---------- Remember Me ---------- */

        if (rememberMe) {
            localStorage.setItem(
                APP_CONFIG.STORAGE_KEYS.REMEMBER_ME,
                "true"
            );

            localStorage.setItem(
                "remembered_email",
                email
            );
        } else {
            localStorage.removeItem(
                APP_CONFIG.STORAGE_KEYS.REMEMBER_ME
            );

            localStorage.removeItem(
                "remembered_email"
            );
        }

        console.log("Login successful.");

        /* ---------- Redirect ---------- */

        window.location.href =
            APP_CONFIG.PAGES.DASHBOARD;

    } catch (error) {

        console.error(
            "Login request failed:",
            error
        );

        let message =
            "Unable to sign in. Please try again.";

        /* ---------- 400 / 401 ---------- */

        if (
            error.status === 400 ||
            error.status === 401
        ) {
            message =
                getLoginApiErrorMessage(error) ||
                "Invalid email or password.";
        }

        /* ---------- 403 ---------- */

        else if (error.status === 403) {
            message =
                "Your account does not have permission to sign in.";
        }

        /* ---------- 500 ---------- */

        else if (
            error.status >= 500
        ) {
            message =
                "Server error. Please try again later.";
        }

        /* ---------- Network / JavaScript ---------- */

        else if (!error.status) {
            message =
                "Unable to connect to the server. Please make sure the backend is running.";
        }

        showLoginError(message);

    } finally {

        setLoginButtonLoading(
            submitButton,
            false
        );
    }
}


/* =========================================================
   FORGOT PASSWORD
========================================================= */

function initializeForgotPassword() {
    const button = document.getElementById("forgotPassword");
    if (!button) return;

    button.addEventListener("click", () => {
        showLoginError(
            "Password reset is managed by the system administrator. Please contact your administrator for assistance."
        );
    });
}


/* =========================================================
   REGISTRATION NOTICE
========================================================= */

function handleRegistrationNotice() {
    const params = new URLSearchParams(window.location.search);

    if (params.get("registered") !== "1") {
        return;
    }

    const alertBox = document.getElementById("loginAlert");
    const alertMessage = document.getElementById("loginAlertMessage");

    if (!alertBox || !alertMessage) return;

    alertBox.classList.remove("alert-danger", "d-none");
    alertBox.classList.add("alert-success");
    alertMessage.textContent =
        "Account created successfully. You can now sign in.";

    window.history.replaceState(
        {},
        document.title,
        window.location.pathname
    );
}


/* =========================================================
   EMAIL VALIDATION
========================================================= */

function validateLoginEmail(email) {
    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(email);
}


/* =========================================================
   LOGIN BUTTON LOADING
========================================================= */

function setLoginButtonLoading(button, loading) {
    if (!button) {
        return;
    }

    const buttonText =
        document.getElementById("loginButtonText");

    const spinner =
        document.getElementById("loginSpinner");

    const arrow =
        document.getElementById("loginArrow");

    if (loading) {
        button.disabled = true;
        button.setAttribute("aria-busy", "true");

        if (buttonText) {
            buttonText.textContent = "Signing in...";
        }

        if (spinner) {
            spinner.classList.remove("d-none");
        }

        if (arrow) {
            arrow.classList.add("d-none");
        }

    } else {
        button.disabled = false;
        button.removeAttribute("aria-busy");

        if (buttonText) {
            buttonText.textContent = "Sign in";
        }

        if (spinner) {
            spinner.classList.add("d-none");
        }

        if (arrow) {
            arrow.classList.remove("d-none");
        }
    }
}


/* =========================================================
   LOGIN ERROR
========================================================= */

function showLoginError(message) {
    const alertBox =
        document.getElementById("loginAlert");

    const alertMessage =
        document.getElementById("loginAlertMessage");

    if (!alertBox) {
        console.error("Login alert element not found.");
        return;
    }

    if (alertMessage) {
        alertMessage.textContent = message;
    } else {
        alertBox.textContent = message;
    }

    alertBox.classList.remove("d-none");
}


function clearLoginError() {
    const alertBox =
        document.getElementById("loginAlert");

    const alertMessage =
        document.getElementById("loginAlertMessage");

    if (!alertBox) {
        return;
    }

    if (alertMessage) {
        alertMessage.textContent = "";
    }

    alertBox.classList.add("d-none");
}


/* =========================================================
   API ERROR MESSAGE
========================================================= */

function getLoginApiErrorMessage(error) {
    const data = error?.data;

    if (!data) {
        return null;
    }

    if (typeof data.message === "string") {
        return data.message;
    }

    if (typeof data.detail === "string") {
        return data.detail;
    }

    if (
        data.errors &&
        typeof data.errors.detail === "string"
    ) {
        return data.errors.detail;
    }

    if (
        Array.isArray(data.email) &&
        data.email.length > 0
    ) {
        return data.email[0];
    }

    if (
        Array.isArray(data.password) &&
        data.password.length > 0
    ) {
        return data.password[0];
    }

    return null;
}


/* =========================================================
   REMEMBER EMAIL
========================================================= */

function restoreRememberedEmail() {
    const emailInput =
        document.getElementById("email");

    const rememberCheckbox =
        document.getElementById("rememberMe");

    if (!emailInput || !rememberCheckbox) {
        return;
    }

    const rememberedEmail =
        localStorage.getItem("remembered_email");

    const rememberMe =
        localStorage.getItem(
            APP_CONFIG.STORAGE_KEYS.REMEMBER_ME
        );

    if (
        rememberedEmail &&
        rememberMe === "true"
    ) {
        emailInput.value = rememberedEmail;
        rememberCheckbox.checked = true;
    }
}


/* =========================================================
   CURRENT USER
========================================================= */

function getCurrentUser() {
    const user =
        localStorage.getItem(
            APP_CONFIG.STORAGE_KEYS.USER
        );

    if (!user) {
        return null;
    }

    try {
        return JSON.parse(user);

    } catch (error) {

        console.error(
            "Unable to parse stored user:",
            error
        );

        return null;
    }
}


/* =========================================================
   AUTHENTICATION CHECK
========================================================= */

function isAuthenticated() {
    const accessToken =
        localStorage.getItem(
            APP_CONFIG.TOKEN_KEYS.ACCESS
        );

    return Boolean(accessToken);
}


/* =========================================================
   PROTECTED PAGE
========================================================= */

function requireAuthentication() {
    if (!isAuthenticated()) {
        window.location.href =
            APP_CONFIG.PAGES.LOGIN;

        return false;
    }

    return true;
}


/* =========================================================
   REDIRECT AUTHENTICATED USER
========================================================= */

function redirectIfAuthenticated() {
    if (isAuthenticated()) {
        window.location.href =
            APP_CONFIG.PAGES.DASHBOARD;

        return true;
    }

    return false;
}


/* =========================================================
   LOGOUT
========================================================= */

function logout() {
    localStorage.removeItem(
        APP_CONFIG.TOKEN_KEYS.ACCESS
    );

    localStorage.removeItem(
        APP_CONFIG.TOKEN_KEYS.REFRESH
    );

    localStorage.removeItem(
        APP_CONFIG.STORAGE_KEYS.USER
    );

    window.location.href =
        APP_CONFIG.PAGES.LOGIN;
}