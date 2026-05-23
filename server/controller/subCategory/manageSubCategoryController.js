const Category = require("../../model/categorySchema");
const SubCategory = require("../../model/subCategorySchema");

async function manageSubCategoryController(req, res) {
    try {
        const { id } = req.params;

        if (req.method === "DELETE") {
            const deletedSubCategory = await SubCategory.findByIdAndDelete(id);

            if (!deletedSubCategory) {
                return res.status(404).json({
                    success: false,
                    message: "Subcategory not found"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Subcategory deleted successfully"
            });
        }

        if (req.method !== "PUT" && req.method !== "PATCH") {
            return res.status(405).json({
                success: false,
                message: "Method not allowed"
            });
        }

        const { name, category } = req.body;
        const existingSubCategory = await SubCategory.findById(id);

        if (!existingSubCategory) {
            return res.status(404).json({
                success: false,
                message: "Subcategory not found"
            });
        }

        if (category) {
            const existingCategory = await Category.findById(category);

            if (!existingCategory) {
                return res.status(404).json({
                    success: false,
                    message: "Category not found"
                });
            }

            existingSubCategory.category = category;
        }

        if (name) {
            const trimmedName = name.trim();
            const duplicateSubCategory = await SubCategory.findOne({
                _id: { $ne: id },
                name: trimmedName
            });

            if (duplicateSubCategory) {
                return res.status(400).json({
                    success: false,
                    message: "Subcategory with this name already exists"
                });
            }

            existingSubCategory.name = trimmedName;
        }

        const updatedSubCategory = await existingSubCategory.save();
        await updatedSubCategory.populate("category", "name");

        return res.status(200).json({
            success: true,
            message: "Subcategory updated successfully",
            data: updatedSubCategory
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

module.exports = manageSubCategoryController;
