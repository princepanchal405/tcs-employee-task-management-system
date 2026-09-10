from django.contrib.auth.models import User
from django.db import models


class Employee(models.Model):
    class EmploymentStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="employee_record",
        null=True,
        blank=True,
    )

    employee_id = models.CharField(
        max_length=20,
        unique=True,
    )

    name = models.CharField(
        max_length=150,
    )

    email = models.EmailField(
        unique=True,
    )

    mobile = models.CharField(
        max_length=15,
    )

    department = models.CharField(
        max_length=100,
    )

    designation = models.CharField(
        max_length=100,
    )

    location = models.CharField(
        max_length=100,
    )

    joining_date = models.DateField()

    employment_status = models.CharField(
        max_length=20,
        choices=EmploymentStatus.choices,
        default=EmploymentStatus.ACTIVE,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    def __str__(self):
        return f"{self.employee_id} - {self.name}"