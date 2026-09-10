from rest_framework.permissions import BasePermission


class IsAdminOrOwnLeave(BasePermission):

    message = (
        "You do not have permission "
        "to access this leave request."
    )

    def has_permission(
        self,
        request,
        view,
    ):
        if not request.user.is_authenticated:
            return False

        profile = getattr(
            request.user,
            "profile",
            None,
        )

        return profile is not None

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        profile = getattr(
            request.user,
            "profile",
            None,
        )

        if (
            profile
            and profile.role == "ADMIN"
        ):
            return True

        try:
            employee = (
                request.user.employee_record
            )
        except AttributeError:
            return False

        return (
            obj.employee_id
            == employee.id
        )


class IsEmployeeOnly(BasePermission):

    message = (
        "Only employees can perform this action."
    )

    def has_permission(
        self,
        request,
        view,
    ):
        if not request.user.is_authenticated:
            return False

        profile = getattr(
            request.user,
            "profile",
            None,
        )

        return (
            profile is not None
            and profile.role == "EMPLOYEE"
        )


class IsAdminOnly(BasePermission):

    message = (
        "Only administrators can perform this action."
    )

    def has_permission(
        self,
        request,
        view,
    ):
        if not request.user.is_authenticated:
            return False

        profile = getattr(
            request.user,
            "profile",
            None,
        )

        return (
            profile is not None
            and profile.role == "ADMIN"
        )