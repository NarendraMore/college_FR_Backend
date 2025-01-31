const mongoose = require('mongoose')
mongoose.set('strictQuery', true);


const studentRegistrationSchema = mongoose.Schema({
    stdId:{ type : String , unique : true, required : true },
    name:String,
    email:{ type : String , unique : true, required : true },
    mobile:{ type : String , unique : true, required : true },
    department:String,
    division:String,
    file: {
        filename: String,
        data: Buffer
    } 
     
})
        
    
const StudentRegistration = mongoose.model('StudentRegistration', studentRegistrationSchema);

module.exports = StudentRegistration;
