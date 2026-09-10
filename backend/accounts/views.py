from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import EmployeeRegistrationSerializer, LoginSerializer


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        return Response(
            {
                "success": True,
                "message": "Login successful.",
                "data": serializer.validated_data,
            },
            status=status.HTTP_200_OK,
        )


class EmployeeRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = EmployeeRegistrationSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)
        employee = serializer.save()

        return Response(
            {
                "success": True,
                "message": "Employee account created successfully.",
                "data": {
                    "employee_id": employee.employee_id,
                    "name": employee.name,
                    "email": employee.email,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = getattr(user, "profile", None)

        role = (
            profile.role
            if profile
            else "ADMIN" if user.is_staff or user.is_superuser
            else "EMPLOYEE"
        )

        return Response(
            {
                "success": True,
                "message": "Authenticated user retrieved successfully.",
                "data": {
                    "id": user.id,
                    "name": user.get_full_name() or user.username,
                    "email": user.email,
                    "role": role,
                },
            },
            status=status.HTTP_200_OK,
        )
