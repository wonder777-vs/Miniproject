const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv'); // Add dotenv for environment variables

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000; // Use environment variable for port
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'; // Use environment variable for frontend URL

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Comprehensive CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // List of allowed origins
        const allowedOrigins = [
            frontendUrl,
            'http://localhost:3000',
            'http://localhost:5000',
            'http://127.0.0.1:5500',
            'https://your-frontend.netlify.app',  // Add your Netlify URL here
            /\.netlify\.app$/,  // Allow all Netlify subdomains
            /\.vercel\.app$/    // Allow all Vercel subdomains
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('Origin not allowed by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight requests for all routes

app.use(express.static(__dirname));

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// MongoDB Atlas Connection - Use environment variable
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://admin:admin@cluster0.kdgkues.mongodb.net/mepco_erp?retryWrites=true&w=majority&appName=Cluster0')
.then(() => {
    console.log('✅ Connected to MongoDB Atlas successfully');
    console.log(`🚀 Server running at http://localhost:${port}/`);
    console.log(`🌐 Frontend URL: ${frontendUrl}`);
})
.catch(err => {
    console.error('❌ MongoDB Atlas Connection Error:', err);
    process.exit(1);
});

// Define all models BEFORE using them in routes
const userSchema = new mongoose.Schema({
    username: String,
    password: String
});

const Users = mongoose.model("userlogin", userSchema);

// Add System Settings Schema
const settingsSchema = new mongoose.Schema({
    institutionName: String,
    academicYear: String,
    semester: String,
    timezone: String,
    startDate: Date,
    endDate: Date,
    logo: String,
    userSettings: {
        allowRegistration: Boolean,
        defaultRole: String
    },
    academicSettings: {
        gradingSystem: String,
        attendanceThreshold: Number
    },
    notificationSettings: {
        emailNotifications: Boolean,
        smsNotifications: Boolean,
        pushNotifications: Boolean
    }
});

const Settings = mongoose.model("Settings", settingsSchema);

// Student model definition with assignedStaff field
const studentSchema = new mongoose.Schema({
    name: String,
    gender: String,
    dob: String,
    phone: String,
    email: String,
    bloodgroup: String,
    religion: String,
    admissionno: String,
    rollno: String,
    registerno: String,
    aadharno: String,
    applicationno: String,
    emisno: String,
    department: String,
    address: String,
    umisno: String,
    tweleve: String,
    sslc: String,
    father: String,
    mother: String,
    parentcontact: String,
    hostel: String,
    course: String,
    year: String,
    scholarship: String,
    status: String,
    assignedStaff: { type: String, default: "" } // Add this field to track assigned staff
});

const Student = mongoose.model("Student", studentSchema);

// Faculty model definition
const facultySchema = new mongoose.Schema({
    name: String,
    gender: String,
    dob: String,
    email: String,
    phone: String,
    address: String,
    department: String,
    designation: String,
    id: String,
    education: String,
    experience: String,
    publications: String,
    grants: String,
    courses: String,
    performance: String,
    status: String
});

const Faculty = mongoose.model("Faculty", facultySchema);

// Course model definition
const CourseSchema = new mongoose.Schema({
    id: String,
    name: String,
    dept: String,
    credits: Number,
    duration: String,
    status: String,
    assessments: String
});

const Course = mongoose.model("Course", CourseSchema);

// Exam model
const examSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    date: { type: String, required: true },
    totalMarks: { type: Number, required: true },
    duration: { type: Number, required: true },
    marks: {
        type: Map,
        of: Number,
        default: {}
    },
    createdAt: { type: Date, default: Date.now }
});

const Exam = mongoose.model("Exam", examSchema);

// Attendance model
const attendanceSchema = new mongoose.Schema({
    date: {
        type: String,
        required: true
    },
    period: {
        type: String,
        required: true
    },
    records: {
        type: Map,
        of: Boolean,
        required: true
    },
    staffId: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Attendance = mongoose.model("Attendance", attendanceSchema);

// Marks model
const marksSchema = new mongoose.Schema({
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    marks: {
        type: Map,
        of: Number,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Marks = mongoose.model("Marks", marksSchema);

// Leave Request model
const leaveRequestSchema = new mongoose.Schema({
    rollNo: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    days: {
        type: Number,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const LeaveRequest = mongoose.model("LeaveRequest", leaveRequestSchema);

// Subject model
const subjectSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    department: String,
    credits: Number,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Subject = mongoose.model("Subject", subjectSchema);

// Fee model definition
const FeeSchema = new mongoose.Schema({
    receipt: String,
    name: String,
    roll: String,
    course: String,
    amount: Number,
    date: String,
    status: String
});

const Fee = mongoose.model("Fee", FeeSchema);

// Internal Marks Schema
const internalMarksSchema = new mongoose.Schema({
    examId: { type: String, required: true },
    examType: { type: String, required: true, enum: ['CAT1', 'CAT2', 'CAT3', 'Special', 'Model', 'Assignment'] },
    subject: { type: String, required: true },
    date: { type: String, required: true },
    maxMarks: { type: Number, required: true },
    duration: { type: Number, required: true },
    marks: [{
        admissionNo: { type: String, required: true },
        marksObtained: { type: Number },
        percentage: { type: Number }
    }],
    staffId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const InternalMarks = mongoose.model("InternalMarks", internalMarksSchema);

// University Marks Schema
const universityMarksSchema = new mongoose.Schema({
    admissionNo: { type: String, required: true },
    semester: { type: String, required: true },
    subjectCode: { type: String, required: true },
    subjectName: { type: String, required: true },
    internalMark: { type: Number, required: true },
    externalMark: { type: Number, required: true },
    total: { type: Number, required: true },
    result: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const UniversityMarks = mongoose.model("UniversityMarks", universityMarksSchema);

// Grade model
const gradeSchema = new mongoose.Schema({
    admissionNo: { type: String, required: true },
    subject: { type: String, required: true },
    grade: { type: String, required: true },
    semester: { type: String, required: true },
    academicYear: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Grade = mongoose.model("Grade", gradeSchema);

// Document Schema
const documentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: String, required: true },
    date: { type: String, required: true },
    filePath: { type: String, required: true },
    uploadedBy: { type: String, required: true },
    uploadedByType: { type: String, required: true, enum: ['staff', 'admin'] },
    createdAt: { type: Date, default: Date.now }
});

const Document = mongoose.model("Document", documentSchema);

// Now define routes after models are defined
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/post', async (req, res) => {
    const { username, password } = req.body;
    const user = new Users({
        username,
        password
    });
    await user.save();
    console.log(user);

    if (username === "admin" && password === "admin") {
        res.redirect('/adminlead.html');
    } else if (username.startsWith("19")) {
        // Check if student exists in the database
        try {
            const student = await Student.findOne({ admissionno: username });
            if (student) {
                // Student exists, redirect to student dashboard with admission number
                res.redirect(`/student.html?admissionno=${username}`);
            } else {
                // Student not found, redirect to index with error
                res.redirect('/index.html?error=notfound');
            }
        } catch (err) {
            console.error(err);
            res.status(500).send("Internal Server Error");
        }
    } else if (username.startsWith("fa")) {
        res.redirect('/staff.html');
    } else {
        res.status(403).send("Unauthorized user");
    }
});

// Add Settings API endpoints
app.get("/api/settings", async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            // Create default settings if none exist
            settings = new Settings({
                institutionName: "MEPCO Schlenk Engineering College",
                academicYear: "2023-2024",
                semester: "First Semester",
                timezone: "IST",
                startDate: new Date("2023-06-01"),
                endDate: new Date("2024-05-31"),
                logo: "",
                userSettings: {
                    allowRegistration: true,
                    defaultRole: "student"
                },
                academicSettings: {
                    gradingSystem: "10-point",
                    attendanceThreshold: 75
                },
                notificationSettings: {
                    emailNotifications: true,
                    smsNotifications: false,
                    pushNotifications: true
                }
            });
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Error fetching settings", error: err.message });
    }
});

app.put("/api/settings", async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings(req.body);
            await settings.save();
        } else {
            settings = await Settings.findOneAndUpdate({}, req.body, { new: true });
        }
        res.json({ message: "✅ Settings updated!", settings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Error updating settings", error: err.message });
    }
});

// Student APIs
app.get("/students/:id", async (req, res) => {
    try {
        const student = await Student.findOne({ admissionno: req.params.id });
        if (!student) return res.status(404).json({ message: "Student not found" });
        res.json(student);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Error fetching student", error: err.message });
    }
});

app.post("/students", async (req, res) => {
    try {
        const student = new Student(req.body);
        await student.save();
        res.json({ message: "✅ Student saved!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Error saving student", error: err.message });
    }
});

app.get("/students", async (req, res) => {
    try {
        console.log("Fetching students from database...");
        const students = await Student.find();
        console.log(`Found ${students.length} students`);
        res.json(students);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

// Staff API endpoints
app.get('/api/staff/students', async (req, res) => {
    try {
        console.log("Fetching staff students...");
        const students = await Student.find({}).select('admissionno name department rollno email phone gender dob bloodgroup address');
        console.log(`Found ${students.length} students for staff`);
        res.json(students);
    } catch (error) {
        console.error('Error fetching staff students:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

// Get student count for staff
app.get('/api/staff/students/count', async (req, res) => {
    try {
        console.log("Counting staff students...");
        const count = await Student.countDocuments({});
        console.log(`Total students: ${count}`);
        res.json({ count });
    } catch (error) {
        console.error('Error fetching student count:', error);
        res.status(500).json({ error: 'Failed to fetch student count' });
    }
});

// Get student by admission number
app.get('/api/students/:admissionNo', async (req, res) => {
    try {
        console.log(`Fetching student with admission number: ${req.params.admissionNo}`);
        const student = await Student.findOne({ admissionno: req.params.admissionNo });
        if (!student) {
            console.log('Student not found');
            return res.status(404).json({ error: 'Student not found' });
        }
        res.json(student);
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({ error: 'Failed to fetch student details' });
    }
});

// NEW: Get assigned staff for a student
app.get('/api/student/:admissionno/assigned-staff', async (req, res) => {
    try {
        const student = await Student.findOne({ admissionno: req.params.admissionno });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        if (!student.assignedStaff) {
            return res.status(404).json({ message: "No staff assigned to this student" });
        }

        const staff = await Faculty.findOne({ id: student.assignedStaff });
        if (!staff) {
            return res.status(404).json({ message: "Assigned staff not found" });
        }

        res.json(staff);
    } catch (err) {
        console.error("Error fetching assigned staff:", err);
        res.status(500).json({ message: "❌ Error fetching assigned staff", error: err.message });
    }
});

// Attendance routes
app.get('/api/attendance', async (req, res) => {
    try {
        const { date, period } = req.query;
        console.log(`Fetching attendance for date: ${date}, period: ${period}`);
        const query = {};
        if (date) query.date = date;
        if (period) query.period = period;
        const attendance = await Attendance.find(query);
        console.log(`Found ${attendance.length} attendance records`);
        res.json(attendance);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
});

app.post('/api/attendance', async (req, res) => {
    try {
        const { date, period, records, staffId } = req.body;
        console.log(`Saving attendance for date: ${date}, period: ${period}`);
        console.log('Records:', records);
        
        // Validate required fields
        if (!date || !period || !records || !staffId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const attendance = new Attendance({
            date,
            period,
            records,
            staffId
        });
        await attendance.save();
        console.log('Attendance saved successfully');
        res.json({ message: 'Attendance saved successfully', attendance });
    } catch (error) {
        console.error('Error saving attendance:', error);
        res.status(500).json({ error: 'Failed to save attendance' });
    }
});

// Exam routes
app.get('/api/exams', async (req, res) => {
    try {
        console.log('Fetching all exams');
        const exams = await Exam.find({});
        console.log(`Found ${exams.length} exams`);
        res.json(exams);
    } catch (error) {
        console.error('Error fetching exams:', error);
        res.status(500).json({ error: 'Failed to fetch exams' });
    }
});

app.get('/api/exams/:id', async (req, res) => {
    try {
        console.log(`Fetching exam with ID: ${req.params.id}`);
        const exam = await Exam.findOne({ id: req.params.id });
        if (!exam) {
            console.log('Exam not found');
            return res.status(404).json({ error: 'Exam not found' });
        }
        res.json(exam);
    } catch (error) {
        console.error('Error fetching exam:', error);
        res.status(500).json({ error: 'Failed to fetch exam details' });
    }
});

app.post('/api/exams', async (req, res) => {
    try {
        console.log('Creating new exam:', req.body);
        
        // Validate required fields
        const { id, name, subject, date, totalMarks, duration } = req.body;
        if (!id || !name || !subject || !date || !totalMarks || !duration) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const exam = new Exam(req.body);
        await exam.save();
        console.log('Exam created successfully');
        res.status(201).json(exam);
    } catch (error) {
        console.error('Error creating exam:', error);
        
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Exam with this ID already exists' });
        }
        
        res.status(500).json({ error: 'Failed to create exam' });
    }
});

app.get('/api/exams/:id/marks', async (req, res) => {
    try {
        console.log(`Fetching marks for exam ID: ${req.params.id}`);
        const marks = await Marks.find({ examId: req.params.id });
        console.log(`Found marks records: ${marks.length}`);
        res.json(marks);
    } catch (error) {
        console.error('Error fetching exam marks:', error);
        res.status(500).json({ error: 'Failed to fetch marks' });
    }
});

app.post('/api/exams/:id/marks', async (req, res) => {
    try {
        console.log(`Saving marks for exam ID: ${req.params.id}`);
        const marks = new Marks({
            examId: req.params.id,
            ...req.body
        });
        await marks.save();
        console.log('Marks saved successfully');
        res.status(201).json(marks);
    } catch (error) {
        console.error('Error saving marks:', error);
        res.status(500).json({ error: 'Failed to save marks' });
    }
});

// Leave request routes
app.get('/api/leave-requests', async (req, res) => {
    try {
        const { students } = req.query;
        console.log(`Fetching leave requests for students: ${students}`);
        const query = students ? { rollNo: { $in: students.split(',') } } : {};
        const leaveRequests = await LeaveRequest.find(query).sort({ date: -1 });
        console.log(`Found ${leaveRequests.length} leave requests`);
        res.json(leaveRequests);
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
});

app.patch('/api/leave-requests/:id', async (req, res) => {
    try {
        const { status } = req.body;
        console.log(`Updating leave request ${req.params.id} status to: ${status}`);
        const leaveRequest = await LeaveRequest.findByIdAndUpdate(
            req.params.id,
            { $set: { status } },
            { new: true }
        );
        if (!leaveRequest) {
            console.log('Leave request not found');
            return res.status(404).json({ error: 'Leave request not found' });
        }
        console.log('Leave request updated successfully');
        res.json(leaveRequest);
    } catch (error) {
        console.error('Error updating leave request:', error);
        res.status(500).json({ error: 'Failed to update leave request' });
    }
});

// Subject routes
app.get('/api/subjects/count', async (req, res) => {
    try {
        console.log('Counting subjects');
        const count = await Subject.countDocuments({});
        console.log(`Total subjects: ${count}`);
        res.json({ count });
    } catch (error) {
        console.error('Error fetching subject count:', error);
        res.status(500).json({ error: 'Failed to fetch subject count' });
    }
});

// Update student
app.put("/students/:id", async (req, res) => {
    try {
        const student = await Student.findOneAndUpdate(
            { admissionno: req.params.id },
            req.body,
            { new: true }
        );
        if (!student) return res.status(404).json({ message: "Student not found" });
        res.json({ message: "✅ Student updated!", student });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Error updating student", error: err.message });
    }
});

// Delete student
app.delete("/students/:id", async (req, res) => {
    try {
        const student = await Student.findOneAndDelete({ admissionno: req.params.id });
        if (!student) return res.status(404).json({ message: "Student not found" });
        res.json({ message: "🗑️ Student deleted!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Error deleting student", error: err.message });
    }
});

// Add this endpoint after your existing routes
app.get("/api/student/:admissionno", async (req, res) => {
    try {
        const student = await Student.findOne({ admissionno: req.params.admissionno });
        if (!student) return res.status(404).json({ message: "Student not found" });
        res.json(student);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Error fetching student", error: err.message });
    }
});

// Faculty APIs
app.post("/faculty", async (req, res) => {
    try {
        const faculty = new Faculty(req.body);
        await faculty.save();
        res.json({ message: "✅ Faculty saved!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Error saving faculty", error: err.message });
    }
});

// Get all faculties
app.get("/faculty", async (req, res) => {
    try {
        const faculties = await Faculty.find();
        res.json(faculties);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Error fetching faculties", error: err.message });
    }
});

app.put("/faculty/:id", async (req, res) => {
    try {
        const faculty = await Faculty.findOneAndUpdate(
            { id: req.params.id },
            req.body,
            { new: true }
        );
        if (!faculty) return res.status(404).json({ message: "Faculty not found" });
        res.json({ message: "✅ Faculty updated!", faculty });
    } catch (err) {
        res.status(500).json({ message: "❌ Error updating faculty", error: err.message });
    }
});

app.delete("/faculty/:id", async (req, res) => {
    try {
        const faculty = await Faculty.findOneAndDelete({ id: req.params.id });
        if (!faculty) return res.status(404).json({ message: "Faculty not found" });
        res.json({ message: "🗑 Faculty deleted!" });
    } catch (err) {
        res.status(500).json({ message: "❌ Error deleting faculty", error: err.message });
    }
});

// Course APIs
app.get("/courses", async (req, res) => {
    try {
        const courses = await Course.find();
        res.json(courses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Error fetching courses", error: err.message });
    }
});

// POST a new course
app.post("/courses", async (req, res) => {
    try {
        const course = new Course(req.body);
        await course.save();
        res.json({ message: "✅ Course saved!", course });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Error saving course", error: err.message });
    }
});

// PUT (update) a course
app.put("/courses/:id", async (req, res) => {
    try {
        const updated = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ message: "Course not found" });
        res.json({ message: "✅ Course updated!", course: updated });
    } catch (err) {
        res.status(500).json({ message: "❌ Error updating course", error: err.message });
    }
});

// DELETE a course
app.delete("/courses/:id", async (req, res) => {
    try {
        const deleted = await Course.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Course not found" });
        res.json({ message: "🗑️ Course deleted!" });
    } catch (err) {
        res.status(500).json({ message: "❌ Error deleting course", error: err.message });
    }
});

// Fee APIs
// GET all fees
app.get("/fees", async (req, res) => {
    try {
        const fees = await Fee.find();
        res.json(fees);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Error fetching fees", error: err.message });
    }
});

// POST a new fee
app.post("/fees", async (req, res) => {
    try {
        const fee = new Fee(req.body);
        await fee.save();
        res.json({ message: "✅ Fee record saved!", fee });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Error saving fee record", error: err.message });
    }
});

// PUT (update) a fee
app.put("/fees/:id", async (req, res) => {
    try {
        const updated = await Fee.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ message: "Fee record not found" });
        res.json({ message: "✅ Fee record updated!", fee: updated });
    } catch (err) {
        res.status(500).json({ message: "❌ Error updating fee record", error: err.message });
    }
});

// DELETE a fee
app.delete("/fees/:id", async (req, res) => {
    try {
        const deleted = await Fee.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Fee record not found" });
        res.json({ message: "🗑️ Fee record deleted!" });
    } catch (err) {
        res.status(500).json({ message: "❌ Error deleting fee record", error: err.message });
    }
});

// Student Dashboard - Internal Marks API
app.get("/api/internal-marks/:admissionno", async (req, res) => {
    try {
        const { admissionno } = req.params;
        const { catType } = req.query;
        
        let query = { 'marks.admissionNo': admissionno };
        if (catType) {
            query.examType = catType;
        }
        
        const internalMarks = await InternalMarks.find(query);
        
        // Transform data to match frontend expectations
        const transformedData = {};
        
        internalMarks.forEach(mark => {
            if (!transformedData[mark.examType]) {
                transformedData[mark.examType] = [];
            }
            
            mark.marks.forEach(studentMark => {
                if (studentMark.admissionNo === admissionno) {
                    transformedData[mark.examType].push({
                        subject: mark.subject,
                        marks: studentMark.marksObtained,
                        maxMarks: mark.maxMarks,
                        percentage: studentMark.percentage
                    });
                }
            });
        });
        
        res.json(transformedData);
    } catch (err) {
        console.error("Error fetching internal marks:", err);
        res.status(500).json({ message: "❌ Error fetching internal marks", error: err.message });
    }
});

// Student Dashboard - University Marks API
app.get("/api/university-marks/:admissionno", async (req, res) => {
    try {
        const universityMarks = await UniversityMarks.find({ admissionNo: req.params.admissionno });
        res.json(universityMarks);
    } catch (err) {
        console.error("Error fetching university marks:", err);
        res.status(500).json({ message: "❌ Error fetching university marks", error: err.message });
    }
});

// Student Dashboard - Documents API
app.get("/api/documents/:admissionno", async (req, res) => {
    try {
        // In a real implementation, you might filter documents by department or course
        const documents = await Document.find({ uploadedByType: 'staff' });
        res.json(documents);
    } catch (err) {
        console.error("Error fetching documents:", err);
        res.status(500).json({ message: "❌ Error fetching documents", error: err.message });
    }
});

// NEW: Document download endpoint
app.get('/api/documents/download/:id', async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        // Check if file exists
        if (!fs.existsSync(document.filePath)) {
            return res.status(404).json({ message: "File not found on server" });
        }

        // Set appropriate headers
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${document.name}"`);

        // Stream the file
        const fileStream = fs.createReadStream(document.filePath);
        fileStream.pipe(res);
    } catch (err) {
        console.error("Error downloading document:", err);
        res.status(500).json({ message: "❌ Error downloading document", error: err.message });
    }
});

// Student Dashboard - Leave Application API (FIXED)
app.post("/api/leave/apply", async (req, res) => {
    try {
        const { rollNo, reason, days, date } = req.body;

        // Check for required fields
        if (!rollNo || !reason || !days || !date) {
            return res.status(400).json({ 
                message: "Missing required fields", 
                required: ["rollNo", "reason", "days", "date"],
                received: req.body 
            });
        }

        const leaveRequest = new LeaveRequest({
            rollNo,
            reason,
            days,
            date
        });

        await leaveRequest.save();
        res.json({ message: "✅ Leave application submitted successfully!" });
    } catch (err) {
        console.error("Error submitting leave application:", err);
        res.status(500).json({ message: "❌ Error submitting leave application", error: err.message });
    }
});

// Staff Dashboard - Statistics API
app.get("/api/dashboard/stats", async (req, res) => {
    try {
        const staffId = req.query.staffId || "default"; // In a real app, get from auth token
        
        // Get students who have attendance records for this staff
        const attendanceRecords = await Attendance.find({ staffId });
        const staffStudents = new Set();
        
        attendanceRecords.forEach(record => {
            // Convert Map to Object to iterate
            const recordsObj = Object.fromEntries(record.records);
            Object.keys(recordsObj).forEach(admissionNo => {
                staffStudents.add(admissionNo);
            });
        });
        
        // Get unique subjects from internal marks
        const internalMarks = await InternalMarks.find({ staffId });
        const uniqueSubjects = new Set();
        
        internalMarks.forEach(mark => {
            uniqueSubjects.add(mark.subject);
        });
        
        // Get total exams for this staff
        const totalExams = await InternalMarks.countDocuments({ staffId });
        
        // Get pending leave requests for this staff
        const pendingLeaves = await LeaveRequest.countDocuments({ 
            staffId, 
            status: 'pending' 
        });
        
        res.json({
            totalStudents: staffStudents.size,
            totalSubjects: uniqueSubjects.size,
            totalExams,
            pendingLeaves
        });
    } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        res.status(500).json({ message: "❌ Error fetching dashboard stats", error: err.message });
    }
});

// Staff Dashboard - Internal Exam Management APIs
app.get("/api/internal-exams", async (req, res) => {
    try {
        const staffId = req.query.staffId || "default"; // In a real app, get from auth token
        const { examType } = req.query;
        
        let query = { staffId };
        if (examType) {
            query.examType = examType;
        }
        
        const exams = await InternalMarks.find(query).sort({ date: -1 });
        res.json(exams);
    } catch (err) {
        console.error("Error fetching internal exams:", err);
        res.status(500).json({ message: "❌ Error fetching internal exams", error: err.message });
    }
});

app.post("/api/internal-exams", async (req, res) => {
    try {
        const exam = new InternalMarks(req.body);
        await exam.save();
        res.json({ message: "✅ Exam created successfully!", exam });
    } catch (err) {
        console.error("Error creating internal exam:", err);
        res.status(500).json({ message: "❌ Error creating internal exam", error: err.message });
    }
});

app.put("/api/internal-exams/:id", async (req, res) => {
    try {
        const exam = await InternalMarks.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        
        if (!exam) return res.status(404).json({ message: "Exam not found" });
        
        res.json({ message: "✅ Exam updated successfully!", exam });
    } catch (err) {
        console.error("Error updating internal exam:", err);
        res.status(500).json({ message: "❌ Error updating internal exam", error: err.message });
    }
});

// Staff Dashboard - Leave Request Management APIs
app.get("/api/leave-requests", async (req, res) => {
    try {
        const staffId = req.query.staffId || "default"; // In a real app, get from auth token
        
        const leaveRequests = await LeaveRequest.find({ staffId }).sort({ date: -1 });
        res.json(leaveRequests);
    } catch (err) {
        console.error("Error fetching leave requests:", err);
        res.status(500).json({ message: "❌ Error fetching leave requests", error: err.message });
    }
});

app.put("/api/leave-requests/:id", async (req, res) => {
    try {
        const { status } = req.body;
        
        const leaveRequest = await LeaveRequest.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        
        if (!leaveRequest) return res.status(404).json({ message: "Leave request not found" });
        
        res.json({ message: `✅ Leave request ${status} successfully!`, leaveRequest });
    } catch (err) {
        console.error("Error updating leave request:", err);
        res.status(500).json({ message: "❌ Error updating leave request", error: err.message });
    }
});

// Staff Dashboard - Document Management APIs
app.post("/api/documents/upload", upload.array('files'), async (req, res) => {
    try {
        const staffId = req.body.staffId || "default"; // In a real app, get from auth token
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "No files uploaded" });
        }
        
        const documents = [];
        
        for (const file of req.files) {
            const document = new Document({
                name: file.originalname,
                type: path.extname(file.originalname).substring(1),
                size: formatFileSize(file.size),
                date: new Date().toISOString().split('T')[0],
                filePath: file.path,
                uploadedBy: staffId,
                uploadedByType: 'staff'
            });
            
            await document.save();
            documents.push(document);
        }
        
        res.json({ message: "✅ Documents uploaded successfully!", documents });
    } catch (err) {
        console.error("Error uploading documents:", err);
        res.status(500).json({ message: "❌ Error uploading documents", error: err.message });
    }
});

app.get("/api/documents", async (req, res) => {
    try {
        const { uploadedBy } = req.query;
        let query = {};
        
        if (uploadedBy) {
            query.uploadedBy = uploadedBy;
        }
        
        const documents = await Document.find(query).sort({ createdAt: -1 });
        res.json(documents);
    } catch (err) {
        console.error("Error fetching documents:", err);
        res.status(500).json({ message: "❌ Error fetching documents", error: err.message });
    }
});

app.delete("/api/documents/:id", async (req, res) => {
    try {
        const document = await Document.findByIdAndDelete(req.params.id);
        
        if (!document) return res.status(404).json({ message: "Document not found" });
        
        // Delete the file from the filesystem
        if (fs.existsSync(document.filePath)) {
            fs.unlinkSync(document.filePath);
        }
        
        res.json({ message: "🗑️ Document deleted successfully!" });
    } catch (err) {
        console.error("Error deleting document:", err);
        res.status(500).json({ message: "❌ Error deleting document", error: err.message });
    }
});

// NEW: Assign student to staff endpoint
app.post("/api/staff/assign-student", async (req, res) => {
    try {
        const { staffId, admissionNo } = req.body;
        
        // Check if staff exists
        const staff = await Faculty.findOne({ id: staffId });
        if (!staff) {
            return res.status(404).json({ message: "Staff not found" });
        }
        
        // Check if student exists
        const student = await Student.findOne({ admissionno: admissionNo });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        // Update student with assigned staff
        student.assignedStaff = staffId;
        await student.save();
        
        res.json({ message: "✅ Student assigned to staff successfully!" });
    } catch (err) {
        console.error("Error assigning student to staff:", err);
        res.status(500).json({ message: "❌ Error assigning student to staff", error: err.message });
    }
});

// Reports APIs

// Generate Excel/PDF reports
app.post("/api/reports/generate", async (req, res) => {
    try {
        const { type, format } = req.body;
        let data = [];
        let fileName = '';

        // Get data based on report type
        switch (type) {
            case 'student':
                data = await Student.find().lean();
                fileName = 'student_report';
                break;
            case 'faculty':
                data = await Faculty.find().lean();
                fileName = 'faculty_report';
                break;
            case 'course':
                data = await Course.find().lean();
                fileName = 'course_report';
                break;
            case 'fee':
                data = await Fee.find().lean();
                fileName = 'fee_report';
                break;
            case 'grades':
                data = await Grade.find().lean();
                fileName = 'grades_report';
                break;
            default:
                throw new Error('Invalid report type');
        }

        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet(type.charAt(0).toUpperCase() + type.slice(1) + ' Report');

            if (data.length > 0) {
                // Add headers
                const headers = Object.keys(data[0]).filter(key => key !== '__v' && key !== '_id');
                worksheet.addRow(headers.map(h => h.charAt(0).toUpperCase() + h.slice(1)));

                // Add data
                data.forEach(item => {
                    const row = headers.map(header => item[header] || '');
                    worksheet.addRow(row);
                });

                // Style the headers
                const headerRow = worksheet.getRow(1);
                headerRow.font = { bold: true };
                headerRow.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE0E0E0' }
                };

                // Adjust column widths
                worksheet.columns.forEach(column => {
                    column.width = Math.max(15, column.header?.length + 5 || 15);
                });
            }

            // Set response headers for Excel
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${fileName}_${Date.now()}.xlsx`);

            // Write to response
            await workbook.xlsx.write(res);
            res.end();

        } else if (format === 'pdf') {
            const doc = new PDFDocument();
            
            // Set response headers for PDF
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${fileName}_${Date.now()}.pdf`);

            // Pipe the PDF to the response
            doc.pipe(res);

            // Add title
            doc.fontSize(16).text(type.charAt(0).toUpperCase() + type.slice(1) + ' Report', {
                align: 'center'
            });
            doc.moveDown();

            if (data.length > 0) {
                // Add headers
                const headers = Object.keys(data[0]).filter(key => key !== '__v' && key !== '_id');
                
                // Add data
                data.forEach((item, index) => {
                    doc.fontSize(12).text(`Record #${index + 1}`, { underline: true });
                    headers.forEach(header => {
                        doc.fontSize(10).text(`${header}: ${item[header] || 'N/A'}`);
                    });
                    doc.moveDown();
                });
            } else {
                doc.fontSize(12).text('No data available', { align: 'center' });
            }

            // Finalize PDF
            doc.end();
        } else {
            throw new Error('Invalid format specified');
        }
    } catch (err) {
        console.error('Report Generation Error:', err);
        res.status(500).json({ 
            message: "Error generating report", 
            error: err.message 
        });
    }
});

// Get student enrollment by department
app.get("/api/reports/enrollment-by-department", async (req, res) => {
    try {
        // Aggregate students by department
        const enrollmentData = await Student.aggregate([
            {
                $group: {
                    _id: "$department",
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    department: "$_id",
                    count: 1,
                    _id: 0
                }
            }
        ]);

        res.json(enrollmentData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Error fetching enrollment data", error: err.message });
    }
});

// Get fee collection overview
app.get("/api/reports/fee-collection", async (req, res) => {
    try {
        // Aggregate fees by status
        const feeData = await Fee.aggregate([
            {
                $group: {
                    _id: "$status",
                    total: { $sum: "$amount" }
                }
            }
        ]);

        // Transform data to the expected format
        const result = {
            collected: 0,
            pending: 0,
            overdue: 0
        };

        feeData.forEach(item => {
            if (item._id.toLowerCase() === "paid") {
                result.collected = item.total;
            } else if (item._id.toLowerCase() === "pending") {
                result.pending = item.total;
            } else if (item._id.toLowerCase() === "overdue") {
                result.overdue = item.total;
            }
        });

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Error fetching fee collection data", error: err.message });
    }
});

// Helper function to get date range query
function getDateRangeQuery(range) {
    const now = new Date();
    let startDate;

    switch (range) {
        case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
        case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
        case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
        case 'quarter':
            startDate = new Date(now.setMonth(now.getMonth() - 3));
            break;
        case 'year':
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
        case 'custom':
            // Handle custom date range from request
            return {}; // Return empty query for now
        default:
            return {};
    }

    return { $gte: startDate };
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});