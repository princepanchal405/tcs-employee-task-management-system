from datetime import date, timedelta

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from accounts.models import UserProfile
from employees.models import Employee
from tasks.models import Task


class ReportApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin@example.com", email="admin@example.com", password="AdminPass123!"
        )
        UserProfile.objects.create(user=self.admin, role=UserProfile.Role.ADMIN)
        user = User.objects.create_user(
            username="report.employee@example.com",
            email="report.employee@example.com",
            password="EmployeePass123!",
            first_name="Report Employee",
        )
        UserProfile.objects.create(user=user, role=UserProfile.Role.EMPLOYEE)
        self.employee = Employee.objects.create(
            user=user,
            employee_id="EMP-REPORT-001",
            name="Report Employee",
            email="report.employee@example.com",
            mobile="9876543212",
            department="Engineering",
            designation="Developer",
            location="Ahmedabad",
            joining_date=date.today() - timedelta(days=10),
        )
        Task.objects.create(
            title="Report task",
            assigned_to=self.employee,
            due_date=date.today() + timedelta(days=2),
            status=Task.Status.PENDING,
            priority=Task.Priority.LOW,
            created_by=self.admin,
        )

    def test_admin_can_get_report_summary(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/reports/summary/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["summary"]["total_employees"], 1)
        self.assertEqual(response.data["data"]["summary"]["pending_tasks"], 1)

    def test_admin_can_export_task_report(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/reports/export/?type=tasks")
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/csv", response["Content-Type"])
        self.assertIn("Report task", response.content.decode("utf-8"))
