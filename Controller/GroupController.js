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

const getCustomersByGroupId = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({ message: 'groupId is required' });
    }

    const customers = await Customer.find({ group: groupId });

    if (!customers.length) {
      return res.status(404).json({ message: 'No customers found for this group' });
    }

    res.status(200).json({ customers });
  } catch (error) {
    console.error('Error fetching customers by groupId:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
const getGroupNamesByUserId = async (req, res) => {
   userId = req.userId;

  try {
    const groups = await Group.find({ userId }).select('GroupName');

    // Extract just the group names if you want plain strings
    const groupNames = groups.map(group => group.GroupName);

    res.status(200).json({ groupNames });
  } catch (error) {
    console.error('Error fetching group names:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { createGroup,getCustomersByGroupId ,getGroupNamesByUserId };
