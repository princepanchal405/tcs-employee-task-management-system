from datetime import date, timedelta

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from accounts.models import UserProfile
from employees.models import Employee
from .models import LeaveRequest


class LeaveApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin@example.com", email="admin@example.com", password="AdminPass123!"
        )
        UserProfile.objects.create(user=self.admin, role=UserProfile.Role.ADMIN)
        self.employee_user = User.objects.create_user(
            username="leave@example.com", email="leave@example.com", password="EmployeePass123!", first_name="Leave User"
        )
        UserProfile.objects.create(user=self.employee_user, role=UserProfile.Role.EMPLOYEE)
        self.employee = Employee.objects.create(
            user=self.employee_user,
            employee_id="EMP-LEAVE-001",
            name="Leave User",
            email="leave@example.com",
            mobile="9876543211",
            department="Engineering",
            designation="Developer",
            location="Ahmedabad",
            joining_date=date.today() - timedelta(days=30),
            employment_status=Employee.EmploymentStatus.ACTIVE,
        )

    def test_employee_can_apply_and_admin_can_approve(self):
        self.client.force_authenticate(self.employee_user)
        start = date.today() + timedelta(days=3)
        response = self.client.post(
            "/api/leaves/",
            {
                "leave_type": "CASUAL",
                "from_date": str(start),
                "to_date": str(start + timedelta(days=1)),
                "reason": "Personal work",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        leave_id = response.data["data"]["id"]

        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/api/leaves/{leave_id}/",
            {"status": "APPROVED", "admin_remarks": "Approved for the requested dates."},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["status"], "APPROVED")
        self.assertEqual(LeaveRequest.objects.get(id=leave_id).status, LeaveRequest.Status.APPROVED)
