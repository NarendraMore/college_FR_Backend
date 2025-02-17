const mongoose = require('mongoose')
mongoose.set('strictQuery', true);


const registrationSchema = mongoose.Schema({
    empid:{ type : String , unique : true, required : true },
    name:String,
    email:{ type : String , unique : true, required : true },
    mobile:{ type : String , unique : true, required : true },
    department:String,
    joiningdate:String,
    password: { type: String, required: true, minlength: 10},
    file: {
        filename: String,
        data: Buffer
    } 
     
})
        
    
const Registration = mongoose.model('Registration',registrationSchema)

module.exports= Registration
