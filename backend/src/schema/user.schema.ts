import { model, Schema } from "mongoose";

const userSchema = new Schema({
     fullname: {
          type: String,
          required: true
     },
     email: {
          type: String,
          required: true,
          unique: true
     },
     password: {
          type: String,
          required: true
     },
     username: {
          type: String,
          required: true,
          unique: true
     },
     googleId: {
          type: String,
          required: true
     },
     avatar: {
          type: String,
          required: true
     },
     Verified: {
          type: Boolean,
          required: true,
          default: false
     },
     status: {
          type: String,
          required: true,
          default: "active"
     },
}, {
     timestamps: true
})

export const UserModel = model("User", userSchema)
