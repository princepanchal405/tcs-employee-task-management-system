from rest_framework.permissions import BasePermission

from accounts.models import UserProfile


class IsAdminUserProfile(BasePermission):
    """
    Only authenticated ADMIN users.
    """

    message = (
        "Only administrators are allowed to perform this action."
    )

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        profile = getattr(
            request.user,
            "profile",
            None,
        )

        return bool(
            profile
            and profile.role == UserProfile.Role.ADMIN
        )


class IsAdminOrOwnEmployeeReadOnly(BasePermission):
    """
    ADMIN:
        Full Employee access.

    EMPLOYEE:
        GET only, and only for their own employee record.
    """

    message = (
        "You do not have permission to perform this action."
    )

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        profile = getattr(
            request.user,
            "profile",
            None,
        )

        if not profile:
            return False

        if profile.role == UserProfile.Role.ADMIN:
            return True

        return request.method in (
            "GET",
            "HEAD",
            "OPTIONS",
        )

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

        if not profile:
            return False

        if profile.role == UserProfile.Role.ADMIN:
            return True

        if request.method not in (
            "GET",
            "HEAD",
            "OPTIONS",
        ):
            return False

        return (
            obj.user_id == request.user.id
        )