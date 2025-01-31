const mongoose = require('mongoose')
mongoose.set('strictQuery', true);


const eventsSchema = mongoose.Schema({
    date:String,
    time:String,
    event:String,
    timestamp:Date,
    cameratype:String,
    location:String,
    imagepath:String,
    videopath:String,
    status:Boolean,
    notified: { type: Boolean, default: false }
})
    
const Events = mongoose.model('Events',eventsSchema)

module.exports= Events