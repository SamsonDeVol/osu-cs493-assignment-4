/*
 * Photo schema and data accessor methods.
 */

const { ObjectId, GridFSBucket } = require('mongodb')
const fs = require("node:fs")
const Jimp = require("jimp");
const sharp = require('sharp');

const { getDbReference } = require('../lib/mongo')
const { extractValidFields } = require('../lib/validation')

/*
 * Schema describing required/optional fields of a photo object.
 */
const PhotoSchema = {
  userId: { required: true },
  businessId: { required: true },
  caption: { required: false }
}

const ThumbSchema = {

}

// async function savePhotoInfo(photo) {
//   const db = getDbReference()
//   const collection = db.collection('photos')
//   const result = await collection.insertOne(photo)
//   return result.insertedId
// }

async function savePhotoFile(photo) {
  console.log("=== saving photo file: ", photo)
  return new Promise(function (resolve, reject) {
      const db = getDbReference()
      const bucket = new GridFSBucket(db, { bucketName: "photos" })
      const metadata = {
          contentType: photo.contentType,
          userId: photo.userId
      }
      const uploadStream = bucket.openUploadStream(
          photo.filename,
          { metadata: metadata }
      )
      fs.createReadStream(photo.path).pipe(uploadStream)
          .on("error", function (err) {
              reject(err)
          })
          .on("finish", function (result) {
              console.log("== write success, result:", result)
              resolve(result._id)
          })
  })
} 

function removeUploadedFile(file) {
  return new Promise((resolve, reject) => {
    fs.unlink(file.path, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function getPhotoInfoById(id) {
  console.log(" -- getting by id")
  const db = getDbReference();
  const bucket = new GridFSBucket(db, { bucketName: 'photos' });  
  console.log(" -- bucket", bucket)
  console.log(" -- valid id", ObjectId(id))
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await bucket.find({ _id: new ObjectId(id) }).toArray();
    console.log(" -- results ", results)
    return results[0];
  }
}

function getPhotoDownloadStreamById(id) {
  console.log("id", id)
  const db = getDbReference()
  const bucket = new GridFSBucket(db, { bucketName: "photos" })
  return bucket.openDownloadStream(new ObjectId(id))
}

/*
 * Executes a DB query to insert a new photo into the database.  Returns
 * a Promise that resolves to the ID of the newly-created photo entry.
 */
// async function insertNewPhoto(photo) {
//   photo = extractValidFields(photo, PhotoSchema)
//   photo.businessId = ObjectId(photo.businessId)
//   const db = getDbReference()
//   const collection = db.collection('photos')
//   const result = await collection.insertOne(photo)
//   return result.insertedId
// }

/*
 * Executes a DB query to fetch a single specified photo based on its ID.
 * Returns a Promise that resolves to an object containing the requested
 * photo.  If no photo with the specified ID exists, the returned Promise
 * will resolve to null.
 */
async function getPhotoById(id) {
  const db = getDbReference()
  const collection = db.collection('photos.files')
  if (!ObjectId.isValid(id)) {
    return null
  } else {
    const results = await collection
      .find({ _id: new ObjectId(id) })
      .toArray()
    return results[0]
  }
}

function getDownloadStreamById(id) {
  const db = getDbReference()
  const bucket = new GridFSBucket(db, { bucketName: 'photos' })
  if (!ObjectId.isValid(id)) {
      return null
  } else {
      return bucket.openDownloadStream(new ObjectId(id))
  }
}

function getThumbDownloadStreamById(id) {
  const db = getDbReference()
  const bucket = new GridFSBucket(db, { bucketName: 'thumbs'})
  return bucket.openDownloadStream(new ObjectId(id))
}

async function saveThumbFile(thumb) {
  console.log(" == saving thumb", thumb)
  return new Promise(function (resolve, reject) {
      const db = getDbReference()
      const bucket = new GridFSBucket(db, { bucketName: "thumbs" })
      const metadata = {
          contentType: "image/jpeg",
      }
      const uploadStream = bucket.openUploadStream(
          thumb.filename,
          { metadata: metadata }
      )
      fs.createReadStream(thumb.path).pipe(uploadStream)
          .on("error", function (err) {
              reject(err)
          })
          .on("finish", function (result) {
              console.log("== write success, result:", result)
              resolve(result._id)
          })
  })
} 

// console.log(photo)
// return new Promise(function (resolve, reject) {
//     const db = getDbReference()
//     const bucket = new GridFSBucket(db, { bucketName: "photos" })
//     const metadata = {
//         contentType: photo.contentType,
//         userId: photo.userId
//     }
//     const uploadStream = bucket.openUploadStream(
//         photo.filename,
//         { metadata: metadata }
//     )
//     fs.createReadStream(photo.path).pipe(uploadStream)
//         .on("error", function (err) {
//             reject(err)
//         })
//         .on("finish", function (result) {
//             console.log("== write success, result:", result)
//             resolve(result._id)
//         })
// })
// } 


async function resizePhoto(photo) {
  console.log("photo dimensions", photo)
  const thumb = await Jimp.read(photo);
  await thumb.resize(100,100)
  console.log(photo)
  return thumb
}

async function updatePhotoSizeById(id, dimensions) {
  const db = getDbReference()
  const collection = db.collection('photos.files')

  if (!ObjectId.isValid(id)) {
      return null
  } else {
      const result = await collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { "metadata.dimensions": dimensions }}
      )
      return result.matchedCount > 0
  }
}

async function createThumbnail(id, photoData) {
  console.log("pd", photoData)
  const thumb = sharp(photoData).resize(100,100)
  const db = getDbReference()
  const photo = await getPhotoDownloadStreamByFilename(id)
  console.log(" -- photo", photo)
  // const thumb = await resizePhoto(dimensions)
  // console.log(" -- thumber", thumb)s
  await saveThumbFile(thumb)
}

async function getThumbInfoById(id) {
  const db = getDbReference();
  const bucket = new GridFSBucket(db, { bucketName: 'thumbs' });  
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await bucket.find({ _id: new ObjectId(id) }).toArray();
    return results[0];
  }
}

exports.getThumbInfoById = getThumbInfoById
exports.PhotoSchema = PhotoSchema
// exports.savePhotoInfo = savePhotoInfo
exports.savePhotoFile = savePhotoFile
exports.removeUploadedFile = removeUploadedFile
exports.getPhotoInfoById = getPhotoInfoById
// exports.insertNewPhoto = insertNewPhoto
exports.getPhotoById = getPhotoById
exports.getPhotoDownloadStreamById = getPhotoDownloadStreamById
exports.getDownloadStreamById = getDownloadStreamById
exports.createThumbnail = createThumbnail
exports.updatePhotoSizeById = updatePhotoSizeById
exports.saveThumbFile = saveThumbFile
exports.getThumbDownloadStreamById = getThumbDownloadStreamById
