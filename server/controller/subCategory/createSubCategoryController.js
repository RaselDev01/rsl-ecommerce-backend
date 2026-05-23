const Category = require("../../model/categorySchema");
const SubCategory = require("../../model/subCategorySchema");

async function createSubCategoryController(req, res) {
    try {
        const { name, category } = req.body;  

        if (!name || !category) {
            return res.status(400).json({ 
                success: false,
                message: "All fields are required" 
            });
        }

        const existingCategory = await Category.findById(category);

        if (!existingCategory) {
            return res.status(404).json({ 
                success: false,
                message: "Category not found" 
            });
        }

        const existingSubCategory = await SubCategory.findOne({ name: name.trim() });
        if (existingSubCategory) {
            return res.status(400).json({ 
                success: false,
                message: "Subcategory with this name already exists" 
            });
        }

        const newSubCategory = new SubCategory({
            name: name.trim(),
            category
        });

        const savedSubCategory = await newSubCategory.save();

        res.status(201).json({ 
            success: true,
            message: "Subcategory created successfully",
            data: savedSubCategory 
        });

    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
}



module.exports = createSubCategoryController;