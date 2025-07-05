# Generated migration for WebAuthn credentials

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('users', '0004_userprofile_timezone'),
    ]

    operations = [
        migrations.CreateModel(
            name='WebAuthnCredential',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('credential_id', models.TextField(help_text='Base64-encoded credential ID')),
                ('public_key', models.TextField(help_text='Base64-encoded public key')),
                ('sign_count', models.PositiveIntegerField(default=0, help_text='Signature counter')),
                ('name', models.CharField(help_text='User-friendly name for the credential', max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('last_used', models.DateTimeField(blank=True, null=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='webauthn_credentials', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('user', 'credential_id')},
            },
        ),
    ]