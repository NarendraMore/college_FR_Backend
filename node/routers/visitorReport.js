const express = require('express')
const router = new express.Router()
const cron = require('node-cron')
const moment = require('moment');
const VisitorRegistration = require('../models/visitorRegistration');
const VisitorReport = require('../models/visitorReport');
const VisitorAttendance = require('../models/visitorAttendance')

//create visitor report table------------------
// Define the function to generate visitor report
async function generateVisitorReport(date) {
    try {
        // Find all visitor attendances for the given date
        const attendances = await VisitorAttendance.find({ date });

        // Iterate over each attendance record
        const reportData = await Promise.all(attendances.map(async visitorAttendance => {
            // Fetch visitor details from registration table
            const visitorRegistration = await VisitorRegistration.findOne({ visitorId: visitorAttendance.visitorId }).select('name contactPerson');

            // Fetch intime and outtime arrays from attendance table based on visitorId and date
            const intimeArray = await VisitorAttendance.find({ visitorId: visitorAttendance.visitorId, date, readerno: 1 }).sort({ time: 1 }).distinct('time');
            const outtimeArray = await VisitorAttendance.find({ visitorId: visitorAttendance.visitorId, date, readerno: 2 }).sort({ time: -1 }).distinct('time');

            // Calculate total time if both intime and outtime arrays have entries
            let totalTime = 'N/A';
            let Intime = 'N/A';
            let Outtime = 'N/A';
            if (intimeArray.length >= 1 && outtimeArray.length >= 1) {
                Intime = moment(`1970-01-01T${intimeArray[0]}`).format('HH:mm:ss');
                Outtime = moment(`1970-01-01T${outtimeArray[outtimeArray.length - 1]}`).format('HH:mm:ss');

                // Calculate total time between Intime and Outtime
                const totalMilliseconds = moment(Outtime, 'HH:mm:ss').diff(moment(Intime, 'HH:mm:ss'));
                const duration = moment.duration(totalMilliseconds);
                totaltime = moment.utc(totalMilliseconds).format('HH:mm');;
            } else {
                console.log('Insufficient intime or outtime entries');
                Intime = intimeArray.length >= 1 ? moment(`1970-01-01T${intimeArray[0]}`).format('HH:mm:ss') : 'N/A';
                // If outtime is not available, set it to "00:00:00"
                Outtime = '00:00:00';
            }

            // Prepare the report data
            return {
                date,
                visitorId: visitorAttendance.visitorId,
                name: visitorRegistration.name,
                contactPerson: visitorRegistration.contactPerson,
                intime: Intime,
                outtime: Outtime,
                totaltime
            };
        }));

        // Create visitor reports
        const visitorReports = await VisitorReport.insertMany(reportData);
        console.log('Visitor reports created:', visitorReports);
    } catch (error) {
        console.error('Error generating visitor report:', error);
    }
}

// Schedule the task to run every 24 hours
cron.schedule('0 0 * * *', async () => {
    // cron.schedule('*/10 * * * * *', async () => {
    console.log('Generating visitor report...');
    const date = getCurrentDate(); 
    await generateVisitorReport(date);
}, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
});

// Function to get current date in 'MM/DD/YY' format
function getCurrentDate() {
    const now = new Date();
    let month = now.getMonth() + 1;
    month = month < 10 ? '0' + month : month;
    let day = now.getDate();
    day = day < 10 ? '0' + day : day;
    const year = now.getFullYear().toString().slice(-2); 
    return `${month}/${day}/${year}`;
}


//get visitorReport of all employees------------------------
router.get('/getVisitorReport',(req,res)=>{
    VisitorReport.find()
    .sort({ date: -1, intime: -1})
    .then(result=>{
     res.status(200).json(
    result
    )
}).catch(err=>{
    console.log(err)
    res.status(500).json({
    error:err
    })
   })
})

//get data with image file-------------------------
// router.get('/getVisitorReportNew', async (req, res) => {
//     try {
//         // Fetch all reports
//         const reports = await VisitorReport.find();

//         if (!reports || reports.length === 0) {
//             return res.status(404).json({ error: "Reports not found" });
//         }
//         const processedReports = [];

//         for (const report of reports) {
//             // Find the registration data for the current report's visiterId
//             const visitorRegistration = await VisitorRegistration.findOne({ visiterId: report.visiterId });

//             if (!visitorRegistration || !visitorRegistration.file) {
//                 // If registration data or file not found, skip this report
//                 console.error(`File not found for visiterId: ${report.visiterId}`);
//                 continue;
//             }
//             const responseObject = {
//                 date: report.date,
//                 visiterId: report.visiterId,
//                 name: report.name,
//                 contactPerson: report.contactPerson,
//                 intime: report.intime,
//                 outtime: report.outtime,
//                 file: visitorRegistration.file
//             };

//             // Push the processed report object to the array
//             processedReports.push(responseObject);
//         }
// // console.log(processedReports);
//         // Send processed reports array in the response
//         res.status(200).json(processedReports);
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: err.message });
//     }
// });


//delete employee
router.delete('/deleteVisitorReport/:id', (req, res) => {
    const RegistrationId = req.params.id;
  
    VisitorReport.findByIdAndDelete(RegistrationId)
        .then(deletedRegistration => {
            if (!deletedRegistration) {
                return res.status(404).send({ error: 'Visitor not found' });
            }
            res.send({ message: 'Visitor deleted successfully', deletedRegistration });
        })
        .catch(err => {
            console.log('Error deleting visitor:', err);
            res.status(500).send({ error: 'Could not delete visitor' });
        });
  });

module.exports = router;