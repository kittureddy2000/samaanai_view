from rest_framework import generics, permissions, status, viewsets, views
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import MealEntry, ExerciseEntry, WeightEntry
from .serializers import (
    MealEntrySerializer, 
    ExerciseEntrySerializer,
    WeightEntrySerializer,
    MealEntryCreateSerializer,
    ExerciseEntryCreateSerializer,
    DailyNutritionReportSerializer,
    WeeklyReportSerializer,
    MonthlyReportSerializer,
    YearlyReportSerializer,
    BaseReportEntrySerializer,
)
from django.contrib.auth.models import User
from django.db.models import Sum
from datetime import datetime, timedelta, date as py_date
from django.utils import timezone
import calendar
import logging

logger = logging.getLogger(__name__)

def get_user_current_date(user):
    """Get current date in user's timezone"""
    if user and hasattr(user, 'profile') and user.profile:
        try:
            return user.profile.get_current_date()
        except:
            pass
    return py_date.today()

class MealEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for meal entries"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create' or self.action == 'bulk_create_or_update':
            return MealEntryCreateSerializer
        return MealEntrySerializer
    
    def get_queryset(self):
        queryset = MealEntry.objects.filter(user=self.request.user)
        date_str = self.request.query_params.get('date')
        if date_str:
            try:
                query_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                queryset = queryset.filter(date=query_date)
            except ValueError:
                pass
        return queryset.order_by('-date', 'meal_type')

    def perform_create(self, serializer):
        # Get meal data from serializer
        date = serializer.validated_data.get('date')
        meal_type = serializer.validated_data.get('meal_type')
        
        # Check if entry already exists for this user, date, and meal_type
        try:
            existing_entry = MealEntry.objects.get(
                user=self.request.user,
                date=date,
                meal_type=meal_type
            )
            # Update existing entry with new values
            for attr, value in serializer.validated_data.items():
                setattr(existing_entry, attr, value)
            existing_entry.save()
        except MealEntry.DoesNotExist:
            # Create new entry if none exists
            serializer.save(user=self.request.user)

class ExerciseEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for exercise entries"""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create' or self.action == 'bulk_create_or_update':
            return ExerciseEntryCreateSerializer
        return ExerciseEntrySerializer

    def get_queryset(self):
        queryset = ExerciseEntry.objects.filter(user=self.request.user)
        date_str = self.request.query_params.get('date')
        if date_str:
            try:
                query_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                queryset = queryset.filter(date=query_date)
            except ValueError:
                pass
        return queryset.order_by('-date')

    def perform_create(self, serializer):
        # Get exercise data from serializer
        date = serializer.validated_data.get('date')
        
        # Check if entry already exists for this user and date 
        # (assuming one exercise entry per day is desired)
        try:
            existing_entry = ExerciseEntry.objects.get(
                user=self.request.user,
                date=date
            )
            # Update existing entry with new values
            for attr, value in serializer.validated_data.items():
                setattr(existing_entry, attr, value)
            existing_entry.save()
        except ExerciseEntry.DoesNotExist:
            # Create new entry if none exists
            serializer.save(user=self.request.user)

class WeightEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for weight entries"""
    serializer_class = WeightEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WeightEntry.objects.filter(user=self.request.user).order_by('-date')

    def perform_create(self, serializer):
        date = serializer.validated_data.get('date', get_user_current_date(self.request.user))
        weight = serializer.validated_data['weight']
        
        # Use update_or_create but don't save the serializer separately
        WeightEntry.objects.update_or_create(
            user=self.request.user,
            date=date,
            defaults={'weight': weight}
        )
        # Don't call serializer.save() again

class DailyNutritionReportAPIView(views.APIView):
    """
    API View to get a consolidated daily nutrition report for a specific date.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        date_str = request.query_params.get('date')
        if not date_str:
            query_date = get_user_current_date(request.user)
        else:
            try:
                # Parse the date exactly as sent from frontend
                query_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                logger.debug(f"Requested date from frontend: {date_str} → Parsed as: {query_date}")
            except ValueError:
                return Response(
                    {"error": "Invalid date format. Use YYYY-MM-DD"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

        user = request.user
        
        # Check entries for exact date match
        meals_queryset = MealEntry.objects.filter(user=user, date=query_date)
        exercises_queryset = ExerciseEntry.objects.filter(user=user, date=query_date)
        weight_entry = WeightEntry.objects.filter(user=user, date=query_date).first()

        # Debug log exact database queries
        logger.debug(f"Database queries:")
        logger.debug(f"- Query date (exact): {query_date}")
        logger.debug(f"- MealEntry SQL: {meals_queryset.query}")
        logger.debug(f"- ExerciseEntry SQL: {exercises_queryset.query}")
        logger.debug(f"- Found {meals_queryset.count()} meal entries")
        logger.debug(f"- Found {exercises_queryset.count()} exercise entries")

        report_data_for_serializer = {
            'date': query_date,
            'meals_queryset': meals_queryset,
            'exercises_queryset': exercises_queryset,
            'meals': list(meals_queryset),
            'exercises': list(exercises_queryset),
            'weight': weight_entry.weight if weight_entry else None
        }

        serializer = DailyNutritionReportSerializer(report_data_for_serializer, context={'request': request})
        return Response(serializer.data)


# --- Report Views (Simplified - Require significant logic for data aggregation) ---
# The following report views are placeholders and need substantial work 
# to correctly gather and aggregate data from MealEntry, ExerciseEntry, WeightEntry
# and structure it for their respective serializers.

class WeeklyReportAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request, *args, **kwargs):
        try:
            user = request.user
            
            # Get date parameter or use current date
            date_str = request.query_params.get('date')
            if date_str:
                try:
                    # This is the date the user is viewing/selected
                    current_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                except ValueError:
                    return Response(
                        {"error": "Invalid date format. Use YYYY-MM-DD"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                current_date = get_user_current_date(request.user)
            
            # Get user's preferred start of week from profile (default to Wednesday if not set)
            start_of_week = 2  # Default to Wednesday
            if hasattr(user, 'profile'):
                start_of_week = user.profile.start_of_week
            
            # Calculate start and end dates for the week based on user preference
            # Find the most recent occurrence of the preferred start day
            weekday = current_date.weekday()
            
            # Print out some debugging info
            logger.debug(f"Current date: {current_date}, weekday: {weekday} ({['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][weekday]})")
            logger.debug(f"User's preferred start of week: {start_of_week} ({['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][start_of_week]})")
            
            # Calculate days back to the start of the week
            # If today is the start day or after, go back to that start day
            # If today is before the start day, go back to the previous week's start day
            if weekday >= start_of_week:
                days_back = weekday - start_of_week
            else:
                days_back = weekday + (7 - start_of_week)
            
            logger.debug(f"Days back to start day: {days_back}")
            
            # Calculate the actual week boundaries
            start_date = current_date - timedelta(days=days_back)
            end_date = start_date + timedelta(days=6)
            
            logger.debug(f"Calculated week: {start_date} to {end_date}")
            logger.debug(f"Start date weekday: {start_date.weekday()} ({['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][start_date.weekday()]})")
            logger.debug(f"End date weekday: {end_date.weekday()} ({['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][end_date.weekday()]})")
            
            # Initialize the response data
            daily_summaries = []
            overall_total_net_calories = 0
            overall_total_food_calories = 0
            overall_total_exercise_calories = 0
            
            # For each day in the week
            current = start_date
            while current <= end_date:
                # Get meal entries for this day
                meal_entries = MealEntry.objects.filter(user=user, date=current)
                total_food_calories = meal_entries.aggregate(Sum('calories'))['calories__sum'] or 0
                
                # Get exercise entries for this day
                exercise_entries = ExerciseEntry.objects.filter(user=user, date=current)
                total_exercise_calories = exercise_entries.aggregate(Sum('calories_burned'))['calories_burned__sum'] or 0
                
                # Get weight entry for this day
                weight_entry = WeightEntry.objects.filter(user=user, date=current).first()
                weight = weight_entry.weight if weight_entry else None
                
                # Calculate net calories
                net_calories = None
                try:
                    if hasattr(user, 'profile') and user.profile and user.profile.metabolic_rate:
                        weight_loss_goal = getattr(user.profile, 'weight_loss_goal', 0)
                        weight_loss_calories_per_day = (weight_loss_goal * 3500) / 7
                        net_calories = round(user.profile.metabolic_rate - weight_loss_calories_per_day - total_food_calories + total_exercise_calories)
                except (AttributeError, Exception) as e:
                    logger.error(f"Error calculating net calories: {e}")
                
                # Add to daily summaries
                daily_summaries.append({
                    'date': current,
                    'total_food_calories': total_food_calories,
                    'total_exercise_calories': total_exercise_calories,
                    'net_calories': net_calories,
                    'weight': weight
                })
                
                # Update overall totals
                overall_total_food_calories += total_food_calories
                overall_total_exercise_calories += total_exercise_calories
                if net_calories is not None:
                    overall_total_net_calories += net_calories
                
                # Move to next day
                current += timedelta(days=1)
            
            response_data = {
                'start_date': start_date,
                'end_date': end_date,
                'daily_summaries': daily_summaries,
                'overall_total_food_calories': overall_total_food_calories,
                'overall_total_exercise_calories': overall_total_exercise_calories,
                'overall_total_net_calories': overall_total_net_calories
            }
            
            serializer = WeeklyReportSerializer(response_data)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error in weekly report: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MonthlyReportAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request, *args, **kwargs):
        try:
            user = request.user
            
            # Get month and year parameters or use current date
            current_date = get_user_current_date(request.user)
            year = int(request.query_params.get('year', current_date.year))
            month = int(request.query_params.get('month', current_date.month))
            
            # Calculate number of days in the month
            _, days_in_month = calendar.monthrange(year, month)
            
            # Create date range for the month
            start_date = datetime(year, month, 1).date()
            end_date = datetime(year, month, days_in_month).date()
            
            # Initialize the response data
            daily_entries = []
            total_net_calories = 0
            total_food_calories = 0
            total_exercise_calories = 0
            
            # For each day in the month
            current = start_date
            while current <= end_date:
                # Get meal entries for this day
                meal_entries = MealEntry.objects.filter(user=user, date=current)
                daily_food_calories = meal_entries.aggregate(Sum('calories'))['calories__sum'] or 0
                
                # Get exercise entries for this day
                exercise_entries = ExerciseEntry.objects.filter(user=user, date=current)
                daily_exercise_calories = exercise_entries.aggregate(Sum('calories_burned'))['calories_burned__sum'] or 0
                
                # Get weight entry for this day
                weight_entry = WeightEntry.objects.filter(user=user, date=current).first()
                weight = weight_entry.weight if weight_entry else None
                
                # Calculate net calories
                net_calories = None
                try:
                    if hasattr(user, 'profile') and user.profile and user.profile.metabolic_rate:
                        weight_loss_goal = getattr(user.profile, 'weight_loss_goal', 0)
                        weight_loss_calories_per_day = (weight_loss_goal * 3500) / 7
                        net_calories = round(user.profile.metabolic_rate - weight_loss_calories_per_day - daily_food_calories + daily_exercise_calories)
                except (AttributeError, Exception) as e:
                    logger.error(f"Error calculating net calories: {e}")
                
                # Only add days with data
                if daily_food_calories > 0 or daily_exercise_calories > 0 or weight is not None:
                    daily_entries.append({
                        'date': current,
                        'total_food_calories': daily_food_calories,
                        'total_exercise_calories': daily_exercise_calories,
                        'net_calories': net_calories,
                        'weight': weight
                    })
                
                # Update monthly totals
                total_food_calories += daily_food_calories
                total_exercise_calories += daily_exercise_calories
                if net_calories is not None:
                    total_net_calories += net_calories
                
                # Move to next day
                current += timedelta(days=1)
            
            response_data = {
                'month': month,
                'year': year,
                'daily_entries': daily_entries,
                'total_food_calories': total_food_calories,
                'total_exercise_calories': total_exercise_calories,
                'total_net_calories': total_net_calories
            }
            
            serializer = MonthlyReportSerializer(response_data)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error in monthly report: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class YearlyReportAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request, *args, **kwargs):
        try:
            user = request.user
            
            # Get year parameter or use current year
            current_date = get_user_current_date(request.user)
            year = int(request.query_params.get('year', current_date.year))
            
            # Create date range for the year
            start_date = datetime(year, 1, 1).date()
            end_date = datetime(year, 12, 31).date()
            
            # Initialize monthly summaries
            monthly_entries = []
            yearly_total_food_calories = 0
            yearly_total_exercise_calories = 0
            
            # For each month in the year
            for month in range(1, 13):
                # Get month start and end dates
                _, days_in_month = calendar.monthrange(year, month)
                month_start = datetime(year, month, 1).date()
                month_end = datetime(year, month, days_in_month).date()
                
                # Get all entries for this month
                meal_entries = MealEntry.objects.filter(
                    user=user, 
                    date__gte=month_start,
                    date__lte=month_end
                )
                monthly_food_calories = meal_entries.aggregate(Sum('calories'))['calories__sum'] or 0
                
                exercise_entries = ExerciseEntry.objects.filter(
                    user=user, 
                    date__gte=month_start,
                    date__lte=month_end
                )
                monthly_exercise_calories = exercise_entries.aggregate(Sum('calories_burned'))['calories_burned__sum'] or 0
                
                # Calculate monthly net calories (simplified)
                monthly_net_calories = None
                try:
                    if hasattr(user, 'profile') and user.profile and user.profile.metabolic_rate:
                        # Check if there's any food or exercise logged for this month
                        has_data = monthly_food_calories > 0 or monthly_exercise_calories > 0
                        
                        if has_data:
                            # Simplified approach for monthly net calories
                            weight_loss_goal = getattr(user.profile, 'weight_loss_goal', 0)
                            daily_bmr = user.profile.metabolic_rate - ((weight_loss_goal * 3500) / 7)
                            monthly_bmr = daily_bmr * days_in_month
                            monthly_net_calories = round(monthly_bmr - monthly_food_calories + monthly_exercise_calories)
                        else:
                            # No food or exercise logged, set net calories to 0
                            monthly_net_calories = 0
                except (AttributeError, Exception) as e:
                    logger.error(f"Error calculating net calories: {e}")
                
                # Get average weight for the month (if available)
                weight_entries = WeightEntry.objects.filter(
                    user=user, 
                    date__gte=month_start,
                    date__lte=month_end
                )
                avg_weight = None
                if weight_entries.exists():
                    total_weight = 0
                    count = 0
                    for entry in weight_entries:
                        total_weight += entry.weight
                        count += 1
                    avg_weight = round(total_weight / count, 1) if count > 0 else None
                
                # Only add months with data
                if monthly_food_calories > 0 or monthly_exercise_calories > 0 or avg_weight is not None:
                    # Count days that have food or exercise entries
                    days_with_data = 0
                    current_date = month_start
                    while current_date <= month_end:
                        day_has_data = (
                            MealEntry.objects.filter(user=user, date=current_date).exists() or 
                            ExerciseEntry.objects.filter(user=user, date=current_date).exists()
                        )
                        if day_has_data:
                            days_with_data += 1
                        current_date += timedelta(days=1)
                        
                    monthly_entries.append({
                        'month': month,
                        'total_food_calories': monthly_food_calories,
                        'total_exercise_calories': monthly_exercise_calories,
                        'net_calories': monthly_net_calories,
                        'average_weight': avg_weight,
                        'days_with_data': days_with_data,
                        'days_in_month': days_in_month
                    })
                
                # Update yearly totals
                yearly_total_food_calories += monthly_food_calories
                yearly_total_exercise_calories += monthly_exercise_calories
            
            # Recalculate yearly totals based on our net calorie rule
            yearly_total_net_calories = 0
            for entry in monthly_entries:
                has_data = entry['total_food_calories'] > 0 or entry['total_exercise_calories'] > 0
                if has_data and entry['net_calories'] is not None:
                    yearly_total_net_calories += entry['net_calories']
            
            response_data = {
                'year': year,
                'monthly_entries': monthly_entries,
                'yearly_total_food_calories': yearly_total_food_calories,
                'yearly_total_exercise_calories': yearly_total_exercise_calories,
                'yearly_total_net_calories': yearly_total_net_calories
            }
            
            serializer = YearlyReportSerializer(response_data)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error in yearly report: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

