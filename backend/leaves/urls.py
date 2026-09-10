from django.urls import path

from .views import (
    LeaveDetailView,
    LeaveListCreateView,
)


urlpatterns = [
    path(
        "",
        LeaveListCreateView.as_view(),
        name="leave-list-create",
    ),

    path(
        "<int:leave_id>/",
        LeaveDetailView.as_view(),
        name="leave-detail",
    ),
]