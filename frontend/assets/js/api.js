"use strict";

/* =========================================================
   API REQUEST HELPER
   Automatic JWT access-token refresh on 401
========================================================= */

let refreshPromise = null;


/* =========================================================
   MAIN API REQUEST
========================================================= */

async function apiRequest(endpoint, options = {}) {

    const {
        method = "GET",
        body = null,
        headers = {},
        requiresAuth = true,
        signal = undefined,
        _retry = false
    } = options;


    const requestHeaders = {
        Accept: "application/json",
        ...headers
    };


    if (body !== null) {

        requestHeaders["Content-Type"] =
            "application/json";

    }


    let accessToken = null;

    if (requiresAuth) {

        accessToken = localStorage.getItem(
            APP_CONFIG.TOKEN_KEYS.ACCESS
        );

        if (accessToken) {

            requestHeaders["Authorization"] =
                `Bearer ${accessToken}`;

        }

    }


    let response;


    try {

        response = await fetch(
            `${APP_CONFIG.API_BASE_URL}${endpoint}`,
            {
                method,
                headers: requestHeaders,
                body:
                    body !== null
                        ? JSON.stringify(body)
                        : null,
                signal
            }
        );

    }
    catch (error) {

        if (
            error?.name ===
            "AbortError"
        ) {

            throw error;

        }

        console.error(
            "Network/API Error:",
            error
        );

        throw error;

    }


    let data = null;


    try {

        data = await response.json();

    }
    catch {

        data = null;

    }


    /* =====================================================
       TOKEN EXPIRED
    ====================================================== */

    if (
        response.status === 401 &&
        requiresAuth &&
        !_retry
    ) {

        try {

            const newAccessToken =
                await refreshAccessToken();


            return await apiRequest(
                endpoint,
                {
                    ...options,
                    headers: {
                        ...headers,
                        Authorization:
                            `Bearer ${newAccessToken}`
                    },
                    _retry: true
                }
            );

        }
        catch (refreshError) {

            console.error(
                "Token refresh failed:",
                refreshError
            );

            clearAuthenticationAndRedirect();

            throw refreshError;

        }

    }


    /* =====================================================
       NORMAL ERROR
    ====================================================== */

    if (!response.ok) {

        const error = new Error(
            data?.message ||
            data?.detail ||
            "Something went wrong. Please try again."
        );


        error.status =
            response.status;


        error.data =
            data;


        throw error;

    }


    return data;

}


/* =========================================================
   REFRESH ACCESS TOKEN
========================================================= */

async function refreshAccessToken() {

    if (refreshPromise) {

        return refreshPromise;

    }


    refreshPromise =
        (async () => {

            const refreshToken =
                localStorage.getItem(
                    APP_CONFIG.TOKEN_KEYS.REFRESH
                );


            if (!refreshToken) {

                throw new Error(
                    "Session expired. Please login again."
                );

            }


            const response =
                await fetch(
                    `${APP_CONFIG.API_BASE_URL}/auth/refresh/`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                            Accept:
                                "application/json"
                        },
                        body: JSON.stringify({
                            refresh:
                                refreshToken
                        })
                    }
                );


            let data = null;


            try {

                data =
                    await response.json();

            }
            catch {

                data = null;

            }


            if (!response.ok) {

                const error =
                    new Error(
                        data?.detail ||
                        data?.message ||
                        "Session refresh failed."
                    );


                error.status =
                    response.status;


                error.data =
                    data;


                throw error;

            }


            const newAccessToken =
                data?.access;


            if (!newAccessToken) {

                throw new Error(
                    "Refresh response did not contain a new access token."
                );

            }


            localStorage.setItem(
                APP_CONFIG.TOKEN_KEYS.ACCESS,
                newAccessToken
            );


            return newAccessToken;

        })()
        .finally(() => {

            refreshPromise =
                null;

        });


    return refreshPromise;

}


/* =========================================================
   CLEAR SESSION
========================================================= */

function clearAuthenticationAndRedirect() {

    try {

        localStorage.removeItem(
            APP_CONFIG.TOKEN_KEYS.ACCESS
        );

        localStorage.removeItem(
            APP_CONFIG.TOKEN_KEYS.REFRESH
        );

    }
    catch {
        localStorage.removeItem(
            "access_token"
        );

        localStorage.removeItem(
            "refresh_token"
        );
    }


    localStorage.removeItem(
        "current_user"
    );


    sessionStorage.clear();


    if (
        !window.location.pathname.endsWith(
            "index.html"
        )
    ) {

        window.location.href =
            "index.html";

    }

}
/* =========================================================
   AUTHENTICATED BLOB DOWNLOAD
========================================================= */

async function apiDownload(endpoint, filename = "download.csv") {
    let accessToken = localStorage.getItem(APP_CONFIG.TOKEN_KEYS.ACCESS);

    if (!accessToken) {
        accessToken = await refreshAccessToken();
    }

    let response = await fetch(`${APP_CONFIG.API_BASE_URL}${endpoint}`, {
        method: "GET",
        headers: {
            Accept: "text/csv",
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (response.status === 401) {
        const newAccessToken = await refreshAccessToken();
        response = await fetch(`${APP_CONFIG.API_BASE_URL}${endpoint}`, {
            method: "GET",
            headers: {
                Accept: "text/csv",
                Authorization: `Bearer ${newAccessToken}`,
            },
        });
    }

    if (!response.ok) {
        let payload = null;
        try { payload = await response.json(); } catch { /* non-JSON response */ }
        const error = new Error(
            payload?.detail || payload?.message || "Unable to download report."
        );
        error.status = response.status;
        error.data = payload;
        throw error;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
