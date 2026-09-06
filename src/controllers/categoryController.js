import categoryModel from "../models/categoryModel.js"

export const getCategory = async(req, res) => {
    try {
        const allCategory = await categoryModel.find({});
        
        if (allCategory.length > 0) {
            res.status(200).json({
                success: true,
                data: allCategory,
                message: "Categories fetched successfully"
            });
        } else {
            res.status(200).json({
                success: true,
                data: [],
                message: "No categories found"
            });
        }
    } catch (error) {
        console.log("Error in getCategory controller:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}