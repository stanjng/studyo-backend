// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for topics
const Topic = require('../models/topic.js')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { topic: { title: '', text: 'foo' } } -> { topic: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// INDEX
// GET /topics
router.get('/topics', requireToken, (req, res, next) => {
  Topic.find()
    .then(topics => {
      // `topics` will be an array of Mongoose documents
      // we want to convert each one to a POJO, so we use `.map` to
      // apply `.toObject` to each one
      return topics.map(topic => topic.toObject())
    })
    // respond with status 200 and JSON of the topics
    .then(topics => res.json({
      topics
    }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// SHOW
// GET /topics/5a7db6c74d55bc51bdf39793
router.get('/topics/:id', requireToken, (req, res, next) => {
  // req.params.id will be set based on the `:id` in the route
  Topic.findById(req.params.id)
    .then(handle404)
    // if `findById` is succesful, respond with 200 and "topic" JSON
    .then(topic => res.status(200).json({ topic: topic.toObject() }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// CREATE
// POST /topics
router.post('/topics', requireToken, (req, res, next) => {
  // set owner of new topic to be current user
  req.body.topic.owner = req.user.id

  Topic.create(req.body.topic)
    // respond to succesful `create` with status 201 and JSON of new "topic"
    .then(topic => {
      res.status(201).json({ topic: topic.toObject() })
    })
    // if an error occurs, pass it off to our error handler
    // the error handler needs the error message and the `res` object so that it
    // can send an error message back to the client
    .catch(next)
})

// UPDATE
// PATCH /topics/5a7db6c74d55bc51bdf39793
router.patch('/topics/:id', requireToken, removeBlanks, (req, res, next) => {
  // if the client attempts to change the `owner` property by including a new
  // owner, prevent that by deleting that key/value pair
  delete req.body.topic.owner

  Topic.findById(req.params.id)
    .then(handle404)
    .then(topic => {
      // pass the `req` object and the Mongoose record to `requireOwnership`
      // it will throw an error if the current user isn't the owner
      requireOwnership(req, topic)

      // pass the result of Mongoose's `.update` to the next `.then`
      return topic.updateOne(req.body.topic)
    })
    // if that succeeded, return 204 and no JSON
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// DESTROY
// DELETE /topics/5a7db6c74d55bc51bdf39793
router.delete('/topics/:id', requireToken, (req, res, next) => {
  Topic.findById(req.params.id)
    .then(handle404)
    .then(topic => {
      // throw an error if current user doesn't own `topic`
      requireOwnership(req, topic)
      // delete the topic ONLY IF the above didn't throw
      topic.deleteOne()
    })
    // send back 204 and no content if the deletion succeeded
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

module.exports = router
