import express, { Application, NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import helmet from "helmet";
import appModule from "./app.module";

export default (app: Application) => {
  const allowedOrigins: string[] = [
    "http://localhost:5173"
  ];

  const corsOptions: object = {
    origin: (origin: any, callback: any) => {
      if (!origin || origin === "null" || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    optionsSuccessState: 200,
  };

  app.use(helmet());
  app.use(
    express.json({
      limit: "75mb",
    })
  );
  app.use(
    express.urlencoded({
      extended: true,
    })
  );

  app.use("/v0/public", express.static("cdn"));
  app.use(cors(corsOptions));
  app.use(cookieParser());
  app.use(
    morgan(process.env.NODE_ENV === "development" ? "dev" : "combined")
  );

  app.use(async (req: Request | any, _res: Response, next: NextFunction) => {
    // get langouage of headers
    req.lang =
      req.headers["accept-language"] === "ar" ||
        req.headers["accept-language"] === "en"
        ? req.headers["accept-language"]
        : ("en" as string);
    req.mobileApp =
      req.headers["app"] === "app" ? "app" : (req.headers["app"] as string);
    req.clientIP =
      req.headers["cf-connecting-ip"] ||
      req.headers["x-real-ip"] ||
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      ("" as string);
    req.currency = req.headers["x-currency"]
      ? req.headers["x-currency"]
      : ("EGP" as string);

    if (req.path === "/metrics") {
      return next();
    }

    next();
  });
  appModule(app);
};
