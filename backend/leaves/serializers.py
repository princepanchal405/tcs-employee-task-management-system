from datetime import date

from rest_framework import serializers

from .models import LeaveRequest


class LeaveRequestSerializer(
    serializers.ModelSerializer
):

    employee_name = serializers.CharField(
        source="employee.name",
        read_only=True,
    )

    employee_id = serializers.CharField(
        source="employee.employee_id",
        read_only=True,
    )

    employee_department = serializers.CharField(
        source="employee.department",
        read_only=True,
    )

    reviewed_by_name = (
        serializers.SerializerMethodField(
            read_only=True
        )
    )

    class Meta:
        model = LeaveRequest

        fields = [
            "id",
            "employee",
            "employee_name",
            "employee_id",
            "employee_department",
            "leave_type",
            "from_date",
            "to_date",
            "reason",
            "status",
            "admin_remarks",
            "reviewed_by",
            "reviewed_by_name",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",

            # IMPORTANT:
            # Employee is determined by the
            # authenticated account on the backend.
            "employee",

            "employee_name",
            "employee_id",
            "employee_department",

            "status",
            "reviewed_by",
            "reviewed_by_name",
            "admin_remarks",

            "created_at",
            "updated_at",
        ]

    def get_reviewed_by_name(
        self,
        obj,
    ):
        if not obj.reviewed_by:
            return None

        return (
            obj.reviewed_by.get_full_name()
            or obj.reviewed_by.username
        )

    def validate_leave_type(
        self,
        value,
    ):
        allowed = {
            LeaveRequest.LeaveType.CASUAL,
            LeaveRequest.LeaveType.SICK,
            LeaveRequest.LeaveType.EARNED,
            LeaveRequest.LeaveType.OTHER,
        }

        if value not in allowed:
            raise serializers.ValidationError(
                "Select a valid leave type."
            )

        return value

    def validate_from_date(
        self,
        value,
    ):
        if value < date.today():
            raise serializers.ValidationError(
                "From date cannot be in the past."
            )

        return value

    def validate_to_date(
        self,
        value,
    ):
        if value < date.today():
            raise serializers.ValidationError(
                "To date cannot be in the past."
            )

        return value

    def validate_reason(
        self,
        value,
    ):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Reason for leave is required."
            )

        if len(value) < 3:
            raise serializers.ValidationError(
                "Reason must contain at least 3 characters."
            )

        return value

    def validate(
        self,
        attrs,
    ):
        from_date = attrs.get(
            "from_date"
        )

        to_date = attrs.get(
            "to_date"
        )

        if (
            from_date
            and to_date
            and to_date < from_date
        ):
            raise serializers.ValidationError(
                {
                    "to_date": (
                        "To date must be greater than "
                        "or equal to from date."
                    )
                }
            )

        return attrs