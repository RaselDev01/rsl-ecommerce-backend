const Category = require("../../model/categorySchema");

async function updateCategoryController(req, res) {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const existingCategory = await Category.findById(id);

        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                error: "Category not found",
            });
        };

        existingCategory.name = name || existingCategory.name;
        existingCategory.description = description || existingCategory.description;

        const updatedCategory = await existingCategory.save();

        return res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: updatedCategory,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
};

module.exports = updateCategoryController;