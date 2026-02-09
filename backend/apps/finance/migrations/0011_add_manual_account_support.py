# Generated manually
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('finance', '0010_add_recurring_transaction'),
    ]

    operations = [
        migrations.AddField(
            model_name='institution',
            name='is_manual',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='account',
            name='is_manual',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='account',
            name='user',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='accounts', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='account',
            name='institution',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='accounts', to='finance.institution'),
        ),
        migrations.AlterField(
            model_name='account',
            name='plaid_account_id',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
