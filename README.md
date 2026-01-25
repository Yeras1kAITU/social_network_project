# StudyConnect - Social Network for Students
https://socialnetworkproject-production.up.railway.app/

## Project Description
StudyConnect is a specialized social networking platform designed exclusively for university and college students. The platform facilitates academic collaboration, study group formation, resource sharing, and student networking in a secure, education-focused environment.

## Team Members
- **Yerassyl Ibrayev** (Group: SE-2425) - Backend Lead & Database Implementation
- **Dayana Kulmagambetova** (Group: SE-2425) - Frontend Developer & UI/UX Design
- **Akbota Aitmukasheva** (Group: SE-2425) - Database Architect & MongoDB Integration

## Project Topic Explanation
Traditional social networks aren't optimized for academic collaboration. StudyConnect addresses this gap by providing tools specifically designed for student needs: course-based networking, study material sharing, group project coordination, and academic event planning. The platform prioritizes privacy and verified student identities to create a trusted environment.

## Installation & Run Instructions

### Prerequisites
- Node.js (version 18 or higher)
- npm or yarn
- MongoDB Atlas account (for production) or local MongoDB installation

### Local Development Setup
```bash
# Clone the repository
git clone https://github.com/Yeras1kAITU/social_network_project.git

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env file with your MongoDB connection string

# Start the development server
npm start

# For development with auto-reload
npm run dev
```

Server runs at: `http://localhost:3000`

### Production Deployment
The application is deployed on Railway.app with MongoDB Atlas as the database service.

## Database Integration

### Database Used: MongoDB Atlas
- **Database**: MongoDB (cloud-based)
- **Collection**: `posts` for study materials and discussions
- **Auto-initialization**: Database connection and sample data seeded on server startup

### Database Schema

#### Posts Collection Schema
```javascript
{
    postId: Number,          // Sequential post identifier
    title: String,           // Post title (required)
    content: String,         // Post content (required)
    author: String,          // Author name (required)
    category: String,        // Category (default: 'general')
    likes: Number,           // Number of likes (default: 0)
    created_at: Date,        // Creation timestamp
    updated_at: Date,        // Last update timestamp
    is_published: Boolean    // Publication status (default: true)
}
```

### Environment Variables Configuration

#### Local Development (.env file)
```
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/studyconnect?retryWrites=true&w=majority
NODE_ENV=development
APP_URL=http://localhost:3000
```

#### Production (Railway Environment Variables)
- `PORT`: 3000
- `MONGODB_URI`: MongoDB Atlas connection string
- `NODE_ENV`: production
- `HOST`: 0.0.0.0

## API Routes (CRUD Operations)

### Posts API Endpoints

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| GET | `/api/posts` | Get all posts with filtering options | 200, 500 |
| GET | `/api/posts/:id` | Get single post by ID | 200, 400, 404, 500 |
| POST | `/api/posts` | Create new post | 201, 400, 500 |
| PUT | `/api/posts/:id` | Update existing post | 200, 400, 404, 500 |
| DELETE | `/api/posts/:id` | Delete post (soft delete) | 200, 400, 404, 500 |
| GET | `/api/posts/categories` | Get all categories with post counts | 200, 500 |
| GET | `/api/posts/stats` | Get post statistics and analytics | 200, 500 |
| GET | `/api/health` | Health check endpoint | 200, 500 |
| GET | `/api/info` | Project information and API documentation | 200 |

### Additional Application Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Home page with project overview |
| GET | `/about` | About page with team information |
| GET | `/contact` | Contact form page |
| POST | `/contact` | Contact form submission endpoint |
| GET | `/search` | Search functionality for posts |
| GET | `/crud` | Full CRUD web interface |
| GET | `/api-docs` | Interactive API documentation |
| GET | `/login` | Login demonstration page |
| GET | `/logout` | Logout functionality |
| GET | `/contact-success` | Contact form success page |
| GET | `/status` | Deployment status and health monitoring |

## Assignment Requirements Implementation

### Part 1: Basic Express Server
- Custom logger middleware logging HTTP method and URL for every request
- Static file serving from `public/` directory
- Query parameter handling (`/search?q=query`)
- Route parameter handling (`/item/:id`)
- Form processing with `express.urlencoded({ extended: true })`
- Server-side validation for all inputs
- JSON responses for API endpoints
- Comprehensive 404 error handling

### Part 2: Database Integration
- **MongoDB Integration**: Full connection with MongoDB Atlas
- **CRUD API**: Complete RESTful API for posts entity
- **Validation**: Server-side validation with proper HTTP status codes
- **Error Handling**: Structured JSON error responses for API routes
- **Home Page Update**: Added API test links and database status
- **404 Handling**: Separate error handlers for API and regular routes

### Part 3: Production Deployment
- **Railway Deployment**: Successfully deployed to production environment
- **Environment Variables**: Proper configuration for production
- **Web Interface**: Full CRUD operations through web UI
- **MongoDB Production**: Database working in production environment
- **Public URL**: Accessible via Railway public URL

### Middleware Implementation
- `express.urlencoded({ extended: true })` for form data parsing
- `express.json()` for JSON request body parsing
- **Custom logger middleware** that logs HTTP method and URL for every request
- Static file serving from `public/` directory
- Error handling middleware for API and web routes

## API Usage Examples

### Get All Posts with Filtering
```bash
curl "http://localhost:3000/api/posts?category=programming&limit=5&sortBy=created_at&sortOrder=desc"
```

### Get Single Post
```bash
curl "http://localhost:3000/api/posts/1"
```

### Create New Post
```bash
curl -X POST "http://localhost:3000/api/posts" \
  -H "Content-Type: application/json" \
  -d '{"title":"New Study Material","content":"Detailed content here","author":"Test User","category":"programming"}'
```

### Update Existing Post
```bash
curl -X PUT "http://localhost:3000/api/posts/1" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title","likes":25,"category":"updated-category"}'
```

### Delete Post (Soft Delete)
```bash
curl -X DELETE "http://localhost:3000/api/posts/1"
```

### Get Post Statistics
```bash
curl "http://localhost:3000/api/posts/stats"
```

### Health Check
```bash
curl "http://localhost:3000/api/health"
```

## Validation Rules

### POST /api/posts - Create Post
- `title`: Required, 3-200 characters
- `content`: Required, minimum 10 characters
- `author`: Required, non-empty string
- `category`: Optional, defaults to 'general'
- All fields undergo server-side validation

### PUT /api/posts/:id - Update Post
- At least one field must be provided for update
- `id` must be a valid MongoDB ObjectId or numeric postId
- `title`: If provided, 3-200 characters
- `content`: If provided, minimum 10 characters
- `likes`: If provided, must be a valid number

### DELETE /api/posts/:id - Delete Post
- `id` must be a valid MongoDB ObjectId or numeric postId
- Soft delete implementation (sets `is_published: false`)

### Error Response Format
All API errors return consistent JSON format:
```json
{
    "success": false,
    "error": "Descriptive error message",
    "timestamp": "2024-01-25T10:30:00.000Z"
}
```

### HTTP Status Codes
- `200 OK` - Successful GET, PUT, DELETE operations
- `201 Created` - Successful resource creation (POST)
- `400 Bad Request` - Invalid input data or missing required fields
- `404 Not Found` - Requested resource does not exist
- `500 Internal Server Error` - Server or database error

## Web Interface Features

### CRUD Operations Interface (`/crud`)
- **Create**: Form for adding new study posts
- **Read**: Display all posts in organized table format
- **Update**: Edit functionality for existing posts
- **Delete**: Remove posts with confirmation
- **Search**: Filter posts by title, author, or category
- **Real-time Updates**: Dynamic data loading without page refresh

### Search Functionality (`/search`)
- Full-text search across post titles, content, authors, and categories
- Results displayed in card format with relevant information
- Search suggestions and popular search tags

### User Interface Features
- Responsive design for mobile and desktop
- Dark theme optimized for extended study sessions
- Interactive navigation with login state management
- Form validation with user feedback
- Loading states and error handling

## Project Structure
```
social_network/
- database/
-   - mongo.js
- public/
-   - stylesheets/
-   -   - style.css      # CSS styles
- views/
-   - index.html           # Home page
-   - about.html           # About page
-   - contact.html         # Contact form
-   - contact-success.html # Success page
-   - 404.html             # Not found page
-   - api-docs.html        # API documentation
-   - search.html          # Search page
-   - login.html           # Login demonstration
-   - api-docs.html        # API documentation
- .env.example              # Environment variables template
- .gitignore                # Git ignore configuration
- package.json              # Dependencies and scripts
- server.js                 # Main Express application
- railway.json              # Railway deployment configuration
- nixpacks.toml             # Build configuration
- README.md                 # Project documentation
```

## Navigation System

### Logged-out State
- Home: Project overview and features
- About: Team information and project details
- Contact: Contact form for inquiries
- Log in/Sign in: Demo login button

### Logged-in State
- Home: Project overview
- About: Team information
- Contact: Contact form
- Search: Post search functionality
- CRUD: Full database management interface
- API Docs: API documentation
- Exit: Logout functionality

### Login Demonstration
Clicking "Log in/Sign in" enables additional features including Search and API Docs access, demonstrating role-based navigation.

## Testing and Quality Assurance

### Automated Testing
- Health check endpoint for monitoring
- Database connection verification
- API endpoint validation

### Manual Testing Routes
- View all posts: `/api/posts`
- Test single post: `/api/posts/1`
- Check categories: `/api/posts/categories`
- View statistics: `/api/posts/stats`
- API Documentation: `/api-docs`
- Search Interface: `/search`
- CRUD Interface: `/crud`

### Error Testing Scenarios
```bash
# Invalid post ID format
curl "http://localhost:3000/api/posts/invalid-id"

# Non-existent post
curl "http://localhost:3000/api/posts/9999"

# Missing required fields
curl -X POST "http://localhost:3000/api/posts" \
  -H "Content-Type: application/json" \
  -d '{"title":"Incomplete Post"}'

# Invalid update data
curl -X PUT "http://localhost:3000/api/posts/1" \
  -H "Content-Type: application/json" \
  -d '{"likes":"not-a-number"}'
```

## Team Contributions

### Yerassyl Ibrayev (Backend Lead)
- MongoDB database design and integration
- Complete CRUD API development and implementation
- Express server configuration and routing architecture
- Error handling and validation systems
- Middleware implementation and production deployment
- Railway configuration and environment management

### Dayana Kulmagambetova (Frontend Developer)
- User interface design and implementation
- Navigation system with state management
- API documentation interface
- Search functionality and user experience
- Responsive CSS design and styling
- Form design and validation feedback

### Akbota Aitmukasheva (Database Architect)
- MongoDB schema design and optimization
- Database connection management and error handling
- Data modeling and relationship design
- Database initialization and sample data seeding
- Data validation and integrity enforcement
- Production database configuration

## Technologies Used

### Backend Technologies
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with MongoDB Atlas
- **Environment Management**: dotenv

### Frontend Technologies
- **Markup**: HTML5
- **Styling**: CSS3 with CSS Custom Properties
- **Scripting**: Vanilla JavaScript
- **Icons**: Font Awesome
- **Fonts**: Google Fonts (Inter)

### Development and Deployment
- **Version Control**: Git
- **Package Manager**: npm
- **Deployment Platform**: Railway.app
- **Database Hosting**: MongoDB Atlas
- **Build Tool**: Nixpacks

### Development Tools
- **Code Editor**: Intellij IDEA
- **API Testing**: curl, browser developer tools
- **Database Management**: MongoDB Compass
- **Version Control**: GitHub

## Production Deployment Details

### Deployment Platform: Railway.app
- **URL**: Accessible via Railway-generated public URL
- **Environment**: Production with optimized settings
- **Scaling**: Automatic scaling based on demand
- **Logs**: Comprehensive logging and monitoring
- **Uptime**: High availability deployment

### Database: MongoDB Atlas
- **Service**: Fully managed MongoDB service
- **Region**: Global deployment with optimal latency
- **Backup**: Automatic backups and point-in-time recovery
- **Security**: Encryption at rest and in transit
- **Monitoring**: Performance insights and alerts

### Environment Configuration
- **PORT**: Set by Railway (3000)
- **MONGODB_URI**: Secure connection string from MongoDB Atlas
- **NODE_ENV**: production
- **HOST**: 0.0.0.0 (required for Railway compatibility)

## How to Test the Application

### Local Development Testing
1. **Start the development server:**
   ```bash
   npm start
   ```

2. **Test API endpoints:**
   ```bash
   # Using curl
   curl http://localhost:3000/api/posts
   
   # Or in web browser
   http://localhost:3000/api/posts
   ```

3. **Test web interface:**
    - Navigate to `http://localhost:3000/`
    - Click "Log in/Sign in" to enable all features
    - Test CRUD operations at `http://localhost:3000/crud`
    - Test search functionality at `http://localhost:3000/search`

4. **Test database operations:**
    - Create, read, update, delete posts via web interface
    - Verify data persistence across server restarts
    - Test error scenarios and validation

### Production Testing
1. **Access the live deployment:**
    - Open the Railway public URL in browser

2. **Verify functionality:**
    - Home page loads correctly
    - CRUD interface works with real database
    - Search functionality returns results
    - API endpoints respond correctly

3. **Health monitoring:**
    - Check `/api/health` for system status
    - Verify database connection is active
    - Monitor application logs in Railway dashboard

## Security Considerations

### Environment Security
- **No hardcoded secrets**: All credentials in environment variables
- **.gitignore configuration**: Prevents accidental credential commits
- **Production secrets**: Managed via Railway environment variables
- **Local development**: Uses .env file excluded from version control

### Database Security
- **MongoDB Atlas security**: Built-in security features
- **Connection encryption**: TLS/SSL encrypted connections
- **Access control**: IP whitelisting and user authentication
- **Credential rotation**: Regular credential updates

### Application Security
- **Input validation**: All user inputs validated server-side
- **Error handling**: Generic error messages in production
- **CORS configuration**: Appropriate cross-origin settings
- **Rate limiting**: Implemented for API endpoints

## Performance Optimizations

### Database Optimization
- **Indexing**: Appropriate indexes for frequently queried fields
- **Connection pooling**: Efficient database connection management
- **Query optimization**: Optimized MongoDB queries

### Application Optimization
- **Middleware efficiency**: Optimized middleware chain
- **Static file serving**: Efficient static asset delivery
- **Response caching**: Appropriate caching headers

### Deployment Optimization
- **Build optimization**: Efficient build process
- **Resource allocation**: Appropriate resource limits
- **Monitoring**: Performance monitoring and alerting

## Future Enhancements

### Planned Features
1. **User Authentication**: Real user registration and login
2. **Study Groups**: Collaborative group functionality
3. **File Uploads**: Study material file sharing
4. **Real-time Chat**: Integrated messaging system
5. **Notifications**: Event and update notifications
6. **Mobile Application**: Native mobile app versions

### Technical Improvements
1. **API Versioning**: Versioned API endpoints
2. **Testing Suite**: Comprehensive unit and integration tests
3. **API Documentation**: OpenAPI/Swagger documentation
4. **Continuous Integration**: Automated testing and deployment
5. **Performance Monitoring**: Advanced performance analytics

## Contact Information & Resources

### Primary Contact
- **Email**: 242613@astanait.edu.kz
- **Telegram**: https://t.me/yeras1k
- **GitHub**: https://github.com/Yeras1kAITU

### Project Resources
- **GitHub Repository**: https://github.com/Yeras1kAITU/social_network_project
- **Live Deployment**: https://socialnetworkproject-production.up.railway.app/
- **API Documentation**: `/api-docs` on deployed application
- **Team Information**: `/about` on deployed application

### Academic Information
- **University**: Astana IT University
- **Course**: Backend Development
- **Group**: SE-2425
- **Academic Year**: 2025-2026

## License and Acknowledgments

### License
This project is developed for educational purposes as part of the Backend Development course at Astana IT University.

### Acknowledgments
- **Course Instructors**: For guidance and project requirements
- **MongoDB**: For providing MongoDB Atlas for educational use
- **Railway**: For deployment platform and resources
- **Team Members**: For collaborative development effort
