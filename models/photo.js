/*
 * Photo schema and data accessor methods.
 */

const { ObjectId, GridFSBucket } = require('mongodb')
const fs = require("node:fs")

const { getDbReference } = require('../lib/mongo')

/*
 * Schema describing required/optional fields of a photo object.
 */
const PhotoSchema = {
  userId: { required: true },
  businessId: { required: true },
  caption: { required: false }
}
exports.PhotoSchema = PhotoSchema

const photoTypes = {
  "image/jpeg": "jpg",
  "image/png": "png"
}
exports.photoTypes = photoTypes

async function savePhotoFile(photo) {
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
exports.savePhotoFile = savePhotoFile

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
exports.removeUploadedFile = removeUploadedFile

function removeUploadedFileByPath(path) {
  return new Promise((resolve, reject) => {
    fs.unlink(path, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
exports.removeUploadedFileByPath = removeUploadedFileByPath

async function getPhotoInfoById(id) {
  const db = getDbReference();
  const bucket = new GridFSBucket(db, { bucketName: 'photos' });  
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await bucket.find({ _id: new ObjectId(id) }).toArray();
    return results[0];
  }
}
exports.getPhotoInfoById = getPhotoInfoById

function getPhotoDownloadStreamById(id) {
  const db = getDbReference()
  const bucket = new GridFSBucket(db, { bucketName: "photos" })

  if (!ObjectId.isValid(id)) {
    return null
  } else {

    return bucket.openDownloadStream(new ObjectId(id))
  }
}
exports.getPhotoDownloadStreamById = getPhotoDownloadStreamById

async function addThumbIdToPhoto(id, thumbId) {
  const db = getDbReference()
  const collection = db.collection('photos.files')

  if (!ObjectId.isValid(id)) {
      return null 
  } else {
      const result = await collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { "metadata.thumbId": ObjectId(thumbId) }}
      )
      return result.matchedCount > 0
  }
}
exports.addThumbIdToPhoto = addThumbIdToPhoto

function getThumbDownloadStreamById(id) {
  const db = getDbReference()
  const bucket = new GridFSBucket(db, { bucketName: 'thumbs'})
  return bucket.openDownloadStream(new ObjectId(id))
}
exports.getThumbDownloadStreamById = getThumbDownloadStreamById

async function getThumbIdFromPhoto(id) {
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
    return results[0].thumbId;
  }
}
exports.getThumbIdFromPhoto = getThumbIdFromPhoto

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
exports.saveThumbFile = saveThumbFile
