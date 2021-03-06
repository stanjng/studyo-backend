const mongoose = require('mongoose')

const questionSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Question', questionSchema)
