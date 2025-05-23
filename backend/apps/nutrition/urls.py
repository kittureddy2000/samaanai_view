from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MealEntryViewSet,
    ExerciseEntryViewSet,
    WeightEntryViewSet,
    DailyNutritionReportAPIView,
    WeeklyReportAPIView,
    MonthlyReportAPIView,
    YearlyReportAPIView
)

router = DefaultRouter()
router.register(r'meals', MealEntryViewSet, basename='mealentry')
router.register(r'exercises', ExerciseEntryViewSet, basename='exerciseentry')
router.register(r'weight-entries', WeightEntryViewSet, basename='weightentry')

urlpatterns = [
    path('', include(router.urls)),
    path('reports/daily/', DailyNutritionReportAPIView.as_view(), name='daily-nutrition-report'),
    path('reports/weekly/', WeeklyReportAPIView.as_view(), name='weekly-report'),
    path('reports/monthly/', MonthlyReportAPIView.as_view(), name='monthly-report'),
    path('reports/yearly/', YearlyReportAPIView.as_view(), name='yearly-report'),
]