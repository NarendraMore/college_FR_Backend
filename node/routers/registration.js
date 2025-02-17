const express = require('express')
const router = new express.Router()
const Registration = require('../models/registration')
const mongoose = require('mongoose');
const fs = require('fs');
const bcrypt = require('bcryptjs'); 
const sharp = require('sharp');
const { GridFsStorage } = require('multer-gridfs-storage');
const path = require('path')
// const upload = multer({ dest: 'C:/Attendance_backend/Images' });
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Check if the file is an image or any other validation you may need
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('File type not allowed'), false);
        }
        cb(null, true);
    },
    // Set the filename dynamically based on empid
    filename: (req, file, cb) => {
        // Extract empid from request body or wherever it is available
        const empid = req.body.empid || '';

        // Use empid as the filename, you can also append a file extension if needed
        const filename = empid + '.jpg';

        cb(null, filename);
    }
});
router.post('/empRegistration', upload.single('file'), async (req, res) => {
    try {
        // Check if a file was uploaded
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        // Read the file as bytes
        // const fileBytes = req.file.buffer; 

        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        // Check if password is provided
        if (!req.body.password) {
            return res.status(400).json({ error: 'Password is required' });
        }
        if (!req.body.email) {
            return res.status(400).json({ error: 'email is required' });
        }

        // Create a new file document with the file bytes
        const registration = new Registration({
            empid: req.body.empid,
            name: req.body.name,
            email: req.body.email,
            mobile: req.body.mobile,
            department: req.body.department,
            joiningdate: req.body.joiningdate,
            password: hashedPassword,
            file: {
              filename: req.file.originalname, 
              data: req.file.buffer
          }
        });

        const result = await registration.save();
        // Emit notification message with registration details
        req.app.get('io').emit('newRegistration', {
          message: `A new employee with ID ${result.empid} has registered.`,
          registrationDetails: result
      });

      // Include notification in the response
      res.status(200).json({
          message: `A new employee with ID ${result.empid} has registered.`,
          registrationDetails: result
      });

  } catch (err) {
      res.status(500).json({
          error: err.message
      });
  }
});


//Get registration data
router.get('/getEmpRegistration',(req,res)=>{
    Registration.find()
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


//get employee by id
router.get('/getEmpRegistrationById/:id', (req, res) => {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid ObjectId' });
    }

    Registration.findById(id)
      .then(result => {
        if (!result) {
          return res.status(404).json({ message: 'Employee not found' });
        }
        res.status(200).json(result);
      })
      .catch(err => {
        console.log(err);
        res.status(500).json({
          error: err
        });
      });
});


//Count all employees
router.get('/employeeCount', async (req, res) => {
    try {
        const totalCount = await Registration.countDocuments();
        res.status(200).json({ count: totalCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
 

//delete employee
router.delete('/deleteEmpRegistration/:id', (req, res) => {
  const RegistrationId = req.params.id;

  Registration.findByIdAndDelete(RegistrationId)
      .then(deletedRegistration => {
          if (!deletedRegistration) {
              return res.status(404).send({ error: 'Employee not found' });
          }
          // Create a notification message for the deleted employee
      const notificationMessage = `Employee with ID "${deletedRegistration.empid}" and name "${deletedRegistration.name}" has been deleted.`;

      // Emit the notification via Socket.IO to all connected clients
      req.app.get('io').emit('deleteNotification', {
        message: notificationMessage,
        deletedEmployee: deletedRegistration,
      });

      // Send the response with the notification message
      res.send({
        message: 'Employee deleted successfully',
        notification: notificationMessage,
        deletedRegistration
      });
    })
    .catch(err => {
      console.log('Error deleting employee:', err);
      res.status(500).send({ error: 'Could not delete employee' });
    });
});


//Update employee
// router.put('/updateEmpRegistration/:id', async (req, res) => {
//   const id = req.params.id;
//   const {empid, name, email, mobile, department, joiningdate,file } = req.body;
//   try {
//     const registration = await Registration.findByIdAndUpdate(
//       id,
//       {empid, name, email, mobile, department,joiningdate,file },
//       { new: true }
//     );
//     if (!registration) {
//       res.status(404).send('Employee not found');
//     } else {
//       res.send(registration);
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Error updating employee');
//   }
// });

router.put('/updateEmpRegistrationNew/:id', upload.single('file'), async (req, res) => {
  const id = req.params.id;
  const { empid, name, email, mobile, department, joiningdate } = req.body;
  
  try {
    let updateFields = {
      empid,
      name,
      email,
      mobile,
      department,
      joiningdate
    };

    // Check if a new file is uploaded and update the file field accordingly
    if (req.file) {
      updateFields.file = {
        filename: req.file.originalname, 
        data: req.file.buffer
    }
    }
    const registration = await Registration.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    if (!registration) {
      res.status(404).send('Employee not found');
    } else {
      // Create a notification message for the updated employee
      const notificationMessage = `Employee with ID "${registration.empid}" and name "${registration.name}" has been updated.`;

      // Emit the notification via Socket.IO to all connected clients
      req.app.get('io').emit('updateNotification', {
        message: notificationMessage,
        updatedEmployee: registration,
      });

      // Send the response with the updated registration and notification message
      res.send({
        message: 'Employee updated successfully',
        notification: notificationMessage,
        updatedRegistration: registration
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating employee');
  }
});

//old registartion api without convrsion of file
// router.post('/empRegistration', upload.single('file'), async (req, res) => {
//   try {
//     // Check if a file was uploaded
//     if (!req.file) {
//       return res.status(400).json({ error: 'No file provided' });
//     }


//     // Generate the new file as empid.pdf
//     const newfilename = req.body.empid + '.jpg';

//     // Create the 'Images' folder if it doesn't exist
//     const folderPath = 'C:/Attendance_backend/Images';
//     if (!fs.existsSync(folderPath)) {
//       fs.mkdirSync(folderPath);
//     }

//     // Move the file to the desired folder with the new filename
//     const newPath = `${folderPath}/${newfilename}`;
//     fs.renameSync(req.file.path, newPath);

//     // Create a new file document
//     const registration = new Registration({
//         empid:req.body.empid,
//         name:req.body.name,
//         email:req.body.email,
//         mobile:req.body.mobile,
//         department:req.body.department,
//         joiningdate:req.body.joiningdate,
//         file : newfilename
//       });

//       const result = await registration.save();
//       res.status(200).json(result);
//   } catch (err) {
//       res.status(500).json({
//           error: err.message
//       });
//   }
// });
module.exports = router