"""
URL configuration for config project.
"""

from django.contrib import admin
from django.urls import include, path


urlpatterns = [
    path(
        "admin/",
        admin.site.urls,
    ),

    path(
        "api/auth/",
        include("accounts.urls"),
    ),

    path(
        "api/employees/",
        include("employees.urls"),
    ),

    path(
        "api/tasks/",
        include("tasks.urls"),
    ),

    path(
        "api/leaves/",
        include("leaves.urls"),
    ),

    path(
        "api/reports/",
        include("reports.urls"),
    ),
]