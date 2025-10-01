# API Endpoint Design (RESTful)

## Auth
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/verify`
- `POST /api/auth/reset-password`

## Districts
- `POST /api/districts` (sign up)
- `GET /api/districts/:id`
- `PATCH /api/districts/:id` (update settings)
- `POST /api/districts/:id/plans` (change plan)

## Users
- `GET /api/users/me`
- `PATCH /api/users/me`
- `GET /api/users/:id`
- `GET /api/users?role=TEACHER|STUDENT|PARENT`
- `POST /api/users/invite` (OrbitStaff)

## Classes
- `POST /api/classes`
- `GET /api/classes/:id`
- `PATCH /api/classes/:id`
- `DELETE /api/classes/:id`

## Groups
- `POST /api/groups`
- `GET /api/groups/:id`
- `PATCH /api/groups/:id`
- `POST /api/groups/:id/request`
- `POST /api/groups/:id/approve`

## Announcements
- `POST /api/announcements`
- `GET /api/announcements?districtId=`
- `PATCH /api/announcements/:id`

## Passes
- `POST /api/passes`
- `GET /api/passes/:id`
- `PATCH /api/passes/:id`

## Help Desk
- `POST /api/helpdesk/tickets`
- `GET /api/helpdesk/tickets?userId=`
- `PATCH /api/helpdesk/tickets/:id`
