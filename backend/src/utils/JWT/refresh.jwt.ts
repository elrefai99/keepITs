import jwt from "jsonwebtoken";

export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET as string;

export const refreshToken = (id: any) => {
  return jwt.sign({ _id: id }, REFRESH_TOKEN_SECRET, { expiresIn: "7d", });
};
