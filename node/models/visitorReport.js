const mongoose = require('mongoose')
mongoose.set('strictQuery', true);


const visitorReportSchema = mongoose.Schema({
date:String,
visitorId:String,
name:String,
contactPerson:String,
intime:String,
outtime:String,
totaltime:String

})
        
    
const VisitorReport = mongoose.model('VisitorReport',visitorReportSchema)

module.exports= VisitorReport
