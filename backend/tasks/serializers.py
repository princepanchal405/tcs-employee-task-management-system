from datetime import date

from rest_framework import serializers

from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    assigned_employee_name = serializers.CharField(
        source="assigned_to.name",
        read_only=True,
    )
    assigned_employee_id = serializers.CharField(
        source="assigned_to.employee_id",
        read_only=True,
    )
    created_by_name = serializers.SerializerMethodField(read_only=True)
    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True,
    )

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "assigned_to",
            "assigned_employee_name",
            "assigned_employee_id",
            "priority",
            "due_date",
            "status",
            "created_by",
            "created_by_name",
            "created_by_username",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "assigned_employee_name",
            "assigned_employee_id",
            "created_by",
            "created_by_name",
            "created_by_username",
            "created_at",
            "updated_at",
        ]

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.username

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Task title is required.")
        if len(value) < 3:
            raise serializers.ValidationError(
                "Task title must contain at least 3 characters."
            )
        return value

    def validate_description(self, value):
        return value.strip()

    def validate_assigned_to(self, value):
        if value.employment_status != "ACTIVE":
            raise serializers.ValidationError(
                "Tasks can only be assigned to active employees."
            )
        return value

    def validate_priority(self, value):
        if value not in Task.Priority.values:
            raise serializers.ValidationError("Select a valid priority.")
        return value

    def validate_status(self, value):
        if value not in Task.Status.values:
            raise serializers.ValidationError("Select a valid task status.")
        return value

    def validate_due_date(self, value):
        if self.instance is None and value < date.today():
            raise serializers.ValidationError(
                "Due date cannot be in the past."
            )
        return value
