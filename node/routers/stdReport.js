const express = require('express')
const router = new express.Router()
const StdReport = require('../models/stdReport')
const StudentRegistration = require('../models/studentRegistration')
const Attendance = require('../models/attendance')
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const moment = require('moment')

//get report of all employees
router.get('/getStudentReport',(req,res)=>{
    StdReport.find()
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

//get data with image file
router.get('/getStudentReportNew', async (req, res) => {
    try {
        // Fetch all reports
        const stdReports = await StdReport.find();

        if (!stdReports || stdReports.length === 0) {
            return res.status(404).json({ error: "Reports not found" });
        }
        const processedReports = [];

        for (const stdReport of stdReports) {
            // Find the registration data for the current report's stdId
            const studentRegistration = await StudentRegistration.findOne({ stdId: stdReport.stdId });

            if (!studentRegistration || !studentRegistration.file) {
                // If registration data or file not found, skip this report
                console.error(`File not found for stdId: ${stdReport.stdId}`);
                continue;
            }
            const responseObject = {
                date: stdReport.date,
                stdId: stdReport.stdId,
                name: stdReport.name,
                department: stdReport.department,
                intime: stdReport.intime,
                outtime: stdReport.outtime,
                totaltime: stdReport.totaltime,
                breaktime: stdReport.breaktime,
                file: studentRegistration.file
            };

            // Push the processed report object to the array
            processedReports.push(responseObject);
        }
// console.log(processedReports);
        // Send processed reports array in the response
        res.status(200).json(processedReports);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

//Download csv file 
router.get('/downloadStdReport', async (req, res) => {
    try {
        const { stdId, department, startDate, endDate } = req.query;
        let query = {};
        if (stdId) {
            query.stdId = stdId;
        }
        if (department) {
            query.department = department;
        }
        if (startDate && endDate) {
            query.date = { $gte: startDate, $lte: endDate };
        }
        const data = await StdReport.find(query);
        if (data.length === 0) {
            return res.status(404).json({ message: 'No data found' });
        }
        // Format CSV data with headers
        const csvData = [
            ['Date', 'Student ID', 'Name', 'In Time', 'Out Time', 'Total Time', 'Break Time'],
            ...data.map(row => [
                row.date,
                row.stdId,
                row.name,
                row.intime,
                row.outtime,
                row.totaltime,
                row.breaktime,
            ]),
        ];
        // Create CSV file in-memory
        const csvString = csvData.map(row => row.join(',')).join('\n');

        // Set response headers
        res.setHeader('Content-Type', 'text/csv');
        res.attachment('report_data.csv');

        // Send CSV data as the response
        res.send(csvString);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
// router.get('/download-csv', async (req, res) => {
//     try {
//         const { empid, stdId, department, startDate, endDate } = req.query;
//         let query = {};

//         if (empid) {
//             query.empid = empid;
//         }
//         if (stdId) {
//             query.stdId = stdId;
//         }
//         if (department) {
//             query.department = department;
//         }
//         if (startDate && endDate) {
//             query.date = { $gte: startDate, $lte: endDate };
//         }

//         // Fetch data based on query
//         const data = await Report.find(query);

//         if (data.length === 0) {
//             return res.status(404).json({ message: 'No data found' });
//         }

//         // Format CSV data with headers
//         const csvData = [
//             ['Date', 'ID', 'Name', 'In Time', 'Out Time', 'Total Time', 'Break Time'],
//             ...data.map(row => [
//                 row.date,
//                 row.empid || row.stdId, // empid or stdid based on which is present
//                 row.name,
//                 row.intime,
//                 row.outtime,
//                 row.totaltime,
//                 row.breaktime,
//             ]),
//         ];

//         // Create CSV file in-memory
//         const csvString = csvData.map(row => row.join(',')).join('\n');

//         // Set response headers
//         res.setHeader('Content-Type', 'text/csv');
//         res.attachment('report_data.csv');

//         // Send CSV data as the response
//         res.send(csvString);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });



//Present employee count
// router.get('/presentEmployeesCount', async (req, res) => {
//     try {
//         const currentDate = new Date();
 
//         // Set the time to 10:15:00 UTC for the current date
//         const intimeBefore = new Date(currentDate);
//         intimeBefore.setUTCHours(10, 15, 0, 0);
 
//         // Convert intimeBefore to a string in HH:mm:ss format
//         const intimeBeforeString = `${intimeBefore.getUTCHours().toString().padStart(2, '0')}:${intimeBefore.getUTCMinutes().toString().padStart(2, '0')}:${intimeBefore.getUTCSeconds().toString().padStart(2, '0')}`;
 
//         // Query to count employees with intime before 10:15:00 on the current date
//         const count = await Report.countDocuments({
//             date: { $eq: currentDate.toISOString().split('T')[0] },
//             intime: { $lt: intimeBeforeString }
//         });
 
//         res.status(200).json({ count: count });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });

router.get('/presentStudentCount', async (req, res) => {
    try {
        const currentDate = new Date();
 
        // Get the current date in MM/DD/YY format
        const mmddyyDate = currentDate.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: '2-digit'
        });
 
        // Set the time to 10:15:00 UTC for the current date
        const intimeBefore = new Date(currentDate);
        intimeBefore.setUTCHours(10, 15, 0, 0);
 
        // Convert intimeBefore to a string in HH:mm:ss format
        const intimeBeforeString = `${intimeBefore.getUTCHours().toString().padStart(2, '0')}:${intimeBefore.getUTCMinutes().toString().padStart(2, '0')}:${intimeBefore.getUTCSeconds().toString().padStart(2, '0')}`;
 
        // Query to count employees with intime before 10:15:00 on the current date
        const count = await StdReport.countDocuments({
            date: { $eq: mmddyyDate },
            intime: { $lt: intimeBeforeString }
        });
 
        res.status(200).json({ count: count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


//Late employee count
// router.get('/lateEmployeesCount', async (req, res) => {
//     try {
//         const currentDate = new Date();

//         // Set the time to 10:15:00 UTC for the current date
//         const intimeAfter = new Date(currentDate);
//         intimeAfter.setUTCHours(10, 15, 0, 0);

//         // Convert intimeAfter to a string in ISO format
//         const intimeAfterISOString = `${intimeAfter.getUTCHours().toString().padStart(2, '0')}:${intimeAfter.getUTCMinutes().toString().padStart(2, '0')}:${intimeAfter.getUTCSeconds().toString().padStart(2, '0')}`

//         // Query to count employees with intime before 10:15:00 on the current date
//         const count = await Report.countDocuments({
//             date: { $eq: currentDate.toISOString().split('T')[0] }, 
//             intime: { $gt: intimeAfterISOString }
//         });

//         res.status(200).json({ count: count });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });

router.get('/lateStudentCount', async (req, res) => {
    try {
        const currentDate = new Date();
 
        // Get the current date in MM/DD/YY format
        const mmddyyDate = currentDate.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: '2-digit'
        });
 
        // Set the time to 10:15:00 UTC for the current date
        const intimeAfter = new Date(currentDate);
        intimeAfter.setUTCHours(10, 15, 0, 0);
 
        // Convert intimeAfter to a string in ISO format
        const intimeAfterISOString = `${intimeAfter.getUTCHours().toString().padStart(2, '0')}:${intimeAfter.getUTCMinutes().toString().padStart(2, '0')}:${intimeAfter.getUTCSeconds().toString().padStart(2, '0')}`
 
        // Query to count employees with intime before 10:15:00 on the current date
        const count = await StdReport.countDocuments({
            date: { $eq: mmddyyDate }, 
            intime: { $gt: intimeAfterISOString }
        });
 
        res.status(200).json({ count: count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


//Absent employee count
// router.get('/absentEmployeesCount', async (req, res) => {
//     try {
//         const currentDate = new Date();

//         // Format the current date as a string in the 'YYYY-MM-DD' format
//         const currentDateStr = formatDate(currentDate);

//         // Fetch all employee IDs from the Registration table
//         const allEmployeeIds = await Registration.distinct('stdId');

//         // Fetch all employee IDs present in the Report table for the current date
//         const presentEmployeeIdsCurrent = await Report.distinct('stdId', { date: currentDateStr });

//         // Identify absent employee IDs for the current date
//         const absentEmployeeIdsCurrent = allEmployeeIds.filter(stdId => !presentEmployeeIdsCurrent.includes(stdId));

//         const result = {
//             Count: absentEmployeeIdsCurrent.length
//         };

//         res.status(200).json(result);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });


router.get('/absentStudentCount', async (req, res) => {
    try {
        const currentDate = new Date();

        // Format the current date as a string in the 'MM/DD/YY' format
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const year = String(currentDate.getFullYear()).slice(-2);
        const currentDateStr = `${month}/${day}/${year}`;

        // Fetch all employee IDs from the Registration table
        const allEmployeeIds = await Registration.distinct('stdId');

        // Fetch all employee IDs present in the Report table for the current date
        const presentEmployeeIdsCurrent = await StdReport.distinct('stdId', { date: currentDateStr });

        // Identify absent employee IDs for the current date
        const absentEmployeeIdsCurrent = allEmployeeIds.filter(stdId => !presentEmployeeIdsCurrent.includes(stdId));

        const result = {
            Count: absentEmployeeIdsCurrent.length
        };

        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


//Monthly count of present employees
router.get('/monthlyPresentStudentCount', async (req, res) => {
    try {
        const registrationIds = await Registration.distinct('stdId');

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1; 

        const monthlyCounts = [];

        for (let month = 1; month <= currentMonth; month++) {
            const startDate = moment().month(month - 1).startOf('month').format('YYYY-MM-DD');
            const endDate = moment().month(month - 1).endOf('month').format('YYYY-MM-DD');

            const presentEmployeeIds = await StdReport.distinct('stdId', {
                date: { $gte: startDate, $lte: endDate }
            });

            const presentCount = presentEmployeeIds.filter(id => registrationIds.includes(id)).length;

            monthlyCounts.push({
                month: month,
                year: moment().year(),
                presentEmployeesCount: presentCount
            });
        }

        res.status(200).json(monthlyCounts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router