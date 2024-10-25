const mongoose  = require("mongoose");

const evacuationTipsSchema = new mongoose.Schema({
   title: {
        type: String,
        required: true
    },
    tips: [String]
});

const EvacuationTips = mongoose.model('EvacuationTips', evacuationTipsSchema);
module.exports = EvacuationTips;