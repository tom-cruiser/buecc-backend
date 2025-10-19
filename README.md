# IN THE BACKEND

## FOR POSTMAN URL:

### FOR THE ADMIN

| Method | Endpoint             | Description                 |
| ------ | -------------------- | --------------------------- |
| POST   | `/api/auth/register` | Register admin (if enabled) |
| POST   | `/api/auth/login`    | Login admin and get token   |

### FOR THE PROPERTY

| Method | Endpoint              | Description         |
| ------ | --------------------- | ------------------- |
| POST   | `/api/properties`     | Create new property |
| GET    | `/api/properties`     | Get all properties  |
| GET    | `/api/properties/:id` | Get property by ID  |
| PUT    | `/api/properties/:id` | Update property     |
| DELETE | `/api/properties/:id` | Delete property     |

### FOR THE INQUIRY ROUTES

| Method | Endpoint             | Description                    |
| ------ | -------------------- | ------------------------------ |
| POST   | `/api/inquiries`     | Submit inquiry (Public)        |
| GET    | `/api/inquiries`     | Get all inquiries (Admin only) |
| DELETE | `/api/inquiries/:id` | Delete inquiry (Admin only)    |

### FOR THE CONTACT FORM ROUTE

| Method | Endpoint       | Description                 |
| ------ | -------------- | --------------------------- |
| POST   | `/api/contact` | Submit general contact form |

### FOR THE IMAGE

| Method | Endpoint                                          | Description                         |
| ------ | ------------------------------------------------- | ----------------------------------- |
| POST   | `/api/upload`                                     | Upload property images (Cloudinary) |
| POST   | `/api/properties/60c72b2f9f1b2c001c8c4a02/images` | Upload photo using Postman          |
