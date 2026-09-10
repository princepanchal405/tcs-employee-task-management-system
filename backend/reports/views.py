import csv
from datetime import date

from django.db.models import Count, Q
from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import UserProfile
from employees.models import Employee
from leaves.models import LeaveRequest
from tasks.models import Task


class AdminOnlyMixin:
    def is_admin(self, request):
        profile = getattr(request.user, "profile", None)
        return bool(profile and profile.role == UserProfile.Role.ADMIN)


class ReportSummaryView(AdminOnlyMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not self.is_admin(request):
            return Response(
                {"success": False, "message": "Only administrators can access reports."},
                status=403,
            )

        employees = Employee.objects.all()
        tasks = Task.objects.all()
        leaves = LeaveRequest.objects.all()

        department_rows = list(
            employees.values("department")
            .annotate(count=Count("id"))
            .order_by("department")
        )

        task_status_rows = list(
            tasks.values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )

        leave_status_rows = list(
            leaves.values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )

        employee_task_rows = list(
            Employee.objects
            .annotate(
                total_tasks=Count("tasks", distinct=True),
                pending_tasks=Count(
                    "tasks",
                    filter=Q(tasks__status=Task.Status.PENDING),
                    distinct=True,
                ),
                in_progress_tasks=Count(
                    "tasks",
                    filter=Q(tasks__status=Task.Status.IN_PROGRESS),
                    distinct=True,
                ),
                completed_tasks=Count(
                    "tasks",
                    filter=Q(tasks__status=Task.Status.COMPLETED),
                    distinct=True,
                ),
            )
            .values(
                "id",
                "employee_id",
                "name",
                "department",
                "total_tasks",
                "pending_tasks",
                "in_progress_tasks",
                "completed_tasks",
            )
            .order_by("name")
        )

        summary = {
            "total_employees": employees.count(),
            "active_employees": employees.filter(
                employment_status=Employee.EmploymentStatus.ACTIVE
            ).count(),
            "inactive_employees": employees.filter(
                employment_status=Employee.EmploymentStatus.INACTIVE
            ).count(),
            "total_tasks": tasks.count(),
            "pending_tasks": tasks.filter(status=Task.Status.PENDING).count(),
            "in_progress_tasks": tasks.filter(status=Task.Status.IN_PROGRESS).count(),
            "completed_tasks": tasks.filter(status=Task.Status.COMPLETED).count(),
            "overdue_tasks": tasks.filter(due_date__lt=date.today()).exclude(
                status=Task.Status.COMPLETED
            ).count(),
            "total_leaves": leaves.count(),
            "pending_leaves": leaves.filter(status=LeaveRequest.Status.PENDING).count(),
            "approved_leaves": leaves.filter(status=LeaveRequest.Status.APPROVED).count(),
            "rejected_leaves": leaves.filter(status=LeaveRequest.Status.REJECTED).count(),
        }

        data = {
            "summary": summary,
            "department_statistics": [
                {"department": row["department"], "count": row["count"]}
                for row in department_rows
            ],
            "task_status_statistics": [
                {"status": row["status"], "count": row["count"]}
                for row in task_status_rows
            ],
            "leave_status_statistics": [
                {"status": row["status"], "count": row["count"]}
                for row in leave_status_rows
            ],
            "employee_task_summary": list(employee_task_rows),
        }

        return Response(
            {
                "success": True,
                "message": "Report summary generated successfully.",
                "data": data,
            }
        )


class ReportExportView(AdminOnlyMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not self.is_admin(request):
            return Response(
                {"success": False, "message": "Only administrators can export reports."},
                status=403,
            )

        export_type = (request.query_params.get("type") or "employees").lower()
        if export_type not in {"employees", "tasks", "leaves"}:
            return Response(
                {"success": False, "message": "Unsupported export type."},
                status=400,
            )

        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="{export_type}_report.csv"'
        writer = csv.writer(response)

        if export_type == "employees":
            writer.writerow(
                [
                    "Employee ID",
                    "Name",
                    "Email",
                    "Mobile",
                    "Department",
                    "Designation",
                    "Location",
                    "Joining Date",
                    "Status",
                ]
            )
            for employee in Employee.objects.order_by("employee_id"):
                writer.writerow(
                    [
                        employee.employee_id,
                        employee.name,
                        employee.email,
                        employee.mobile,
                        employee.department,
                        employee.designation,
                        employee.location,
                        employee.joining_date,
                        employee.get_employment_status_display(),
                    ]
                )

        elif export_type == "tasks":
            writer.writerow(
                [
                    "Task ID",
                    "Title",
                    "Assigned Employee",
                    "Employee ID",
                    "Priority",
                    "Due Date",
                    "Status",
                    "Created By",
                    "Created At",
                ]
            )
            queryset = Task.objects.select_related("assigned_to", "created_by").order_by("id")
            for task in queryset:
                writer.writerow(
                    [
                        task.id,
                        task.title,
                        task.assigned_to.name,
                        task.assigned_to.employee_id,
                        task.get_priority_display(),
                        task.due_date,
                        task.get_status_display(),
                        task.created_by.get_full_name() or task.created_by.username,
                        task.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    ]
                )

        elif export_type == "leaves":
            writer.writerow(
                [
                    "Leave ID",
                    "Employee",
                    "Employee ID",
                    "Department",
                    "Leave Type",
                    "From Date",
                    "To Date",
                    "Reason",
                    "Status",
                    "Admin Remarks",
                ]
            )
            queryset = LeaveRequest.objects.select_related("employee").order_by("id")
            for leave in queryset:
                writer.writerow(
                    [
                        leave.id,
                        leave.employee.name,
                        leave.employee.employee_id,
                        leave.employee.department,
                        leave.get_leave_type_display(),
                        leave.from_date,
                        leave.to_date,
                        leave.reason,
                        leave.get_status_display(),
                        leave.admin_remarks,
                    ]
                )
        return response
