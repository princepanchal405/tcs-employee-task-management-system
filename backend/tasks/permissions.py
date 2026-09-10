from rest_framework.permissions import BasePermission


class IsAdminOnly(BasePermission):
    message = "Only administrators can perform this action."

    def has_permission(self, request, view):
        profile = getattr(request.user, "profile", None)
        return bool(
            request.user.is_authenticated
            and profile
            and profile.role == "ADMIN"
        )


class IsAdminOrTaskOwner(BasePermission):
    message = "You do not have permission to access this task."

    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        profile = getattr(request.user, "profile", None)
        if profile and profile.role == "ADMIN":
            return True

        employee = getattr(request.user, "employee_record", None)
        return bool(employee and obj.assigned_to_id == employee.id)
