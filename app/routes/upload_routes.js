const express = require('express')
const multer = require('multer')
const storage = multer.memoryStorage()
const multerUpload = multer({
  storage: storage
})

const passport = require('passport')

const Upload = require('../models/upload.js')
const Topic = require('../models/topic.js')

const uploadApi = require('../../lib/uploadApi.js')

const customErrors = require('../../lib/custom_errors')

const handle404 = customErrors.handle404

const requireOwnership = customErrors.requireOwnership

const removeBlanks = require('../../lib/remove_blank_fields')

const requireToken = passport.authenticate('bearer', {
  session: false
})

const router = express.Router()

// INDEX
router.get('/uploads', requireToken, (req, res, next) => {
  Upload.find()
    .then(uploads => {
      return uploads.map(upload => upload.toObject())
    })
    .then(uploads => res.status(200).json({
      uploads: uploads
    }))
    .catch(next)
})

// SHOW
router.get('/topics/:id/uploads/:qid/', requireToken, (req, res, next) => {
  console.log(req.params)
  Upload.findById(req.params.qid)
    .then(handle404)
    .then(upload => res.status(200).json({
      upload: upload.toObject()
    }))
    .catch(next)
})

// CREATE
router.post('/topics/:id/uploads', multerUpload.single('file'), requireToken, (req, res, next) => {
  console.log('req.file is', req.file)
  console.log('req.user._id is', req.user._id)
  // 1. define variable to hold our upload because the promise chain creates its own scope
  console.log('req.body is', req.body)
  let createdUpload

  uploadApi(req.file)
    .then(awsResponse => {
      return Upload.create(
        req.body.upload,
        {
          fileName: awsResponse.key,
          fileType: req.file.mimetype,
          description: req.body.description,
          owner: req.user.id
        })
    })
    .then(upload => {
      // 3. store the upload in our variable
      createdUpload = upload
      // 4. find the topic, return it to continue the chain
      // Populate uploads to show params
      return Topic.findById(req.params.id).populate('upload')
    })
    .then(topic => {
      // 5. push the `createdQ`'s id into the topic we found
      topic.uploads.push(createdUpload)
      // 6. Save the topic! Return it to continue the chain
      return topic.save()
    })
    .then(upload => {
      res.status(201).json({
        upload: upload.toObject()
      })
    })
    .catch(next)
})

// PATCH
router.patch('/topics/:id/uploads/:qid', requireToken, removeBlanks, (req, res, next) => {
  Upload.findById(req.params.id)
    .then(handle404)
    .then(upload => {
      requireOwnership(req, upload)

      return upload.updateOne(req.body.upload)
    })
    .then(() => res.sendStatus(204))
    .catch(next)
})

// DESTROY
router.delete('/topics/:id/uploads/:qid', requireToken, (req, res, next) => {
  Upload.findById(req.params.qid)
    .then(handle404)
    .then(upload => {
      requireOwnership(req, upload)
      upload.deleteOne()
    })
    .then(() => res.sendStatus(204))
    .catch(next)
})

module.exports = router
