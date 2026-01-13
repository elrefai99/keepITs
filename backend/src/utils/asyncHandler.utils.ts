import { Request, Response, NextFunction } from "express";
import { ExtendedError, Socket } from "socket.io";
import { logger } from "./logger";

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
    async (req: Request, res: Response, next: NextFunction) =>
      await fn(req, res, next).catch((err: any) => {
        if (err.statusCode === 500 || !err.statusCode) {
          logger.error({
            message: err.message,
            stack: err.stack,
            method: req.method,
            url: req.originalUrl,
          });
        }
        next(err);
      });

export const asyncSocketHandler = (
  fn: (
    socket: Socket,
    next: (err?: ExtendedError) => void
  ) => Promise<void> | void
) => {
  return (socket: Socket, next: (err?: ExtendedError) => void): void => {
    Promise.resolve(fn(socket, next)).catch(next);
  };
};
