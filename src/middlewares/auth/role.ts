//check the roles for the authenticated user? 
//adds another layer of protection to the endpoints thanks to the RBAC achitecture.

import { UserRequest } from "../../util/types/authUser"
import { NextFunction, Response} from "express"

export const roleGuard = (allowedRoles: string[]) => {
    return (req: UserRequest, res: Response, next: NextFunction) => {
        if (!req.user || !req.user.role || !allowedRoles.includes(req.user.role.name)) {
            res.status(403).json({
                message: "Access denied: do not have the facilities for that men"
            });
            return;
        }
        next();
    };
};

export const adminGuard =  roleGuard(["bossy"]); //full control
export const investorGuard =  roleGuard(["user"]); 


 