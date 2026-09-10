from django.contrib.auth.models import User
from django.db import models

from employees.models import Employee


class Task(models.Model):
    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    assigned_to = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    due_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="created_tasks",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["assigned_to"],
                name="tasks_task_assigne_2cb0ce_idx",
            ),
            models.Index(
                fields=["priority"],
                name="tasks_task_priority_1a4df8_idx",
            ),
            models.Index(
                fields=["status"],
                name="tasks_task_status_4c6c16_idx",
            ),
            models.Index(
                fields=["due_date"],
                name="tasks_task_due_dat_a4d0e7_idx",
            ),
        ]

    def __str__(self):
        return self.title
