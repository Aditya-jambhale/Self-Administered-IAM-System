const cookieParser = (req, res, next) => {
  const rawCookies = req.headers.cookie;
  req.cookies = {};
  if (rawCookies) {
    rawCookies.split(";").forEach((cookie) => {
      const parts = cookie.split("=");
      const name = parts[0].trim();
      const value = parts.slice(1).join("=").trim();
      req.cookies[name] = decodeURIComponent(value);
    });
  }
  next();
};

export default cookieParser;
