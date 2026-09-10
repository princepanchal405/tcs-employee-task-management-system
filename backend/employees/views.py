from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import UserProfile

from .models import Employee
from .permissions import IsAdminOrOwnEmployeeReadOnly
from .serializers import EmployeeSerializer


class EmployeeListCreateView(APIView):
    permission_classes = [
        IsAuthenticated,
        IsAdminOrOwnEmployeeReadOnly,
    ]

    # =========================================================
    # GET EMPLOYEES
    # =========================================================

    def get(self, request):
        profile = getattr(
            request.user,
            "profile",
            None,
        )

        if not profile:
            return Response(
                {
                    "success": False,
                    "message": (
                        "User profile is not configured."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # ADMIN sees all employees.
        if profile.role == UserProfile.Role.ADMIN:
            employees = Employee.objects.all()

        # EMPLOYEE sees only their own employee record.
        else:
            employees = Employee.objects.filter(
                user=request.user
            )

        employees = employees.order_by(
            "-created_at"
        )

        # =====================================================
        # SEARCH
        # =====================================================

        search_query = request.query_params.get(
            "search"
        )

        if search_query:
            employees = employees.filter(
                employee_id__icontains=search_query
            ) | employees.filter(
                name__icontains=search_query
            ) | employees.filter(
                email__icontains=search_query
            )

        # =====================================================
        # DEPARTMENT
        # =====================================================

        department = request.query_params.get(
            "department"
        )

        if department:
            employees = employees.filter(
                department__iexact=department
            )

        # =====================================================
        # STATUS
        # =====================================================

        employment_status = request.query_params.get(
            "employment_status"
        )

        if employment_status:
            employees = employees.filter(
                employment_status__iexact=employment_status
            )

        # =====================================================
        # ORDERING
        # =====================================================

        ordering = request.query_params.get(
            "ordering"
        )

        allowed_ordering_fields = [
            "employee_id",
            "name",
            "email",
            "department",
            "designation",
            "location",
            "joining_date",
            "employment_status",
            "created_at",
        ]

        if ordering:
            ordering_field = ordering.lstrip("-")

            if ordering_field in allowed_ordering_fields:
                employees = employees.order_by(
                    ordering
                )

        # =====================================================
        # PAGINATION
        # =====================================================

        page_size = 10

        try:
            page = int(
                request.query_params.get(
                    "page",
                    1,
                )
            )
        except (TypeError, ValueError):
            page = 1

        if page < 1:
            page = 1

        total_count = employees.count()

        total_pages = (
            max(
                1,
                (total_count + page_size - 1)
                // page_size,
            )
        )

        if page > total_pages:
            page = total_pages

        start = (
            page - 1
        ) * page_size

        end = start + page_size

        paginated_employees = employees[
            start:end
        ]

        serializer = EmployeeSerializer(
            paginated_employees,
            many=True,
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Employees retrieved successfully."
                ),
                "data": serializer.data,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_items": total_count,
                    "total_pages": total_pages,
                },
            },
            status=status.HTTP_200_OK,
        )

    # =========================================================
    # CREATE
    # =========================================================

    def post(self, request):
        profile = getattr(
            request.user,
            "profile",
            None,
        )

        if (
            not profile
            or profile.role != UserProfile.Role.ADMIN
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only administrators can create employees."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = EmployeeSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        employee = serializer.save()

        return Response(
            {
                "success": True,
                "message": (
                    "Employee and login account "
                    "created successfully."
                ),
                "data": EmployeeSerializer(
                    employee
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


class EmployeeDetailView(APIView):
    permission_classes = [
        IsAuthenticated,
        IsAdminOrOwnEmployeeReadOnly,
    ]

    # =========================================================
    # OBJECT
    # =========================================================

    def get_object(
        self,
        employee_id,
    ):
        return get_object_or_404(
            Employee,
            pk=employee_id,
        )

    # =========================================================
    # GET
    # =========================================================

    def get(
        self,
        request,
        employee_id,
    ):
        employee = self.get_object(
            employee_id
        )

        self.check_object_permissions(
            request,
            employee,
        )

        serializer = EmployeeSerializer(
            employee
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Employee retrieved successfully."
                ),
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    # =========================================================
    # PUT
    # =========================================================

    def put(
        self,
        request,
        employee_id,
    ):
        profile = getattr(
            request.user,
            "profile",
            None,
        )

        if (
            not profile
            or profile.role != UserProfile.Role.ADMIN
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only administrators can update employees."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        employee = self.get_object(
            employee_id
        )

        serializer = EmployeeSerializer(
            employee,
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True
        )

        employee = serializer.save()

        return Response(
            {
                "success": True,
                "message": (
                    "Employee updated successfully."
                ),
                "data": EmployeeSerializer(
                    employee
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    # =========================================================
    # DELETE
    # =========================================================

    def delete(
        self,
        request,
        employee_id,
    ):
        profile = getattr(
            request.user,
            "profile",
            None,
        )

        if (
            not profile
            or profile.role != UserProfile.Role.ADMIN
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only administrators can delete employees."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        employee = self.get_object(
            employee_id
        )

        employee.delete()

        return Response(
            {
                "success": True,
                "message": (
                    "Employee and linked login "
                    "account deleted successfully."
                ),
                "data": None,
            },
            status=status.HTTP_200_OK,
        )

    # =========================================================
    # OBJECT PERMISSION HELPER
    # =========================================================

    def check_object_permissions(
        self,
        request,
        obj,
    ):
        for permission in self.get_permissions():
            if hasattr(
                permission,
                "has_object_permission",
            ):
                if not permission.has_object_permission(
                    request,
                    self,
                    obj,
                ):
                    from rest_framework.exceptions import (
                        PermissionDenied
                    )

                    raise PermissionDenied(
                        permission.message
                    )

    def get_permissions(self):
        return [
            permission_class()
            for permission_class in self.permission_classes
        ]