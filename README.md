# OrbitalEducation

A platform for K-12 education management—grading, attendance, communication, and more—for Districts, Teachers, Students, Parents, and OrbitStaff.

## Features

- **District Sign-up & Management** (with 4-digit or custom codes)
- **Role-based Dashboards**: District Admin, Teacher, Student, Parent, OrbitStaff
- **Plans**: Basic/Free and PRO (with extra features & customizations)
- **Google Classroom/Drive/Admin Sync**
- **Clubs & Groups** (with requests, admin approval, auto-allow, group admins)
- **Bulk Grade & Real-time Updates**
- **Custom File/Email System**
- **Help Desk & Support Ticketing**
- **Custom News Website for Districts**
- **Full Role/Permission Model**

## Monorepo Structure

```
/orbital-education
  /apps
    /web           # React frontend
    /api           # Express backend
  /packages
    /db            # Prisma schema & migrations
    /shared        # Shared TypeScript types
  README.md
```

## Setup

1. `yarn install`
2. `cd apps/api && yarn dev`
3. `cd apps/web && yarn dev`
4. Set up `.env` files for API and DB.

---
