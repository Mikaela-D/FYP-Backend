// C:\Users\Mikaela\FYP-Backend\routes\customers.js

let express = require("express");
let router = express.Router();
let mongoose = require("mongoose");
let Schema = mongoose.Schema;

// Use the default mongoose instance
mongoose.connect("mongodb://127.0.0.1:27017/db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let customerSchema = new Schema(
  {
    customerId: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    }, // Auto-generate if not provided
    customerName: String,
    customerPhone: String,
    customerEmail: { type: String, unique: true },
    persona: { type: String, default: "" },
  },
  { collection: "customers" }
);

let Customers = mongoose.model("customers", customerSchema);

// Create Customer
router.post("/createCustomer", async function (req, res) {
  let retVal = { response: "fail" };
  let { customerName, customerPhone, customerEmail, persona } = req.body;

  try {
    let customer = await Customers.findOne({ customerEmail });

    if (!customer) {
      customer = await Customers.create({
        customerId: new mongoose.Types.ObjectId().toString(), // Explicitly setting customerId
        customerName,
        customerPhone,
        customerEmail,
        persona,
      });
      retVal = { response: "success", customerId: customer._id };
    } else {
      // Update persona if provided
      if (persona && persona.trim()) {
        customer.persona = persona;
        await customer.save();
        retVal = {
          response: "success",
          customerId: customer._id,
          updated: true,
        };
      } else {
        retVal.error = "Customer already exists";
      }
    }
  } catch (err) {
    console.error("Error creating customer:", err);
    retVal.error = err.message;
  }

  res.json(retVal);
});

// Fetch Customers
router.get("/customers", async function (req, res) {
  try {
    const customers = await Customers.find().lean();
    res.json({ customers });
  } catch (err) {
    console.error("Error fetching customers:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
