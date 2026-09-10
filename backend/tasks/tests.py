from datetime import date, timedelta

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from accounts.models import UserProfile
from employees.models import Employee
from .models import Task


class TaskApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin@example.com",
            email="admin@example.com",
            password="AdminPass123!",
        )
        UserProfile.objects.create(user=self.admin, role=UserProfile.Role.ADMIN)
        self.employee_user = User.objects.create_user(
            username="employee@example.com",
            email="employee@example.com",
            password="EmployeePass123!",
            first_name="Test Employee",
        )
        UserProfile.objects.create(user=self.employee_user, role=UserProfile.Role.EMPLOYEE)
        self.employee = Employee.objects.create(
            user=self.employee_user,
            employee_id="EMP-TEST-001",
            name="Test Employee",
            email="employee@example.com",
            mobile="9876543210",
            department="Engineering",
            designation="Developer",
            location="Ahmedabad",
            joining_date=date.today() - timedelta(days=30),
            employment_status=Employee.EmploymentStatus.ACTIVE,
        )

    def test_admin_can_create_and_list_task(self):
        self.client.force_authenticate(self.admin)
        payload = {
            "title": "Build dashboard",
            "description": "Create analytics dashboard.",
            "assigned_to": self.employee.id,
            "priority": "HIGH",
            "due_date": str(date.today() + timedelta(days=2)),
            "status": "PENDING",
        }
        response = self.client.post("/api/tasks/", payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Task.objects.filter(title="Build dashboard").exists())

        response = self.client.get("/api/tasks/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["pagination"]["total_items"], 1)

    def test_employee_sees_own_tasks_and_can_update_status(self):
        task = Task.objects.create(
            title="Assigned work",
            description="Do the work.",
            assigned_to=self.employee,
            priority=Task.Priority.MEDIUM,
            due_date=date.today() + timedelta(days=1),
            status=Task.Status.PENDING,
            created_by=self.admin,
        )
        self.client.force_authenticate(self.employee_user)
        response = self.client.get("/api/tasks/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["pagination"]["total_items"], 1)

        response = self.client.patch(
            f"/api/tasks/{task.id}/",
            {"status": "COMPLETED"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        task.refresh_from_db()
        self.assertEqual(task.status, Task.Status.COMPLETED)

    def test_employee_cannot_create_task(self):
        self.client.force_authenticate(self.employee_user)
        response = self.client.post(
            "/api/tasks/",
            {
                "title": "Unauthorized",
                "assigned_to": self.employee.id,
                "priority": "LOW",
                "due_date": str(date.today() + timedelta(days=2)),
                "status": "PENDING",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 403)
