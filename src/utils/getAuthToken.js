import jwt from "jsonwebtoken"
export const generateAcessToken = (user)=>{
    const acessToken = jwt.sign({id:user._id,email:user.email,role:user.role},process.env.JWT_ACCESS_SECRET,{expiresIn:"7d"});
    return acessToken;
}

export const generateRefreshToken = (user)=>{
    return jwt.sign({id:user._id},process.env.JWT_REFRESH_TOKEN,{expiresIn:"7d"})

}