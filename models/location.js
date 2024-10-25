const mongoose  = require("mongoose");

const LocationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required:true
        },
        coordinates: {
            type: [Number],
            required: true,
            index: '2dsphere'
        }
    }
});

const Location = mongoose.model('Location', LocationSchema)
module.exports = Location;