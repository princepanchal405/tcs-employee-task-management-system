from django.db.models import Q

from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Task
from .permissions import IsAdminOnly, IsAdminOrTaskOwner
from .serializers import TaskSerializer


class TaskPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class TaskListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = TaskPagination

    def get_role(self, user):
        profile = getattr(user, "profile", None)
        return profile.role if profile else None

    def get_queryset(self):
        user = self.request.user
        role = self.get_role(user)

        queryset = (
            Task.objects
            .select_related("assigned_to", "created_by")
            .all()
        )

        if role == "ADMIN":
            return queryset

        employee = getattr(user, "employee_record", None)
        if not employee:
            return queryset.none()

        return queryset.filter(assigned_to=employee)

    def apply_filters(self, queryset):
        params = self.request.query_params

        search = params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(assigned_to__name__icontains=search)
                | Q(assigned_to__employee_id__icontains=search)
            )

        assigned_to = params.get("assigned_to")
        if assigned_to:
            try:
                queryset = queryset.filter(assigned_to_id=int(assigned_to))
            except (TypeError, ValueError):
                queryset = queryset.none()

        priority = params.get("priority")
        if priority in Task.Priority.values:
            queryset = queryset.filter(priority=priority)

        task_status = params.get("status")
        if task_status in Task.Status.values:
            queryset = queryset.filter(status=task_status)

        ordering = params.get("ordering", "-created_at")
        allowed_fields = {
            "created_at",
            "updated_at",
            "due_date",
            "priority",
            "status",
            "title",
        }
        ordering_field = ordering.lstrip("-")
        if ordering_field in allowed_fields:
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by("-created_at")

        return queryset

    def get(self, request):
        queryset = self.apply_filters(self.get_queryset())
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = TaskSerializer(page, many=True)

        return Response(
            {
                "success": True,
                "message": "Tasks retrieved successfully.",
                "data": serializer.data,
                "pagination": {
                    "page": paginator.page.number,
                    "page_size": paginator.get_page_size(request),
                    "total_items": paginator.page.paginator.count,
                    "total_pages": paginator.page.paginator.num_pages,
                },
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        if not IsAdminOnly().has_permission(request, self):
            return Response(
                {
                    "success": False,
                    "message": "Only administrators can create tasks.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = TaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task = serializer.save(created_by=request.user)

        return Response(
            {
                "success": True,
                "message": "Task created successfully.",
                "data": TaskSerializer(task).data,
            },
            status=status.HTTP_201_CREATED,
        )


class TaskDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, task_id):
        try:
            return (
                Task.objects
                .select_related("assigned_to", "created_by")
                .get(pk=task_id)
            )
        except Task.DoesNotExist:
            return None

    def check_object_permission(self, request, task):
        permission = IsAdminOrTaskOwner()
        if not permission.has_object_permission(request, self, task):
            return Response(
                {
                    "success": False,
                    "message": "You do not have permission to access this task.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def get(self, request, task_id):
        task = self.get_object(task_id)
        if task is None:
            return Response(
                {"success": False, "message": "Task not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        denied = self.check_object_permission(request, task)
        if denied:
            return denied

        return Response(
            {
                "success": True,
                "message": "Task retrieved successfully.",
                "data": TaskSerializer(task).data,
            },
            status=status.HTTP_200_OK,
        )

    def _update_task(self, request, task_id, partial):
        task = self.get_object(task_id)
        if task is None:
            return Response(
                {"success": False, "message": "Task not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        denied = self.check_object_permission(request, task)
        if denied:
            return denied

        profile = getattr(request.user, "profile", None)
        role = profile.role if profile else None

        if role != "ADMIN":
            forbidden = set(request.data.keys()) - {"status"}
            if forbidden:
                return Response(
                    {
                        "success": False,
                        "message": "Employees can update only task status.",
                        "errors": {
                            field: (
                                "This field cannot be modified by an employee."
                            )
                            for field in sorted(forbidden)
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = TaskSerializer(
            task,
            data=request.data,
            partial=partial,
        )
        serializer.is_valid(raise_exception=True)
        updated_task = serializer.save()

        return Response(
            {
                "success": True,
                "message": "Task updated successfully.",
                "data": TaskSerializer(updated_task).data,
            },
            status=status.HTTP_200_OK,
        )

    def put(self, request, task_id):
        return self._update_task(request, task_id, partial=False)

    def patch(self, request, task_id):
        return self._update_task(request, task_id, partial=True)

    def delete(self, request, task_id):
        task = self.get_object(task_id)
        if task is None:
            return Response(
                {"success": False, "message": "Task not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        denied = self.check_object_permission(request, task)
        if denied:
            return denied

        if not IsAdminOnly().has_permission(request, self):
            return Response(
                {
                    "success": False,
                    "message": "Only administrators can delete tasks.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        task.delete()
        return Response(
            {
                "success": True,
                "message": "Task deleted successfully.",
                "data": None,
            },
            status=status.HTTP_200_OK,
        )
