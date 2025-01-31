const express = require("express");
const router = new express.Router();
const Events = require("../models/events");
const nodemailer = require('nodemailer');
const path = require('path')
const fs = require('fs')
const mime = require('mime')


// Setup Nodemailer transport for email
// const transporter = nodemailer.createTransport({
//   service: 'gmail', // Or any other service
//   auth: {
//     user: 'boardapp8055@gmail.com',
//     pass: 'qqeaawchpscyanry',
//   },
// });

// Define the POST route to save an event
router.post('/save-event', async (req, res) => {
  try {
    const newEvent = new Events({
      date: req.body.date,
      time: req.body.time,
      event: req.body.event,
      timestamp: new Date(),
      cameratype: req.body.cameratype,
      location: req.body.location,
      imagepath: req.body.imagepath,
      videopath: req.body.videopath,
      status: req.body.status,
    });

    const savedEvent = await newEvent.save();

   // Notify all connected clients using Socket.IO
   req.app.get('io').emit('newEvent', {
    message: `A new event of type "${savedEvent.event}" has been generated at ${savedEvent.location}. Time: ${savedEvent.time}.`,
    eventDetails: savedEvent
  });   

    // Send email to the admin
    const mailOptions = {
      from: 'boardapp8055@gmail.com',
      to: 'morenarendra0106@gmail.com',
      subject: `New Event Generated: ${savedEvent.event}`,
      text: `A new event of type "${savedEvent.event}" has been generated at ${savedEvent.location}. Time: ${savedEvent.time}.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.error(error);
      }
      console.log('Email sent: ' + info.response);
    });

    res.status(201).send(savedEvent);

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


// Setup Nodemailer transport for email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'boardapp8055@gmail.com',
    pass: 'qqeaawchpscyanry',
  },
});

// Function to get the latest unnotified event
async function getLatestUnnotifiedEvent() {
  try {
    // Find the latest event where 'notified' is either false or undefined
    const latestUnnotifiedEvent = await Events.findOne({ notified: { $ne: true } }).sort({ timestamp: -1 });
    return latestUnnotifiedEvent;
  } catch (err) {
    console.error('Error fetching unnotified events: ', err);
    throw err;
  }
}

// GET API to retrieve and notify the latest unnotified event
router.get('/latest-event', async (req, res) => {
  try {
    // Get the latest unnotified event
    const latestEvent = await getLatestUnnotifiedEvent();

    if (!latestEvent) {
      return res.status(404).send({ message: 'No unnotified events found' });
    }

    // Construct the notification message
    const notificationMessage = `A new event of type "${latestEvent.event}" has been generated at ${latestEvent.location}. Time: ${latestEvent.time}.`;

    // Emit notification to all clients via Socket.IO
    req.app.get('io').emit('newEvent', {
      message: notificationMessage,
      eventDetails: latestEvent,
    });

    // Send email to the admin
    const mailOptions = {
      from: 'boardapp8055@gmail.com',
      to: 'morenarendra0106@gmail.com',
      subject: `New Event Generated: ${latestEvent.event}`,
      text: notificationMessage,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.error('Error sending email: ', error);
      }
      console.log('Email sent: ' + info.response);
    });

    // Mark this specific event as notified and save it
    latestEvent.notified = true;
    await latestEvent.save();

    // Send the notified event along with the notification message in the response
    res.status(200).send({
      message: notificationMessage,
      eventDetails: latestEvent,
    });

  } catch (err) {
    res.status(500).send({ error: 'Server Error', details: err.message });
  }
});


// Simple GET API to retrieve events by event name
router.get('/events/:eventName', async (req, res) => {
  try {
    const { eventName } = req.params;

    // Query the Events collection to find events by event name
    const events = await Events.find({ event: eventName }).sort({ timestamp: -1 });

    if (events.length === 0) {
      return res.status(404).send({ message: `No events found for event: ${eventName}` });
    }

    // Directly send the retrieved events array in the response
    res.status(200).send(events);

  } catch (err) {
    res.status(500).send({ error: 'Server Error', details: err.message });
  }
});


//api to get image 
router.get("/getImage/:id", async (req, res) => {
  try {
    const imageData = await Events.findOne({ _id: req.params.id });
    console.log(imageData);
    if (!imageData) {
      res.status(404).send("image data not found");
      return;
    }

    const baseDir = imageData.imagepath;
    const filePath = path.join(baseDir);

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.status(404).send("File not found");
        return;
      }

      const contentType = mime.lookup(filePath);
      const fileStream = fs.createReadStream(filePath);

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${path.basename(filePath)}"`
      );

      fileStream.pipe(res);
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});


//Download csv file............
router.get('/event_csv', async (req, res) => {
  try {
    const { startTimestamp, endTimestamp } = req.query;

    if (!startTimestamp || !endTimestamp) {
      return res.status(400).json({ message: 'startTimestamp and endTimestamp are required' });
    }

    // Convert ISO string timestamps to Date objects
    const startDate = new Date(startTimestamp);
    const endDate = new Date(endTimestamp);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    // Build query for timestamp range
    let query = {
      timestamp: { $gte: startDate, $lte: endDate }
    };

    // Retrieve events data within the given range
    const data = await Events.find(query);

    if (data.length === 0) {
      return res.status(404).json({ message: 'No data found' });
    }

    // Format CSV data with headers
    const csvData = [
      ['Date','Time', 'Event', 'Cameratype', 'Location'],
      ...data.map(row => [
        row.date,
        row.time,
        row.event,
        row.cameratype,
        row.location
      ])
    ];

    // Create CSV file in-memory
    const csvString = csvData.map(row => row.join(',')).join('\n');

    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="report_data.csv"');

    // Send CSV data as the response
    res.send(csvString);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;

