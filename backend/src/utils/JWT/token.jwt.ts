import jwt from "jsonwebtoken";

export const SECRET_KEY = process.env.ACCESS_TOKEN_SECRET as string;

export const accountToken = (id: any) => {
  return jwt.sign({ _id: id }, SECRET_KEY, { expiresIn: "1d", });
};
