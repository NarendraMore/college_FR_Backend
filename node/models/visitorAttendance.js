const mongoose = require('mongoose')
mongoose.set('strictQuery', true);


const visitorAttendanceSchema = mongoose.Schema({
visitorId:String ,
building_ID: Number,
city_ID: Number,
readerno: Number,
date: String,
time: String
})
      
    
const VisitorAttendance = mongoose.model('VisitorAttendance',visitorAttendanceSchema)

module.exports= VisitorAttendance