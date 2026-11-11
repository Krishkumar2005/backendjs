// second way, promise wala

const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
        .catch((err) => next(err))
    } 
}



// first way of try and catch


// it is a wrapper function, jo hum har jagah use karenge
//it is also a super/higher order function jo ek function ko as a variable treat karke parameter me 
//leta hai aur return bhi as a function karta hai

// const asyncHandler = () => {}
// const asyncHandler = (fn) => { () => {} }
// const asyncHandler = (fn) => async () => {}


// const asyncHandler = (fn) => async (req, res, next) => {
//     try{
//         await fn(req, res, next)
//     } catch(err){
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         })
//     }
// }


export {asyncHandler}