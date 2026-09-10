from django.contrib.auth.models import User
from django.db import models

from employees.models import Employee


class LeaveRequest(models.Model):

    class LeaveType(models.TextChoices):
        CASUAL = "CASUAL", "Casual"
        SICK = "SICK", "Sick"
        EARNED = "EARNED", "Earned"
        OTHER = "OTHER", "Other"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="leave_requests",
    )

    leave_type = models.CharField(
        max_length=20,
        choices=LeaveType.choices,
    )

    from_date = models.DateField()

    to_date = models.DateField()

    reason = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    admin_remarks = models.TextField(
        blank=True,
        default="",
    )

    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_leave_requests",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["employee"]
            ),
            models.Index(
                fields=["status"]
            ),
            models.Index(
                fields=["leave_type"]
            ),
            models.Index(
                fields=["from_date"]
            ),
            models.Index(
                fields=["to_date"]
            ),
        ]

    def __str__(self):
        return (
            f"{self.employee.employee_id} - "
            f"{self.leave_type} - "
            f"{self.status}"
        )