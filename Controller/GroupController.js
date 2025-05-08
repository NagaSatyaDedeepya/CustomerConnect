// controllers/groupController.js
const Group = require('../Model/Groups');
const Customer = require('../Model/Customer');

const createGroup = async (req, res) => {
  try {
    const { GroupName, Description, Tags, customers, userId } = req.body;

    if (!GroupName || !userId) {
      return res.status(400).json({ message: 'GroupName and userId are required.' });
    }

    const group = new Group({
      GroupName,
      Description,
      Tags,
      customers,
      userId
    });

    const savedGroup = await group.save();

    // Update each customer to link them to the new group
    await Customer.updateMany(
      { _id: { $in: customers } },
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
