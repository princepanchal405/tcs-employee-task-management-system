from django.contrib import admin

from .models import LeaveRequest


@admin.register(LeaveRequest)
class LeaveRequestAdmin(
    admin.ModelAdmin
):

    list_display = (
        "id",
        "employee",
        "leave_type",
        "from_date",
        "to_date",
        "status",
        "reviewed_by",
        "created_at",
    )

    list_filter = (
        "leave_type",
        "status",
        "from_date",
        "to_date",
    )

    search_fields = (
        "employee__name",
        "employee__employee_id",
        "employee__department",
        "reason",
        "admin_remarks",
        "reviewed_by__username",
    )

    ordering = (
        "-created_at",
    )