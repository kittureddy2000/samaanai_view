from rest_framework import serializers
from .models import MealEntry, ExerciseEntry, WeightEntry
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models import Sum

class UserSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']

class WeightEntrySerializer(serializers.ModelSerializer):
    user = UserSimpleSerializer(read_only=True)
    class Meta:
        model = WeightEntry
        fields = ['id', 'user', 'date', 'weight']
        read_only_fields = ['id', 'user']

class MealEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = MealEntry
        fields = ['id', 'meal_type', 'description', 'calories', 'date', 'created_at']
        read_only_fields = ['id', 'created_at']

class ExerciseEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExerciseEntry
        fields = ['id', 'description', 'calories_burned', 'duration_minutes', 'date', 'created_at']
        read_only_fields = ['id', 'created_at']

class MealEntryCreateSerializer(serializers.ModelSerializer):
    date = serializers.DateField(required=True)
    
    class Meta:
        model = MealEntry
        fields = ['meal_type', 'description', 'calories', 'date']
    
    def create(self, validated_data):
        meal_entry = MealEntry.objects.create(**validated_data)
        return meal_entry

class ExerciseEntryCreateSerializer(serializers.ModelSerializer):
    date = serializers.DateField(required=True)
    
    class Meta:
        model = ExerciseEntry
        fields = ['description', 'calories_burned', 'duration_minutes', 'date']

    def create(self, validated_data):
        exercise_entry = ExerciseEntry.objects.create(**validated_data)
        return exercise_entry

class DailyNutritionReportSerializer(serializers.Serializer):
    """
    Serializer for a consolidated daily nutrition report for a specific user and date.
    This data is assembled on-the-fly by the view.
    """
    date = serializers.DateField()
    meals = MealEntrySerializer(many=True, read_only=True)
    exercises = ExerciseEntrySerializer(many=True, read_only=True)
    weight = serializers.FloatField(allow_null=True, read_only=True)
    
    total_food_calories = serializers.SerializerMethodField()
    total_exercise_calories = serializers.SerializerMethodField()
    net_calories = serializers.SerializerMethodField()

    def get_total_food_calories(self, obj):
        return obj.get('meals_queryset', MealEntry.objects.none()).aggregate(total=Sum('calories'))['total'] or 0

    def get_total_exercise_calories(self, obj):
        return obj.get('exercises_queryset', ExerciseEntry.objects.none()).aggregate(total=Sum('calories_burned'))['total'] or 0

    def get_net_calories(self, obj):
        user = self.context['request'].user
        try:
            profile = user.profile
            if not profile.metabolic_rate:
                return None
            
            weight_loss_calories_per_day = (profile.weight_loss_goal * 3500) / 7
            
            food_calories = self.get_total_food_calories(obj)
            exercise_calories = self.get_total_exercise_calories(obj)
            
            return round(profile.metabolic_rate - weight_loss_calories_per_day - food_calories + exercise_calories)
        except AttributeError:
            return None
        except Exception:
            return None

class BaseReportEntrySerializer(serializers.Serializer):
    """Represents a single day's summary within a larger report."""
    date = serializers.DateField()
    total_food_calories = serializers.IntegerField(default=0)
    total_exercise_calories = serializers.IntegerField(default=0)
    net_calories = serializers.IntegerField(allow_null=True)
    weight = serializers.FloatField(allow_null=True)

class WeeklyReportSerializer(serializers.Serializer):
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    daily_summaries = BaseReportEntrySerializer(many=True)
    overall_total_food_calories = serializers.IntegerField(default=0)
    overall_total_exercise_calories = serializers.IntegerField(default=0)
    overall_total_net_calories = serializers.IntegerField(default=0)

class MonthlyReportSerializer(serializers.Serializer):
    month = serializers.IntegerField()
    year = serializers.IntegerField()
    daily_entries = BaseReportEntrySerializer(many=True)
    total_food_calories = serializers.IntegerField(default=0)
    total_exercise_calories = serializers.IntegerField(default=0)
    total_net_calories = serializers.IntegerField(default=0)

class MonthlyEntrySerializer(serializers.Serializer):
    """Represents a monthly summary for yearly reports"""
    month = serializers.IntegerField()
    total_food_calories = serializers.IntegerField(default=0)
    total_exercise_calories = serializers.IntegerField(default=0)
    net_calories = serializers.IntegerField(allow_null=True)
    average_weight = serializers.FloatField(allow_null=True)
    days_with_data = serializers.IntegerField(default=0)
    days_in_month = serializers.IntegerField(default=0)

class YearlyReportSerializer(serializers.Serializer):
    year = serializers.IntegerField()
    monthly_entries = MonthlyEntrySerializer(many=True)
    yearly_total_food_calories = serializers.IntegerField(default=0)
    yearly_total_exercise_calories = serializers.IntegerField(default=0)
    yearly_total_net_calories = serializers.IntegerField(default=0)