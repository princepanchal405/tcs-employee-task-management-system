/**
 * Common Utility Functions
 */

function isValidEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(email);
}


function showElement(element) {
    if (element) {
        element.classList.remove("d-none");
    }
}


function hideElement(element) {
    if (element) {
        element.classList.add("d-none");
    }
}


function setButtonLoading(button, loading, textElement, spinnerElement) {
    if (!button) {
        return;
    }

    button.disabled = loading;

    if (loading) {
        textElement?.classList.add("d-none");
        spinnerElement?.classList.remove("d-none");
    } else {
        textElement?.classList.remove("d-none");
        spinnerElement?.classList.add("d-none");
    }
}