const express = require("express");
const mongoose = require('mongoose'); // Make sure mongoose is required for ObjectId validation
const cors = require("cors");
const { nanoid } = require('nanoid');
const connectDB = require("./db.js");

// Import User and Sensor Models
const UserModel = require("./models/Users");
const SensorDataModel = require("./models/SensorData");

// --- NEW: Import Inventory Models ---
const ItemModel = require("./models/Item.js");
const RentalModel = require("./models/Rental.js");
const CustomerModel = require("./models/Customer.js"); // Import Customer Model
const PackageModel = require("./models/Package");

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

// ===================================
//      SENSOR DATA ENDPOINTS
// ===================================
const CURRENT_SENSOR_DATA_ID = "60c72b2f9f1b2c3d4e5f6a7b"; // Example fixed ObjectId
const API_PREFIX = '/api';

app.post("/sensorData", async (req, res) => {
  try {
    const { sensorType, position, direction, centimeters, value } = req.body;
    const updateData = { sensorType };

    if (sensorType === "LengthMeasurement") {
      if (typeof centimeters === "undefined" || typeof centimeters !== "number") {
        return res.status(400).json({ success: false, message: "Centimeters value missing or invalid for LengthMeasurement." });
      }
      updateData.centimeters = centimeters;
      updateData.position = position;
    } else if (sensorType === "RotaryEncoder") {
      if (typeof position === "undefined" || typeof direction === "undefined") {
        return res.status(400).json({ success: false, message: "Position or direction missing for RotaryEncoder." });
      }
      updateData.position = position;
      updateData.direction = direction;
    } else if (typeof value !== "undefined") {
      updateData.value = value;
    } else {
      return res.status(400).json({ success: false, message: "Invalid sensorType or missing data." });
    }

    const currentSensorData = await SensorDataModel.findOneAndUpdate(
      { _id: CURRENT_SENSOR_DATA_ID },
      updateData,
      { upsert: true, new: true, runValidators: true }
    );
    res.status(200).json({ success: true, message: "Current sensor data updated", data: currentSensorData });
  } catch (error) {
    console.error("Error receiving sensor data:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join(", ") });
    }
    res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
});

app.get("/sensorData", async (req, res) => {
  try {
    const currentSensorData = await SensorDataModel.findById(CURRENT_SENSOR_DATA_ID);
    if (!currentSensorData) {
      return res.status(404).json({ success: false, message: "No current sensor data found yet." });
    }
    res.status(200).json({ success: true, data: currentSensorData });
  } catch (error) {
    console.error("Error fetching current sensor data:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid ID format for current sensor data." });
    }
    res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
});

// ===================================
//      AUTHENTICATION ENDPOINTS
// ===================================
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "Email not found." });
    }
    // IMPORTANT: Implement bcrypt password comparison here
    if (password !== user.password) { // This is INSECURE for production!
      return res.status(401).json({ success: false, message: "Incorrect password." });
    }
    const token = `dummy_jwt_token_for_${user._id}`; // Replace with actual JWT
    res.status(200).json({ success: true, message: "Logged in successfully", token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
});

// ===================================
//      USER CRUD ENDPOINTS
// ===================================
app.post("/createUser", (req, res) => {
  // IMPORTANT: Add password hashing here before saving user
  UserModel.create(req.body)
    .then((users) => res.json(users))
    .catch((err) => res.status(400).json(err)); // Send proper error status
});

app.get("/", (req, res) => {
  UserModel.find({})
    .then((users) => res.json(users))
    .catch((err) => res.status(500).json(err));
});

app.get("/getUser/:id", (req, res) => {
  const id = req.params.id;
  UserModel.findById({ _id: id })
    .then((users) => res.json(users))
    .catch((err) => res.status(500).json(err));
});

app.put("/updateUser/:id", (req, res) => {
  const id = req.params.id;
  // IMPORTANT: Consider what fields are updatable, handle password update separately
  UserModel.findByIdAndUpdate(
    { _id: id },
    {
      name: req.body.name,
      email: req.body.email,
      age: req.body.age,
    },
    { new: true, runValidators: true } // Return updated doc and run validators
  )
    .then((users) => res.json(users))
    .catch((err) => res.status(400).json(err));
});

app.delete("/deleteUser/:id", (req, res) => {
  const id = req.params.id;
  UserModel.findByIdAndDelete({ _id: id })
    .then((result) => res.json(result))
    .catch((err) => res.status(500).json(err));
});


// =============================================
//      INVENTORY API ENDPOINT (for SingleRent product selection)
// =============================================
// This endpoint is used by SingleRent.tsx to fetch products for the search/selection
app.get(`${API_PREFIX}/inventory`, async (req, res) => {
  try {
    // We use .lean() to ensure the frontend always gets a plain object with a string _id
    const items = await ItemModel.find({}).sort({ name: 1 }).lean();
    res.status(200).json(items);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ message: "Server Error: Could not fetch inventory." });
  }
});


// ===================================
//      RENTAL API ENDPOINTS
// ===================================
// GET ALL RENTALS
// Fetches all rental documents, sorted by most recently created
app.get(`${API_PREFIX}/packages`, async (req, res) => {
  try {
    const packages = await PackageModel.find({}).sort({ price: 1 }).lean();
    res.status(200).json(packages);
  } catch (error) {
    console.error("Error fetching packages:", error);
    res.status(500).json({ message: "Server Error: Could not fetch packages." });
  }
});

app.get(`${API_PREFIX}/rentals`, async (req, res) => {
  try {
    const { customerPhoneNumber, status } = req.query;
    const filter = {};

    if (customerPhoneNumber) {
      // Use a regular expression for a partial match on the phone number within the array
      filter['customerInfo.phoneNumber'] = { $regex: new RegExp(customerPhoneNumber, 'i') };
    }
    if (status) {
      filter.status = status;
    }

    const rentals = await RentalModel.find(filter).sort({ createdAt: -1 }).lean();
    res.status(200).json(rentals);
  } catch (error) {
    console.error("Error fetching rentals:", error);
    res.status(500).json({ message: "Server Error: Could not fetch rentals." });
  }
});


// --- 2. NEW: ADD ITEM TO AN EXISTING RENTAL ---
// This endpoint now handles adding either a single item OR a package.
app.put(`${API_PREFIX}/rentals/:id/addItem`, async (req, res) => {
  const { id } = req.params;
  const { itemId, color, size, packageId } = req.body;

  try {
    let newItemObject = {};

    // --- LOGIC FORK: Determine if adding a package or a single item ---
    
    if (packageId) {
      // --- PACKAGE ADDITION LOGIC ---
      if (!mongoose.Types.ObjectId.isValid(packageId)) {
        return res.status(400).json({ message: "Invalid Package ID format." });
      }
      const rentalPackage = await PackageModel.findById(packageId).lean();
      if (!rentalPackage) {
        return res.status(404).json({ message: "Package not found." });
      }
      
      // Construct the item object representing the package
      newItemObject = {
        name: rentalPackage.name,
        price: rentalPackage.price,
        quantity: 1, // A package is always a single unit
        variation: {
          color: "Package Deal",
          size: "N/A",
          imageUrl: rentalPackage.imageUrl || 'https://placehold.co/100x100/777/FFF?text=Package',
        },
        notes: rentalPackage.inlusions.join(', '), // Store inclusions in notes field
      };

    } else if (itemId) {
      // --- SINGLE ITEM ADDITION LOGIC ---
      if (!mongoose.Types.ObjectId.isValid(itemId)) {
        return res.status(400).json({ message: "Invalid Product ID format." });
      }
      const product = await ItemModel.findOne({ _id: itemId });
      if (!product) {
        return res.status(404).json({ message: "Product to add not found." });
      }
      const targetVariation = product.variations.find(v => v.color === color && v.size === size);
      if (!targetVariation || targetVariation.quantity <= 0) {
        return res.status(400).json({ message: "Selected item variation is out of stock." });
      }
      
      // Construct the item object for the single item
      newItemObject = {
        name: product.name,
        price: product.price,
        quantity: 1,
        variation: {
          color: targetVariation.color,
          size: targetVariation.size,
          imageUrl: targetVariation.imageUrl,
        }
      };

      // Decrement stock ONLY for single items
      await ItemModel.updateOne(
        { _id: itemId, "variations.color": color, "variations.size": size },
        { $inc: { "variations.$.quantity": -1 } }
      );

    } else {
      // If neither a packageId nor an itemId is provided
      return res.status(400).json({ message: "Request must include either an itemId or a packageId." });
    }

    // --- SHARED LOGIC: Update the rental document ---
    // Find the rental by its ID and push the newly created item object into its 'items' array
    const updatedRental = await RentalModel.findByIdAndUpdate(
      id,
      { $push: { items: newItemObject } },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedRental) {
      return res.status(404).json({ message: "Rental to update not found." });
    }

    // Send the complete, updated rental document back to the frontend
    res.status(200).json(updatedRental);

  } catch (error) {
    console.error(`Error adding item to rental ${id}:`, error);
    res.status(500).json({ message: "Server Error." });
  }
});

// GET A SINGLE RENTAL BY ID
app.get(`${API_PREFIX}/rentals/:id`, async (req, res) => {
  try {
    // FIX: Added .lean() here as well for consistency.
    const rental = await RentalModel.findById(req.params.id).lean();
    if (!rental) {
      return res.status(404).json({ message: "Rental not found." });
    }
    res.status(200).json(rental);
  } catch (error) {
    console.error(`Error fetching rental ${req.params.id}:`, error);
    res.status(500).json({ message: "Server Error." });
  }
});

// CREATE A NEW RENTAL
app.post(`${API_PREFIX}/rentals`, async (req, res) => {
  // 1. Destructure the payload. Note that dates are NOT received from the frontend.
  const { itemId, color, size, customerInfo } = req.body;

  // 2. Validate required data
  if (!itemId || !color || !size || !customerInfo) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  // 3. Safety check for the ObjectId
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    return res.status(400).json({ message: "Invalid Product ID format." });
  }

  try {
    // 4. Find the item and check stock
    const product = await ItemModel.findOne({ 
      _id: itemId,
      "variations": { "$elemMatch": { color: color, size: size } }
    });
    
    if (!product) {
      return res.status(404).json({ message: "Product or variation not found." });
    }

    const targetVariation = product.variations.find(v => v.color === color && v.size === size);

    if (!targetVariation || targetVariation.quantity <= 0) {
      return res.status(400).json({ message: "Sorry, this item is currently out of stock." });
    }

    // 5. Generate a new custom ID
    const newRentalId = `rent_${nanoid(7)}`;

    // --- THIS IS THE FIX ---
    // 6. Generate default dates directly on the backend.
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 4); // Default to a 4-day rental period

    const rentalToCreate = {
      _id: newRentalId,
      customerInfo,
      items: [{
        name: product.name,
        price: product.price,
        quantity: 1,
        variation: {
          color: targetVariation.color,
          size: targetVariation.size,
          imageUrl: targetVariation.imageUrl,
        }
      }],
      // Use the newly created default dates
      rentalStartDate: startDate.toISOString().split('T')[0],
      rentalEndDate: endDate.toISOString().split('T')[0],
      // The schema will automatically set defaults for shopDiscount and paymentMethod
      status: "To Process",
    };

    // 7. Save the new rental
    const newRental = new RentalModel(rentalToCreate);
    const savedRental = await newRental.save();

    // 8. Decrement inventory stock
    await ItemModel.updateOne(
      { _id: itemId, "variations.color": color, "variations.size": size },
      { $inc: { "variations.$.quantity": -1 } }
    );

    // 9. Send the successful response
    res.status(201).json(savedRental);

  } catch (error) {
    console.error("Error during rental creation process:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: "Validation Error", errors: error.errors });
    }
    res.status(500).json({ message: "Server Error: Could not create rental." });
  }
});


// UPDATE RENTAL STATUS
app.put(`${API_PREFIX}/rentals/:id/status`, async (req, res) => {
  const { id } = req.params;
  const { status, rentalStartDate, rentalEndDate, shopDiscount, paymentMethod, gcashRefNum, cashTendered } = req.body;
  
  if (!status) {
    return res.status(400).json({ message: "Status is required in the request body." });
  }
  
  try {
    // --- SPECIAL LOGIC FOR CANCELLATION ---
    if (status === 'Cancelled') {
      const rentalToCancel = await RentalModel.findById(id).lean();
      if (!rentalToCancel) {
        return res.status(404).json({ message: "Rental to cancel not found." });
      }

      const stockUpdateOperations = rentalToCancel.items.map(item => ({
        updateOne: {
          filter: { 
            name: item.name,
            "variations.color": item.variation.color,
            "variations.size": item.variation.size,
          },
          update: { 
            $inc: { "variations.$.quantity": item.quantity }
          }
        }
      }));

      if (stockUpdateOperations.length > 0) {
        await ItemModel.bulkWrite(stockUpdateOperations);
      }
    }

    // --- GENERAL LOGIC FOR ALL STATUS UPDATES ---
    const updatePayload = { status };

    if (rentalStartDate && rentalEndDate) {
      updatePayload.rentalStartDate = rentalStartDate;
      updatePayload.rentalEndDate = rentalEndDate;
    }
    
    if (shopDiscount !== undefined) {
      updatePayload.shopDiscount = parseFloat(shopDiscount) || 0;
    }
    if (paymentMethod) {
      updatePayload.paymentMethod = paymentMethod;
    }
    if (gcashRefNum !== undefined) {
      updatePayload.gcashRefNum = gcashRefNum;
    }
    if (cashTendered !== undefined) {
      updatePayload.cashTendered = parseFloat(cashTendered) || 0;
    }
    
    const updatedRental = await RentalModel.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedRental) {
      return res.status(404).json({ message: "Rental not found." });
    }

    res.status(200).json(updatedRental);

  } catch (error) {
    console.error(`Error updating status for rental ${id}:`, error);
     if (error.name === 'ValidationError') {
      return res.status(400).json({ message: "Invalid status or other data.", errors: error.errors });
    }
    res.status(500).json({ message: "Server Error during status update." });
  }
});


// DELETE A RENTAL
app.delete(`${API_PREFIX}/rentals/:id`, async (req, res) => {
  try {
    // FIX: Added .lean() to ensure the returned deleted object is plain.
    const deletedRental = await RentalModel.findByIdAndDelete(req.params.id).lean();
    if (!deletedRental) {
      return res.status(404).json({ message: "Rental not found." });
    }
    res.status(200).json({ message: "Rental deleted successfully." });
  } catch (error) {
    console.error(`Error deleting rental ${req.params.id}:`, error);
    res.status(500).json({ message: "Server Error." });
  }
});



// ===================================
//      SERVER LISTENING
// ===================================
app.listen(3001, () => {
  console.log("Server is running on port 3001");
});