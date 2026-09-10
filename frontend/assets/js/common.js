"use strict";

/* =========================================================
   COMMON APPLICATION FUNCTIONS
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    initSidebar();
    initLogout();
    applyRoleNavigation();
    initComingSoonLinks();
});


/* =========================================================
   SIDEBAR
========================================================= */

function initSidebar() {
    const sidebar = document.getElementById("appSidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const openButton = document.getElementById("sidebarOpen") || document.getElementById("mobileMenuButton");
    const closeButton = document.getElementById("sidebarClose");

    if (!sidebar) return;

    function openSidebar() {
        sidebar.classList.add("sidebar-open");
        overlay?.classList.add("sidebar-visible");
        document.body.style.overflow = "hidden";
    }

    function closeSidebar() {
        sidebar.classList.remove("sidebar-open");
        overlay?.classList.remove("sidebar-visible");
        document.body.style.overflow = "";
    }

    openButton?.addEventListener("click", openSidebar);
    closeButton?.addEventListener("click", closeSidebar);
    overlay?.addEventListener("click", closeSidebar);

    sidebar.querySelectorAll(".sidebar-link").forEach((link) => {
        link.addEventListener("click", () => {
            if (window.innerWidth <= 900) closeSidebar();
        });
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 900) closeSidebar();
    });
}


/* =========================================================
   ROLE-BASED NAVIGATION
========================================================= */

function applyRoleNavigation() {
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    if (!user) return;

    document.querySelectorAll("[data-role]").forEach((element) => {
        const roles = element.dataset.role
            .split(",")
            .map((role) => role.trim().toUpperCase());

        element.hidden = !roles.includes(String(user.role || "").toUpperCase());
    });

    const isEmployee = user.role === "EMPLOYEE";

    document.querySelectorAll(".sidebar-nav-label-admin").forEach((element) => {
        element.hidden = isEmployee;
    });

    document.querySelectorAll(".sidebar-nav-label-employee").forEach((element) => {
        element.hidden = !isEmployee;
    });
}


/* =========================================================
   COMING SOON LINKS
========================================================= */

function initComingSoonLinks() {
    document.querySelectorAll('[data-coming-soon="true"]').forEach((element) => {
        element.addEventListener("click", (event) => {
            event.preventDefault();

            if (typeof showDashboardNotice === "function") {
                showDashboardNotice("This module is scheduled for a later project phase.");
            }
        });
    });

    document.querySelectorAll(".disabled-quick-action").forEach((element) => {
        element.setAttribute("aria-disabled", "true");
    });
}


/* =========================================================
   LOGOUT
========================================================= */

function initLogout() {
    const logoutButton = document.getElementById("logoutButton");
    if (!logoutButton) return;

    logoutButton.addEventListener("click", (event) => {
        event.preventDefault();

        if (typeof logout === "function") {
            logout();
            return;
        }

        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("current_user");
        window.location.href = "index.html";
    });
}
