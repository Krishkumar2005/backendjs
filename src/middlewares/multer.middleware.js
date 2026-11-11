import multer from "multer"

const storage = multer.diskStorage({

  destination: function (req, file, cb) {
    cb(null, "./public/temp") // cb mean callback
  },
  filename: function (req, file, cb) {
    //const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    //cb(null, file.fieldname + '-' + uniqueSuffix)
    cb(null, file.originalname) // save the file with its original name
  }
})
  
export const upload = multer({
  storage,
})