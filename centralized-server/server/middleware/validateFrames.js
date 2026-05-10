const validateFrames = (req, res, next) => {
  const frames = req.files;

  if (!frames || frames.length < 2) {
    return res.status(400).json({
      status: "failed",
      message: "Minimum 2 frames required",
    });
  }

  for (const file of frames) {
    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid file type",
      });
    }
  }

  next();
};

export default validateFrames;
