const express =  require('express')
const mongoose =  require('mongoose')
const path = require('path')
const port = 3000

const app = express();
app.use(express.json());


app.use(express.static(__dirname));
app.use(express.urlencoded({extended:true}))

mongoose.connect('mongodb://127.0.0.1:27017/mepco_erp')

const db = mongoose.connection
db.once('open',()=>{
  console.log("mongodb connect successfully.")
  console.log("http://localhost:3000/")
})

const userSchema = new mongoose.Schema({
  username:String,
  password:String
})

const Users = mongoose.model("userlogin",userSchema)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

app.post('/post',async(req,res)=>{
    const{username,password} = req.body
    const user = new Users({
      username,
      password
    })
    await user.save()
    console.log(user)
    if(username.startsWith("AD")){
        res.redirect('/adminlead.html');
    } else if(username.startsWith("ST")){ {
        res.redirect('/student.html');
    }
  } else if(username.startsWith("FA")){ {
        res.redirect('/staff.html');
    }
  }
})
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
  semester: String,
  twelfth: String,
  sslc: String,
  father: String,
  mother: String,
  parentcontact: String,
  hostel: String,
  scholarship: String,
  address: String
}));

const Faculty = mongoose.model("Faculty", new mongoose.Schema({
  name: String,
  gender: String,
  dob: String,
  email: String,
  phone: String,
  address: String,
  department: String,
  designation: String,
  education: String,
  experience: String,
  publications: String,
  grants: String,
  courses: String,
  performance: String
}));

const Course = mongoose.model("Course", new mongoose.Schema({
  title: String,
  audience: String,
  objectives: String,
  topics: String,
  activities: String,
  assessments: String
}));

// APIs
app.post("/students", async (req, res) => {
  const student = new Student(req.body);
  try {
    await student.save();
    res.json({ message: "✅ Student saved!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Error saving student", error: err.message });
  }
});

app.post("/faculty", async (req, res) => {
  const faculty = new Faculty(req.body);
  try {
    await faculty.save();
    res.json({ message: "✅ Faculty saved!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Error saving faculty", error: err.message });
  }
});

app.post("/courses", async (req, res) => {
  const course = new Course(req.body);
  try {
    await course.save();
    res.json({ message: "✅ Course saved!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Error saving course", error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});