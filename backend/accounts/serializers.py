from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from accounts.models import User


class UserSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    email = serializers.EmailField()
    aim = serializers.CharField()
    date_joined = serializers.DateTimeField()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    aim = serializers.CharField(required=False, allow_blank=True, max_length=180)

    class Meta:
        model = User
        fields = ["name", "email", "password", "aim"]

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate_name(self, value):
        name = " ".join(value.split())
        if len(name) < 2:
            raise serializers.ValidationError("Use at least 2 characters.")
        return name

    def validate_aim(self, value):
        return value.strip()

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(TokenObtainPairSerializer):
    default_error_messages = {"no_active_account": "Email or password is not right."}

    def validate(self, attrs):
        email = attrs.get(self.username_field)
        if isinstance(email, str):
            attrs[self.username_field] = email.strip().lower()
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data
