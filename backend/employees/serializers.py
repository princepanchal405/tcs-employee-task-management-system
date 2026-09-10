import re
from datetime import date

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from accounts.models import UserProfile

from .models import Employee


class EmployeeSerializer(serializers.ModelSerializer):
    """
    Employee serializer with optional authentication-account creation.

    On CREATE:
        Employee + Django User + UserProfile(EMPLOYEE)

    On UPDATE:
        Employee data is updated.
        Existing password is preserved.
    """

    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8,
        trim_whitespace=False,
    )

    confirm_password = serializers.CharField(
        write_only=True,
        required=False,
        trim_whitespace=False,
    )

    has_login_account = serializers.SerializerMethodField(
        read_only=True
    )

    class Meta:
        model = Employee

        fields = [
            "id",
            "employee_id",
            "name",
            "email",
            "mobile",
            "department",
            "designation",
            "location",
            "joining_date",
            "employment_status",
            "has_login_account",
            "password",
            "confirm_password",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "has_login_account",
            "created_at",
            "updated_at",
        ]

    def get_has_login_account(self, obj):
        return obj.user_id is not None

    # =========================================================
    # EMPLOYEE ID
    # =========================================================

    def validate_employee_id(self, value):
        value = value.strip().upper()

        if not re.fullmatch(
            r"[A-Z0-9-]+",
            value,
        ):
            raise serializers.ValidationError(
                "Employee ID may contain only letters, numbers, and hyphens."
            )

        queryset = Employee.objects.filter(
            employee_id__iexact=value
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "An employee with this Employee ID already exists."
            )

        return value

    # =========================================================
    # NAME
    # =========================================================

    def validate_name(self, value):
        value = value.strip()

        if len(value) < 2:
            raise serializers.ValidationError(
                "Name must contain at least 2 characters."
            )

        if not re.fullmatch(
            r"[A-Za-z .'-]+",
            value,
        ):
            raise serializers.ValidationError(
                "Name may contain only letters, spaces, periods, apostrophes, and hyphens."
            )

        return value

    # =========================================================
    # MOBILE
    # =========================================================

    def validate_mobile(self, value):
        value = value.strip()

        if not re.fullmatch(
            r"\+?[0-9]{10,15}",
            value,
        ):
            raise serializers.ValidationError(
                "Enter a valid mobile number containing 10 to 15 digits."
            )

        return value

    # =========================================================
    # EMAIL
    # =========================================================

    def validate_email(self, value):
        value = value.strip().lower()

        employee_queryset = Employee.objects.filter(
            email__iexact=value
        )

        if self.instance:
            employee_queryset = employee_queryset.exclude(
                pk=self.instance.pk
            )

        if employee_queryset.exists():
            raise serializers.ValidationError(
                "An employee with this email address already exists."
            )

        user_queryset = User.objects.filter(
            email__iexact=value
        )

        if self.instance and self.instance.user_id:
            user_queryset = user_queryset.exclude(
                pk=self.instance.user_id
            )

        if user_queryset.exists():
            raise serializers.ValidationError(
                "A login account with this email address already exists."
            )

        return value

    # =========================================================
    # JOINING DATE
    # =========================================================

    def validate_joining_date(self, value):
        if value > date.today():
            raise serializers.ValidationError(
                "Joining date cannot be in the future."
            )

        return value

    # =========================================================
    # PASSWORD VALIDATION
    # =========================================================

    def validate(self, attrs):
        password = attrs.get("password")
        confirm_password = attrs.get("confirm_password")

        # Password is required only while creating
        # a brand-new Employee.
        if self.instance is None:

            if not password:
                raise serializers.ValidationError(
                    {
                        "password": (
                            "Password is required when creating "
                            "a login account for an employee."
                        )
                    }
                )

            if not confirm_password:
                raise serializers.ValidationError(
                    {
                        "confirm_password": (
                            "Please confirm the employee password."
                        )
                    }
                )

            if password != confirm_password:
                raise serializers.ValidationError(
                    {
                        "confirm_password": (
                            "Passwords do not match."
                        )
                    }
                )

            try:
                validate_password(password)
            except Exception as exc:
                raise serializers.ValidationError(
                    {"password": list(exc.messages)}
                )

        else:
            # If only one password field is provided during update,
            # reject it.
            if bool(password) != bool(confirm_password):
                raise serializers.ValidationError(
                    {
                        "confirm_password": (
                            "Both password fields are required "
                            "when changing the password."
                        )
                    }
                )

            if password and password != confirm_password:
                raise serializers.ValidationError(
                    {
                        "confirm_password": (
                            "Passwords do not match."
                        )
                    }
                )

            if password:
                try:
                    validate_password(password, self.instance.user if self.instance and self.instance.user_id else None)
                except Exception as exc:
                    raise serializers.ValidationError(
                        {"password": list(exc.messages)}
                    )

        return attrs

    # =========================================================
    # CREATE EMPLOYEE + USER + PROFILE
    # =========================================================

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop(
            "password"
        )

        validated_data.pop(
            "confirm_password",
            None,
        )

        email = validated_data["email"].strip().lower()
        name = validated_data["name"].strip()

        existing_user = User.objects.filter(
            email__iexact=email
        ).first()

        if existing_user:
            raise serializers.ValidationError(
                {
                    "email": (
                        "A login account with this email "
                        "address already exists."
                    )
                }
            )

        # We use email as the login identifier.
        # Django's username field remains populated internally.
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=name,
        )

        UserProfile.objects.create(
            user=user,
            role=UserProfile.Role.EMPLOYEE,
        )

        employee = Employee.objects.create(
            user=user,
            **validated_data,
        )

        return employee

    # =========================================================
    # UPDATE EMPLOYEE
    # =========================================================

    @transaction.atomic
    def update(self, instance, validated_data):
        password = validated_data.pop(
            "password",
            None,
        )

        validated_data.pop(
            "confirm_password",
            None,
        )

        employee = super().update(
            instance,
            validated_data,
        )

        # Keep linked login account synchronized.
        if employee.user_id:
            user = employee.user

            user.email = employee.email
            user.username = employee.email
            user.first_name = employee.name

            if password:
                user.set_password(password)

            user.save(
                update_fields=[
                    "email",
                    "username",
                    "first_name",
                    "password",
                ]
                if password
                else [
                    "email",
                    "username",
                    "first_name",
                ]
            )

        return employee