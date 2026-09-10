from django.urls import path

from .views import (
    EmployeeDetailView,
    EmployeeListCreateView,
)


urlpatterns = [
    path(
        "",
        EmployeeListCreateView.as_view(),
        name="employee-list-create",
    ),
    path(
        "<int:employee_id>/",
        EmployeeDetailView.as_view(),
        name="employee-detail",
    ),
]