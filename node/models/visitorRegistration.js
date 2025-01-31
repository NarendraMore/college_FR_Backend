const mongoose = require('mongoose')
mongoose.set('strictQuery', true);


const visitorRegistrationSchema = mongoose.Schema({
    visitorId:{ type : String , unique : true, required : true },
    name:String,
    email:{ type : String , unique : true, required : true },
    mobile:{ type : String , unique : true, required : true },
    contactPerson:String,
    entryDate:String,
    exitDate:String,
    file: {
        filename: String,
        data: Buffer
    } 
     
})
        
    
const VisitorRegistration = mongoose.model('VisitorRegistration',visitorRegistrationSchema)

module.exports= VisitorRegistration
