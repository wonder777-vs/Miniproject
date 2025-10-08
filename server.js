const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const cors = require('cors');
const port = 3000;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use cors middleware for better CORS handling
app.use(cors());

app.use(express.static(__dirname));

mongoose.connect('mongodb+srv://admin:admin@cluster0.kdgkues.mongodb.net/mepco_erp?retryWrites=true&w=majority&appName=Cluster0');

const db = mongoose.connection;
db.once('open', () => {
    console.log("mongodb connect successfully.");
    console.log("http://localhost:3000/");
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

// Student model definition
const Student = mongoose.model("Student", new mongoose.Schema({
    name: String,
    gender: String,
    dob: String,
    phone: String,
    email: String,
    bloodgroup: String,
    religion: String,
    caste: String,
    admissionno: String,
    rollno: String,
    registerno: String,
    aadharno: String,
    applicationno: String,
    emisno: String,
    umisno: String,
    department: String,
    tweleve: String,
    sslc: String,
    father: String,
    mother: String,
    parentcontact: String,
    hostel: String,
    course: String,
    year: String,
    scholarship: String,
    address: String,
    status: String
}));

// Faculty model definition
const Faculty = mongoose.model("Faculty", new mongoose.Schema({
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
}));

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

// Exam model definition
const ExamSchema = new mongoose.Schema({
    examId: { type: String, required: true, unique: true },
    course: { type: String, required: true },
    examDate: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    venue: { type: String, required: true },
    status: { type: String, required: true, enum: ['Scheduled', 'Completed', 'Cancelled'] }
});

const Exam = mongoose.model("Exam", ExamSchema);

// New Attendance model definition
const attendanceSchema = new mongoose.Schema({
    date: { type: String, required: true },
    period: { type: String, required: true },
    records: [{
        admissionNo: { type: String, required: true },
        status: { type: String, required: true, enum: ['present', 'absent'] },
        timestamp: { type: Date, default: Date.now }
    }],
    staffId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Attendance = mongoose.model("Attendance", attendanceSchema);

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

// Student APIs
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
        console.error("Error fetching students:", err);
        res.status(500).json({ message: "❌ Error fetching students", error: err.message });
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

// Exam APIs
// GET all exams
app.get("/exams", async (req, res) => {
    try {
        const exams = await Exam.find();
        res.json(exams);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Error fetching exams", error: err.message });
    }
});

// POST a new exam
app.post("/exams", async (req, res) => {
    try {
        const exam = new Exam(req.body);
        await exam.save();
        res.json({ message: "✅ Exam saved!", exam });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Error saving exam", error: err.message });
    }
});

// PUT (update) an exam
app.put("/exams/:id", async (req, res) => {
    try {
        const updated = await Exam.findOneAndUpdate(
            { examId: req.params.id },
            req.body,
            { new: true }
        );
        if (!updated) return res.status(404).json({ message: "Exam not found" });
        res.json({ message: "✅ Exam updated!", exam: updated });
    } catch (err) {
        res.status(500).json({ message: "❌ Error updating exam", error: err.message });
    }
});

// DELETE an exam
app.delete("/exams/:id", async (req, res) => {
    try {
        const deleted = await Exam.findOneAndDelete({ examId: req.params.id });
        if (!deleted) return res.status(404).json({ message: "Exam not found" });
        res.json({ message: "🗑️ Exam deleted!" });
    } catch (err) {
        res.status(500).json({ message: "❌ Error deleting exam", error: err.message });
    }
});

// New Attendance API
app.post("/attendance", async (req, res) => {
    try {
        const { date, period, records, staffId } = req.body;
        
        // Check if attendance already exists for this date and period
        let attendance = await Attendance.findOne({ date, period });
        
        if (attendance) {
            // Update existing attendance record
            attendance.records = Object.entries(records).map(([admissionNo, status]) => ({
                admissionNo,
                status: status ? 'present' : 'absent',
                timestamp: new Date()
            }));
            attendance.staffId = staffId;
            await attendance.save();
        } else {
            // Create new attendance record
            attendance = new Attendance({
                date,
                period,
                records: Object.entries(records).map(([admissionNo, status]) => ({
                    admissionNo,
                    status: status ? 'present' : 'absent',
                    timestamp: new Date()
                })),
                staffId
            });
            await attendance.save();
        }
        
        console.log(`Attendance saved for ${date}, period: ${period}`);
        res.json({ message: "✅ Attendance saved successfully" });
    } catch (err) {
        console.error("Error saving attendance:", err);
        res.status(500).json({ message: "❌ Error saving attendance", error: err.message });
    }
});

// Get attendance records
app.get("/attendance", async (req, res) => {
    try {
        const { date, period, admissionNo } = req.query;
        let query = {};
        
        if (date) query.date = date;
        if (period) query.period = period;
        if (admissionNo) query['records.admissionNo'] = admissionNo;
        
        const attendance = await Attendance.find(query);
        res.json(attendance);
    } catch (err) {
        console.error("Error fetching attendance:", err);
        res.status(500).json({ message: "❌ Error fetching attendance", error: err.message });
    }
});

// Reports APIs
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

// Generate and download a report
app.post("/api/reports/generate", async (req, res) => {
    try {
        const { reportType, format, dateRange } = req.body;
        
        // Create a temporary directory for reports if it doesn't exist
        const reportsDir = path.join(__dirname, 'reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${reportType}_report_${timestamp}.${format}`;
        const filepath = path.join(reportsDir, filename);
        
        // Generate report based on type and format
        switch (reportType) {
            case 'enrollment':
                await generateEnrollmentReport(format, dateRange, filepath);
                break;
            case 'fees':
                await generateFeesReport(format, dateRange, filepath);
                break;
            case 'attendance':
                await generateAttendanceReport(format, dateRange, filepath);
                break;
            case 'grades':
                await generateGradesReport(format, dateRange, filepath);
                break;
            case 'faculty':
                await generateFacultyReport(format, dateRange, filepath);
                break;
            default:
                return res.status(400).json({ message: "Invalid report type" });
        }
        
        // Send the file for download
        res.download(filepath, filename, (err) => {
            if (err) {
                console.error(err);
                res.status(500).json({ message: "❌ Error downloading report" });
            }
            
            // Delete the file after download
            fs.unlink(filepath, (unlinkErr) => {
                if (unlinkErr) console.error("Error deleting temporary file:", unlinkErr);
            });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Error generating report", error: err.message });
    }
});

// Generate and download all reports as a ZIP file
app.post("/api/reports/generate-all", async (req, res) => {
    try {
        const { format, dateRange } = req.body;
        
        // Create a temporary directory for reports if it doesn't exist
        const reportsDir = path.join(__dirname, 'reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        // Generate timestamp for filenames
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const zipFilename = `all_reports_${timestamp}.zip`;
        const zipPath = path.join(reportsDir, zipFilename);
        
        // Create a ZIP file
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        output.on('close', () => {
            // Send the ZIP file for download
            res.download(zipPath, zipFilename, (err) => {
                if (err) {
                    console.error(err);
                    res.status(500).json({ message: "❌ Error downloading reports" });
                }
                
                // Delete the ZIP file after download
                fs.unlink(zipPath, (unlinkErr) => {
                    if (unlinkErr) console.error("Error deleting temporary ZIP file:", unlinkErr);
                });
            });
        });
        
        archive.on('error', (err) => {
            throw err;
        });
        
        archive.pipe(output);
        
        // Generate and add each report to the ZIP
        const reportTypes = ['enrollment', 'fees', 'attendance', 'grades', 'faculty'];
        
        for (const reportType of reportTypes) {
            const filename = `${reportType}_report_${timestamp}.${format}`;
            const filepath = path.join(reportsDir, filename);
            
            // Generate report based on type and format
            switch (reportType) {
                case 'enrollment':
                    await generateEnrollmentReport(format, dateRange, filepath);
                    break;
                case 'fees':
                    await generateFeesReport(format, dateRange, filepath);
                    break;
                case 'attendance':
                    await generateAttendanceReport(format, dateRange, filepath);
                    break;
                case 'grades':
                    await generateGradesReport(format, dateRange, filepath);
                    break;
                case 'faculty':
                    await generateFacultyReport(format, dateRange, filepath);
                    break;
            }
            
            // Add the generated file to the ZIP
            archive.file(filepath, { name: filename });
            
            // Delete the temporary file
            fs.unlink(filepath, (unlinkErr) => {
                if (unlinkErr) console.error("Error deleting temporary file:", unlinkErr);
            });
        }
        
        archive.finalize();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Error generating reports", error: err.message });
    }
});

// Helper function to generate enrollment report
async function generateEnrollmentReport(format, dateRange, filepath) {
    try {
        // Fetch student data
        const students = await Student.find();
        
        if (format === 'csv') {
            // Generate CSV report
            const csvHeader = 'Name,Email,Department,Course,Year,Status\n';
            const csvContent = students.map(student => 
                `"${student.name}","${student.email}","${student.department}","${student.course}","${student.year}","${student.status}"`
            ).join('\n');
            
            fs.writeFileSync(filepath, csvHeader + csvContent);
        } else if (format === 'excel') {
            // Generate Excel report using exceljs
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Enrollment Report');
            
            // Add header row
            worksheet.columns = [
                { header: 'Name', key: 'name', width: 30 },
                { header: 'Email', key: 'email', width: 30 },
                { header: 'Department', key: 'department', width: 20 },
                { header: 'Course', key: 'course', width: 20 },
                { header: 'Year', key: 'year', width: 10 },
                { header: 'Status', key: 'status', width: 15 }
            ];
            
            // Add data rows
            students.forEach(student => {
                worksheet.addRow({
                    name: student.name,
                    email: student.email,
                    department: student.department,
                    course: student.course,
                    year: student.year,
                    status: student.status
                });
            });
            
            // Style the header row
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD3D3D3' }
            };
            
            // Save the workbook
            await workbook.xlsx.writeFile(filepath);
        } else if (format === 'pdf') {
            // Generate PDF report using pdfkit
            const doc = new PDFDocument({ margin: 30 });
            doc.pipe(fs.createWriteStream(filepath));
            
            // Add title
            doc.fontSize(20).text('Student Enrollment Report', { align: 'center' });
            doc.moveDown();
            
            // Add table header
            doc.fontSize(12).font('Helvetica-Bold');
            const tableTop = doc.y;
            const cellPadding = 5;
            const rowHeight = 20;
            const colWidths = [100, 120, 80, 80, 50, 60];
            const headers = ['Name', 'Email', 'Department', 'Course', 'Year', 'Status'];
            
            // Draw header row
            let x = 50;
            headers.forEach((header, i) => {
                doc.text(header, x, tableTop, { width: colWidths[i], align: 'left' });
                doc.rect(x, tableTop, colWidths[i], rowHeight).stroke();
                x += colWidths[i];
            });
            
            // Draw data rows
            doc.font('Helvetica').fontSize(10);
            let y = tableTop + rowHeight;
            
            students.forEach(student => {
                x = 50;
                
                // Name
                doc.text(student.name || '', x, y + cellPadding, { width: colWidths[0], align: 'left' });
                doc.rect(x, y, colWidths[0], rowHeight).stroke();
                x += colWidths[0];
                
                // Email
                doc.text(student.email || '', x, y + cellPadding, { width: colWidths[1], align: 'left' });
                doc.rect(x, y, colWidths[1], rowHeight).stroke();
                x += colWidths[1];
                
                // Department
                doc.text(student.department || '', x, y + cellPadding, { width: colWidths[2], align: 'left' });
                doc.rect(x, y, colWidths[2], rowHeight).stroke();
                x += colWidths[2];
                
                // Course
                doc.text(student.course || '', x, y + cellPadding, { width: colWidths[3], align: 'left' });
                doc.rect(x, y, colWidths[3], rowHeight).stroke();
                x += colWidths[3];
                
                // Year
                doc.text(student.year || '', x, y + cellPadding, { width: colWidths[4], align: 'left' });
                doc.rect(x, y, colWidths[4], rowHeight).stroke();
                x += colWidths[4];
                
                // Status
                doc.text(student.status || '', x, y + cellPadding, { width: colWidths[5], align: 'left' });
                doc.rect(x, y, colWidths[5], rowHeight).stroke();
                
                y += rowHeight;
                
                // Add a new page if needed
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
            });
            
            // Finalize the PDF
            doc.end();
        }
    } catch (err) {
        console.error("Error generating enrollment report:", err);
        throw err;
    }
}

// Helper function to generate fees report
async function generateFeesReport(format, dateRange, filepath) {
    try {
        // Fetch fee data
        const fees = await Fee.find();
        
        if (format === 'csv') {
            // Generate CSV report
            const csvHeader = 'Receipt No,Student Name,Roll No,Course,Amount,Date,Status\n';
            const csvContent = fees.map(fee => 
                `"${fee.receipt}","${fee.name}","${fee.roll}","${fee.course}",${fee.amount},"${fee.date}","${fee.status}"`
            ).join('\n');
            
            fs.writeFileSync(filepath, csvHeader + csvContent);
        } else if (format === 'excel') {
            // Generate Excel report using exceljs
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Fees Report');
            
            // Add header row
            worksheet.columns = [
                { header: 'Receipt No', key: 'receipt', width: 15 },
                { header: 'Student Name', key: 'name', width: 30 },
                { header: 'Roll No', key: 'roll', width: 15 },
                { header: 'Course', key: 'course', width: 20 },
                { header: 'Amount', key: 'amount', width: 15 },
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Status', key: 'status', width: 15 }
            ];
            
            // Add data rows
            fees.forEach(fee => {
                worksheet.addRow({
                    receipt: fee.receipt,
                    name: fee.name,
                    roll: fee.roll,
                    course: fee.course,
                    amount: fee.amount,
                    date: fee.date,
                    status: fee.status
                });
            });
            
            // Style the header row
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD3D3D3' }
            };
            
            // Format amount column as currency
            worksheet.getColumn('amount').numFmt = '"₹"#,##0.00';
            
            // Save the workbook
            await workbook.xlsx.writeFile(filepath);
        } else if (format === 'pdf') {
            // Generate PDF report using pdfkit
            const doc = new PDFDocument({ margin: 30 });
            doc.pipe(fs.createWriteStream(filepath));
            
            // Add title
            doc.fontSize(20).text('Fee Collection Report', { align: 'center' });
            doc.moveDown();
            
            // Add table header
            doc.fontSize(12).font('Helvetica-Bold');
            const tableTop = doc.y;
            const cellPadding = 5;
            const rowHeight = 20;
            const colWidths = [80, 100, 60, 80, 60, 60, 60];
            const headers = ['Receipt', 'Student', 'Roll', 'Course', 'Amount', 'Date', 'Status'];
            
            // Draw header row
            let x = 50;
            headers.forEach((header, i) => {
                doc.text(header, x, tableTop, { width: colWidths[i], align: 'left' });
                doc.rect(x, tableTop, colWidths[i], rowHeight).stroke();
                x += colWidths[i];
            });
            
            // Draw data rows
            doc.font('Helvetica').fontSize(10);
            let y = tableTop + rowHeight;
            
            fees.forEach(fee => {
                x = 50;
                
                // Receipt
                doc.text(fee.receipt || '', x, y + cellPadding, { width: colWidths[0], align: 'left' });
                doc.rect(x, y, colWidths[0], rowHeight).stroke();
                x += colWidths[0];
                
                // Student Name
                doc.text(fee.name || '', x, y + cellPadding, { width: colWidths[1], align: 'left' });
                doc.rect(x, y, colWidths[1], rowHeight).stroke();
                x += colWidths[1];
                
                // Roll No
                doc.text(fee.roll || '', x, y + cellPadding, { width: colWidths[2], align: 'left' });
                doc.rect(x, y, colWidths[2], rowHeight).stroke();
                x += colWidths[2];
                
                // Course
                doc.text(fee.course || '', x, y + cellPadding, { width: colWidths[3], align: 'left' });
                doc.rect(x, y, colWidths[3], rowHeight).stroke();
                x += colWidths[3];
                
                // Amount
                doc.text(`₹${fee.amount || 0}`, x, y + cellPadding, { width: colWidths[4], align: 'right' });
                doc.rect(x, y, colWidths[4], rowHeight).stroke();
                x += colWidths[4];
                
                // Date
                doc.text(fee.date || '', x, y + cellPadding, { width: colWidths[5], align: 'left' });
                doc.rect(x, y, colWidths[5], rowHeight).stroke();
                x += colWidths[5];
                
                // Status
                doc.text(fee.status || '', x, y + cellPadding, { width: colWidths[6], align: 'left' });
                doc.rect(x, y, colWidths[6], rowHeight).stroke();
                
                y += rowHeight;
                
                // Add a new page if needed
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
            });
            
            // Finalize the PDF
            doc.end();
        }
    } catch (err) {
        console.error("Error generating fees report:", err);
        throw err;
    }
}

// Helper function to generate attendance report
async function generateAttendanceReport(format, dateRange, filepath) {
    try {
        // Fetch attendance data
        const attendance = await Attendance.find();
        
        if (format === 'csv') {
            // Generate CSV report
            const csvHeader = 'Date,Period,Admission No,Status,Timestamp\n';
            let csvContent = '';
            
            attendance.forEach(att => {
                att.records.forEach(record => {
                    csvContent += `"${att.date}","${att.period}","${record.admissionNo}","${record.status}","${record.timestamp}"\n`;
                });
            });
            
            fs.writeFileSync(filepath, csvHeader + csvContent);
        } else if (format === 'excel') {
            // Generate Excel report using exceljs
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Attendance Report');
            
            // Add header row
            worksheet.columns = [
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Period', key: 'period', width: 15 },
                { header: 'Admission No', key: 'admissionNo', width: 15 },
                { header: 'Status', key: 'status', width: 10 },
                { header: 'Timestamp', key: 'timestamp', width: 20 }
            ];
            
            // Add data rows
            attendance.forEach(att => {
                att.records.forEach(record => {
                    worksheet.addRow({
                        date: att.date,
                        period: att.period,
                        admissionNo: record.admissionNo,
                        status: record.status,
                        timestamp: record.timestamp
                    });
                });
            });
            
            // Style the header row
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD3D3D3' }
            };
            
            // Save the workbook
            await workbook.xlsx.writeFile(filepath);
        } else if (format === 'pdf') {
            // Generate PDF report using pdfkit
            const doc = new PDFDocument({ margin: 30 });
            doc.pipe(fs.createWriteStream(filepath));
            
            // Add title
            doc.fontSize(20).text('Attendance Report', { align: 'center' });
            doc.moveDown();
            
            // Add table header
            doc.fontSize(12).font('Helvetica-Bold');
            const tableTop = doc.y;
            const cellPadding = 5;
            const rowHeight = 20;
            const colWidths = [80, 80, 80, 60, 80];
            const headers = ['Date', 'Period', 'Admission No', 'Status', 'Timestamp'];
            
            // Draw header row
            let x = 50;
            headers.forEach((header, i) => {
                doc.text(header, x, tableTop, { width: colWidths[i], align: 'left' });
                doc.rect(x, tableTop, colWidths[i], rowHeight).stroke();
                x += colWidths[i];
            });
            
            // Draw data rows
            doc.font('Helvetica').fontSize(10);
            let y = tableTop + rowHeight;
            
            attendance.forEach(att => {
                att.records.forEach(record => {
                    x = 50;
                    
                    // Date
                    doc.text(att.date || '', x, y + cellPadding, { width: colWidths[0], align: 'left' });
                    doc.rect(x, y, colWidths[0], rowHeight).stroke();
                    x += colWidths[0];
                    
                    // Period
                    doc.text(att.period || '', x, y + cellPadding, { width: colWidths[1], align: 'left' });
                    doc.rect(x, y, colWidths[1], rowHeight).stroke();
                    x += colWidths[1];
                    
                    // Admission No
                    doc.text(record.admissionNo || '', x, y + cellPadding, { width: colWidths[2], align: 'left' });
                    doc.rect(x, y, colWidths[2], rowHeight).stroke();
                    x += colWidths[2];
                    
                    // Status
                    doc.text(record.status || '', x, y + cellPadding, { width: colWidths[3], align: 'left' });
                    doc.rect(x, y, colWidths[3], rowHeight).stroke();
                    x += colWidths[3];
                    
                    // Timestamp
                    doc.text(record.timestamp ? new Date(record.timestamp).toLocaleString() : '', x, y + cellPadding, { width: colWidths[4], align: 'left' });
                    doc.rect(x, y, colWidths[4], rowHeight).stroke();
                    
                    y += rowHeight;
                    
                    // Add a new page if needed
                    if (y > 700) {
                        doc.addPage();
                        y = 50;
                    }
                });
            });
            
            // Finalize the PDF
            doc.end();
        }
    } catch (err) {
        console.error("Error generating attendance report:", err);
        throw err;
    }
}

// Helper function to generate grades report
async function generateGradesReport(format, dateRange, filepath) {
    try {
        // Placeholder for grades report generation
        // In a real implementation, you would fetch grades data
        
        if (format === 'csv') {
            const content = "Grades Report\n\nThis is a placeholder for the grades report.";
            fs.writeFileSync(filepath, content);
        } else if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Grades Report');
            
            worksheet.addRow(['Grades Report']);
            worksheet.addRow(['This is a placeholder for the grades report']);
            
            await workbook.xlsx.writeFile(filepath);
        } else if (format === 'pdf') {
            const doc = new PDFDocument();
            doc.pipe(fs.createWriteStream(filepath));
            
            doc.fontSize(20).text('Grades Report', { align: 'center' });
            doc.moveDown();
            doc.text('This is a placeholder for the grades report');
            
            doc.end();
        }
    } catch (err) {
        console.error("Error generating grades report:", err);
        throw err;
    }
}

// Helper function to generate faculty report
async function generateFacultyReport(format, dateRange, filepath) {
    try {
        // Fetch faculty data
        const faculties = await Faculty.find();
        
        if (format === 'csv') {
            // Generate CSV report
            const csvHeader = 'Name,Email,Department,Designation,Status\n';
            const csvContent = faculties.map(faculty => 
                `"${faculty.name}","${faculty.email}","${faculty.department}","${faculty.designation}","${faculty.status}"`
            ).join('\n');
            
            fs.writeFileSync(filepath, csvHeader + csvContent);
        } else if (format === 'excel') {
            // Generate Excel report using exceljs
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Faculty Report');
            
            // Add header row
            worksheet.columns = [
                { header: 'Name', key: 'name', width: 30 },
                { header: 'Email', key: 'email', width: 30 },
                { header: 'Department', key: 'department', width: 20 },
                { header: 'Designation', key: 'designation', width: 20 },
                { header: 'Status', key: 'status', width: 15 }
            ];
            
            // Add data rows
            faculties.forEach(faculty => {
                worksheet.addRow({
                    name: faculty.name,
                    email: faculty.email,
                    department: faculty.department,
                    designation: faculty.designation,
                    status: faculty.status
                });
            });
            
            // Style the header row
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD3D3D3' }
            };
            
            // Save the workbook
            await workbook.xlsx.writeFile(filepath);
        } else if (format === 'pdf') {
            // Generate PDF report using pdfkit
            const doc = new PDFDocument({ margin: 30 });
            doc.pipe(fs.createWriteStream(filepath));
            
            // Add title
            doc.fontSize(20).text('Faculty Report', { align: 'center' });
            doc.moveDown();
            
            // Add table header
            doc.fontSize(12).font('Helvetica-Bold');
            const tableTop = doc.y;
            const cellPadding = 5;
            const rowHeight = 20;
            const colWidths = [100, 120, 80, 80, 60];
            const headers = ['Name', 'Email', 'Department', 'Designation', 'Status'];
            
            // Draw header row
            let x = 50;
            headers.forEach((header, i) => {
                doc.text(header, x, tableTop, { width: colWidths[i], align: 'left' });
                doc.rect(x, tableTop, colWidths[i], rowHeight).stroke();
                x += colWidths[i];
            });
            
            // Draw data rows
            doc.font('Helvetica').fontSize(10);
            let y = tableTop + rowHeight;
            
            faculties.forEach(faculty => {
                x = 50;
                
                // Name
                doc.text(faculty.name || '', x, y + cellPadding, { width: colWidths[0], align: 'left' });
                doc.rect(x, y, colWidths[0], rowHeight).stroke();
                x += colWidths[0];
                
                // Email
                doc.text(faculty.email || '', x, y + cellPadding, { width: colWidths[1], align: 'left' });
                doc.rect(x, y, colWidths[1], rowHeight).stroke();
                x += colWidths[1];
                
                // Department
                doc.text(faculty.department || '', x, y + cellPadding, { width: colWidths[2], align: 'left' });
                doc.rect(x, y, colWidths[2], rowHeight).stroke();
                x += colWidths[2];
                
                // Designation
                doc.text(faculty.designation || '', x, y + cellPadding, { width: colWidths[3], align: 'left' });
                doc.rect(x, y, colWidths[3], rowHeight).stroke();
                x += colWidths[3];
                
                // Status
                doc.text(faculty.status || '', x, y + cellPadding, { width: colWidths[4], align: 'left' });
                doc.rect(x, y, colWidths[4], rowHeight).stroke();
                
                y += rowHeight;
                
                // Add a new page if needed
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
            });
            
            // Finalize the PDF
            doc.end();
        }
    } catch (err) {
        console.error("Error generating faculty report:", err);
        throw err;
    }
}

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});