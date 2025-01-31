const express = require('express')
const router = new express.Router()
const StudentRegistration = require('../models/studentRegistration');
const mongoose = require('mongoose');
const fs = require('fs')
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
    // Set the filename dynamically based on stdId
    filename: (req, file, cb) => {
        // Extract stdId from request body or wherever it is available
        const stdId = req.body.stdId || '';

        // Use stdId as the filename, you can also append a file extension if needed
        const filename = stdId + '.jpg';

        cb(null, filename);
    }
});
router.post('/stdRegistration', upload.single('file'), async (req, res) => {
    try {
        // Check if a file was uploaded
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        // Read the file as bytes
        // const fileBytes = req.file.buffer; 

        // Create a new file document with the file bytes
        const registration = new StudentRegistration({
            stdId: req.body.stdId,
            name: req.body.name,
            email: req.body.email,
            mobile: req.body.mobile,
            department: req.body.department,
            division: req.body.division,
            file: {
              filename: req.file.originalname, 
              data: req.file.buffer
          }
        });

        const result = await registration.save();
        // Emit notification message with StudentRegistration details
        req.app.get('io').emit('newStudentRegistration', {
          message: `A new student with ID ${result.stdId} has registered.`,
          registrationDetails: result
      });

      // Include notification in the response
      res.status(200).json({
          message: `A new student with ID ${result.stdId} has registered.`,
          registrationDetails: result
      });

  } catch (err) {
      res.status(500).json({
          error: err.message
      });
  }
});


//Get registration data
router.get('/getStdRegistration',(req,res)=>{
    StudentRegistration.find()
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


//get student by id
router.get('/getStdRegistrationById/:id', (req, res) => {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid ObjectId' });
    }

    StudentRegistration.findById(id)
      .then(result => {
        if (!result) {
          return res.status(404).json({ message: 'Student not found' });
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


//Count all students
router.get('/studentCount', async (req, res) => {
    try {
        const totalCount = await StudentRegistration.countDocuments();
        res.status(200).json({ count: totalCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
 

//delete student
router.delete('/deleteStdRegistration/:id', (req, res) => {
  const RegistrationId = req.params.id;

  StudentRegistration.findByIdAndDelete(RegistrationId)
      .then(deletedRegistration => {
          if (!deletedRegistration) {
              return res.status(404).send({ error: 'Student not found' });
          }
          // Create a notification message for the deleted student
      const notificationMessage = `Student with ID "${deletedRegistration.stdId}" and name "${deletedRegistration.name}" has been deleted.`;

      // Emit the notification via Socket.IO to all connected clients
      req.app.get('io').emit('deleteNotification', {
        message: notificationMessage,
        deletedStudent: deletedRegistration,
      });

      // Send the response with the notification message
      res.send({
        message: 'Student deleted successfully',
        notification: notificationMessage,
        deletedRegistration
      });
    })
    .catch(err => {
      console.log('Error deleting student:', err);
      res.status(500).send({ error: 'Could not delete student' });
    });
});


//Update Student
// router.put('/updateStdRegistration/:id', async (req, res) => {
//   const id = req.params.id;
//   const {stdId, name, email, mobile, department, division,file } = req.body;
//   try {
//     const registration = await StudentRegistration.findByIdAndUpdate(
//       id,
//       {stdId, name, email, mobile, department,division,file },
//       { new: true }
//     );
//     if (!registration) {
//       res.status(404).send('Student not found');
//     } else {
//       res.send(registration);
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Error updating student');
//   }
// });

router.put('/updateStdRegistrationNew/:id', upload.single('file'), async (req, res) => {
  const id = req.params.id;
  const { stdId, name, email, mobile, department, division } = req.body;
  
  try {
    let updateFields = {
      stdId,
      name,
      email,
      mobile,
      department,
      division
    };

    // Check if a new file is uploaded and update the file field accordingly
    if (req.file) {
      updateFields.file = {
        filename: req.file.originalname, 
        data: req.file.buffer
    }
    }
    const registration = await StudentRegistration.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    if (!registration) {
      res.status(404).send('Student not found');
    } else {
      // Create a notification message for the updated students
      const notificationMessage = `Student with ID "${registration.stdId}" and name "${registration.name}" has been updated.`;

      // Emit the notification via Socket.IO to all connected clients
      req.app.get('io').emit('updateNotification', {
        message: notificationMessage,
        updatedStudent: registration,
      });

      // Send the response with the updated registration and notification message
      res.send({
        message: 'Student updated successfully',
        notification: notificationMessage,
        updatedRegistration: registration
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating student');
  }
});


module.exports = router