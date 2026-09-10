from django.contrib import admin

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "assigned_to",
        "priority",
        "status",
        "due_date",
        "created_by",
        "created_at",
    )
    list_filter = ("priority", "status", "due_date")
    search_fields = (
        "title",
        "description",
        "assigned_to__name",
        "assigned_to__employee_id",
        "created_by__username",
    )
    ordering = ("-created_at",)
