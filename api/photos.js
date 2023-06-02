/*
 * API sub-router for businesses collection endpoints.
 */

const { Router } = require('express')
const { getChannel, connectToRabbitMQ } = require('../lib/rabbitmq')
const { validateAgainstSchema } = require('../lib/validation')
const {
  PhotoSchema,
  getPhotoInfoById,
  savePhotoInfo,
  savePhotoFile,
  removeUploadedFile,
  getPhotoDownloadStreamById,
  getPhotoById,
  getThumbDownloadStreamById,
  getThumbInfoById
} = require('../models/photo')

const router = Router()

const photoTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
}

const multer = require('multer');
const upload = multer({ dest: `${__dirname}/../uploads` });


/*
 * POST /photos - Route to create a new photo.
 */
router.post('/', upload.single('photo'), async (req, res, next) => {
  // console.log("  -- req.file:", req.file)
  const body = JSON.parse(req.body.data)
  // console.log("  -- req.body:", body)

  if (validateAgainstSchema(body, PhotoSchema) && req.file) {
    try {
      const photo = {
        contentType: req.file.mimetype,
        filename: req.file.filename,
        path: req.file.path,
        userId: body.userId
      }

      const id = await savePhotoFile(photo)
      const channel = getChannel();
      // console.log("id inserted", id)
      channel.sendToQueue('photos', Buffer.from(id.toString()));
      await removeUploadedFile(photo)
      res.status(200).send({
        id: id,
        links: {
          photo: `/photos/${id}`,
          business: `/businesses/${body.businessId}`
        }
      })
    } catch (err) {
      console.error(err)
      res.status(500).send({
        error: "Error inserting photo into DB.  Please try again later."
      })
    }
  } else {
    res.status(400).send({
      error: "Request body is not a valid photo object with userId"
    })
  }
})

/*
 * GET /photos/{id} - Route to fetch info about a specific photo.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const photo = await getPhotoInfoById(req.params.id)
    // console.log(" -- photo:", photo)
    if (photo) {
      delete photo.path;
      const resBody = {
        _id: photo._id,
        url: `/photos/media/${photo.filename}`,
        contentType: photo.metadata.contentType,
        userId: photo.metadata.userId,
        dimensions: photo.metadata.dimensions
      }
      res.status(200).send(resBody)
    } else {
      next()
    }
  } catch (err) {
    console.error(err)
    res.status(500).send({
      error: "Unable to fetch photo.  Please try again later."
    })
  }
})


router.get('/media/:id', async (req, res, next) => {
  getPhotoDownloadStreamById(req.params.id)
  .on('file', (file) => {
    res.status(200).type(file.metadata.contentType);
    console.log(file)
  }).on('error', (err) => {
    if (err.code === 'ENOENT') {
      next();
    } else {
      next(err);
    }
  }).pipe(res);
})

router.get('/thumbs/:id', async (req, res, next) => {
  try {
    const thumb = await getThumbInfoById(req.params.id)
    // console.log(" -- thumb:", thumb)
    if (thumb) {
      delete thumb.path;
      const resBody = {
        _id: thumb._id,
        url: `/photos/media/thumbs/${thumb.filename}`,
        // contentType: thumb.metadata.contentType,
        // userId: thumb.metadata.userId,
        // dimensions: thumb.metadata.dimensions
      }
      res.status(200).send(resBody)
    } else {
      next()
    }
  } catch (err) {
    console.error(err)
    res.status(500).send({
      error: "Unable to fetch photo.  Please try again later."
    })
  }
})

router.get('/media/thumbs/:id', async (req, res, next) => {
  getThumbDownloadStreamById(req.params.id)
  .on('file', (file) => {
    console.log("cont", file)
    res.status(200).type(file.metadata.contentType);
  }).on('error', (err) => {
    if (err.code === 'ENOENT') {
      next();
    } else {
      next(err);
    }
  }).pipe(res);
})

module.exports = router
