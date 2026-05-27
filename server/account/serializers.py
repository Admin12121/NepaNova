from rest_framework import serializers
from .models import *

class NewsLetterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(validators=[])

    def validate_email(self, value):
        return value.strip().lower()

    class Meta:
        model = NewLetter
        fields = '__all__'

class SiteViewLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteViewLog
        fields = '__all__'

class BulkUserActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'state']

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'first_name', 'last_name']

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

class UserDataSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = '__all__'

    def get_roles(self, obj):
        return list(obj.get_role_slugs())

    def get_permissions(self, obj):
        return list(obj.get_rbac_permission_codes())

class UserDetailSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id','email', 'profile', 'username', 
            'last_name', 'first_name', 'role', 'roles', 'permissions', 'gender', 'dob'
        ]

    def get_roles(self, obj):
        return list(obj.get_role_slugs())

    def get_permissions(self, obj):
        return list(obj.get_rbac_permission_codes())
        
class SocialLoginSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = User
        fields = ['email', 'username', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class UserChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField()

    def validate(self, data):
        user = self.context['user']
        if not user.check_password(data['old_password']):
            raise serializers.ValidationError('Old password is incorrect')
        return data

class AdminUserDataSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()
    provider = serializers.SerializerMethodField()  # Add this line

    class Meta:
        model = User
        exclude = ['password']
    def get_profile(self, obj):
        request = self.context.get('request')
        if obj.profile and hasattr(obj.profile, 'url'):
            return request.build_absolute_uri(obj.profile.url)
        return None
    def get_provider(self, obj):  # Add this method
        return obj.account.provider if hasattr(obj, 'account') else None

class UserDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserDevice
        fields = '__all__'

class RbacPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RbacPermission
        fields = '__all__'

class RoleSerializer(serializers.ModelSerializer):
    permission_codes = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()
    permissions = serializers.PrimaryKeyRelatedField(
        queryset=RbacPermission.objects.all(), many=True, required=False
    )

    class Meta:
        model = Role
        fields = [
            'id', 'name', 'slug', 'color', 'position', 'is_default', 'is_system',
            'permissions', 'permission_codes', 'user_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_permission_codes(self, obj):
        return list(obj.permissions.values_list('code', flat=True))

    def get_user_count(self, obj):
        return obj.user_assignments.count()

class UserRoleSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    role_name = serializers.CharField(source='role.name', read_only=True)
    role_slug = serializers.CharField(source='role.slug', read_only=True)
    assigned_by_email = serializers.EmailField(
        source='assigned_by.email', read_only=True
    )

    class Meta:
        model = UserRole
        fields = [
            'id', 'user', 'user_email', 'role', 'role_name', 'role_slug',
            'assigned_by', 'assigned_by_email', 'assigned_at'
        ]
        read_only_fields = ['assigned_by', 'assigned_at']

class UserRoleAssignmentSerializer(serializers.Serializer):
    role_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), allow_empty=True
    )

class DeliveryAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryAddress
        exclude = ['is_deleted']

class SearchHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchHistory
        fields = '__all__'
