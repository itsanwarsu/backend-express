// Create
const Product = require("../models/Product");


exports.createProduct = async (req, res) => {
  try {

    const product = await Product.create(req.body);

    res.status(201).json(product);

  } catch(error) {

    res.status(500).json({
      message: error.message
    });

  }
};

// Read
exports.getProducts = async (req,res)=>{

  try{

    const products = await Product.find();

    res.json(products);

  }catch(error){

    res.status(500).json({
      message:error.message
    });

  }

};

// Read one
exports.getProduct = async(req,res)=>{

try{

const product = await Product.findById(req.params.id);

res.json(product);


}catch(error){

res.status(500).json({
message:error.message
});

}

};

// Update
exports.updateProduct = async(req,res)=>{

try{

const product = await Product.findByIdAndUpdate(
req.params.id,
req.body,
{
new:true
}
);


res.json(product);


}catch(error){

res.status(500).json({
message:error.message
});

}

};

// Delete
exports.deleteProduct = async(req,res)=>{

try{

await Product.findByIdAndDelete(req.params.id);


res.json({
message:"Product deleted"
});


}catch(error){

res.status(500).json({
message:error.message
});

}

};

