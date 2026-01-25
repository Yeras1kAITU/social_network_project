# StudyConnect - Social Network for Students

## Project Description
StudyConnect is a specialized social networking platform designed exclusively for university and college students. The platform facilitates academic collaboration, study group formation, resource sharing, and student networking in a secure, education-focused environment.

## Team Members
- **Yerassyl Ibrayev** (Group: SE-2425) - Backend Lead & Database Implementation
- **Dayana Kulmagambetova** (Group: SE-2425) - Frontend Developer & UI/UX Design
- **Akbota Aitmukasheva** (Group: SE-2425) - Database Architect & SQLite Integration

## Project Topic Explanation
Traditional social networks aren't optimized for academic collaboration. StudyConnect addresses this gap by providing tools specifically designed for student needs: course-based networking, study material sharing, group project coordination, and academic event planning. The platform prioritizes privacy and verified student identities to create a trusted environment.

## Installation & Run Instructions

### Prerequisites
- Node.js
- npm

### Installation
```bash
# Clone and install dependencies
npm install

# Start the server
npm start

# For development with auto-reload
npm run dev
```

Server runs at: `http://localhost:3000`

## Database Integration (Assignment 2 - Part 2)

### Database Used: SQLite
- **File**: `studyconnect.db` (auto-generated in `database/` folder)
- **Auto-initialization**: Database and tables created on server startup
- **Sample Data**: 5 sample posts seeded automatically

### Database Schema

#### Posts Table (Main Entity)
```sql
CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    likes INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT 1
)
```

#### Students Table (Future Expansion)
```sql
CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    group_name TEXT,
    year INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## API Routes (CRUD Operations)

### Posts API Endpoints

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| GET | `/api/posts` | Get all posts (with filtering) | 200, 500 |
| GET | `/api/posts/:id` | Get single post by ID | 200, 400, 404, 500 |
| POST | `/api/posts` | Create new post | 201, 400, 500 |
| PUT | `/api/posts/:id` | Update existing post | 200, 400, 404, 500 |
| DELETE | `/api/posts/:id` | Delete post (soft delete) | 200, 400, 404, 500 |
| GET | `/api/posts/categories` | Get all categories with counts | 200, 500 |
| GET | `/api/posts/stats` | Get post statistics | 200, 500 |
| GET | `/api/info` | Project information | 200 |

### Additional Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Home page |
| GET | `/about` | About page |
| GET | `/contact` | Contact form |
| POST | `/contact` | Form submission |
| GET | `/search` | Search page/form |
| GET | `/item/:id` | Item page |
| GET | `/login` | Login page (demo) |
| GET | `/api-docs` | API documentation |
| GET | `/logout` | Logout (demo) |
| GET | `/contact-success` | Success page |

## Assignment Requirements Implementation

### Part 1
- Custom logger middleware (HTTP method + URL)
- Static file serving from `public/` directory
- Query parameter handling (`/search?q=`)
- Route parameter handling (`/item/:id`)
- Form processing with `express.urlencoded()`
- Server-side validation
- JSON responses for API endpoints
- 404 error handling

### Part 2
- **Database Integration**: SQLite with automatic initialization
- **CRUD API**: Full RESTful API for posts entity
- **Validation**: Server-side validation with proper HTTP status codes
- **Error Handling**: JSON error responses for API routes
- **Home Page Update**: Added API test links
- **404 Handling**: Separate handlers for API and regular routes

### Middleware
- `express.urlencoded({ extended: true })` for form parsing
- `express.json()` for API requests
- **Custom logger** that logs HTTP method + URL for every request
- Static file serving from `public/` directory

## API Usage Examples

### Get All Posts
```bash
Invoke-RestMethod -Uri "http://localhost:3000/api/posts" -Method GET
```

### Get Posts with Filtering
```bash
Invoke-RestMethod -Uri "http://localhost:3000/api/posts?category=programming&limit=10" -Method GET
```

### Get Single Post
```bash
Invoke-RestMethod -Uri "http://localhost:3000/api/posts/1" -Method GET
```

### Create New Post
```bash
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/posts" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"title":"New Post","content":"Content here","author":"Author Name"}'
```

### Update Post
```bash
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/posts/1" `
  -Method PUT `
  -ContentType "application/json" `
  -Body '{"title":"Updated Title","likes":50}'
```

### Delete Post
```bash
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/posts/1" `
  -Method DELETE
```

### Get Categories
```bash
Invoke-RestMethod -Uri "http://localhost:3000/api/posts/categories" -Method GET
```

### Get Statistics
```bash
Invoke-RestMethod -Uri "http://localhost:3000/api/posts/stats" -Method GET
```

## Validation Rules

### POST /api/posts
- `title`: Required, 3-200 characters
- `content`: Required, minimum 10 characters
- `author`: Required
- `category`: Optional (default: 'general')

### PUT /api/posts/:id
- At least one field must be provided
- `id` must be a valid positive integer
- `likes` must be a number if provided

### Error Responses
All API errors return JSON:
```json
{
    "success": false,
    "error": "Error message description"
}
```

### HTTP Status Codes Used
- `200 OK` - Successful GET/PUT/DELETE
- `201 Created` - Successful POST
- `400 Bad Request` - Invalid input/missing fields
- `404 Not Found` - Resource does not exist
- `500 Internal Server Error` - Server/database error

## Project Structure
```
social_network/
- database/
-   - db.js              # Database configuration
-   - studyconnect.db    # SQLite database (auto-generated)
- public/
-   - stylesheets/
-   -   - style.css      # CSS styles
- views/
-   - index.html         # Home page
-   - about.html         # About page
-   - contact.html       # Contact form
-   - contact-success.html # Success page
-   - 404.html           # Not found page
-   - api-docs.html      # API documentation
-   - search.html        # Search page
- server.js              # Main Express server
- package.json           # Dependencies
- package-lock.json      # Lock file
- messages.json          # Contact form submissions
- README.md              # This file
```

## Navigation System
- **Logged-out State**: Home, About, Contact, Log in/Sign in button
- **Logged-in State**: Home, About, Contact, Search, API Docs, Exit button
- **Login Demo**: Clicking "Log in/Sign in" enables search and API docs features

## Testing Routes

### Quick Test Links (Added to Home Page)
- View all posts: `/api/posts`
- View post #1: `/api/posts/1`
- View categories: `/api/posts/categories`
- View stats: `/api/posts/stats`
- API Documentation: `/api-docs`
- Search Page: `/search`

### Error Testing
```bash
# Invalid ID (400 Bad Request)
curl http://localhost:3000/api/posts/abc

# Non-existent post (404 Not Found)
curl http://localhost:3000/api/posts/999

# Missing required fields (400 Bad Request)
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Missing Fields"}'
```

## Team Contributions

### Yerassyl Ibrayev (Backend Lead)
- Database design and SQLite integration
- CRUD API development and implementation
- Server configuration and routing architecture
- Error handling and validation systems
- Middleware implementation

### Dayana Kulmagambetova (Frontend Developer)
- UI/UX design and implementation
- Navigation system with login/logout states
- API documentation page design
- Search interface development
- Responsive design and CSS styling

### Akbota Aitmukasheva (Database Architect)
- Database schema design and optimization
- SQLite integration and configuration
- Data modeling and relationships
- Database initialization and seeding
- Data validation and integrity

## Technologies Used
- **Backend**: Node.js, Express.js
- **Database**: SQLite with better-sqlite3 driver
- **Frontend**: HTML5, CSS3, JavaScript, Font Awesome
- **Styling**: CSS Variables, Google Fonts (Inter)
- **Tools**: npm, Git, curl for testing

## Roadmap of Future Steps

### ✅ Week 1-2: Foundation (Completed)
- Express.js server setup and configuration
- Basic routing and page templates
- Contact form with server-side processing
- Query and route parameter handling

### ✅ Week 3-4: Database Integration (Current - Completed)
- SQLite database setup and integration
- CRUD API for posts entity
- Database auto-initialization with sample data
- API documentation and testing interface

### Week 5: User Authentication
- Student registration and login system
- Session management and security
- User profile management
- Role-based access control

### Week 6: Study Groups & Connections
- Create/join study groups functionality
- Add classmates and manage connections
- Group messaging and announcements
- Event scheduling and calendars

### Week 7: Resource Sharing
- File upload system for study materials
- Document sharing and collaboration
- Lecture notes and assignment repository
- Resource rating and commenting

### Week 8: Advanced Features & Deployment
- Real-time chat functionality
- Video call integration for study sessions
- Mobile application development
- Cloud deployment and scaling

## How to Test the Application

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Test API endpoints:**
   ```bash
   # Using curl
   curl http://localhost:3000/api/posts
   
   # Or in browser
   http://localhost:3000/api/posts
   ```

3. **Test navigation flow:**
    - Home page → Click "Log in/Sign in"
    - Access Search and API Docs features
    - Use Exit button to return to logged-out state

4. **Test database operations:**
    - Create, read, update, delete posts via API
    - Check database file: `database/studyconnect.db`
    - Verify data persistence across server restarts

## Contact & Resources
- **GitHub Repository**: https://github.com/Yeras1kAITU/social_network
- **Primary Email**: 242613@astanait.edu.kz
- **Telegram**: https://t.me/yeras1k
- **University**: Astana IT University
- **Course**: Backend Development