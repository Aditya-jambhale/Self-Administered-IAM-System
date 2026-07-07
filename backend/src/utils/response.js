export const sendSuccess = (res, data, statusCode = 200) => {
  res.status(statusCode).json({ success: true, data });
};

export const sendOk = (res) => {
  res.status(200).json({ success: true, message: "OK" });
};
