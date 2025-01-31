const express = require('express');
const http = require('http');
const cors = require('cors');
const moment = require('moment');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const RegistrationRouter = require('./routers/registration');
const EmpReportRouter = require('./routers/empReport');
const StdReportRouter = require('./routers/stdReport');
const VisitorRegistrationRouter = require('./routers/visitorRegistration');
const VisitorReportRouter = require('./routers/visitorReport')
const EventsRouter = require('./routers/events')
const StudentRegistrationRouter = require('./routers/studentRegistration')

const app = express();
const port = process.env.PORT || 3000;

const server = http.createServer(app);

// Initialize Socket.io
const io = socketIO(server);

// Connect to your MongoDB database
mongoose.connect('mongodb://127.0.0.1:27017/CollegeFR', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log('Connected to database!');
});

// Code for new report collection
const Attendance = require('./models/attendance');
const Registration = require('./models/registration');
const StudentRegistration = require('./models/studentRegistration');
const EmpReport = require('./models/empReport');
const StdReport = require('./models/stdReport')

// Run function every day at midnight
cron.schedule('* * * * *', async () => {
  try {
      const report = await Attendance.find();
      const reportWithIntimeAndOuttime = {};

      for (let i = 0; i < report.length; i++) {
          const attendance = report[i];
          const key = `${attendance.u_id}_${attendance.date}`; // Using u_id for both employees and students

          if (attendance.readerno === 1) {
              if (!reportWithIntimeAndOuttime[key]) {
                  reportWithIntimeAndOuttime[key] = {
                      u_id: attendance.u_id,
                      name: '',
                      department: '',
                      date: attendance.date,
                      intime: [], // Initialize as an empty array
                      outtime: [], // Initialize as an empty array
                      totaltime: null,
                  };
              }

              if (
                  reportWithIntimeAndOuttime[key].outtime.length ===
                  reportWithIntimeAndOuttime[key].intime.length
              ) {
                  reportWithIntimeAndOuttime[key].intime.push(attendance.time); // Add intime to the array
              }
          }

          if (attendance.readerno === 2) {
              if (reportWithIntimeAndOuttime[key]) {
                  reportWithIntimeAndOuttime[key].outtime.push(attendance.time); // Add outtime to the array
              }
          }
      }

      const reportWithTotaltime = await Promise.all(
          Object.values(reportWithIntimeAndOuttime).map(async (attendance) => {
              let name = '';
              let department = '';
              let isEmployee = false;

              // First, try to find the u_id in the Registration collection (for employees)
              const registration = await Registration.findOne({ empid: attendance.u_id });
              if (registration) {
              name = registration.name;
              department = registration.department;
              isEmployee = true;

             } else {
                  // If not found in Registration, try finding it in StudentRegistration (for students)
                  const studentRegistration = await StudentRegistration.findOne({ stdId: attendance.u_id });
                  if (studentRegistration) {
                      name = studentRegistration.name;
                      department = studentRegistration.department;
                  }
              }

              // Now proceed with calculating intime, outtime, and total time
              const attendanceDate = attendance.date;
              const intimeArray = attendance.intime;
              const outtimeArray = attendance.outtime;

              let firstIntime, lastOuttime, totalMilliseconds = 0;

              if (intimeArray.length >= 1 && outtimeArray.length >= 1) {
                  firstIntime = moment(`1970-01-01T${intimeArray[0]}`).format('HH:mm:ss');
                  lastOuttime = moment(`1970-01-01T${outtimeArray[outtimeArray.length - 1]}`).format('HH:mm:ss');

                  // Calculate total time between firstIntime and lastOuttime
                  totalMilliseconds = moment(lastOuttime, 'HH:mm:ss').diff(
                      moment(firstIntime, 'HH:mm:ss')
                  );
              } else {
                  firstIntime = moment(`1970-01-01T${intimeArray[0]}`).format('HH:mm:ss');
                  lastOuttime = '00:00:00'; // Default out time if not available
              }

              // Calculate total time and break time
              const totalSeconds = totalMilliseconds / 1000;
              const totalMinutes = totalSeconds / 60;
              const totalHours = Math.floor(totalMinutes / 60);
              const remainingMinutes = Math.floor(totalMinutes % 60);

              const formattedTotalTime = isNaN(totalHours) || isNaN(remainingMinutes)
                  ? '00:00'
                  : `${totalHours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}`;

              const breakTimes = [];
              let totalBreakTimeMilliseconds = 0;

              for (let i = 0; i < outtimeArray.length - 1; i++) {
                  const currentOuttime = new Date(`1970-01-01T${outtimeArray[i]}`);
                  const nextIntime = new Date(`1970-01-01T${intimeArray[i + 1]}`);

                  const breakTimeMilliseconds = nextIntime - currentOuttime;
                  totalBreakTimeMilliseconds += breakTimeMilliseconds;
                  breakTimes.push(breakTimeMilliseconds);
              }

              const totalBreakTimeHours = Math.floor(totalBreakTimeMilliseconds / (60 * 60 * 1000));
              const totalBreakTimeMinutes = Math.floor(
                  (totalBreakTimeMilliseconds % (60 * 60 * 1000)) / (60 * 1000)
              );

              const formattedTotalBreakTime = `${String(totalBreakTimeHours).padStart(2, '0')}:${String(
                  totalBreakTimeMinutes
              ).padStart(2, '0')}`;

              // Store report data into respective tables based on whether it's employee or student
              if (isEmployee) {
                // Check if a report already exists for this employee
                const existingEmpReport = await EmpReport.findOne({ empid: attendance.u_id, date: attendanceDate });
                  if (existingEmpReport) {
                      await EmpReport.updateOne(
                          { _id: existingEmpReport._id },
                          {
                              intime: firstIntime,
                              outtime: lastOuttime,
                              totaltime: formattedTotalTime,
                              breaktime: formattedTotalBreakTime,
                          }
                      );
                  } else {
                      await EmpReport.create({
                          empid: attendance.u_id,
                          name: name,
                          department: department,
                          date: attendanceDate,
                          intime: firstIntime,
                          outtime: lastOuttime,
                          totaltime: formattedTotalTime,
                          breaktime: formattedTotalBreakTime,
                      });
                 
                }
              } else {
                  // Check if a report already exists for this student
                  const existingStdReport = await StdReport.findOne({ stdId: attendance.u_id, date: attendanceDate });
                  if (existingStdReport) {
                      await StdReport.updateOne(
                          { _id: existingStdReport._id },
                          {
                              intime: firstIntime,
                              outtime: lastOuttime,
                              totaltime: formattedTotalTime,
                              breaktime: formattedTotalBreakTime,
                          }
                      );
                  } else {
                      await StdReport.create({
                          stdId: attendance.u_id,
                          name: name,
                          department: department,
                          date: attendanceDate,
                          intime: firstIntime,
                          outtime: lastOuttime,
                          totaltime: formattedTotalTime,
                          breaktime: formattedTotalBreakTime,
                      });
                  }
              }
          })
      );
  } catch (err) {
      console.error(err);
  }
});



// cron.schedule('0 * * * *', async () => {
  // cron.schedule('* * * * *', async () => {
  //   try {
  //     const report = await Attendance.find();
  //     const reportWithIntimeAndOuttime = {};
  
  //     for (let i = 0; i < report.length; i++) {
  //       const attendance = report[i];
  //       const key = `${attendance.u_id}_${attendance.date}`; // Using u_id for both employees and students
  
  //       if (attendance.readerno === 1) {
  //         if (!reportWithIntimeAndOuttime[key]) {
  //           reportWithIntimeAndOuttime[key] = {
  //             u_id: attendance.u_id,
  //             name: '',
  //             department: '',
  //             date: attendance.date,
  //             intime: [], // Initialize as an empty array
  //             outtime: [], // Initialize as an empty array
  //             totaltime: null,
  //           };
  //         }
  
  //         if (
  //           reportWithIntimeAndOuttime[key].outtime.length ===
  //           reportWithIntimeAndOuttime[key].intime.length
  //         ) {
  //           reportWithIntimeAndOuttime[key].intime.push(attendance.time); // Add intime to the array
  //         }
  //       }
  
  //       if (attendance.readerno === 2) {
  //         if (reportWithIntimeAndOuttime[key]) {
  //           reportWithIntimeAndOuttime[key].outtime.push(attendance.time); // Add outtime to the array
  //         }
  //       }
  //     }
  
  //     const reportWithTotaltime = await Promise.all(
  //       Object.values(reportWithIntimeAndOuttime).map(async (attendance) => {
  //         let name = '';
  //         let department = '';
  //         let registrationFound = false;
  
  //         // First, try to find the u_id in the Registration collection (for employees)
  //         const registration = await Registration.findOne({ empid: attendance.u_id });
  //         if (registration) {
  //           name = registration.name;
  //           department = registration.department;
  //           registrationFound = true;
  //         }
  
  //         // If not found in Registration, try finding it in StudentRegistration (for students)
  //         if (!registrationFound) {
  //           const studentRegistration = await StudentRegistration.findOne({ stdId: attendance.u_id });
  //           if (studentRegistration) {
  //               console.log('Student Registration found:', studentRegistration); // Log found student
  //               name = studentRegistration.name;
  //               department = studentRegistration.department; 
  //           } else {
  //               console.log('No student found for stdId:', attendance.u_id); // Log when no student found
  //           }
  //       }
        
  
  //         // Now proceed with the rest of your logic
  //         const attendanceDate = attendance.date;
  //         const intimeArray = attendance.intime;
  //         const outtimeArray = attendance.outtime;
  
  //         let firstIntime, lastOuttime, totalMilliseconds = 0;
  
  //         if (intimeArray.length >= 1 && outtimeArray.length >= 1) {
  //           firstIntime = moment(`1970-01-01T${intimeArray[0]}`).format('HH:mm:ss');
  //           lastOuttime = moment(`1970-01-01T${outtimeArray[outtimeArray.length - 1]}`).format(
  //             'HH:mm:ss'
  //           );
  
  //           // Calculate total time between firstIntime and lastOuttime
  //           totalMilliseconds = moment(lastOuttime, 'HH:mm:ss').diff(
  //             moment(firstIntime, 'HH:mm:ss')
  //           );
  //         } else {
  //           console.log('Insufficient intime or outtime entries');
  //           firstIntime = moment(`1970-01-01T${intimeArray[0]}`).format('HH:mm:ss');
  //           // If outtime is not available, set it to "00:00:00"
  //           lastOuttime = '00:00:00';
  //         }
  
  //         // Calculate break times in between
  //         const breakTimes = [];
  //         let totalBreakTimeMilliseconds = 0;
  
  //         for (let i = 0; i < outtimeArray.length - 1; i++) {
  //           const currentOuttime = new Date(`1970-01-01T${outtimeArray[i]}`);
  //           const nextIntime = new Date(`1970-01-01T${intimeArray[i + 1]}`);
  
  //           const breakTimeMilliseconds = nextIntime - currentOuttime;
  
  //           // Accumulate total break time
  //           totalBreakTimeMilliseconds += breakTimeMilliseconds;
  
  //           // Convert breakTimeMilliseconds to 'hh:mm' format
  //           const breakTimeHours = Math.floor(breakTimeMilliseconds / (60 * 60 * 1000));
  //           const breakTimeMinutes = Math.floor(
  //             (breakTimeMilliseconds % (60 * 60 * 1000)) / (60 * 1000)
  //           );
  
  //           const formattedBreakTime = `${String(breakTimeHours).padStart(2, '0')}:${String(
  //             breakTimeMinutes
  //           ).padStart(2, '0')}`;
  //           breakTimes.push(formattedBreakTime);
  //         }
  
  //         // Convert totalBreakTimeMilliseconds to 'hh:mm' format
  //         const totalBreakTimeHours = Math.floor(
  //           totalBreakTimeMilliseconds / (60 * 60 * 1000)
  //         );
  //         const totalBreakTimeMinutes = Math.floor(
  //           (totalBreakTimeMilliseconds % (60 * 60 * 1000)) / (60 * 1000)
  //         );
  
  //         const formattedTotalBreakTime = `${String(totalBreakTimeHours).padStart(2, '0')}:${String(
  //           totalBreakTimeMinutes
  //         ).padStart(2, '0')}`;
  
  //         const totalSeconds = totalMilliseconds / 1000;
  //         const totalMinutes = totalSeconds / 60;
  //         const totalHours = Math.floor(totalMinutes / 60); // Calculate total hours
  //         const remainingMinutes = Math.floor(totalMinutes % 60); // Calculate remaining minutes
  
  //         const formattedTotalTime = isNaN(totalHours) || isNaN(remainingMinutes)
  //           ? '00:00'
  //           : `${totalHours.toString().padStart(2, '0')}:${remainingMinutes
  //               .toString()
  //               .padStart(2, '0')}`;
  
  //         // Check if a report already exists for this u_id and date              
  //         const existingReport = await Report.findOne({ empid: attendance.u_id,stdId: attendance.u_id, date: attendanceDate });               
  //         if (existingReport) {              
  //           // Update the existing report              
  //           await Report.updateOne(             
  //             { _id: existingReport._id },              
  //             {              
  //               intime: firstIntime,              
  //               outtime: lastOuttime,              
  //               totaltime: formattedTotalTime,              
  //               breaktime: formattedTotalBreakTime,              
  //             }              
  //           );              
  //         } else {              
  //           // Insert a new report              
  //           const result = await Report.create({              
  //             empid: attendance.u_id,
  //             stdId: attendance.u_id,              
  //             name: name,              
  //             department: department,              
  //             date: attendanceDate,              
  //             intime: firstIntime,              
  //             outtime: lastOuttime,              
  //             totaltime: formattedTotalTime,             
  //             breaktime: formattedTotalBreakTime,              
  //           });             
  //           console.log(result);              
  //         }              
  //       })
  //     );
  
  //   } catch (err) {
  //     console.error(err);
  //   }
  // });

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());
app.use(RegistrationRouter);
app.use(EmpReportRouter);
app.use(StdReportRouter);
app.use(VisitorRegistrationRouter);
app.use(VisitorReportRouter);
app.use(EventsRouter)
app.use(StudentRegistrationRouter

)
app.set('io', io);

// Start the server
server.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});
