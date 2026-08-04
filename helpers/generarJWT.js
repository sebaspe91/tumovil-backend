import jwt from "jsonwebtoken";

const generarJWT = id => {
    return jwt.sign({id}, process.env.JWT_SECRET, {
        expiresIn: "30d", // expira en 30 dias el token, cierra sesion
    });
}

export default generarJWT;