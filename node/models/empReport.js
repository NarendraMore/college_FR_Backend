const mongoose = require('mongoose')
mongoose.set('strictQuery', true);


const empReportSchema = mongoose.Schema({
date:String,
empid:String,
name:String,
department:String,
intime:String,
outtime:String,
totaltime:String,
breaktime:String,
// status: { type: String, default: 'absent' } 
// camreraLocation:String
})
        
    
const EmpReport = mongoose.model('EmpReport',empReportSchema)

module.exports= EmpReport
