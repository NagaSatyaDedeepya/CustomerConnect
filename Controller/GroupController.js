// controllers/groupController.js
const Group = require('../models/Group');
const Customer = require('../models/Customer');

const createGroup = async (req, res) => {
  try {
    const { name, customerIds } = req.body;
    const { userId } = req; // Ensure the user is authenticated

    // Check if the required fields are provided
    if (!name || !customerIds || customerIds.length === 0) {
      return res.status(400).json({ error: 'Group name and customers are required' });
    }

    // Fetch the customers from the database by IDs
    const customers = await Customer.find({
      _id: { $in: customerIds }, 
      createdBy: userId  // Ensure the user owns these customers
    });

    // If not all customers exist or belong to the user, return an error
    if (customers.length !== customerIds.length) {
      return res.status(400).json({ error: 'Some customers are invalid or do not belong to you' });
    }

    // Create the new group
    const group = new Group({
      name,
      createdBy: userId,
      customers: customerIds,
    });

    // Save the group to the database
    const savedGroup = await group.save();

    // Update each customer to link them to the new group
    await Customer.updateMany(
      { _id: { $in: customerIds } },
      { $set: { group: savedGroup._id } }
    );

    res.status(201).json({
      message: 'Group created successfully',
      groupId: savedGroup._id,
      group: savedGroup,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create group' });
  }
};

module.exports = { createGroup };
