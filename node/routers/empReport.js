const express = require('express')
const router = new express.Router()
const Registration = require('../models/registration')
const Attendance = require('../models/attendance')
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const moment = require('moment')
const EmpReport = require('../models/empReport')

//get report of all employees
router.get('/getAttendanceReport',(req,res)=>{
    EmpReport.find()
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
router.get('/getAttendanceReportNew', async (req, res) => {
    try {
        // Fetch all reports
        const empReports = await EmpReport.find();

        if (!empReports || empReports.length === 0) {
            return res.status(404).json({ error: "Reports not found" });
        }
        const processedReports = [];

        for (const empReport of empReports) {
            // Find the registration data for the current report's empid
            const registration = await Registration.findOne({ empid: empReport.empid });

            if (!registration || !registration.file) {
                // If registration data or file not found, skip this report
                console.error(`File not found for empid: ${empReport.empid}`);
                continue;
            }
            const responseObject = {
                date: empReport.date,
                empid: empReport.empid,
                name: empReport.name,
                department: empReport.department,
                intime: empReport.intime,
                outtime: empReport.outtime,
                totaltime: empReport.totaltime,
                breaktime: empReport.breaktime,
                file: registration.file
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
router.get('/download-csv', async (req, res) => {
    try {
        const { empid, department, startDate, endDate } = req.query;
        let query = {};
        if (empid) {
            query.empid = empid;
        }
        if (department) {
            query.department = department;
        }
        if (startDate && endDate) {
            query.date = { $gte: startDate, $lte: endDate };
        }
        const data = await Report.find(query);
        if (data.length === 0) {
            return res.status(404).json({ message: 'No data found' });
        }
        // Format CSV data with headers
        const csvData = [
            ['Date', 'Employee ID', 'Name', 'In Time', 'Out Time', 'Total Time', 'Break Time'],
            ...data.map(row => [
                row.date,
                row.empid,
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

router.get('/presentEmployeesCount', async (req, res) => {
    try {
        const currentDate = new Date();
        
        // Get the current date in DD/MM/YYYY format (to match your stored date format)
        const ddmmyyyyDate = currentDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric' // Full year for YYYY format
        });

        // Set the time to 10:15:00 UTC for the current date
        const intimeBefore = new Date(currentDate);
        intimeBefore.setUTCHours(10, 15, 0, 0);

        // Convert intimeBefore to a string in HH:mm:ss format
        const intimeBeforeString = `${intimeBefore.getUTCHours().toString().padStart(2, '0')}:${intimeBefore.getUTCMinutes().toString().padStart(2, '0')}:${intimeBefore.getUTCSeconds().toString().padStart(2, '0')}`;

        // Query to count employees with intime before 10:15:00 on the current date
        const count = await EmpReport.countDocuments({
            date: { $eq: ddmmyyyyDate }, // Match the stored format
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

router.get('/lateEmployeesCount', async (req, res) => {
    try {
        const currentDate = new Date();
 
        // Get the current date in MM/DD/YY format
        const mmddyyyyDate = currentDate.toLocaleDateString('en-GB', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });
 
        // Set the time to 10:15:00 UTC for the current date
        const intimeAfter = new Date(currentDate);
        intimeAfter.setUTCHours(10, 15, 0, 0);
 
        // Convert intimeAfter to a string in ISO format
        const intimeAfterISOString = `${intimeAfter.getUTCHours().toString().padStart(2, '0')}:${intimeAfter.getUTCMinutes().toString().padStart(2, '0')}:${intimeAfter.getUTCSeconds().toString().padStart(2, '0')}`
 
        // Query to count employees with intime before 10:15:00 on the current date
        const count = await EmpReport.countDocuments({
            date: { $eq: mmddyyyyDate }, 
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
//         const allEmployeeIds = await Registration.distinct('empid');

//         // Fetch all employee IDs present in the Report table for the current date
//         const presentEmployeeIdsCurrent = await Report.distinct('empid', { date: currentDateStr });

//         // Identify absent employee IDs for the current date
//         const absentEmployeeIdsCurrent = allEmployeeIds.filter(empid => !presentEmployeeIdsCurrent.includes(empid));

//         const result = {
//             Count: absentEmployeeIdsCurrent.length
//         };

//         res.status(200).json(result);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });


router.get('/absentEmployeesCount', async (req, res) => {
    try {
        const currentDate = new Date();

        // Format the current date as a string in the 'MM/DD/YY' format
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const year = String(currentDate.getFullYear()).slice(-2);
        const currentDateStr = `${month}/${day}/${year}`;

        // Fetch all employee IDs from the Registration table
        const allEmployeeIds = await Registration.distinct('empid');

        // Fetch all employee IDs present in the Report table for the current date
        const presentEmployeeIdsCurrent = await EmpReport.distinct('empid', { date: currentDateStr });

        // Identify absent employee IDs for the current date
        const absentEmployeeIdsCurrent = allEmployeeIds.filter(empid => !presentEmployeeIdsCurrent.includes(empid));

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
router.get('/monthlyPresentEmployeesCount', async (req, res) => {
    try {
        const registrationIds = await Registration.distinct('empid');

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1; 

        const monthlyCounts = [];

        for (let month = 1; month <= currentMonth; month++) {
            const startDate = moment().month(month - 1).startOf('month').format('YYYY-MM-DD');
            const endDate = moment().month(month - 1).endOf('month').format('YYYY-MM-DD');

            const presentEmployeeIds = await EmpReport.distinct('empid', {
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