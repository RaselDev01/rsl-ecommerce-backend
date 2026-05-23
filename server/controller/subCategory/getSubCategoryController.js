const SubCategory = require("../../model/subCategorySchema");

async function getSubCategoryController(req, res) {
    try {
        const subCategories = await SubCategory.find().populate("category", "name");
        res.status(200).json({
            success: true,
            message: "Sub-categories fetched successfully",
            data: subCategories
        });



    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching sub-categories",
            error
        });
    }
}


module.exports = getSubCategoryController;