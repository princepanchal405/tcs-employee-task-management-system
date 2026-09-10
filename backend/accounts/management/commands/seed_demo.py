from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

from accounts.models import UserProfile
from employees.models import Employee
from leaves.models import LeaveRequest
from tasks.models import Task


class Command(BaseCommand):
    help = "Create a small idempotent demo dataset for local testing."

    def handle(self, *args, **options):
        admin, _ = User.objects.get_or_create(
            username="admin@tcs.com",
            defaults={"email": "admin@tcs.com", "is_staff": True, "is_superuser": True},
        )
        admin.email = "admin@tcs.com"
        admin.is_active = True
        admin.is_staff = True
        admin.is_superuser = True
        admin.set_password("Admin@12345")
        admin.save()
        UserProfile.objects.update_or_create(
            user=admin,
            defaults={"role": UserProfile.Role.ADMIN},
        )

        employees = []
        demo_people = [
            ("EMP-001", "Prince Panchal", "prince.demo@example.com", "Engineering", "Junior Web Developer"),
            ("EMP-002", "Demo Employee", "employee.demo@example.com", "Engineering", "Software Developer"),
        ]

        for employee_id, name, email, department, designation in demo_people:
            user, _ = User.objects.get_or_create(
                username=email,
                defaults={"email": email, "first_name": name},
            )
            user.email = email
            user.first_name = name
            user.set_password("Employee@12345")
            user.save()
            UserProfile.objects.update_or_create(
                user=user,
                defaults={"role": UserProfile.Role.EMPLOYEE},
            )
            employee, _ = Employee.objects.update_or_create(
                employee_id=employee_id,
                defaults={
                    "user": user,
                    "name": name,
                    "email": email,
                    "mobile": "9876543210",
                    "department": department,
                    "designation": designation,
                    "location": "Ahmedabad",
                    "joining_date": date.today() - timedelta(days=30),
                    "employment_status": Employee.EmploymentStatus.ACTIVE,
                },
            )
            employees.append(employee)

        if employees:
            Task.objects.get_or_create(
                title="Complete project dashboard",
                assigned_to=employees[0],
                defaults={
                    "description": "Review dashboard KPI and navigation flow.",
                    "priority": Task.Priority.HIGH,
                    "due_date": date.today() + timedelta(days=5),
                    "status": Task.Status.IN_PROGRESS,
                    "created_by": admin,
                },
            )
            Task.objects.get_or_create(
                title="Verify leave workflow",
                assigned_to=employees[1],
                defaults={
                    "description": "Test leave application and approval flow.",
                    "priority": Task.Priority.MEDIUM,
                    "due_date": date.today() + timedelta(days=7),
                    "status": Task.Status.PENDING,
                    "created_by": admin,
                },
            )

        employee = employees[0]
        LeaveRequest.objects.get_or_create(
            employee=employee,
            leave_type=LeaveRequest.LeaveType.CASUAL,
            from_date=date.today() + timedelta(days=10),
            to_date=date.today() + timedelta(days=10),
            defaults={
                "reason": "Personal work",
                "status": LeaveRequest.Status.PENDING,
            },
        )

        self.stdout.write(self.style.SUCCESS("Demo data is ready."))
        self.stdout.write("Admin: admin@tcs.com / Admin@12345")
        self.stdout.write("Employee: prince.demo@example.com / Employee@12345")
