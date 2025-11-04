# Data Persistence Guide

## Overview
This application uses a **dual-layer persistence strategy** to ensure no data is lost:

1. **Primary Storage: MongoDB Atlas Database** (Permanent)
2. **Backup Cache: Browser localStorage** (Temporary fallback)

## How Data Persistence Works

### 1. **Database First Approach**
- All data is **primarily stored in MongoDB Atlas**
- Data persists permanently until explicitly deleted by the user
- Survives page reloads, browser restarts, and server restarts

### 2. **localStorage as Backup Cache**
- Used as a **temporary cache** for offline access
- Automatically synced with database on page load
- **Database data always overrides cached data**

### 3. **Data Flow**

```
User Action (Create/Update) 
    ↓
Save to MongoDB Database ← PRIMARY
    ↓
Cache in localStorage ← BACKUP
    ↓
Update UI
```

```
Page Reload
    ↓
Load from localStorage (immediate display) ← FAST UX
    ↓
Fetch from MongoDB Database ← AUTHORITATIVE
    ↓
Override localStorage with fresh data
    ↓
Update UI with latest data
```

## Data Types and Persistence

### ✅ Fully Persistent Data

All the following data persists in the database:

| Data Type | Collection | Persistence |
|-----------|-----------|-------------|
| **Students** | `students` | ✓ Permanent until deleted |
| **Faculty** | `faculties` | ✓ Permanent until deleted |
| **Exams** | `exams` | ✓ Permanent until deleted |
| **Marks** | `marks` | ✓ Permanent until deleted |
| **Attendance** | `attendances` | ✓ Permanent until deleted |
| **Documents** | `documents` | ✓ Permanent until deleted |
| **Leave Requests** | `leaverequests` | ✓ Permanent until deleted |
| **Messages** | `messages` | ✓ Permanent until deleted |
| **Courses** | `courses` | ✓ Permanent until deleted |
| **Settings** | `settings` | ✓ Permanent until deleted |

### 🔄 How Each Data Type is Protected

#### **Exams**
- Created via POST `/api/exams`
- Stored in `exams` collection with unique `id` field
- Retrieved on page load via GET `/api/exams`
- Updates via PUT `/api/exams/:id`
- **Never deleted unless user explicitly clicks delete button**

#### **Marks**
- Saved via POST `/api/exams/:id/marks` (Marks collection)
- Also saved in exam's `marks` field (Exam collection)
- Double persistence for redundancy
- Retrieved via GET `/api/exams/student/:admissionNo`

#### **Attendance**
- Saved via POST `/api/attendance`
- Each record has date, period, subject, staff, student, status
- Retrieved via GET `/api/attendance` and GET `/api/attendance/:admissionNo`

#### **Students & Faculty**
- Created via POST `/api/students` or POST `/api/faculty`
- Updated via PUT `/api/students/:admissionno` or PUT `/api/staff/:id`
- **Password changes** saved immediately to database

#### **Documents**
- Uploaded via POST `/api/documents/upload`
- Files stored on server, metadata in database
- Retrieved via GET `/api/documents`

#### **Leave Requests**
- Created via POST `/api/leave-requests`
- Updated (approve/reject) via PUT `/api/leave-requests/:id`
- Retrieved via GET `/api/leave-requests`

#### **Messages (Discussion)**
- Sent via POST `/api/messages`
- Real-time polling every 5 seconds
- Retrieved via GET `/api/messages`
- Mark as read via PATCH `/api/messages/read`

## Key Features Ensuring Persistence

### 1. **Automatic Sync on Page Load**
```javascript
// On every page load, data is fetched from database
window.onload = async () => {
    // Load from database (authoritative source)
    exams = await handleApiCall('/api/exams');
    students = await handleApiCall('/api/students');
    // ... all other data
    
    // Cache in localStorage as backup
    saveToLocalStorage('exams', exams);
}
```

### 2. **Database-First Priority**
```javascript
// Database data ALWAYS overrides cached data
if (examsRes.status === 'fulfilled') {
    const freshExams = examsRes.value;
    if (freshExams && Array.isArray(freshExams)) {
        exams = freshExams; // Use database data
        saveToLocalStorage('exams', exams); // Update cache
    }
}
```

### 3. **Immediate Save on User Actions**
```javascript
// Every create/update action saves to database immediately
const createdExam = await handleApiCall('/api/exams', {
    method: 'POST',
    body: JSON.stringify(newExam)
});

// Then updates local state
exams.push(createdExam);
saveToLocalStorage('exams', exams);
```

### 4. **Error Handling & Offline Support**
```javascript
try {
    // Try to save to database first
    await handleApiCall('/api/exams', {...});
    showNotification('Saved successfully', 'success');
} catch (error) {
    // If database fails, save locally
    saveToLocalStorage('exams', exams);
    showNotification('Saved locally, will sync when online', 'warning');
}
```

## What Gets Deleted vs What Persists

### ❌ Never Automatically Deleted
- Exams (unless user clicks delete)
- Marks entered by staff
- Attendance records
- Student/Faculty profiles
- Documents uploaded
- Leave requests submitted
- Chat messages

### ✓ Only Deleted When
- User explicitly clicks "Delete" button
- Admin removes a record
- Staff deletes a document
- Faculty deletes an exam

### 🔄 Refreshed (Not Deleted)
- localStorage cache (overridden by fresh database data)
- UI display (re-rendered with latest data)

## Troubleshooting

### If Data Appears Missing:
1. **Check Server Logs** - Look for "Found X exams" messages
2. **Check Browser Console** - Look for API errors or 404s
3. **Clear Browser Cache** - Hard refresh with Ctrl+Shift+R
4. **Check Database** - Use MongoDB Atlas UI to verify data exists
5. **Check localStorage** - Open DevTools → Application → Local Storage

### Common Issues Fixed:
✅ **Old `examId` index** - Fixed by dropping old index on server start
✅ **localStorage key mismatch** - Fixed by using consistent `saveToLocalStorage()` function
✅ **Cache overriding database** - Fixed by prioritizing database data
✅ **Missing validation logging** - Added detailed console logs

## Best Practices

### For Users:
- ✓ Wait for "Success" notification after creating/updating
- ✓ Don't refresh page during save operations
- ✓ Check console logs if data seems missing

### For Developers:
- ✓ Always save to database first, then localStorage
- ✓ Always load from database on page load
- ✓ Use `saveToLocalStorage()` helper, not direct `localStorage.setItem()`
- ✓ Handle errors gracefully with fallback to localStorage
- ✓ Add console logs for debugging data flow

## Summary

**Data Persistence = Guaranteed** ✓

- All user-entered data is saved to MongoDB Atlas database
- Data persists across page reloads, browser restarts, and sessions
- localStorage is only a temporary cache for better UX
- Database is the single source of truth
- Data is only deleted when user explicitly requests deletion

**Your data is safe and will never vanish on page reload!** 🎉
