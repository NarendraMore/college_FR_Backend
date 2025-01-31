const express = require('express')
const router = new express.Router()
const VisitorRegistration = require('../models/visitorRegistration')
const mongoose = require('mongoose');
const fs = require('fs')
const sharp = require('sharp');
const cron = require('node-cron');
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
router.post('/visitorRegistration', upload.single('file'), async (req, res) => {
    try {
        // Check if a file was uploaded
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        // Read the file as bytes
        // const fileBytes = req.file.buffer; 

        // Create a new file document with the file bytes
        const visitorRegistration = new VisitorRegistration({
            visiterId: req.body.visiterId,
            name: req.body.name,
            email: req.body.email,
            mobile: req.body.mobile,
            contactPerson: req.body.contactPerson,
            entryDate: req.body.entryDate,
            exitDate: req.body.exitDate,
            file: {
              filename: req.file.originalname, 
              data: req.file.buffer
          }
        });

        const result = await visitorRegistration.save();
        // Emit notification message with registration details
        req.app.get('io').emit('newRegistration', {
          message: `A new visitor with ID ${result.visitorId} has registered.`,
          registrationDetails: result
      });

      // Include notification in the response
      res.status(200).json({
          message: `A new visitor with ID ${result.visitorId} has registered.`,
          registrationDetails: result
      });

  } catch (err) {
      res.status(500).json({
          error: err.message
      });
  }
});


//Get visitor registration data----------
router.get('/getVisitorRegistration',(req,res)=>{
    VisitorRegistration.find()
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


//get employee by id----------
router.get('/getVisitorRegistrationById/:id', (req, res) => {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid ObjectId' });
    }

    VisitorRegistration.findById(id)
      .then(result => {
        if (!result) {
          return res.status(404).json({ message: 'Visitor not found' });
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

 
//delete visitor--------------
router.delete('/deleteVisitorRegistration/:id', (req, res) => {
  const RegistrationId = req.params.id;

  VisitorRegistration.findByIdAndDelete(RegistrationId)
      .then(deletedRegistration => {
          if (!deletedRegistration) {
              return res.status(404).send({ error: 'Visitor not found' });
          }
           // Create a notification message for the deleted employee
      const notificationMessage = `Visitor with ID "${deletedRegistration.visitorId}" and name "${deletedRegistration.name}" has been deleted.`;

      // Emit the notification via Socket.IO to all connected clients
      req.app.get('io').emit('deleteNotification', {
        message: notificationMessage,
        deletedVisitor: deletedRegistration,
      });

      // Send the response with the notification message
      res.send({
        message: 'Visitor deleted successfully',
        notification: notificationMessage,
        deletedRegistration
      });
    })
    .catch(err => {
      console.log('Error deleting visitor:', err);
      res.status(500).send({ error: 'Could not delete visitor' });
    });
});

//delete visitor after exitDate---------------
// async function deleteExpiredVisitors() {
//   try {
//     // Get the current date in MM/DD/YY format
//     const currentDate = new Date().toLocaleDateString('en-US', {
//       month: '2-digit',
//       day: '2-digit',
//       year: '2-digit',
//     });

//     // Find visitors with exitDate less than current date
//     const expiredVisitors = await VisitorRegistration.find({
//       exitDate: { $lt: currentDate },
//     });

//     // Delete expired visitors
//     for (const visitor of expiredVisitors) {
//       await VisitorRegistration.findByIdAndDelete(visitor._id);
//       console.log(`Visitor ${visitor.name} deleted.`);
//     }
//   } catch (error) {
//     console.error('Error deleting expired visitors:', error);
//   }
// } 
// // Schedule the task to run every day at midnight
// cron.schedule('*/60 * * * * *', deleteExpiredVisitors);
// cron.schedule('0 0 * * *', deleteExpiredVisitors);
  
// // Delete API endpoint with automatic deletion of visitors whose exitDate has passed
// router.delete('/deleteExpiredDateVisitors', async (req, res) => {
//     try {
//       // Find visitors with exitDate less than or equal to current date
//       const expiredVisitors = await VisitorRegistration.find({
//         exitDate: { $lt: new Date() },
//       });
  
//       // Delete expired visitors
//       for (const visitor of expiredVisitors) {
//         await VisitorRegistration.findByIdAndDelete(visitor._id);
//         console.log(`Visitor ${visitor.name} deleted.`);
//       }
  
//       return res.send({ message: 'Expired visitors deleted successfully' });
//     } catch (error) {
//       return res.status(500).send({ error: 'Could not delete expired visitors' });
//     }
// });

//Update visitor----------------
router.put('/updateVisitorRegistration/:id', upload.single('file'), async (req, res) => {
  const id = req.params.id;
  const { visiterId, name, email, mobile, contactPerson, entryDate, exitDate } = req.body;
  
  try {
    let updateFields = {
    visiterId,
      name,
      email,
      mobile,
      contactPerson,
      entryDate,
      exitDate
    };

    // Check if a new file is uploaded and update the file field accordingly
    if (req.file) {
      updateFields.file = {
        filename: req.file.originalname, 
        data: req.file.buffer
    }
    }
    const visitorRegistration = await VisitorRegistration.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    if (!visitorRegistration) {
      res.status(404).send('Visitor not found');
    } else {
    // Create a notification message for the updated employee
    const notificationMessage = `Visitor with ID "${visitorRegistration.visitorId}" and name "${visitorRegistration.name}" has been updated.`;

    // Emit the notification via Socket.IO to all connected clients
    req.app.get('io').emit('updateNotification', {
      message: notificationMessage,
      updatedVisitor: visitorRegistration,
    });

    // Send the response with the updated registration and notification message
    res.send({
      message: 'Visitor updated successfully',
      notification: notificationMessage,
      updatedRegistration: visitorRegistration
    });
  }
} catch (error) {
  console.error(error);
  res.status(500).send('Error updating visitor');
}
});


module.exports = router