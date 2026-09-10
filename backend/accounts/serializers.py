import re
from datetime import date

from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from employees.models import Employee
from .models import UserProfile


User = get_user_model()


class LoginSerializer(TokenObtainPairSerializer):
    username_field = "email"

    def validate(self, attrs):
        email = (attrs.get("email") or "").strip().lower()
        password = attrs.get("password") or ""

        if not email:
            raise serializers.ValidationError({"email": "Email address is required."})

        if not password:
            raise serializers.ValidationError({"password": "Password is required."})

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({"detail": "Invalid email or password."})

        authenticated_user = authenticate(
            request=self.context.get("request"),
            username=user.username,
            password=password,
        )

        if authenticated_user is None:
            raise serializers.ValidationError({"detail": "Invalid email or password."})

        if not authenticated_user.is_active:
            raise serializers.ValidationError({
                "detail": "Your account is inactive. Please contact the administrator."
            })

        profile, _ = UserProfile.objects.get_or_create(
            user=authenticated_user,
            defaults={
                "role": (
                    UserProfile.Role.ADMIN
                    if authenticated_user.is_staff or authenticated_user.is_superuser
                    else UserProfile.Role.EMPLOYEE
                )
            },
        )

        # Existing staff/superuser accounts are always treated as ADMIN.
        if authenticated_user.is_staff or authenticated_user.is_superuser:
            if profile.role != UserProfile.Role.ADMIN:
                profile.role = UserProfile.Role.ADMIN
                profile.save(update_fields=["role", "updated_at"])
        
        refresh = self.get_token(authenticated_user)
        refresh["role"] = profile.role
        refresh["email"] = authenticated_user.email
        refresh["name"] = authenticated_user.get_full_name() or authenticated_user.username

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": {
                "id": authenticated_user.id,
                "name": authenticated_user.get_full_name() or authenticated_user.username,
                "email": authenticated_user.email,
                "role": profile.role,
            },
        }


class EmployeeRegistrationSerializer(serializers.ModelSerializer):
    """Public employee account registration.

    Registration always creates a normal EMPLOYEE account. There is no
    public way to choose or create an ADMIN role.
    """

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        trim_whitespace=False,
    )
    confirm_password = serializers.CharField(
        write_only=True,
        min_length=8,
        trim_whitespace=False,
    )

    class Meta:
        model = Employee
        fields = [
            "employee_id",
            "name",
            "email",
            "mobile",
            "department",
            "designation",
            "location",
            "joining_date",
            "password",
            "confirm_password",
        ]

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })

        try:
            validate_password(attrs["password"])
        except Exception as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})

        return attrs

    def validate_employee_id(self, value):
        value = value.strip().upper()
        if not value:
            raise serializers.ValidationError("Employee ID is required.")
        if not all(ch.isalnum() or ch == "-" for ch in value):
            raise serializers.ValidationError(
                "Employee ID may contain only letters, numbers, and hyphens."
            )
        if Employee.objects.filter(employee_id__iexact=value).exists():
            raise serializers.ValidationError(
                "An employee with this Employee ID already exists."
            )
        return value

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Name must contain at least 2 characters.")
        if not all(ch.isalpha() or ch in " .'-" for ch in value):
            raise serializers.ValidationError("Name may contain only letters, spaces, periods, apostrophes, and hyphens.")
        return value

    def validate_mobile(self, value):
        value = value.strip()
        if not re.fullmatch(r"\+?[0-9]{10,15}", value):
            raise serializers.ValidationError("Enter a valid mobile number containing 10 to 15 digits.")
        return value

    def validate_designation(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Designation is required.")
        return value

    def validate_location(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Location is required.")
        return value

    def validate_joining_date(self, value):
        if value > date.today():
            raise serializers.ValidationError("Joining date cannot be in the future.")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if Employee.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "An employee with this email address already exists."
            )
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "A login account with this email address already exists."
            )
        return value

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")
        validated_data.pop("confirm_password", None)

        email = validated_data["email"]
        name = validated_data["name"]

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

        return Employee.objects.create(
            user=user,
            **validated_data,
        )
