from django_filters.rest_framework import (
    DjangoFilterBackend,
)

from rest_framework import status
from rest_framework.filters import (
    OrderingFilter,
    SearchFilter,
)
from rest_framework.pagination import (
    PageNumberPagination,
)
from rest_framework.permissions import (
    IsAuthenticated,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LeaveRequest
from .permissions import (
    IsAdminOnly,
    IsAdminOrOwnLeave,
    IsEmployeeOnly,
)
from .serializers import LeaveRequestSerializer


class LeavePagination(
    PageNumberPagination
):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class LeaveListCreateView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]

    filterset_fields = [
        "employee",
        "leave_type",
        "status",
    ]

    search_fields = [
        "reason",
        "admin_remarks",
        "employee__name",
        "employee__employee_id",
        "employee__department",
    ]

    ordering_fields = [
        "created_at",
        "updated_at",
        "from_date",
        "to_date",
        "status",
        "leave_type",
    ]

    ordering = [
        "-created_at",
    ]

    pagination_class = LeavePagination

    def get_role(
        self,
        user,
    ):
        profile = getattr(
            user,
            "profile",
            None,
        )

        return (
            profile.role
            if profile
            else None
        )

    def get_queryset(self):

        user = self.request.user

        queryset = (
            LeaveRequest.objects
            .select_related(
                "employee",
                "reviewed_by",
            )
            .all()
        )

        role = self.get_role(
            user
        )

        if role == "ADMIN":
            return queryset

        try:
            employee = (
                user.employee_record
            )
        except AttributeError:
            return queryset.none()

        return queryset.filter(
            employee=employee
        )

    def apply_filters(
        self,
        queryset,
    ):
        request = self.request

        search = (
            request.query_params
            .get(
                "search",
                "",
            )
            .strip()
        )

        employee = (
            request.query_params
            .get("employee")
        )

        leave_type = (
            request.query_params
            .get("leave_type")
        )

        leave_status = (
            request.query_params
            .get("status")
        )

        ordering = (
            request.query_params
            .get("ordering")
        )

        if search:
            search_filter = (
                SearchFilter()
            )

            queryset = (
                search_filter.filter_queryset(
                    request,
                    queryset,
                    self,
                )
            )

        if employee:
            queryset = queryset.filter(
                employee_id=employee
            )

        if leave_type:
            queryset = queryset.filter(
                leave_type=leave_type
            )

        if leave_status:
            queryset = queryset.filter(
                status=leave_status
            )

        if ordering:
            ordering_filter = (
                OrderingFilter()
            )

            queryset = (
                ordering_filter.filter_queryset(
                    request,
                    queryset,
                    self,
                )
            )
        else:
            queryset = queryset.order_by(
                "-created_at"
            )

        return queryset

    def get(
        self,
        request,
    ):

        queryset = (
            self.get_queryset()
        )

        queryset = (
            self.apply_filters(
                queryset
            )
        )

        paginator = (
            self.pagination_class()
        )

        page = (
            paginator.paginate_queryset(
                queryset,
                request,
                view=self,
            )
        )

        serializer = (
            LeaveRequestSerializer(
                page,
                many=True,
            )
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Leave requests "
                    "retrieved successfully."
                ),
                "data": serializer.data,
                "pagination": {
                    "page": (
                        paginator.page.number
                    ),
                    "page_size": (
                        paginator.get_page_size(
                            request
                        )
                    ),
                    "total_items": (
                        paginator.page
                        .paginator.count
                    ),
                    "total_pages": (
                        paginator.page
                        .paginator.num_pages
                    ),
                },
            },
            status=status.HTTP_200_OK,
        )

    def post(
        self,
        request,
    ):

        if not IsEmployeeOnly().has_permission(
            request,
            self,
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only employees can "
                        "apply for leave."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            employee = (
                request.user.employee_record
            )
        except AttributeError:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Employee record is not "
                        "linked to this account."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = (
            LeaveRequestSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        leave = serializer.save(
            employee=employee,
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Leave request "
                    "submitted successfully."
                ),
                "data": (
                    LeaveRequestSerializer(
                        leave
                    ).data
                ),
            },
            status=status.HTTP_201_CREATED,
        )


class LeaveDetailView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def get_object(
        self,
        leave_id,
    ):

        try:
            return (
                LeaveRequest.objects
                .select_related(
                    "employee",
                    "reviewed_by",
                )
                .get(
                    pk=leave_id
                )
            )

        except LeaveRequest.DoesNotExist:
            return None

    def check_object_permission(
        self,
        request,
        leave,
    ):

        permission = (
            IsAdminOrOwnLeave()
        )

        if not permission.has_object_permission(
            request,
            self,
            leave,
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "You do not have permission "
                        "to access this leave request."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return None

    def get(
        self,
        request,
        leave_id,
    ):

        leave = self.get_object(
            leave_id
        )

        if leave is None:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Leave request not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        denied = (
            self.check_object_permission(
                request,
                leave,
            )
        )

        if denied:
            return denied

        return Response(
            {
                "success": True,
                "message": (
                    "Leave request "
                    "retrieved successfully."
                ),
                "data": (
                    LeaveRequestSerializer(
                        leave
                    ).data
                ),
            },
            status=status.HTTP_200_OK,
        )

    def patch(
        self,
        request,
        leave_id,
    ):

        leave = self.get_object(
            leave_id
        )

        if leave is None:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Leave request not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        denied = (
            self.check_object_permission(
                request,
                leave,
            )
        )

        if denied:
            return denied

        if not IsAdminOnly().has_permission(
            request,
            self,
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only administrators can "
                        "review leave requests."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        incoming_status = request.data.get(
            "status"
        )

        incoming_remarks = request.data.get(
            "admin_remarks",
            "",
        )

        if incoming_status not in {
            LeaveRequest.Status.APPROVED,
            LeaveRequest.Status.REJECTED,
        }:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Admin must approve or "
                        "reject the leave request."
                    ),
                    "errors": {
                        "status": (
                            "Status must be "
                            "APPROVED or REJECTED."
                        )
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        incoming_remarks = str(
            incoming_remarks
        ).strip()

        if not incoming_remarks:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Approval/rejection remarks "
                        "are required."
                    ),
                    "errors": {
                        "admin_remarks": (
                            "Please provide "
                            "admin remarks."
                        )
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            leave.status
            != LeaveRequest.Status.PENDING
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only pending leave requests "
                        "can be reviewed."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        leave.status = (
            incoming_status
        )

        leave.admin_remarks = (
            incoming_remarks
        )

        leave.reviewed_by = (
            request.user
        )

        leave.save(
            update_fields=[
                "status",
                "admin_remarks",
                "reviewed_by",
                "updated_at",
            ]
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Leave request "
                    f"{incoming_status.lower()} successfully."
                ),
                "data": (
                    LeaveRequestSerializer(
                        leave
                    ).data
                ),
            },
            status=status.HTTP_200_OK,
        )

    def delete(
        self,
        request,
        leave_id,
    ):

        leave = self.get_object(
            leave_id
        )

        if leave is None:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Leave request not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if not IsAdminOnly().has_permission(
            request,
            self,
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only administrators can "
                        "delete leave requests."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        leave.delete()

        return Response(
            {
                "success": True,
                "message": (
                    "Leave request "
                    "deleted successfully."
                ),
                "data": None,
            },
            status=status.HTTP_200_OK,
        )