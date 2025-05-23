Calorie & Weight Tracker
A comprehensive mobile-first application for tracking daily calories, exercise, and weight to support personal weight management goals.
Overview
This application helps users monitor their daily food intake, exercise activities, and weight progression. It calculates net calories based on each user's metabolic rate and weight loss goals, providing accurate insights into their progress toward weight management objectives.
Features
Daily Logging: Log food intake (breakfast, lunch, dinner, snacks), exercises, and weight in a streamlined interface
Smart Calculations: Automatic net calorie calculations based on your personal metabolic rate and weight loss goals
Date Navigation: Easily navigate between dates to view or edit entries
Customizable Profile: Set your Basal Metabolic Rate (BMR) and weekly weight loss goals
Comprehensive Reports:
Weekly View: Wednesday-to-Tuesday cycle with daily calorie visualization and cumulative net calorie tracking
Monthly View: Monthly calorie and weight progression summary
Yearly View: Long-term trend analysis and visualization
Mobile-First Design: Optimized for easy use on mobile devices
Technology Stack
Frontend: React.js with styled-components
Backend: Django REST Framework
Database: PostgreSQL
Containerization: Docker & Docker Compose
Getting Started
Prerequisites
Docker and Docker Compose installed on your system
Git
Installation
Clone the repository:
Apply to README.md
Run
tracker
Start the application:
Apply to README.md
Run
up
Access the application:
Frontend: http://localhost:3000
Backend API: http://localhost:8000/api/
Development Setup
For local development without Docker:
Backend setup:
Apply to README.md
Run
runserver
Frontend setup:
Apply to README.md
Run
start
Usage
Creating an Account
Navigate to the Registration page
Enter your username, email, and password
Set your initial BMR and weight loss goal in the profile setup
Daily Tracking
Use the Daily Entry page to log your meals and exercises
Add meals by selecting the meal type, description, and calorie amount
Log exercises with description, duration, and calories burned
Record your daily weight to track progress
Viewing Reports
Weekly Report: Navigate to the Weekly tab to see your Wednesday-to-Tuesday cycle
Monthly Report: View the Monthly tab for calendar month summaries
Yearly Report: Check the Yearly tab for long-term trends
Project Structure
Apply to README.md
configuration
API Endpoints
Authentication
POST /api/auth/register/: Register a new user
POST /api/auth/login/: Login with credentials
POST /api/auth/logout/: Logout the current user
Profile
GET /api/users/profile/: Get current user profile
PATCH /api/users/profile/metrics/: Update user metrics (BMR, weight loss goal)
Nutrition Tracking
GET /api/nutrition/daily/date/?date=YYYY-MM-DD: Get or create daily entry for date
PATCH /api/nutrition/daily/{id}/: Update a daily entry
POST /api/nutrition/meals/: Add a meal entry
DELETE /api/nutrition/meals/{id}/: Delete a meal entry
POST /api/nutrition/exercises/: Add an exercise entry
DELETE /api/nutrition/exercises/{id}/: Delete an exercise entry
Reports
GET /api/nutrition/daily/weekly/?date=YYYY-MM-DD: Get weekly report data
GET /api/nutrition/daily/monthly/?month=MM&year=YYYY: Get monthly report data
GET /api/nutrition/daily/yearly/?year=YYYY: Get yearly report data
Deployment
The application is containerized for easy deployment:
Update environment variables in docker-compose.yml for production
Build and start the containers: docker-compose up -d --build
Access the application on the configured host and port
For production deployment, consider:
Using a reverse proxy like Nginx
Enabling HTTPS with Let's Encrypt
Setting up proper database backups
Configuring environment-specific settings
License
This project is licensed under the MIT License - see the LICENSE file for details.
Acknowledgements
React.js and Django communities for the excellent documentation
All contributors who have helped shape this project

## 8. Testing

### 8.1 Run All Tests (Locally)
This will run backend, frontend, and E2E (Cypress) tests using the test Docker Compose environment:

```bash
./run_tests.sh
```

### 8.2 Run Backend Tests Only
```bash
docker-compose -f docker-compose.test.yml run --rm backend-test
```

### 8.3 Run Frontend Unit Tests Only
```bash
docker-compose -f docker-compose.test.yml run --rm frontend-test
```

### 8.4 Run Cypress E2E Tests Only
First, start the required services:
```bash
docker-compose -f docker-compose.test.yml up -d db backend frontend
```
Then, in a separate terminal, run:
```bash
docker-compose -f docker-compose.test.yml run --rm cypress
```
When finished, stop the services:
```bash
docker-compose -f docker-compose.test.yml down
```

### 8.5 View Test Summary
After running `./run_tests.sh`, generate a consolidated summary:
```bash
./generate_test_summary.sh
```
The summary will be available in the `logs/` directory.

## 9. Continuous Integration / Deployment (CI/CD)

### 9.1 Automated Testing in Google Cloud Build
- **Cloud Build is configured to run all tests automatically before building and deploying.**
- The test steps are defined in `cloudbuild-backend.yaml` and `cloudbuild-frontend.yaml`.
- If any test fails, the build and deployment will be stopped.

**You do not need to do anything extra** as long as your Cloud Build triggers are set up to use these YAML files (see below).

### 9.2 How it Works
- **Frontend:**  
  - Runs unit tests and Cypress E2E tests using `docker-compose.test.yml`  
  - Only builds, pushes, and deploys if all tests pass
- **Backend:**  
  - Runs backend tests using `docker-compose.test.yml`  
  - Only builds, pushes, and deploys if all tests pass

### 9.3 Cloud Build Trigger Setup
- Make sure your Google Cloud Build triggers are configured to use `cloudbuild-backend.yaml` and `cloudbuild-frontend.yaml` for the respective services.
- No further action is needed if your triggers are already set up.
