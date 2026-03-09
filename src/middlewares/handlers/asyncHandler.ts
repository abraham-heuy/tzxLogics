import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * @desc Avoid the problem of try/catch not automatically passed to asynchronous threads
 * @param fn The asynchronous function to wrap
 * @returns A function that executes the async function and catches the error
 */
const asyncHandler = <R extends Request = Request>(
  fn: (req: R, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req as R, res, next)).catch(next);
  };
};

export default asyncHandler;
