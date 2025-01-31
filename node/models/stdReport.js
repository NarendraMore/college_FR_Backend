const mongoose = require('mongoose')
mongoose.set('strictQuery', true);


const stdReportSchema = mongoose.Schema({
date:String,
stdId:String,
name:String,
department:String,
intime:String,
outtime:String,
totaltime:String,
breaktime:String,
// status: { type: String, default: 'absent' } 
// camreraLocation:String
})
        
    
const StdReport = mongoose.model('StdReport',stdReportSchema)

module.exports= StdReport
