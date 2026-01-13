import { NextFunction, Request, Response } from "express";
import axios from "axios";
import bcrypt from 'bcryptjs'
import { asyncHandler } from "../../utils/asyncHandler.utils";
import ServerError from "../../utils/api.errors.utils";
import { accountToken } from "../../utils/JWT/token.jwt";
import { UserModel } from "../../schema/user.schema";

export const googleController = asyncHandler(
     async (req: Request, res: Response, next: NextFunction) => {
          const { access_token } = req.body
          console.log(req.body);

          const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${access_token}` } });

          if (!response.data) {
               next(new ServerError("Google data verification failed", 401))
               return
          }

          const googleUser = await response.data;
          const cUser = await UserModel.findOne({ status: "active", email: googleUser.email.toLowerCase() }, { _id: 1 })
          if (cUser) {
               const token = accountToken(cUser?._id);
               res.cookie("access_token", token, { httpOnly: true, secure: true, sameSite: "none", maxAge: 1000 * 60 * 60 * 24 * 1 });
               res.status(201).json({ code: 201, status: "Created", message: "User created successfully", account: "active", token })
               return
          }

          const outputString = googleUser.name.replace(/\s/g, "-");
          const finalName = outputString + Math.floor(Math.random() * 10000001);

          const password = googleUser.name + googleUser.id + googleUser.email + googleUser.given_name + googleUser.family_name;

          const salt = await bcrypt.genSalt(10);
          const hash = await bcrypt.hash(password, salt);


          const nameArray = googleUser.name.split(' ')
          const firstName = nameArray[0]
          const lastName = nameArray[nameArray.length - 1]

          const newUser = await UserModel.create({
               fullname: firstName + " " + lastName,
               email: googleUser.email,
               password: hash,
               username: finalName,
               googleId: googleUser.id,
               avatar: googleUser.picture,
               Verified: true,
          })

          const token = accountToken(String(newUser._id))

          res.cookie("access_token", token, { httpOnly: true, secure: true, sameSite: "none", maxAge: 1000 * 60 * 60 * 24 * 1 });
          res.status(201).json({ code: 201, status: "Created", message: "User created successfully", account: "pending", token })
          return
     }
)
